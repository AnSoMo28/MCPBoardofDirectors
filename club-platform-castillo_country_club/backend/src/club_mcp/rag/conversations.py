"""
Conversation Manager — multi-turn RAG sessions.

Stores conversation history per session with:
    - TTL-based expiration (30 min inactivity)
    - Max messages per session (50)
    - Context windowing for LLM (last 6 messages)
    - Automatic cleanup of expired sessions

Usage:
    store = ConversationStore()
    store.add_message(session_id, "user", "pregunta", sources=[])
    store.add_message(session_id, "assistant", "respuesta", confidence=0.85)
    context = store.get_context(session_id)  # last 6 messages for LLM
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from threading import Lock
from typing import Any
from uuid import uuid4

logger = logging.getLogger(__name__)

_DEFAULT_TTL_SECONDS = 30 * 60  # 30 minutes
_DEFAULT_MAX_MESSAGES = 50
_CONTEXT_WINDOW = 6  # Last N messages to pass to LLM


# ── Models ────────────────────────────────────────────────


@dataclass
class ConversationMessage:
    """A single message in a conversation."""
    role: str  # "user" or "assistant"
    content: str
    sources: list[dict[str, Any]] = field(default_factory=list)
    confidence: float = 0.0
    timestamp: float = field(default_factory=time.time)


@dataclass
class ConversationSession:
    """A conversation session with message history."""
    id: str
    messages: list[ConversationMessage] = field(default_factory=list)
    created_at: float = field(default_factory=time.time)
    last_active: float = field(default_factory=time.time)
    metadata: dict[str, Any] = field(default_factory=dict)

    @property
    def message_count(self) -> int:
        return len(self.messages)

    @property
    def avg_confidence(self) -> float:
        """Average assistant confidence for this session."""
        assistant_msgs = [m for m in self.messages if m.role == "assistant" and m.confidence > 0]
        if not assistant_msgs:
            return 0.0
        return sum(m.confidence for m in assistant_msgs) / len(assistant_msgs)


# ── Conversation Store ────────────────────────────────────


class ConversationStore:
    """
    Thread-safe in-memory conversation store with TTL expiration.

    Args:
        ttl_seconds: Session expiration time in seconds.
        max_messages: Maximum messages per session.
        context_window: Number of recent messages for LLM context.
    """

    def __init__(
        self,
        ttl_seconds: int = _DEFAULT_TTL_SECONDS,
        max_messages: int = _DEFAULT_MAX_MESSAGES,
        context_window: int = _CONTEXT_WINDOW,
    ) -> None:
        self._sessions: dict[str, ConversationSession] = {}
        self._ttl = ttl_seconds
        self._max_messages = max_messages
        self._context_window = context_window
        self._lock = Lock()
        self._cleanup_count = 0

    # ── Session management ────────────────────────────────

    def create_session(self, session_id: str | None = None, metadata: dict[str, Any] | None = None) -> str:
        """
        Create a new conversation session.

        Args:
            session_id: Optional custom ID. Generated if not provided.
            metadata: Optional session metadata (user_role, etc.).

        Returns:
            Session ID.
        """
        sid = session_id or uuid4().hex[:12]

        with self._lock:
            self._sessions[sid] = ConversationSession(
                id=sid,
                metadata=metadata or {},
            )

        logger.info("[conversations] Created session '%s'", sid)
        return sid

    def get_session(self, session_id: str) -> ConversationSession | None:
        """Get a session by ID. Returns None if expired or not found."""
        with self._lock:
            session = self._sessions.get(session_id)

        if session is None:
            return None

        # Check TTL
        if self._is_expired(session):
            self.delete_session(session_id)
            return None

        return session

    def delete_session(self, session_id: str) -> bool:
        """Delete a session. Returns True if it existed."""
        with self._lock:
            existed = session_id in self._sessions
            self._sessions.pop(session_id, None)

        if existed:
            logger.info("[conversations] Deleted session '%s'", session_id)
        return existed

    # ── Message management ────────────────────────────────

    def add_message(
        self,
        session_id: str,
        role: str,
        content: str,
        sources: list[dict[str, Any]] | None = None,
        confidence: float = 0.0,
    ) -> bool:
        """
        Add a message to a conversation session.

        Auto-creates session if it doesn't exist.
        Enforces max_messages limit (drops oldest).

        Returns:
            True if message was added successfully.
        """
        with self._lock:
            session = self._sessions.get(session_id)
            if session is None:
                session = ConversationSession(id=session_id)
                self._sessions[session_id] = session

            # Enforce max messages
            while len(session.messages) >= self._max_messages:
                session.messages.pop(0)

            session.messages.append(ConversationMessage(
                role=role,
                content=content,
                sources=sources or [],
                confidence=confidence,
            ))
            session.last_active = time.time()

        return True

    def get_context(
        self,
        session_id: str,
        max_messages: int | None = None,
    ) -> list[dict[str, str]]:
        """
        Get recent conversation context for LLM.

        Returns last N messages as [{role, content}] dicts.
        Suitable for passing directly to Claude's messages parameter.

        Args:
            session_id: Session to retrieve context for.
            max_messages: Override context window size.

        Returns:
            List of {role, content} dicts, or empty list if session not found.
        """
        session = self.get_session(session_id)
        if session is None:
            return []

        window = max_messages or self._context_window
        recent = session.messages[-window:]

        return [
            {"role": msg.role, "content": msg.content}
            for msg in recent
        ]

    def get_full_history(
        self,
        session_id: str,
    ) -> list[dict[str, Any]]:
        """
        Get full conversation history with metadata.

        Returns messages with sources, confidence, timestamps.
        Used for displaying conversation in the UI.
        """
        session = self.get_session(session_id)
        if session is None:
            return []

        return [
            {
                "role": msg.role,
                "content": msg.content,
                "sources": msg.sources,
                "confidence": msg.confidence,
                "timestamp": msg.timestamp,
            }
            for msg in session.messages
        ]

    # ── Cleanup ───────────────────────────────────────────

    def cleanup_expired(self) -> int:
        """
        Remove expired sessions.

        Returns:
            Number of sessions removed.
        """
        now = time.time()
        expired_ids: list[str] = []

        with self._lock:
            for sid, session in self._sessions.items():
                if now - session.last_active > self._ttl:
                    expired_ids.append(sid)

            for sid in expired_ids:
                del self._sessions[sid]

        if expired_ids:
            self._cleanup_count += len(expired_ids)
            logger.info(
                "[conversations] Cleaned up %d expired sessions (total cleaned: %d)",
                len(expired_ids), self._cleanup_count,
            )

        return len(expired_ids)

    # ── Stats ─────────────────────────────────────────────

    def get_stats(self) -> dict[str, Any]:
        """Get store statistics."""
        with self._lock:
            total_sessions = len(self._sessions)
            total_messages = sum(s.message_count for s in self._sessions.values())
            avg_confidence = 0.0
            if self._sessions:
                confidences = [s.avg_confidence for s in self._sessions.values() if s.avg_confidence > 0]
                if confidences:
                    avg_confidence = sum(confidences) / len(confidences)

        return {
            "active_sessions": total_sessions,
            "total_messages": total_messages,
            "total_cleaned": self._cleanup_count,
            "avg_confidence": round(avg_confidence, 3),
            "ttl_seconds": self._ttl,
            "max_messages": self._max_messages,
            "context_window": self._context_window,
        }

    @property
    def active_count(self) -> int:
        """Number of active sessions."""
        with self._lock:
            return len(self._sessions)

    # ── Internal ──────────────────────────────────────────

    def _is_expired(self, session: ConversationSession) -> bool:
        """Check if a session has expired."""
        return time.time() - session.last_active > self._ttl
