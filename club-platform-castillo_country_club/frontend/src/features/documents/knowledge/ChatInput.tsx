/**
 * @component ChatInput (Fase 25)
 * @namespace .glass-knowledge__input-*
 * @depends KnowledgeQuery.css
 * @note Chat input with auto-resize textarea, Enter/Shift+Enter, Ctrl+K focus.
 * @import import '../KnowledgeQuery.css';
 */

import {
  useEffect,
  type FormEvent,
  type KeyboardEvent,
  type ChangeEvent,
} from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/shared/components/ui/Button";

interface ChatInputProps {
  input: string;
  onInputChange: (v: string) => void;
  onSubmit: () => void;
  isPending: boolean;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
}

export function ChatInput({
  input,
  onInputChange,
  onSubmit,
  isPending,
  inputRef,
}: ChatInputProps) {
  /* ── Ctrl+K focus ── */
  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
    }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [inputRef]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    onInputChange(e.target.value);
    /* Auto-resize with smooth transition (CSS handles transition) */
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  return (
    <div className="glass-knowledge__input-area">
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <div className="glass-knowledge__input-wrap">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Preguntá algo sobre los documentos del club..."
            rows={1}
            className="glass-knowledge__input-field"
            aria-label="Escribir consulta a la base de conocimiento"
            disabled={isPending}
          />
          <Button
            type="submit"
            variant="primary"
            disabled={!input.trim() || isPending}
            icon={
              isPending ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Send size={18} />
              )
            }
            className="flex-shrink-0"
            aria-label="Enviar consulta"
          />
        </div>
      </form>
      <p className="glass-knowledge__input-hint">
        Enter para enviar · Shift+Enter para nueva línea · ⌘K para focus
      </p>
    </div>
  );
}