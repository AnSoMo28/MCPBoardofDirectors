/**
 * FilterDropdown.tsx
 * src/shared/components/ui/FilterDropdown.tsx
 *
 * @level       Level 6+ Agency · Apple Production Grade · 2027
 * @role        Senior Expert UI/UX, AI/ML, Architecture
 * @namespace   .ui-fd
 * @keyframes   1 (ui-fd-panel-in) — in FilterDropdown.css
 * @depends     globals.css §1 tokens, useReducedMotion, lucide-react
 *
 * PRE-WRITE VERIFICATION:
 * [x] cn utility verified in shared/lib/utils
 * [x] useReducedMotion verified in shared/hooks/useReducedMotion
 * [x] ChevronDown, Check verified in lucide-react
 * [x] All tokens verified against globals.css §1
 * [x] --shadow-elevated does NOT exist → using --shadow-md
 *
 * ANTI-PATTERNS REMOVED:
 * [x] framer-motion → CSS-only transition lifecycle
 * [x] ~80 Tailwind utilities → BEM CSS classes (.ui-fd__*)
 * [x] transition-all → specific properties in CSS
 * [x] font-[family-name:var(--font-ui)] → CSS font-family
 * [x] text-[var(--color-gold-400)]/8 → color-mix() in CSS
 * [x] focus-visible:ring-2 → CSS outline per D10-01
 * [x] --shadow-elevated (non-existent) → --shadow-md
 * [x] style={{ backgroundColor }} → CSS custom property bridge
 * [x] Missing data-testid → added
 * [x] Missing light mode → added in CSS
 * [x] Missing reduced motion CSS → added
 * [x] Mutable props → readonly
 */

// ═══ React core ═══
import {
  useState,
  useEffect,
  useRef,
  useId,
  useCallback,
  type CSSProperties,
} from "react";

// ═══ Third-party ═══
import { ChevronDown, Check } from "lucide-react";

// ═══ Shared — values ═══
import { cn } from "@/shared/lib/utils";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import "./FilterDropdown.css";


/* ═══════════════════════════════════════════════════════════════
   §1  TYPES
   Discriminated union: single vs multi select.
   ═══════════════════════════════════════════════════════════════ */

export interface FilterOption {
  readonly value: string;
  readonly label: string;
  readonly color?: string;
}

interface FilterDropdownBaseProps {
  readonly label: string;
  readonly options: readonly FilterOption[];
  readonly clearLabel?: string;
  readonly className?: string;
}

interface SingleFilterProps extends FilterDropdownBaseProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly multiple?: false;
}

interface MultiFilterProps extends FilterDropdownBaseProps {
  readonly selected: readonly string[];
  readonly onChange: (selected: string[]) => void;
  readonly multiple: true;
}

export type FilterDropdownProps = SingleFilterProps | MultiFilterProps;


/* ═══════════════════════════════════════════════════════════════
   §2  COMPONENT — FilterDropdown
   Single/multi select with ARIA listbox pattern.
   CSS-only entrance/exit lifecycle (no framer-motion).
   Full keyboard navigation preserved from v1.
   ═══════════════════════════════════════════════════════════════ */

