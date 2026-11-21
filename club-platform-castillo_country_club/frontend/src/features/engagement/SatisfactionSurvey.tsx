// src/features/engagement/components/SatisfactionSurvey.tsx
// ═══════════════════════════════════════════════════════════
// Satisfaction Survey — Interactive Survey Wizard
// Castillo Country Club — Phase 31 "The Voice"
//
// CLEAN REWRITE of V1. Eliminates:
//   - framer-motion (motion, AnimatePresence)
//   - cn utility (Tailwind conditional classes)
//   - default export
//   - Tailwind inline classes
//
// Replaces with:
//   - CSS keyframes (slideIn, successReveal, fadeUp)
//   - data-selected / data-active / data-current attributes
//   - Named export
//   - Co-located CSS file
//
// Verified against types.ts:
//   SurveyTemplate, SurveyQuestion
//
// Glass namespace: glass-eng-survey
// Rules: R34, R35, R38, #62 (type verification)
// ═══════════════════════════════════════════════════════════

import { useState, useMemo } from "react";
import { useParams } from "react-router";
import {
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Star,
  Sparkles,
  Send,
} from "lucide-react";
import { PageContainer } from "@/shared/components/layout/PageContainer";
import { Card, Button } from "@/shared/components/ui";
import { showToast } from "@/shared/components/ui";
import { useMCPQuery, useMCPMutation } from "@/shared/hooks/useMCPQuery";
import type { SurveyTemplate, SurveyQuestion } from "./types";
import "./SatisfactionSurvey.css";


// ══════════════════════════════════════════════════════════════
// INPUT SUB-COMPONENTS
// ══════════════════════════════════════════════════════════════

// ── NPS (0-10 grid) ──────────────────────────────────────

function NPSInput({
  value,
  onChange,
}: {
  value?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="eng-survey__nps">
      <div className="eng-survey__nps-grid">
        {Array.from({ length: 11 }).map((_, i) => (
          <Button
            variant="unstyled"
            key={i}
            type="button"
            data-selected={value === i}
            onClick={() => onChange(i)}
            className="eng-survey__nps-btn"
          >
            {i}
          </Button>
        ))}
      </div>
      <div className="eng-survey__nps-labels">
        <span>Nada probable</span>
        <span>Muy probable</span>
      </div>
    </div>
  );
}

// ── Rating (star selector) ───────────────────────────────

function RatingInput({
  value,
  onChange,
  max = 5,
}: {
  value?: number;
  onChange: (v: number) => void;
  max?: number;
}) {
  return (
    <div className="eng-survey__rating">
      {Array.from({ length: max }).map((_, i) => {
        const starVal = i + 1;
        const active = value !== undefined && starVal <= value;

        return (
          <Button
            variant="unstyled"
            key={i}
            type="button"
            data-active={active}
            onClick={() => onChange(starVal)}
            className="eng-survey__rating-btn"
          >
            <Star
              size={28}
              fill={active ? "var(--color-gold-400)" : "transparent"}
              stroke={active ? "var(--color-gold-400)" : "rgba(255,255,255,0.12)"}
            />
          </Button>
        );
      })}
    </div>
  );
}

// ── Choice (single or multi) ─────────────────────────────

function ChoiceInput({
  options,
  value,
  onChange,
  multi = false,
}: {
  options: string[];
  value?: string | string[];
  onChange: (v: string | string[]) => void;
  multi?: boolean;
}) {
  function handleClick(opt: string) {
    if (multi) {
      const selected = Array.isArray(value) ? value : [];
      onChange(
        selected.includes(opt)
          ? selected.filter((s) => s !== opt)
          : [...selected, opt],
      );
    } else {
      onChange(opt);
    }
  }

  function isSelected(opt: string): boolean {
    if (multi) {
      return Array.isArray(value) ? value.includes(opt) : false;
    }
    return value === opt;
  }

  return (
    <div className="eng-survey__choices">
      {options.map((opt) => (
        <Button
          variant="unstyled"
          key={opt}
          type="button"
          data-selected={isSelected(opt)}
          onClick={() => handleClick(opt)}
          className="eng-survey__choice-btn"
        >
          {opt}
        </Button>
      ))}
    </div>
  );
}

