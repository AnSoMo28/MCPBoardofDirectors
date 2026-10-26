// src/shared/lib/highlight.tsx
// ═══════════════════════════════════════════════════════════
// highlightTerms — Text highlight helper for search results
//
// Splits text by matched terms and wraps matches in <mark>.
// Generic: caller provides className for styling.
//
// @usage
//   highlightTerms(snippet, terms, "glass-docs__highlight")
//   highlightTerms(name, filters, "glass-knowledge__highlight")
// ═══════════════════════════════════════════════════════════

import type { ReactNode } from "react";

/**
 * Highlights matching terms in text with <mark> elements.
 *
 * @param text - Raw text to search within
 * @param terms - Array of search terms to highlight
 * @param className - CSS class applied to each <mark> element
 * @returns Original text if no terms, or ReactNode with highlighted matches
 */
export function highlightTerms(
  text: string,
  terms: string[],
  className: string = "text-highlight",
): ReactNode {
  if (!terms.length) return text;

  const escaped = terms.map((t) =>
    t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  );
  const regex = new RegExp(`(${escaped.join("|")})`, "gi");
  const parts = text.split(regex);

  return parts.map((part, i) => {
    const isMatch = terms.some(
      (t) => part.toLowerCase() === t.toLowerCase(),
    );

    if (isMatch) {
      return (
        <mark key={i} className={className}>
          {part}
        </mark>
      );
    }

    return part;
  });
}