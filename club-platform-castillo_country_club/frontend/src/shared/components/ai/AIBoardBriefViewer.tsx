// src/shared/components/ai/AIBoardBriefViewer.tsx
// Fase 23 — Silver Tide AI Board Intelligence Brief
// Glass · Editorial Prose · Executive Cards · Section Nav · Premium PDF
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown, MessageSquare, Target, Shield, Clock, Printer,
  TrendingUp, AlertTriangle, Users, DollarSign
} from "lucide-react";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { cn } from "@/shared/lib/utils";
import type { AdvisorBoardBriefResponse } from "@/shared/mocks/contracts";
import { trackEvent } from "@/shared/lib/analytics";
import './AIBoardBriefViewer.css';
import { Button } from "@/shared/components/ui/Button";

/* ──────────────────────────────────────
   Types
   ────────────────────────────────────── */

interface AIBoardBriefViewerProps {
  briefData: AdvisorBoardBriefResponse["brief"];
  onClose?: () => void;
}

interface ParsedSection {
  id: string;
  title: string;
  level: number;
}

/* ──────────────────────────────────────
   Helpers
   ────────────────────────────────────── */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function markdownToHtml(md: string): string {
  return md
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>[\s\S]*?<\/li>)+/g, (m) => `<ul>${m}</ul>`)
    .replace(/^\| (.+) \|$/gm, (match) => {
      const cells = match.split("|").filter(Boolean).map((c) => c.trim());
      if (cells.every((c) => /^-+$/.test(c))) return "";
      return `<tr>${cells.map((c) => `<td>${escapeHtml(c)}</td>`).join("")}</tr>`;
    })
    .replace(/(<tr>[\s\S]*?<\/tr>)+/g, (m) => `<table>${m}</table>`)
    .replace(/^(?!<[hultrob])(.+)$/gm, "<p>$1</p>")
    .replace(/<p><\/p>/g, "");
}