// ── Text (free-form) ─────────────────────────────────────

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value?: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <textarea
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      rows={4}
      placeholder={placeholder ?? "Escribí tu respuesta..."}
      className="eng-survey__textarea"
    />
  );
}


// ══════════════════════════════════════════════════════════════
// QUESTION INPUT ROUTER
// ══════════════════════════════════════════════════════════════

function QuestionInput({
  question,
  value,
  onChange,
}: {
  question: SurveyQuestion;
  value: string | number | string[] | undefined;
  onChange: (v: string | number | string[]) => void;
}) {
  switch (question.type) {
    case "nps":
      return (
        <NPSInput
          value={value as number | undefined}
          onChange={onChange}
        />
      );

    case "rating":
      return (
        <RatingInput
          value={value as number | undefined}
          onChange={onChange}
        />
      );

    case "choice":
      return (
        <ChoiceInput
          options={question.options ?? []}
          value={value as string | undefined}
          onChange={onChange}
        />
      );

    case "multi_choice":
      return (
        <ChoiceInput
          options={question.options ?? []}
          value={value as string[] | undefined}
          onChange={onChange}
          multi
        />
      );

    case "text":
    default:
      return (
        <TextInput
          value={value as string | undefined}
          onChange={onChange}
        />
      );
  }
}


// ══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════

/**
 * Satisfaction Survey — interactive wizard for survey completion.
 * Fetches active survey via useMCPQuery (get_active_survey).
 * Submits responses via useMCPMutation (submit_survey_response).
 * Question-by-question navigation with dot indicators.
 */
