import { RouterProvider } from "react-router";
import { Providers } from "@/app/providers";
import { router } from "@/app/router";
import { useThemeStore } from "@/stores/theme.store";
import { useAuthStore } from "@/stores/auth.store";
import { ToastContainer } from "@/shared/components/ui";
import { useEffect } from "react";
import { useWebVitals } from "@/shared/hooks/useWebVitals";
import { AIChatWidget } from "@/shared/components/chat/AIChatWidget";

export function App() {
  const theme = useThemeStore((s) => s.theme);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const devBypass = useAuthStore((s) => s.devBypass);
  useWebVitals();

 

  // Dev-only: auto-login bypass (never runs in production)
  useEffect(() => {
    if (!isAuthenticated && import.meta.env.DEV) {
      devBypass();
    }
  }, []);
  
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("transitioning");
    root.classList.toggle("light", theme === "light");
    const timer = setTimeout(() => {
      root.classList.remove("transitioning");
    }, 300);
    return () => clearTimeout(timer);
  }, [theme]);

  return (
    <Providers>
      <RouterProvider router={router} />
      <ToastContainer />
      {isAuthenticated && <AIChatWidget />}
    </Providers>
  );
}
