/**
 * @component MessageBubble (Fase 25)
 * @namespace .glass-knowledge__bubble
 * @depends MessageBubble.css
 * @note Chat message bubble with markdown rendering, source chips,
 *       confidence badge, copy/regenerate/feedback actions.
 * @import import './MessageBubble.css';
 */
import "./MessageBubble.css";

import { useState, useMemo, type ReactNode } from "react";
import {
  Copy,
  Check,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  User,
} from "lucide-react";
import { Badge } from "@/shared/components/ui";
import { cn } from "@/shared/lib/utils";
import { formatTime } from "@/features/documents/types";
import type {
  ConversationMessage
} from "@/features/documents/types";
import type { FeedbackValue } from "../hooks/useKnowledgeChat";
import { SourceChips } from "./SourceChips";
import { Button } from "@/shared/components/ui/Button";

/* ═══════════════════════════════════════
   Simple Markdown Parser
   ═══════════════════════════════════════ */

function renderMarkdown(text: string): ReactNode {
  const lines = text.split("\n");
  const elements: ReactNode[] = [];
  let inList = false;
  let listItems: ReactNode[] = [];
  let listType: "ul" | "ol" = "ul";

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        listType === "ul" ? (
          <ul key={`list-${elements.length}`}>{listItems}</ul>
        ) : (
          <ol key={`list-${elements.length}`}>{listItems}</ol>
        ),
      );
      listItems = [];
      inList = false;
    }
  };

  const renderInline = (line: string, key: string): ReactNode => {
    const parts: ReactNode[] = [];
    let remaining = line;
    let idx = 0;

    /* Bold: **text** */
    const boldRegex = /\*\*(.+?)\*\*/g;
    let match: RegExpExecArray | null;
    let lastIdx = 0;

    while ((match = boldRegex.exec(remaining)) !== null) {
      if (match.index > lastIdx) {
        parts.push(remaining.slice(lastIdx, match.index));
      }
      parts.push(<strong key={`${key}-b-${idx}`}>{match[1]}</strong>);
      lastIdx = match.index + match[0].length;
      idx++;
    }

    if (lastIdx < remaining.length) {
      parts.push(remaining.slice(lastIdx));
    }

    /* Inline code: `text` */
    if (parts.length === 0) {
      const codeRegex = /`(.+?)`/g;
      let codeMatch: RegExpExecArray | null;
      let codeLastIdx = 0;
      const codeParts: ReactNode[] = [];
      let codeIdx = 0;

      while ((codeMatch = codeRegex.exec(remaining)) !== null) {
        if (codeMatch.index > codeLastIdx) {
          codeParts.push(remaining.slice(codeLastIdx, codeMatch.index));
        }
        codeParts.push(
          <code key={`${key}-c-${codeIdx}`}>{codeMatch[1]}</code>,
        );
        codeLastIdx = codeMatch.index + codeMatch[0].length;
        codeIdx++;
      }

      if (codeLastIdx < remaining.length) {
        codeParts.push(remaining.slice(codeLastIdx));
      }

      return codeParts.length > 0 ? codeParts : remaining;
    }

    return parts.length === 1 ? parts[0] : parts;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const key = `line-${i}`;

    /* Heading: ### text */
    const h3Match = line.match(/^###\s+(.+)/);
    if (h3Match) {
      flushList();
      elements.push(
        <h3 key={key}>{renderInline(h3Match[1], key)}</h3>,
      );
      continue;
    }

    /* Unordered list: - text or * text */
    const ulMatch = line.match(/^[-*]\s+(.+)/);
    if (ulMatch) {
      if (!inList || listType !== "ul") {
        flushList();
        inList = true;
        listType = "ul";
      }
      listItems.push(
        <li key={key}>{renderInline(ulMatch[1], key)}</li>,
      );
      continue;
    }

    /* Ordered list: 1. text */
    const olMatch = line.match(/^\d+\.\s+(.+)/);
    if (olMatch) {
      if (!inList || listType !== "ol") {
        flushList();
        inList = true;
        listType = "ol";
      }
      listItems.push(
        <li key={key}>{renderInline(olMatch[1], key)}</li>,
      );
      continue;
    }

    /* Regular paragraph */
    flushList();
    if (line.trim() === "") {
      continue;
    }
    elements.push(
      <span key={key}>
        {renderInline(line, key)}
        {i < lines.length - 1 && "\n"}
      </span>,
    );
  }

  flushList();
  return elements.length === 1 ? elements[0] : elements;
}

