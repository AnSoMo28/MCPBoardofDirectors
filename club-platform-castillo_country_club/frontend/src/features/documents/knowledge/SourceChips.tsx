/**
 * @component SourceChips (Fase 25)
 * @namespace .glass-knowledge__source*
 * @depends KnowledgeQuery.css
 * @note Source citation chips with inline expand for snippet.
 * @import import '../KnowledgeQuery.css';
 */

import { useState } from "react";
import { FileText, BookOpen } from "lucide-react";
import {
  DOCUMENT_TYPE_CONFIG,
  type KnowledgeSource,
} from "@/features/documents/types";
import { Button } from "@/shared/components/ui/Button";

interface SourceChipsProps {
  sources: KnowledgeSource[];
}

export function SourceChips({ sources }: SourceChipsProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="glass-knowledge__sources">
      <span className="glass-knowledge__sources-label">
        <BookOpen size={12} />
        Fuentes ({sources.length})
      </span>
      <div className="glass-knowledge__source-chips">
        {sources.map((source) => {
          const config = DOCUMENT_TYPE_CONFIG[source.document_type];
          const isExpanded = expandedId === source.document_id;

          return (
            <div key={source.document_id}>
              <Button
                variant="unstyled"
                type="button"
                className="glass-knowledge__source-chip"
                onClick={() =>
                  setExpandedId(isExpanded ? null : source.document_id)
                }
                aria-expanded={isExpanded}
              >
                <FileText size={12} style={{ color: config.color }} />
                <span style={{ color: config.color }}>
                  {source.title}
                </span>
                <span className="glass-knowledge__source-chip-relevance">
                  {Math.round(source.relevance * 100)}%
                </span>
              </Button>

              {isExpanded && (
                <div className="glass-knowledge__source-expand">
                  <p className="glass-knowledge__source-expand-text">
                    {source.snippet}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}