function parseSections(md: string): ParsedSection[] {
  const sections: ParsedSection[] = [];
  const lines = md.split("\n");
  for (const line of lines) {
    const match = line.match(/^(#{1,3})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const title = match[2].trim();
      const id = title
        .toLowerCase()
        .replace(/[^a-z0-9áéíóúñü]+/g, "-")
        .replace(/(^-|-$)/g, "");
      sections.push({ id, title, level });
    }
  }
  return sections;
}

function detectPointIcon(point: string): typeof TrendingUp {
  const lower = point.toLowerCase();
  if (lower.includes("revenue") || lower.includes("ingreso") || lower.includes("financ")) return DollarSign;
  if (lower.includes("churn") || lower.includes("riesgo") || lower.includes("alerta")) return AlertTriangle;
  if (lower.includes("socio") || lower.includes("member") || lower.includes("retención")) return Users;
  if (lower.includes("tendencia") || lower.includes("crecimiento") || lower.includes("mejora")) return TrendingUp;
  return Target;
}

function formatBriefDate(): string {
  return new Date().toLocaleDateString("es-CR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/* ──────────────────────────────────────
   Section Progress Hook
   ────────────────────────────────────── */

function useScrollProgress(containerRef: React.RefObject<HTMLDivElement | null>) {
  const [progress, setProgress] = useState(0);
  const [activeSection, setActiveSection] = useState("");

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const pct = scrollHeight > clientHeight
        ? (scrollTop / (scrollHeight - clientHeight)) * 100
        : 0;
      setProgress(Math.min(pct, 100));

      /* Find active section */
      const headings = container.querySelectorAll("[data-section]");
      let current = "";
      for (const h of headings) {
        const rect = h.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        if (rect.top - containerRect.top <= 80) {
          current = h.getAttribute("data-section") || "";
        }
      }
      setActiveSection(current);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [containerRef]);

  return { progress, activeSection };
}

/* ──────────────────────────────────────
   Main Orchestrator
   ────────────────────────────────────── */

export default function AIBoardBriefViewer({
  briefData,
  onClose,
}: AIBoardBriefViewerProps) {
  const reduced = useReducedMotion();
  const [showQA, setShowQA] = useState(false);
  useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { progress, activeSection } = useScrollProgress(scrollRef);
  const sections = useMemo(() => parseSections(briefData.brief_md), [briefData.brief_md]);

  /* Track opened */
  useState(() => { trackEvent("board_brief", "opened"); });

  /* ── PDF Export ── */
  const handlePrint = useCallback(() => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Briefing Ejecutivo — Castillo Country Club</title>
  <style>
    @page { margin: 2.5cm 2cm; }
    body {
      font-family: 'Georgia', 'Times New Roman', serif;
      max-width: 750px;
      margin: 0 auto;
      padding: 0;
      color: #1a1a1a;
      line-height: 1.7;
      font-size: 13px;
    }
    .header {
      text-align: center;
      padding-bottom: 20px;
      border-bottom: 3px solid #C9A96E;
      margin-bottom: 30px;
    }
    .header .org {
      font-size: 11px;
      letter-spacing: 3px;
      color: #888;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .header .title {
      font-size: 22px;
      font-weight: 700;
      color: #1a1a1a;
      margin-bottom: 6px;
    }
    .header .date {
      font-size: 11px;
      color: #888;
    }
    .confidential {
      text-align: center;
      font-size: 10px;
      letter-spacing: 2px;
      color: #C9A96E;
      text-transform: uppercase;
      margin-bottom: 24px;
      font-family: sans-serif;
    }
    h1 { font-size: 20px; border-bottom: 2px solid #C9A96E; padding-bottom: 6px; margin-top: 28px; }
    h2 { font-size: 16px; margin-top: 22px; color: #333; }
    h3 { font-size: 14px; color: #555; margin-top: 16px; }
    p { margin: 8px 0; }
    strong { color: #1a1a1a; }
    table { border-collapse: collapse; width: 100%; margin: 16px 0; }
    th { background: #f5f2eb; font-weight: 600; text-align: left; padding: 8px 12px; border: 1px solid #e0ddd5; font-size: 12px; }
    td { padding: 8px 12px; border: 1px solid #e0ddd5; font-size: 12px; }
    tr:nth-child(even) td { background: #faf9f7; }
    .key-points {
      background: #f8f6f0;
      border-left: 4px solid #C9A96E;
      padding: 16px 20px;
      margin: 20px 0;
    }
    .key-points h3 { margin-top: 0; color: #C9A96E; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; font-family: sans-serif; }
    .key-points ol { margin: 0; padding-left: 20px; }
    .key-points li { margin-bottom: 8px; }
    .talking-points {
      background: #f0f7f5;
      border-left: 4px solid #34d399;
      padding: 16px 20px;
      margin: 20px 0;
    }
    .talking-points h3 { margin-top: 0; color: #34d399; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; font-family: sans-serif; }
    .talking-points ol { margin: 0; padding-left: 20px; }
    .talking-points li { margin-bottom: 6px; }
    .qa { margin-top: 24px; }
    .qa dt { font-weight: 600; margin-top: 14px; font-size: 13px; color: #333; }
    .qa dd { margin: 4px 0 0 0; font-size: 12px; color: #555; padding-left: 16px; }
    .footer {
      margin-top: 40px;
      padding-top: 16px;
      border-top: 1px solid #ddd;
      text-align: center;
      font-size: 10px;
      color: #999;
      font-family: sans-serif;
    }
    @media print {
      body { padding: 0; }
      .header { page-break-after: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <p class="org">Castillo Country Club</p>
    <p class="title">Briefing Ejecutivo</p>
    <p class="date">${formatBriefDate()}</p>
  </div>
  <p class="confidential">Confidencial — Solo para Junta Directiva</p>
  ${markdownToHtml(briefData.brief_md)}
  <div class="key-points">
    <h3>Puntos Clave para la Junta</h3>
    <ol>
      ${briefData.key_points.map((p) => `<li>${escapeHtml(p)}</li>`).join("")}
    </ol>
  </div>
  ${briefData.talking_points.length > 0 ? `
  <div class="talking-points">
    <h3>Puntos para la Reunión</h3>
    <ol>
      ${briefData.talking_points.map((p) => `<li>${escapeHtml(p)}</li>`).join("")}
    </ol>
  </div>` : ""}
  ${briefData.q_and_a.length > 0 ? `
  <h2>Preguntas Frecuentes</h2>
  <dl class="qa">
    ${briefData.q_and_a.map((qa) => `
      <dt>P: ${escapeHtml(qa.question)}</dt>
      <dd>R: ${escapeHtml(qa.answer)}</dd>
    `).join("")}
  </dl>` : ""}
  <div class="footer">
    <p>Generado por Advisor Intelligence — Castillo Country Club — ${formatBriefDate()}</p>
    <p>Este documento es confidencial y está destinado exclusivamente a los miembros de la Junta Directiva.</p>
  </div>
</body>
</html>`);
    printWindow.document.close();
    printWindow.print();
    trackEvent("board_brief", "pdf_exported");
  }, [briefData]);

  /* ── Section scroll ── */
  const scrollToSection = useCallback((id: string) => {
    const el = scrollRef.current?.querySelector(`[data-section="${id}"]`);
    el?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  }, [reduced]);

  const qaToggle = useCallback(() => {
    setShowQA((v) => {
      trackEvent("board_brief", v ? "qa_collapsed" : "qa_expanded");
      return !v;
    });
  }, []);

  return (
    <motion.div
      className="glass-brief"
      initial={reduced ? undefined : { opacity: 0, y: 6 }}
      animate={reduced ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Ambient glow */}
      <span className="glass-brief__glow" />

      {/* ═══ Header — Intelligence Briefing Seal ═══ */}
      <div className="glass-brief__header">
        <div className="glass-brief__header-top">
          <div className="glass-brief__seal">
            <p className="glass-brief__seal-org">Castillo Country Club</p>
            <h2 className="glass-brief__seal-title">Briefing Ejecutivo</h2>
            <p className="glass-brief__seal-date">{formatBriefDate()}</p>
          </div>
          <div className="glass-brief__header-actions">
            <Button variant="unstyled" onClick={handlePrint} className="glass-brief__pdf-btn">
              <Printer className="w-3.5 h-3.5" />
              <span>PDF</span>
            </Button>
            {onClose && (
              <Button variant="unstyled" onClick={onClose} className="glass-brief__close-btn">
                Cerrar
              </Button>
            )}
          </div>
        </div>

        {/* Confidentiality */}
        <div className="glass-brief__confidential">
          <Shield className="w-3 h-3" />
          <span>Confidencial — Solo para Junta Directiva</span>
        </div>

        {/* Table of Contents */}
        {sections.length > 2 && (
          <div className="glass-brief__toc">
            <div className="glass-brief__toc-scroll">
              {sections.filter((s) => s.level <= 2).map((s) => (
                <Button
                  variant="unstyled"
                  key={s.id}
                  onClick={() => scrollToSection(s.id)}
                  className={cn(
                    "glass-brief__toc-item",
                    activeSection === s.id && "glass-brief__toc-item--active",
                    s.level === 1 && "glass-brief__toc-item--h1",
                  )}
                >
                  {s.title}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Progress bar */}
        {sections.length > 2 && (
          <div className="glass-brief__progress-track">
            <motion.div
              className="glass-brief__progress-fill"
              style={{ width: `${progress}%` }}
              transition={{ duration: 0.1 }}
            />
          </div>
        )}
      </div>

      {/* ═══ Scrollable Content ═══ */}
      <div ref={scrollRef} className="glass-brief__body">
        {/* ── Prose Content ── */}
        <div className="glass-brief__prose">
          {briefData.brief_md.split("\n").map((line, i) => {
            if (line.startsWith("# ")) {
              const title = line.replace(/^# /, "");
              const id = title.toLowerCase().replace(/[^a-z0-9áéíóúñü]+/g, "-").replace(/(^-|-$)/g, "");
              return (
                <h1 key={i} data-section={id} className="glass-brief__h1">{title}</h1>
              );
            }
            if (line.startsWith("## ")) {
              const title = line.replace(/^## /, "");
              const id = title.toLowerCase().replace(/[^a-z0-9áéíóúñü]+/g, "-").replace(/(^-|-$)/g, "");
              return (
                <h2 key={i} data-section={id} className="glass-brief__h2">
                  <span className="glass-brief__h2-num" />
                  {title}
                </h2>
              );
            }
            if (line.startsWith("### ")) {
              return (
                <h3 key={i} className="glass-brief__h3">{line.replace(/^### /, "")}</h3>
              );
            }
            if (line.startsWith("> ")) {
              return (
                <blockquote key={i} className="glass-brief__blockquote">
                  {line.replace(/^> /, "")}
                </blockquote>
              );
            }
            if (line.startsWith("| ")) {
              return (
                <p key={i} className="glass-brief__table-line">{line}</p>
              );
            }
            if (line.trim()) {
              /* Bold/italic inline */
              const rendered = line
                .replace(/\*\*(.+?)\*\*/g, '<strong class="glass-brief__bold">$1</strong>')
                .replace(/\*(.+?)\*/g, '<em class="glass-brief__italic">$1</em>');
              return (
                <p key={i} className="glass-brief__p" dangerouslySetInnerHTML={{ __html: rendered }} />
              );
            }
            return null;
          })}
        </div>

        {/* ── Key Points — Executive Cards ── */}
        {briefData.key_points.length > 0 && (
          <div className="glass-brief__keypoints">
            <div className="glass-brief__section-header glass-brief__section-header--gold">
              <Target className="w-4 h-4" />
              <span>Puntos Clave para la Junta</span>
            </div>
            <div className="glass-brief__keypoints-list">
              {briefData.key_points.map((point, i) => {
                const PointIcon = detectPointIcon(point);
                const isFirst = i === 0;
                return (
                  <motion.div
                    key={i}
                    className={cn("glass-brief__keypoint", isFirst && "glass-brief__keypoint--primary")}
                    initial={reduced ? undefined : { opacity: 0, x: -6 }}
                    animate={reduced ? undefined : { opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 + i * 0.06 }}
                  >
                    <div className="glass-brief__keypoint-num">
                      {isFirst ? (
                        <span className="glass-brief__keypoint-badge">{i + 1}</span>
                      ) : (
                        <span className="glass-brief__keypoint-idx">{i + 1}</span>
                      )}
                    </div>
                    <PointIcon className="w-3.5 h-3.5 flex-shrink-0 text-[var(--color-gold-400)] opacity-60" />
                    <p className="glass-brief__keypoint-text">{point}</p>
                    {isFirst && <span className="glass-brief__keypoint-priority">PRIORITARIO</span>}
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Talking Points — Meeting Prep ── */}
        {briefData.talking_points.length > 0 && (
          <div className="glass-brief__talking">
            <div className="glass-brief__section-header glass-brief__section-header--teal">
              <MessageSquare className="w-4 h-4" />
              <span>Puntos para la Reunión</span>
              <span className="glass-brief__talking-order">Orden sugerido</span>
            </div>
            <div className="glass-brief__talking-list">
              {briefData.talking_points.map((point, i) => (
                <motion.div
                  key={i}
                  className="glass-brief__talking-item"
                  initial={reduced ? undefined : { opacity: 0, x: -6 }}
                  animate={reduced ? undefined : { opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                >
                  <span className="glass-brief__talking-num">{i + 1}</span>
                  <MessageSquare className="w-3 h-3 flex-shrink-0 text-[var(--color-teal-400)] opacity-50" />
                  <p className="glass-brief__talking-text">{point}</p>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* ── Q&A — Anticipated Questions ── */}
        {briefData.q_and_a.length > 0 && (
          <div className="glass-brief__qa">
            <Button variant="unstyled" onClick={qaToggle} className="glass-brief__qa-toggle">
              <MessageSquare className="w-4 h-4 text-[var(--color-silver-400)]" />
              <span>Preguntas que probablemente harán</span>
              <span className="glass-brief__qa-count">{briefData.q_and_a.length}</span>
              <motion.div
                animate={{ rotate: showQA ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="ml-auto"
              >
                <ChevronDown className="w-4 h-4 text-[var(--color-silver-400)]" />
              </motion.div>
            </Button>

            {/* Preview when collapsed */}
            {!showQA && briefData.q_and_a[0] && (
              <p className="glass-brief__qa-preview">
                "{briefData.q_and_a[0].question}"
              </p>
            )}

            <AnimatePresence initial={false}>
              {showQA && (
                <motion.div
                  initial={reduced ? undefined : { height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={reduced ? undefined : { height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="glass-brief__qa-body"
                >
                  <div className="glass-brief__qa-list">
                    {briefData.q_and_a.map((qa, i) => (
                      <motion.div
                        key={i}
                        className="glass-brief__qa-item"
                        initial={reduced ? undefined : { opacity: 0, y: 4 }}
                        animate={reduced ? undefined : { opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                      >
                        <div className="glass-brief__qa-q">
                          <span className="glass-brief__qa-icon">P</span>
                          <p>{qa.question}</p>
                        </div>
                        <div className="glass-brief__qa-a">
                          <span className="glass-brief__qa-icon glass-brief__qa-icon--a">R</span>
                          <p>{qa.answer}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ── Footer — Confidence & Metadata ── */}
        <div className="glass-brief__footer">
          <div className="glass-brief__footer-left">
            <Shield className="w-3 h-3" />
            <span>Generado por Advisor Intelligence</span>
          </div>
          <div className="glass-brief__footer-right">
            <Clock className="w-3 h-3" />
            <span>{formatBriefDate()}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}