export function SatisfactionSurvey() {
  const { id: surveyId } = useParams();

  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<
    Record<string, string | number | string[]>
  >({});
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // ── Data fetching ────────────────────────────────────────
  const surveyQ = useMCPQuery<SurveyTemplate>(
    "engagement",
    "get_active_survey",
    surveyId ? { survey_id: surveyId } : {},
    { staleTime: 300_000 },
  );

  const submitMut = useMCPMutation<unknown, Record<string, unknown>>(
    "engagement",
    "submit_survey_response",
    {
      onSuccess: () => {
        setSubmitted(true);
        showToast({ type: "success", message: "¡Gracias por tu opinión!" });
      },
      onError: (err) => {
        showToast({
          type: "error",
          message: err instanceof Error ? err.message : "Error al enviar",
        });
      },
    },
  );

  // ── Derived ──────────────────────────────────────────────
  const questions = useMemo(
    () =>
      (surveyQ.data?.questions ?? []).sort((a, b) => a.order - b.order),
    [surveyQ.data],
  );

  const totalQ = questions.length;
  const q = questions[currentQ];
  const answeredCount = Object.keys(answers).length;
  const progress = totalQ > 0 ? ((currentQ + 1) / totalQ) * 100 : 0;

  // ── Actions ──────────────────────────────────────────────
  function setAnswer(questionId: string, value: string | number | string[]) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  function handleSubmit() {
    submitMut.mutate({
      survey_id: surveyQ.data!.id,
      answers: Object.entries(answers).map(([question_id, value]) => ({
        question_id,
        value,
      })),
      comment: comment.trim() || undefined,
    });
  }

  // ── Loading ──────────────────────────────────────────────
  if (surveyQ.isLoading) {
    return (
      <PageContainer title="Encuesta de Satisfacción" subtitle="Cargando...">
        <div data-glass-eng-survey="" className="eng-survey">
          <div className="eng-survey__shell">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="eng-survey__skeleton"
                style={{ "--stagger-i": i } as React.CSSProperties}
              />
            ))}
          </div>
        </div>
      </PageContainer>
    );
  }

  // ── No survey ────────────────────────────────────────────
  if (!surveyQ.data || questions.length === 0) {
    return (
      <PageContainer title="Encuesta de Satisfacción">
        <div data-glass-eng-survey="" className="eng-survey">
          <Card className="eng-survey__empty-card">
            <p className="eng-survey__empty-title">
              No hay encuestas disponibles
            </p>
            <p className="eng-survey__empty-subtitle">
              En este momento no hay encuestas activas. ¡Gracias por tu interés!
            </p>
          </Card>
        </div>
      </PageContainer>
    );
  }

  // ── Success ──────────────────────────────────────────────
  if (submitted) {
    return (
      <PageContainer title="Encuesta de Satisfacción">
        <div data-glass-eng-survey="" className="eng-survey">
          <div className="eng-survey__shell">
            <Card className="eng-survey__success-card">
              <div className="eng-survey__success-icon-ring">
                <CheckCircle2 size={36} style={{ color: "var(--color-emerald-400)" }} />
              </div>
              <h2 className="eng-survey__success-title">
                ¡Gracias por tu opinión!
              </h2>
              <p className="eng-survey__success-text">
                Tu respuesta nos ayuda a mejorar la experiencia del club para toda la familia.
              </p>
            </Card>
          </div>
        </div>
      </PageContainer>
    );
  }

  // ── Main render ──────────────────────────────────────────
  return (
    <PageContainer
      title={surveyQ.data.name}
      subtitle={surveyQ.data.description}
    >
      <div data-glass-eng-survey="" className="eng-survey">
        <div className="eng-survey__shell">

          {/* ── Progress ───────────────────────────────────── */}
          <div className="eng-survey__progress-section">
            <div className="eng-survey__progress-info">
              <span>Pregunta {currentQ + 1} de {totalQ}</span>
              <span>{answeredCount} respondidas</span>
            </div>
            <div className="eng-survey__progress-track">
              <div
                className="eng-survey__progress-fill"
                style={{ "--progress": `${progress}%` } as React.CSSProperties}
              />
            </div>
          </div>

          {/* ── Question Card ──────────────────────────────── */}
          {q && (
            <div key={q.id} className="eng-survey__question-animated">
              <Card className="eng-survey__question-card">
                <div className="eng-survey__question-header">
                  <span className="eng-survey__question-number">
                    {currentQ + 1}
                  </span>
                  {q.ai_suggested && (
                    <Sparkles
                      size={14}
                      style={{ color: "var(--color-gold-400)" }}
                    />
                  )}
                </div>

                <h3 className="eng-survey__question-text">
                  {q.question}
                </h3>

                {q.description && (
                  <p className="eng-survey__question-description">
                    {q.description}
                  </p>
                )}

                <div className="eng-survey__question-input">
                  <QuestionInput
                    question={q}
                    value={answers[q.id]}
                    onChange={(v) => setAnswer(q.id, v)}
                  />
                </div>

                {q.required && !answers[q.id] && (
                  <p className="eng-survey__required-hint">
                    * Pregunta obligatoria
                  </p>
                )}
              </Card>
            </div>
          )}

          {/* ── Navigation ─────────────────────────────────── */}
          <div className="eng-survey__nav">
            <Button
              variant="ghost"
              onClick={() => setCurrentQ((s) => Math.max(0, s - 1))}
              disabled={currentQ === 0}
            >
              <ChevronLeft size={16} />
              Anterior
            </Button>

            {currentQ < totalQ - 1 ? (
              <Button
                variant="primary"
                onClick={() => setCurrentQ((s) => Math.min(totalQ - 1, s + 1))}
              >
                Siguiente
                <ChevronRight size={16} />
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={handleSubmit}
                disabled={submitMut.isPending || (q?.required && !answers[q.id])}
              >
                <Send size={14} />
                {submitMut.isPending ? "Enviando..." : "Enviar Encuesta"}
              </Button>
            )}
          </div>

          {/* ── Comment (last question) ────────────────────── */}
          {currentQ === totalQ - 1 && (
            <div className="eng-survey__comment-animated">
              <Card className="eng-survey__comment-card">
                <label className="eng-survey__comment-label">
                  Comentario adicional (opcional)
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  placeholder="¿Hay algo más que nos quieras contar?"
                  className="eng-survey__textarea"
                />
              </Card>
            </div>
          )}

          {/* ── Dot navigation ─────────────────────────────── */}
          <div className="eng-survey__dots">
            {questions.map((question, i) => (
              <Button
                variant="unstyled"
                key={question.id}
                type="button"
                data-current={i === currentQ}
                data-answered={answers[question.id] !== undefined}
                onClick={() => setCurrentQ(i)}
                className="eng-survey__dot"
                aria-label={`Pregunta ${i + 1}`}
              />
            ))}
          </div>

        </div>
      </div>
    </PageContainer>
  );
}