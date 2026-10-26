// shared/components/layout/DashboardLayout.tsx
// Fase 21 — Silver Tide Glass Layout Foundation
// Ambient Vignette · Route Transitions · Scroll-Aware Sidebar · Focus Mode
// ═════════════════════════════════════════════════════════════════════════

import { Suspense, useState, useEffect, useRef } from "react";
import { Outlet, Navigate, useLocation } from "react-router";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import { RouteSkeleton } from "./RouteSkeleton";
import { useScrollToTop } from "@/shared/hooks/useScrollToTop";
import { useKeyboardNav } from "@/shared/hooks/useKeyboardNav";
import { useRouteFocus } from "@/shared/hooks/useRouteFocus";
import { KeyboardHelpModal } from "./KeyboardHelpModal";
import { useAuthStore } from "@/stores/auth.store";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { MobileNav } from "./MobileNav";
import { WelcomeModal } from "./WelcomeModal";
import { TopLoadingBar } from "./TopLoadingBar";
import { SkipNavigation } from "./SkipNavigation";
import { CommandPalette } from "@/shared/components/ui/CommandPalette";
import { useSidebarStore } from "@/stores/sidebar.store";
import { cn } from "@/shared/lib/utils";
import WebGLBackground from "./WebGLBackground";
import CursorEffect from "./CursorEffect";
import './DashboardLayout.css';
/* ── Page transition choreography ── */
const pageVariants: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, scale: 0.98 },
};

const pageTransition = {
  duration: 0.3,
  ease: [0.25, 0.1, 0.25, 1] as const,
};

export function DashboardLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isCollapsed = useSidebarStore((s) => s.isCollapsed);
  const toggleCollapse = useSidebarStore((s) => s.toggleCollapse);
  const location = useLocation();

  useScrollToTop();
  const { helpOpen, closeHelp } = useKeyboardNav();
  useRouteFocus();

  /* ════════════════════════════════
     Focus Mode (Cmd+. / Ctrl+.)
     ════════════════════════════════ */
  const [focusMode, setFocusMode] = useState(false);
  const focusModeRef = useRef(false);
  const focusModeDidCollapse = useRef(false);

  /* Keep ref in sync for scroll handler */
  useEffect(() => {
    focusModeRef.current = focusMode;
  }, [focusMode]);

  /* Keyboard shortcut */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === ".") {
        e.preventDefault();
        setFocusMode((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  /* Collapse/expand sidebar with focus mode */
  useEffect(() => {
    const store = useSidebarStore.getState();
    if (focusMode && !store.isCollapsed) {
      store.toggleCollapse();
      focusModeDidCollapse.current = true;
    } else if (!focusMode && focusModeDidCollapse.current) {
      focusModeDidCollapse.current = false;
      store.toggleCollapse();
    }
  }, [focusMode]);

  /* ════════════════════════════════
     Scroll-Aware Sidebar
     ════════════════════════════════ */
  const scrollAutoCollapsed = useRef(false);
  const [showReExpand, setShowReExpand] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;

    const handleScroll = () => {
      /* Skip during focus mode */
      if (focusModeRef.current) return;

      const store = useSidebarStore.getState();
      const pastThreshold = main.scrollTop > 100;
      const nearTop = main.scrollTop < 20;

      if (pastThreshold && !scrollAutoCollapsed.current && !store.isCollapsed) {
        scrollAutoCollapsed.current = true;
        setShowReExpand(true);
        store.toggleCollapse();
      } else if (nearTop && scrollAutoCollapsed.current) {
        scrollAutoCollapsed.current = false;
        setShowReExpand(false);
        store.toggleCollapse();
      }
    };

    main.addEventListener("scroll", handleScroll, { passive: true });
    return () => main.removeEventListener("scroll", handleScroll);
  }, []);

  /* ── Auth guard ── */
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="glass-layout-shell flex h-screen overflow-hidden">
      {/* ── Top loading bar ── */}
      <TopLoadingBar />

      {/* ── Accessibility: skip navigation ── */}
      <SkipNavigation />

      {/* ── z-0: WebGL liquid silver background ── */}
      <WebGLBackground />

      {/* ── z-3: Ambient health vignette ── */}
      <div className="ambient-vignette" aria-hidden="true" />

      {/* ── z-4: Vignette — cinematic depth ── */}
      <div className="vignette" aria-hidden="true" />

      {/* ── z-5: Noise grain — film texture ── */}
      <div className="noise-overlay" aria-hidden="true" />

      {/* ── z-10: Content layer ── */}
      <div className="relative z-10 flex w-full h-full">
        <Sidebar />

        <div
          className={cn(
            "flex flex-col flex-1 min-w-0 transition-all duration-300",
            isCollapsed ? "lg:ml-[72px]" : "lg:ml-[280px]",
            focusMode && "lg:!ml-[72px]",
          )}
        >
          <Header />

          <main
            ref={mainRef}
            id="main-content"
            className={cn(
              "flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-20 lg:pb-8",
              focusMode && "lg:p-10 lg:pb-10",
            )}
          >
            <div className="glass-content-canvas">
              <AnimatePresence mode="wait">
                <motion.div
                  key={location.pathname}
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={pageTransition}
                >
                  <Suspense fallback={<RouteSkeleton />}>
                    <Outlet />
                  </Suspense>
                </motion.div>
              </AnimatePresence>
            </div>
          </main>
        </div>
      </div>

      {/* ── Scroll re-expand indicator ── */}
      <AnimatePresence>
        {showReExpand && !focusMode && (
          <motion.button
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.2 }}
            onClick={() => {
              scrollAutoCollapsed.current = false;
              setShowReExpand(false);
              toggleCollapse();
            }}
            className="fixed left-2 top-1/2 -translate-y-1/2 z-50 w-6 h-12 rounded-r-lg bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 transition-colors flex items-center justify-center"
            aria-label="Re-expand sidebar"
          >
            <span className="text-white/40 text-xs select-none">›</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Focus mode indicator ── */}
      <AnimatePresence>
        {focusMode && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="fixed bottom-20 lg:bottom-4 left-1/2 -translate-x-1/2 z-50 glass-toast px-4 py-2 rounded-full"
          >
            <span className="text-xs text-white/50 font-mono">
              Focus Mode · <kbd>⌘.</kbd> to exit
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Keyboard help modal ── */}
      <KeyboardHelpModal isOpen={helpOpen} onClose={closeHelp} />

      {/* ── Welcome modal (first login) ── */}
      <WelcomeModal />

      {/* ── Mobile bottom nav ── */}
      <MobileNav />

      {/* ── z-9999: Custom cursor (desktop only) ── */}
      <CursorEffect />

      {/* ── Global command palette (Cmd+K) ── */}
      <CommandPalette />
    </div>
  );
}