export function FilterDropdown(props: FilterDropdownProps) {
  const { label, options, clearLabel = "Todos", className } = props;
  const isMulti = props.multiple === true;

  /* ─── §2.1  Refs ─────────────────────────────────────────── */

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const reducedMotion = useReducedMotion();


  /* ─── §2.2  State ────────────────────────────────────────── */

  const [open, setOpen] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [focusIndex, setFocusIndex] = useState(-1);


  /* ─── §2.3  IDs ──────────────────────────────────────────── */

  const baseId = useId();
  const listboxId = `${baseId}-listbox`;


  /* ─── §2.4  Derived ──────────────────────────────────────── */

  const activeCount = isMulti ? props.selected.length : 0;
  const hasActive = isMulti ? activeCount > 0 : props.value !== "";
  const focusedOptionId = open && focusIndex >= 0
    ? `${baseId}-opt-${focusIndex}`
    : undefined;


  /* ─── §2.5  Helpers ──────────────────────────────────────── */

  const isOptionSelected = useCallback((value: string): boolean => {
    if (isMulti) return (props as MultiFilterProps).selected.includes(value);
    return (props as SingleFilterProps).value === value;
  }, [isMulti, props]);


  /* ─── §2.6  Effects — Open/Close lifecycle ───────────────── */

  useEffect(() => {
    if (open) {
      setShouldRender(true);
      if (reducedMotion) {
        setIsVisible(true);
      } else {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setIsVisible(true);
          });
        });
      }
    } else {
      setIsVisible(false);
      if (reducedMotion) {
        setShouldRender(false);
        setFocusIndex(-1);
      } else {
        const timer = setTimeout(() => {
          setShouldRender(false);
          setFocusIndex(-1);
        }, 150);
        return () => clearTimeout(timer);
      }
    }
  }, [open, reducedMotion]);


  /* ─── §2.7  Effects — Click outside + Escape ─────────────── */

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open]);


  /* ─── §2.8  Handlers ─────────────────────────────────────── */

  const handleSelect = useCallback((value: string) => {
    if (isMulti) {
      const arr = (props as MultiFilterProps).selected;
      (props as MultiFilterProps).onChange(
        arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value],
      );
    } else {
      (props as SingleFilterProps).onChange(value);
      setOpen(false);
      triggerRef.current?.focus();
    }
  }, [isMulti, props]);

  const handleClear = useCallback(() => {
    if (isMulti) {
      (props as MultiFilterProps).onChange([]);
    } else {
      (props as SingleFilterProps).onChange("");
    }
    setOpen(false);
    triggerRef.current?.focus();
  }, [isMulti, props]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const totalItems = options.length + 1; // +1 for clear option

    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        setOpen(true);
        setFocusIndex(0);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setFocusIndex((prev) => (prev < totalItems - 1 ? prev + 1 : prev));
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocusIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case "Home":
        e.preventDefault();
        setFocusIndex(0);
        break;
      case "End":
        e.preventDefault();
        setFocusIndex(totalItems - 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (focusIndex === 0) {
          handleClear();
        } else if (focusIndex > 0 && focusIndex <= options.length) {
          handleSelect(options[focusIndex - 1].value);
        }
        break;
    }
  }, [open, options, focusIndex, handleClear, handleSelect]);


  /* ─── §2.9  Display text ─────────────────────────────────── */

  const displayText = isMulti
    ? activeCount > 0
      ? `${activeCount} seleccionado${activeCount > 1 ? "s" : ""}`
      : clearLabel
    : (props as SingleFilterProps).value
      ? options.find((o) => o.value === (props as SingleFilterProps).value)?.label ?? clearLabel
      : clearLabel;


  /* ─── §2.10  Render ──────────────────────────────────────── */

  if (options.length === 0) return null;

  return (
    <div
      ref={containerRef}
      data-testid="ui-fd"
      className={cn("ui-fd", className)}
    >
      {/* Trigger button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listboxId : undefined}
        aria-activedescendant={focusedOptionId}
        className={cn(
          "ui-fd__trigger",
          hasActive && "ui-fd__trigger--active",
          open && "ui-fd__trigger--open",
        )}
      >
        <span className="ui-fd__label">{label}</span>
        <span className="ui-fd__value">{displayText}</span>
        {isMulti && activeCount > 0 && (
          <span className="ui-fd__count">{activeCount}</span>
        )}
        <ChevronDown size={14} className="ui-fd__chevron" aria-hidden="true" />
      </button>

      {/* Dropdown panel */}
      {shouldRender && (
        <div
          className={cn(
            "ui-fd__panel",
            isVisible && "ui-fd__panel--visible",
          )}
        >
          <ul
            ref={listRef}
            id={listboxId}
            role="listbox"
            aria-label={label}
            aria-multiselectable={isMulti || undefined}
            className="ui-fd__list"
          >
            {/* Clear / All option */}
            <li
              id={`${baseId}-opt-0`}
              role="option"
              aria-selected={!hasActive}
              onClick={handleClear}
              onMouseEnter={() => setFocusIndex(0)}
              className={cn(
                "ui-fd__option",
                !hasActive && "ui-fd__option--selected",
                focusIndex === 0 && "ui-fd__option--focused",
              )}
            >
              {isMulti && (
                <span
                  className={cn(
                    "ui-fd__checkbox",
                    !hasActive && "ui-fd__checkbox--checked",
                  )}
                  aria-hidden="true"
                >
                  {!hasActive && <Check size={12} />}
                </span>
              )}
              {clearLabel}
            </li>

            {/* Options */}
            {options.map((opt, i) => {
              const selected = isOptionSelected(opt.value);
              return (
                <li
                  key={opt.value}
                  id={`${baseId}-opt-${i + 1}`}
                  role="option"
                  aria-selected={selected}
                  onClick={() => handleSelect(opt.value)}
                  onMouseEnter={() => setFocusIndex(i + 1)}
                  className={cn(
                    "ui-fd__option",
                    selected && "ui-fd__option--selected",
                    focusIndex === i + 1 && "ui-fd__option--focused",
                  )}
                >
                  {isMulti && (
                    <span
                      className={cn(
                        "ui-fd__checkbox",
                        selected && "ui-fd__checkbox--checked",
                      )}
                      aria-hidden="true"
                    >
                      {selected && <Check size={12} />}
                    </span>
                  )}
                  {opt.color && (
                    <span
                      className="ui-fd__opt-dot"
                      style={{ "--fd-dot-color": opt.color } as CSSProperties}
                      aria-hidden="true"
                    />
                  )}
                  <span className="ui-fd__opt-label">{opt.label}</span>
                  {!isMulti && selected && (
                    <Check size={14} className="ui-fd__opt-check" aria-hidden="true" />
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}