/* ═══════════════════════════════════════
   Confidence Badge
   ═══════════════════════════════════════ */

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const percent = Math.round(confidence * 100);
  const level =
    percent >= 80 ? "high" : percent >= 50 ? "medium" : "low";
  const label =
    level === "high"
      ? "Alta confianza"
      : level === "medium"
        ? "Confianza media"
        : "Baja confianza";
  const variant =
    level === "high"
      ? "success"
      : level === "medium"
        ? "warning"
        : "danger";

  return (
    <div className="glass-knowledge__confidence">
      <Badge variant={variant} size="sm">
        {label}
      </Badge>
      <span className="glass-knowledge__confidence-value">
        {percent}%
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════
   Component
   ═══════════════════════════════════════ */

interface MessageBubbleProps {
  message: ConversationMessage;
  onCopy: () => void;
  onRegenerate: () => void;
  onFeedback: (value: FeedbackValue) => void;
  feedbackGiven: boolean;
  showTimestamp: boolean;
}

export function MessageBubble({
  message,
  onCopy,
  onRegenerate,
  onFeedback,
  feedbackGiven,
  showTimestamp,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderedContent = useMemo(
    () => (isUser ? message.content : renderMarkdown(message.content)),
    [message.content, isUser],
  );

  return (
    <div
      className={cn(
        "glass-knowledge__bubble",
        isUser
          ? "glass-knowledge__bubble--user"
          : "glass-knowledge__bubble--assistant",
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "glass-knowledge__avatar",
          isUser
            ? "glass-knowledge__avatar--user"
            : "glass-knowledge__avatar--assistant",
        )}
      >
        {isUser ? <User size={16} /> : <Sparkles size={16} />}
      </div>

      {/* Content */}
      <div className="glass-knowledge__content">
        <div
          className={cn(
            "glass-knowledge__bubble-text",
            isUser
              ? "glass-knowledge__bubble-text--user"
              : "glass-knowledge__bubble-text--assistant",
          )}
        >
          {renderedContent}
        </div>

        {/* Confidence */}
        {!isUser && message.confidence != null && (
          <ConfidenceBadge confidence={message.confidence} />
        )}

        {/* Source chips */}
        {!isUser &&
          message.sources &&
          message.sources.length > 0 && (
            <SourceChips sources={message.sources} />
          )}

        {/* Actions (assistant only) */}
        {!isUser && (
          <div className="glass-knowledge__actions">
            <Button
              variant="unstyled"
              type="button"
              className={cn(
                "glass-knowledge__action-btn",
                copied && "glass-knowledge__action-btn--copied",
              )}
              onClick={handleCopy}
              aria-label="Copiar respuesta"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "Copiado" : "Copiar"}
            </Button>
            <Button
              variant="unstyled"
              type="button"
              className="glass-knowledge__action-btn"
              onClick={onRegenerate}
              aria-label="Regenerar respuesta"
            >
              <RefreshCw size={14} />
              Regenerar
            </Button>
            <Button
              variant="unstyled"
              type="button"
              className={cn(
                "glass-knowledge__action-btn",
                feedbackGiven && "glass-knowledge__action-btn--active",
              )}
              onClick={() => onFeedback("positive")}
              disabled={feedbackGiven}
              aria-label="Feedback positivo"
            >
              <ThumbsUp size={14} />
            </Button>
            <Button
              variant="unstyled"
              type="button"
              className={cn(
                "glass-knowledge__action-btn",
                feedbackGiven && "glass-knowledge__action-btn--active",
              )}
              onClick={() => onFeedback("negative")}
              disabled={feedbackGiven}
              aria-label="Feedback negativo"
            >
              <ThumbsDown size={14} />
            </Button>
          </div>
        )}

        {/* Timestamp (conditional) */}
        {showTimestamp && (
          <span
            className={cn(
              "glass-knowledge__timestamp",
              isUser && "glass-knowledge__timestamp--right",
            )}
          >
            {formatTime(message.timestamp)}
          </span>
        )}
      </div>
    </div>
  );
}