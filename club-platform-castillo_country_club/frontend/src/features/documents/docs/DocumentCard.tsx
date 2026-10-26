import { Clock, Eye, Download, Tag } from "lucide-react";
import { Badge } from "@/shared/components/ui";
import { Button } from "@/shared/components/ui/Button";
import { cn, timeAgo } from "@/shared/lib/utils";
import {
  DOCUMENT_TYPE_CONFIG,
  DOCUMENT_STATUS_CONFIG,
  formatFileSize,
  type DocumentSearchResult,
} from "@/features/documents/types";
import { TYPE_ICONS } from "./TypeChip";
import { highlightTerms } from "@/shared/lib/highlight";

/* ═══════════════════════════════════════
   Component
   ═══════════════════════════════════════ */

interface DocumentCardProps {
  result: DocumentSearchResult;
  index: number;
  reducedMotion: boolean;
}

export function DocumentCard({
  result,
  index,
  reducedMotion,
}: DocumentCardProps) {
  const { document: doc, relevance_score, snippet, highlighted_terms } =
    result;
  const config = DOCUMENT_TYPE_CONFIG[doc.type];
  const statusConfig = DOCUMENT_STATUS_CONFIG[doc.status];
  const Icon = TYPE_ICONS[doc.type] ?? (() => null);
  const delay = Math.min(index, 11) * 40;

  return (
    <div
      className={cn(
        "glass-docs__card",
        reducedMotion ? "" : "glass-docs__card-enter",
      )}
      style={
        {
          "--card-type-color": config.color,
          animationDelay: `${delay}ms`,
        } as React.CSSProperties
      }
      tabIndex={0}
    >
      <div className="glass-docs__card-body">
        {/* Header */}
        <div className="glass-docs__card-header">
          <div
            className="glass-docs__card-icon-wrap"
            style={{ backgroundColor: config.bgColor }}
          >
            <Icon size={20} style={{ color: config.color }} />
          </div>
          <Badge variant={statusConfig.badgeVariant} size="sm">
            {statusConfig.label}
          </Badge>
        </div>

        {/* Type */}
        <span
          className="glass-docs__card-type"
          style={{ color: config.color }}
        >
          {config.label}
        </span>

        {/* Title */}
        <h3 className="glass-docs__card-title">{doc.title}</h3>

        {/* Snippet */}
        <p className="glass-docs__card-snippet">
          {highlightTerms(snippet, highlighted_terms, "glass-docs__highlight")}
        </p>

        {/* Relevance */}
        <div className="glass-docs__card-relevance">
          <div className="glass-docs__card-relevance-header">
            <span className="glass-docs__card-relevance-label">
              Relevancia
            </span>
            <span className="glass-docs__card-relevance-value">
              {Math.round(relevance_score * 100)}%
            </span>
          </div>
          <div className="glass-docs__card-relevance-track">
            <div
              className="glass-docs__card-relevance-fill"
              style={
                {
                  backgroundColor: config.color,
                  "--fill-width": `${relevance_score * 100}%`,
                  "--fill-delay": `${delay + 150}ms`,
                } as React.CSSProperties
              }
            />
          </div>
        </div>

        {/* Tags */}
        {doc.tags.length > 0 && (
          <div className="glass-docs__card-tags">
            {doc.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="glass-docs__card-tag">
                <Tag size={10} />
                {tag}
              </span>
            ))}
            {doc.tags.length > 3 && (
              <span className="glass-docs__card-tag-more">
                +{doc.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="glass-docs__card-footer">
          <div className="glass-docs__card-meta">
            <span className="glass-docs__card-meta-item">
              <Clock size={12} />
              {timeAgo(doc.updated_at)}
            </span>
            {doc.file_size_bytes != null && (
              <span>{formatFileSize(doc.file_size_bytes)}</span>
            )}
          </div>
          <div className="glass-docs__card-actions">
            <Button
              variant="ghost"
              size="sm"
              icon={<Eye size={14} />}
              aria-label={`Ver ${doc.title}`}
            >
              Ver
            </Button>
            {doc.file_url && (
              <Button
                variant="ghost"
                size="sm"
                icon={<Download size={14} />}
                aria-label={`Descargar ${doc.title}`}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}