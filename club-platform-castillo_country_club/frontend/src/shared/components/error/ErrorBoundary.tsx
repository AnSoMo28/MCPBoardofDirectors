// src/shared/components/error/ErrorBoundary.tsx
// ═══════════════════════════════════════════════════════════
// CASTILLO — Error Boundary
//
// Catches render errors at any level. Shows a recovery UI
// instead of a blank white screen.
// ═══════════════════════════════════════════════════════════

import { Component, type ReactNode, type ErrorInfo } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import './ErrorBoundary.css';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  level?: "global" | "route" | "section";
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[ErrorBoundary:${this.props.level || "global"}]`, error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleHome = () => {
    window.location.href = "/admin/dashboard";
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { level = "global" } = this.props;
      const isGlobal = level === "global";

      return (
        <div
          className={`
            flex flex-col items-center justify-center text-center
            ${isGlobal ? "min-h-screen" : "min-h-[400px]"}
            bg-[var(--color-abyss)] px-6
          `}
        >
          <div
            className="error-boundary w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
            style={{
              backgroundColor: "color-mix(in srgb, var(--color-rose-400) 12%, transparent)",
            }}
          >
            <AlertTriangle className="w-8 h-8 text-[var(--color-rose-400)]" />
          </div>

          <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--color-silver-100)] mb-2">
            {isGlobal
              ? "Algo salió mal"
              : "Error en esta sección"}
          </h2>

          <p className="text-sm text-[var(--color-silver-400)] font-[family-name:var(--font-ui)] max-w-md mb-8 leading-relaxed">
            {isGlobal
              ? "Ocurrió un error inesperado. Podés intentar recargar la página o volver al inicio."
              : "Esta sección encontró un error. El resto de la aplicación debería funcionar normalmente."}
          </p>

          {/* Error details (dev only) */}
          {this.state.error && (
            <details className="max-w-lg mb-8 text-left">
              <summary className="text-xs text-[var(--color-silver-500)] font-[family-name:var(--font-mono)] cursor-pointer hover:text-[var(--color-silver-400)] transition-colors">
                Detalles técnicos
              </summary>
              <pre className="mt-2 p-4 rounded-xl bg-[var(--color-surface-2)] border border-white/[0.06] text-xs text-[var(--color-rose-300)] font-[family-name:var(--font-mono)] overflow-auto max-h-[200px] whitespace-pre-wrap break-all">
                {this.state.error.message}
                {"\n\n"}
                {this.state.error.stack}
              </pre>
            </details>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius-md)] border border-white/[0.08] text-sm font-medium font-[family-name:var(--font-ui)] text-[var(--color-silver-300)] hover:border-white/[0.14] hover:text-[var(--color-silver-200)] transition-all min-h-[44px]"
            >
              <RefreshCw className="w-4 h-4" />
              Reintentar
            </button>

            {isGlobal && (
              <button
                onClick={this.handleReload}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius-md)] border border-white/[0.08] text-sm font-medium font-[family-name:var(--font-ui)] text-[var(--color-silver-300)] hover:border-white/[0.14] hover:text-[var(--color-silver-200)] transition-all min-h-[44px]"
              >
                Recargar página
              </button>
            )}

            <button
              onClick={this.handleHome}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius-md)] bg-[var(--color-gold-400)] text-[var(--color-abyss)] text-sm font-bold font-[family-name:var(--font-ui)] hover:brightness-110 active:scale-[0.98] transition-all min-h-[44px]"
            >
              <Home className="w-4 h-4" />
              Ir al inicio
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
