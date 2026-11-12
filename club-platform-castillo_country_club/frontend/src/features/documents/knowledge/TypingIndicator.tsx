/**
 * @component TypingIndicator (Fase 25)
 * @namespace .glass-knowledge__typing
 * @depends TypingIndicator.css
 * @note Animated dots indicating AI is generating a response.
 * @import import './TypingIndicator.css';
 */
import "./TypingIndicator.css";

export function TypingIndicator() {
  return (
    <div className="glass-knowledge__typing">
      <div className="glass-knowledge__avatar glass-knowledge__avatar--assistant">
        <Sparkles size={16} />
      </div>
      <div className="glass-knowledge__typing-dots">
        <div className="glass-knowledge__typing-dot" />
        <div className="glass-knowledge__typing-dot" />
        <div className="glass-knowledge__typing-dot" />
      </div>
    </div>
  );
}

/* Sparkles import — minimal, no extra deps */
function Sparkles({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  );
}