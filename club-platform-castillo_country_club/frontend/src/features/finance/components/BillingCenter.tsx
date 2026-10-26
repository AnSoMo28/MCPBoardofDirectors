// ═══════════════════════════════════════════════════════════
// Castillo Country Club — Billing Center
// Fase 19i REWRITE
//
// 6 innovations:
//   1. Glass Billing Surface (all containers → glass)
//   2. Account Health Gauge (semi-circular payment health)
//   3. KPI Vital Signs (animated counters + ambient glow)
//   4. Overdue Urgency (pulsing border)
//   5. Invoice Item Glass (dynamic items glass treatment)
//   6. Tab Glass Pills (billing tabs → glass)
//
// Rules: #1 tokens, #8 formatCurrency, #11 focus-visible,
//   #12 touch, #15 toast, #17 Button, #18 reducedMotion,
//   #20 breakpoint, #21 responsive, #22 cn
// ═══════════════════════════════════════════════════════════

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard, FileText, Plus, Trash2, AlertTriangle,
  Check, Search, RefreshCw,
} from "lucide-react";
import { Button, Skeleton, showToast } from "@/shared/components/ui";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { useMCPQuery, useMCPMutation } from "@/shared/hooks/useMCPQuery";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { formatCurrency, cn } from "@/shared/lib/utils";
import type {
  FinanceInvoiceCreateResponse,
  FinancePaymentProcessResponse,
  FinanceAccountStatusResponse,
  InvoiceData,
} from "@/shared/mocks/contracts";
import {
  INVOICE_STATUS_CONFIG,
  PAYMENT_METHOD_CONFIG,
} from "../types";
import './BillingCenter.css';

/* ══════════════════════════════════════════════════════════
   Constants & Helpers
   ══════════════════════════════════════════════════════════ */

const FAMILY_PRESETS = [
  { id: "fam-001", name: "Castillo Montero", tier: "VIP" },
  { id: "fam-002", name: "Quesada Vargas", tier: "Premium" },
  { id: "fam-003", name: "Solano Brenes", tier: "Básico" },
];

type BillingView = "account" | "new-invoice" | "new-payment";

const VIEW_TABS: Array<{ id: BillingView; label: string; icon: typeof FileText }> = [
  { id: "account", label: "Cuenta", icon: FileText },
  { id: "new-invoice", label: "Nueva Factura", icon: Plus },
  { id: "new-payment", label: "Registrar Pago", icon: CreditCard },
];

function getInvStatusConfig(status: string) {
  if (status === "draft")
    return { label: "Borrador", color: "var(--color-silver-500)", bgColor: "color-mix(in srgb, var(--color-silver-500) 10%, transparent)" };
  if (status === "sent")
    return { label: "Enviada", color: "var(--color-teal-400)", bgColor: "color-mix(in srgb, var(--color-teal-400) 10%, transparent)" };
  return INVOICE_STATUS_CONFIG[status] ?? INVOICE_STATUS_CONFIG.pending;
}

function fmtDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-CR", { day: "numeric", month: "short", year: "numeric" });
}

/* ══════════════════════════════════════════════════════════
   Hooks
   ══════════════════════════════════════════════════════════ */

function useMotion() {
  const reduced = useReducedMotion();
  return {
    container: reduced
      ? undefined
      : ({ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.06 } } } as const),
    item: reduced
      ? undefined
      : ({ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const } } } as const),
  };
}

function useAnimatedCounter(
  target: number,
  duration = 600,
  reduced = false,
): number {
  const [value, setValue] = useState(0);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (reduced || !Number.isFinite(target)) {
      setValue(target);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(target * eased);
      if (progress < 1) frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration, reduced]);

  return value;
}

/* ══════════════════════════════════════════════════════════
   Account Health Gauge (Propuesta 2)
   ══════════════════════════════════════════════════════════ */

function AccountHealthGauge({
  totalInvoiced,
  totalPaid,
}: {
  totalInvoiced: number;
  totalPaid: number;
}) {
  const healthPct = totalInvoiced > 0 ? (totalPaid / totalInvoiced) * 100 : 100;
  const color = healthPct >= 90 ? "var(--color-emerald-400)" : healthPct >= 70 ? "var(--color-amber-400)" : "var(--color-rose-400)";
  const label = healthPct >= 90 ? "Saludable" : healthPct >= 70 ? "Regular" : "Crítico";

  // Semi-circle arc
  const r = 44;
  const cx = 52;
  const cy = 50;
  const arcLength = Math.PI * r;
  const fillLength = (Math.min(healthPct, 100) / 100) * arcLength;

  return (
    <div className="glass-billing-gauge" role="meter" aria-valuenow={Math.round(healthPct)} aria-valuemin={0} aria-valuemax={100}>
      <svg width="104" height="58" viewBox="0 0 104 58" aria-hidden="true">
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${fillLength} ${arcLength - fillLength}`}
          style={{ transition: "stroke-dasharray 0.6s cubic-bezier(0.33,1,0.68,1)" }}
        />
        <text
          x={cx} y={cy - 6}
          textAnchor="middle"
          fill="var(--color-silver-100)"
          fontSize="16"
          fontWeight="bold"
          fontFamily="var(--font-display)"
        >
          {Math.round(healthPct)}%
        </text>
        <text
          x={cx} y={cy + 8}
          textAnchor="middle"
          fill={color}
          fontSize="8"
          fontWeight="600"
          fontFamily="var(--font-ui)"
        >
          {label.toUpperCase()}
        </text>
      </svg>
    </div>
  );
}


/* ══════════════════════════════════════════════════════════
   Main Component
   ══════════════════════════════════════════════════════════ */

export default function BillingCenter() {
  const motionV = useMotion();
  const reduced = useReducedMotion();

  // ── State ──

  const [familyId, setFamilyId] = useState("");
  const [activeView, setActiveView] = useState<BillingView>("account");

  // Invoice form
  const [invItems, setInvItems] = useState([{ description: "", quantity: 1, unit_price: 0 }]);
  const [taxRate, setTaxRate] = useState(13);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  });
  const [invNotes, setInvNotes] = useState("");

  // Payment form
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("transfer");
  const [payRef, setPayRef] = useState("");
  const [payNotes, setPayNotes] = useState("");

  // ── Reset helpers ──

  const resetInvoiceForm = useCallback(() => {
    setInvItems([{ description: "", quantity: 1, unit_price: 0 }]);
    setTaxRate(13);
    const d = new Date();
    d.setDate(d.getDate() + 30);
    setDueDate(d.toISOString().split("T")[0]);
    setInvNotes("");
  }, []);

  const resetPaymentForm = useCallback(() => {
    setPayAmount("");
    setPayMethod("transfer");
    setPayRef("");
    setPayNotes("");
  }, []);

  // ── Mutations ──

  const invoiceMut = useMCPMutation<FinanceInvoiceCreateResponse>(
    "finance",
    "finance_invoice_create",
    {
      onSuccess: (data) => {
        showToast({ type: "success", message: data.message ?? "Factura creada. Pendiente de aprobación." });
        resetInvoiceForm();
        setActiveView("account");
        accountQ.refetch();
      },
      onError: (err) => {
        showToast({ type: "error", message: err instanceof Error ? err.message : "Error al crear factura" });
      },
    },
  );

  const paymentMut = useMCPMutation<FinancePaymentProcessResponse>(
    "finance",
    "finance_payment_process",
    {
      onSuccess: (data) => {
        showToast({ type: "success", message: data.message ?? "Pago registrado. Pendiente de aprobación." });
        resetPaymentForm();
        setActiveView("account");
        accountQ.refetch();
      },
      onError: (err) => {
        showToast({ type: "error", message: err instanceof Error ? err.message : "Error al procesar pago" });
      },
    },
  );

  // ── Queries ──

  const accountQ = useMCPQuery<FinanceAccountStatusResponse>(
    "finance",
    "finance_account_status",
    { family_id: familyId },
    { enabled: !!familyId, staleTime: 30_000 },
  );

  const account = accountQ.data?.data;

  // ── Derived ──

  const subtotal = invItems.reduce((s, it) => s + it.quantity * it.unit_price, 0);
  const tax = Math.round(subtotal * taxRate / 100);
  const total = subtotal + tax;

  // Animated counters for KPIs (Propuesta 3)
  const animBalance = useAnimatedCounter(account?.balance_due ?? 0, 600, reduced);
  const animInvoiced = useAnimatedCounter(account?.total_invoiced ?? 0, 600, reduced);
  const animPaid = useAnimatedCounter(account?.total_paid ?? 0, 600, reduced);
  const animOverdue = useAnimatedCounter(account?.overdue_amount ?? 0, 600, reduced);

  // ── Invoice item CRUD ──

  const addItem = useCallback(() => {
    setInvItems((prev) => [...prev, { description: "", quantity: 1, unit_price: 0 }]);
  }, []);

  const removeItem = useCallback((idx: number) => {
    setInvItems((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const updateItem = useCallback((idx: number, field: string, value: string | number) => {
    setInvItems((prev) =>
      prev.map((item, i) =>
        i === idx ? { ...item, [field]: value } : item,
      ),
    );
  }, []);

  // ── Submit handlers ──

  const handleInvoiceSubmit = useCallback(() => {
    const valid = invItems.filter((it) => it.description.trim() && it.unit_price > 0);
    if (valid.length === 0) {
      showToast({ type: "error", message: "Agregá al menos un ítem con descripción y precio" });
      return;
    }
    if (!familyId) {
      showToast({ type: "error", message: "Seleccioná una familia primero" });
      return;
    }
    invoiceMut.mutate({
      family_id: familyId,
      items: valid.map((it) => ({
        description: it.description,
        quantity: it.quantity,
        unit_price: it.unit_price,
        total: it.quantity * it.unit_price,
      })),
      due_date: dueDate,
      notes: invNotes,
      tax_rate: taxRate,
    });
  }, [invItems, familyId, dueDate, invNotes, taxRate, invoiceMut]);

  const handlePaymentSubmit = useCallback(() => {
    const amountNum = parseFloat(payAmount);
    if (!amountNum || amountNum <= 0) {
      showToast({ type: "error", message: "Ingresá un monto válido mayor a cero" });
      return;
    }
    if (!familyId) {
      showToast({ type: "error", message: "Seleccioná una familia primero" });
      return;
    }
    paymentMut.mutate({
      family_id: familyId,
      amount: amountNum,
      method: payMethod,
      reference: payRef,
      notes: payNotes,
      date: new Date().toISOString().split("T")[0],
    });
  }, [payAmount, familyId, payMethod, payRef, payNotes, paymentMut]);

  // ── Render ──

  return (
    <div className="space-y-6">

      {/* ═══════ Family Selector — GLASS (Propuesta 1) ═══════ */}
      <div className="glass-billing-panel p-5">
        <div className="relative z-[1]">
          <div className="flex items-center gap-2 mb-3">
            <Search size={16} className="text-[var(--color-silver-400)]" />
            <h3 className="text-sm font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">
              Seleccionar familia
            </h3>
          </div>

          <div className="flex flex-wrap gap-2 mb-3">
            {FAMILY_PRESETS.map((fam) => (
              <button
                key={fam.id}
                type="button"
                onClick={() => setFamilyId(fam.id)}
                className={cn(
                  "glass-billing-preset",
                  familyId === fam.id && "glass-billing-preset--active",
                )}
                aria-pressed={familyId === fam.id}
              >
                {fam.name}
                <span className="text-[10px] opacity-60">({fam.tier})</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={familyId}
              onChange={(e) => setFamilyId(e.target.value)}
              placeholder="O escribí un ID de familia (ej: fam-001)"
              className={cn(
                "flex-1 rounded-lg border px-3 py-2 text-sm font-[family-name:var(--font-ui)]",
                "bg-[var(--color-surface-1)] text-[var(--color-silver-200)] border-white/[0.06]",
                "placeholder:text-[var(--color-silver-500)]",
                "focus-visible:outline-2 focus-visible:outline-[var(--color-gold-400)]",
                "min-h-[44px]",
              )}
              aria-label="ID de familia"
            />
            {familyId && (
              <Button variant="ghost" onClick={() => setFamilyId("")} className="flex-shrink-0">
                Limpiar
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ═══════ Account Content ═══════ */}
      {!familyId ? (
        <EmptyState
          icon={<CreditCard size={48} />}
          title="Seleccioná una familia"
          description="Elegí una familia del listado o ingresá un ID para ver su estado de cuenta y gestionar facturación."
        />
      ) : accountQ.isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      ) : accountQ.error ? (
        <div className="glass-billing-panel p-6 text-center">
          <p className="relative z-[1] text-sm text-[var(--color-silver-400)]">Error al cargar cuenta.</p>
          <Button variant="secondary" onClick={() => accountQ.refetch()} className="mt-3" icon={<RefreshCw className="w-4 h-4" />}>
            Reintentar
          </Button>
        </div>
      ) : account ? (
        <motion.div variants={motionV.container} initial={false} animate="visible" className="space-y-6">

          {/* ═══════ Summary + Health Gauge — GLASS KPIs (Propuestas 1+2+3) ═══════ */}
          <motion.div variants={motionV.item}>
            <div className="glass-billing-panel p-5">
              <div className="relative z-[1]">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-display)]">
                      Estado de Cuenta
                    </h3>
                    <p className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-ui)]">
                      {account.family_name || familyId}
                    </p>
                  </div>
                  <AccountHealthGauge
                    totalInvoiced={account.total_invoiced}
                    totalPaid={account.total_paid}
                  />
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    {
                      label: "Saldo Pendiente",
                      value: formatCurrency(animBalance),
                      raw: account.balance_due,
                      color: account.balance_due > 0 ? "var(--color-rose-400)" : "var(--color-emerald-400)",
                      icon: <CreditCard size={14} />,
                      glow: account.balance_due > 0 ? "glass-billing-kpi--danger" : "glass-billing-kpi--positive",
                    },
                    {
                      label: "Total Facturado",
                      value: formatCurrency(animInvoiced),
                      raw: account.total_invoiced,
                      color: "var(--color-silver-200)",
                      icon: <FileText size={14} />,
                      glow: "",
                    },
                    {
                      label: "Total Pagado",
                      value: formatCurrency(animPaid),
                      raw: account.total_paid,
                      color: "var(--color-emerald-400)",
                      icon: <Check size={14} />,
                      glow: "glass-billing-kpi--positive",
                    },
                    {
                      label: "Vencido",
                      value: formatCurrency(animOverdue),
                      raw: account.overdue_amount,
                      color: account.overdue_count > 0 ? "var(--color-rose-400)" : "var(--color-silver-400)",
                      icon: <AlertTriangle size={14} />,
                      glow: account.overdue_count > 0 ? "glass-billing-kpi--danger" : "",
                    },
                  ].map((kpi) => (
                    <div key={kpi.label} className={cn("glass-billing-kpi", kpi.glow)}>
                      <div className="relative z-[1]">
                        <div className="flex items-center gap-2 mb-1">
                          <span style={{ color: kpi.color }}>{kpi.icon}</span>
                          <p className="text-[10px] font-[family-name:var(--font-ui)] text-[var(--color-silver-400)]">{kpi.label}</p>
                        </div>
                        <p className="text-xl font-bold font-[family-name:var(--font-display)]" style={{ color: kpi.color }}>
                          {kpi.value}
                        </p>
                        {kpi.label === "Vencido" && account.overdue_count > 0 && (
                          <p className="text-[10px] font-[family-name:var(--font-mono)] mt-1" style={{ color: "var(--color-rose-400)" }}>
                            {account.overdue_count} factura{account.overdue_count > 1 ? "s" : ""}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* ═══════ Overdue Alert — GLASS PULSE (Propuesta 4) ═══════ */}
          {account.overdue_count > 0 && (
            <motion.div variants={motionV.item}>
              <div className="glass-billing-overdue">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={16} className="flex-shrink-0 mt-0.5 text-[var(--color-rose-400)]" />
                  <div>
                    <p className="text-sm font-medium text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">
                      {account.overdue_count} factura{account.overdue_count > 1 ? "s" : ""} vencida{account.overdue_count > 1 ? "s" : ""}
                    </p>
                    <p className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-body)] mt-0.5">
                      Total vencido: {formatCurrency(account.overdue_amount)}. Considerá contactar a la familia para gestión de cobranza.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ═══════ View Tabs — GLASS PILLS (Propuesta 6) ═══════ */}
          <motion.div variants={motionV.item}>
            <div className="glass-billing-tabs" role="tablist" aria-label="Vistas de facturación">
              {VIEW_TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={activeView === tab.id}
                    onClick={() => setActiveView(tab.id)}
                    className={cn(
                      "glass-billing-tab focus-visible:outline-2 focus-visible:outline-[var(--color-gold-400)]",
                      activeView === tab.id && "glass-billing-tab--active",
                    )}
                  >
                    <Icon size={14} />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>

          {/* ═══════ View Content ═══════ */}
          <AnimatePresence mode="wait">
            {/* ── View: Account (Invoice list) ── */}
            {activeView === "account" && (
              <motion.div
                key="account"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
              >
                {account.invoices.length === 0 ? (
                  <EmptyState
                    icon={<FileText size={40} />}
                    title="Sin facturas"
                    description="Esta familia no tiene facturas registradas."
                  />
                ) : (
                  <div className="space-y-3">
                    {account.invoices.map((inv: InvoiceData) => {
                      const cfg = getInvStatusConfig(inv.status);
                      return (
                        <div key={inv.id} className="glass-billing-invoice">
                          <div className="relative z-[1] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-medium font-[family-name:var(--font-ui)] text-[var(--color-silver-200)]">
                                  #{inv.id.slice(-6).toUpperCase()}
                                </p>
                                <span
                                  className="px-2.5 py-0.5 rounded-full text-xs font-medium font-[family-name:var(--font-ui)]"
                                  style={{ color: cfg.color, backgroundColor: cfg.bgColor }}
                                >
                                  {cfg.label}
                                </span>
                              </div>
                              <p className="text-sm mt-1 font-[family-name:var(--font-ui)] text-[var(--color-silver-400)]">
                                Vence: {fmtDate(inv.due_date)}
                                {inv.paid_date && ` · Pagada: ${fmtDate(inv.paid_date)}`}
                              </p>
                              {inv.notes && (
                                <p className="text-xs mt-1 text-[var(--color-silver-500)] font-[family-name:var(--font-body)]">
                                  {inv.notes}
                                </p>
                              )}
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="font-bold font-[family-name:var(--font-mono)] text-[var(--color-silver-200)]">
                                {formatCurrency(inv.total)}
                              </p>
                              <p className="text-xs text-[var(--color-silver-500)] font-[family-name:var(--font-mono)]">
                                Sub: {formatCurrency(inv.subtotal)} + IVA: {formatCurrency(inv.tax)}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {/* ── View: New Invoice — GLASS ITEMS (Propuesta 5) ── */}
            {activeView === "new-invoice" && (
              <motion.div
                key="new-invoice"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
              >
                <div className="glass-billing-panel p-5">
                  <div className="relative z-[1]">
                    <div className="mb-4">
                      <h3 className="text-sm font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-display)]">Nueva Factura</h3>
                      <p className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-ui)]">
                        Familia: {account.family_name || familyId}
                      </p>
                    </div>

                    {/* Dynamic items — glass (Propuesta 5) */}
                    <div className="space-y-3">
                      {invItems.map((item, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, delay: idx * 0.05 }}
                          className="glass-billing-item"
                        >
                          <div className="relative z-[1]">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-medium text-[var(--color-silver-500)] font-[family-name:var(--font-mono)]">
                                Ítem {idx + 1}
                              </span>
                              {invItems.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeItem(idx)}
                                  className="p-1.5 rounded text-[var(--color-silver-500)] hover:text-[var(--color-rose-400)] hover:bg-[var(--color-surface-3)] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                                  aria-label={`Eliminar ítem ${idx + 1}`}
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-[1fr_80px_110px_100px] gap-2">
                              <input
                                type="text"
                                value={item.description}
                                onChange={(e) => updateItem(idx, "description", e.target.value)}
                                placeholder="Descripción del servicio o producto"
                                className={cn(
                                  "rounded-lg border px-3 py-2 text-sm font-[family-name:var(--font-ui)]",
                                  "bg-[var(--color-surface-1)] text-[var(--color-silver-200)] border-white/[0.06]",
                                  "placeholder:text-[var(--color-silver-500)]",
                                  "focus-visible:outline-2 focus-visible:outline-[var(--color-gold-400)]",
                                  "min-h-[44px]",
                                )}
                                aria-label={`Descripción ítem ${idx + 1}`}
                              />
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateItem(idx, "quantity", Math.max(1, parseInt(e.target.value) || 1))}
                                min={1}
                                className={cn(
                                  "rounded-lg border px-3 py-2 text-sm text-right font-[family-name:var(--font-mono)]",
                                  "bg-[var(--color-surface-1)] text-[var(--color-silver-200)] border-white/[0.06]",
                                  "focus-visible:outline-2 focus-visible:outline-[var(--color-gold-400)]",
                                  "min-h-[44px]",
                                )}
                                aria-label={`Cantidad ítem ${idx + 1}`}
                              />
                              <input
                                type="number"
                                value={item.unit_price || ""}
                                onChange={(e) => updateItem(idx, "unit_price", parseFloat(e.target.value) || 0)}
                                min={0}
                                step={1000}
                                placeholder="₡ Unitario"
                                className={cn(
                                  "rounded-lg border px-3 py-2 text-sm text-right font-[family-name:var(--font-mono)]",
                                  "bg-[var(--color-surface-1)] text-[var(--color-silver-200)] border-white/[0.06]",
                                  "placeholder:text-[var(--color-silver-500)]",
                                  "focus-visible:outline-2 focus-visible:outline-[var(--color-gold-400)]",
                                  "min-h-[44px]",
                                )}
                                aria-label={`Precio unitario ítem ${idx + 1}`}
                              />
                              <div className="flex items-center justify-end min-h-[44px]">
                                <span className="text-sm font-bold font-[family-name:var(--font-mono)] text-[var(--color-silver-200)]">
                                  {formatCurrency(item.quantity * item.unit_price)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}

                      <Button
                        variant="ghost"
                        onClick={addItem}
                        icon={<Plus size={14} />}
                        className="w-full border border-dashed border-white/[0.1]"
                      >
                        Agregar ítem
                      </Button>
                    </div>

                    {/* Totals — glass (Propuesta 1) */}
                    <div className="glass-billing-totals mt-4 space-y-2">
                      <div className="relative z-[1]">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-[var(--color-silver-400)] font-[family-name:var(--font-ui)]">Subtotal</span>
                          <span className="text-sm font-[family-name:var(--font-mono)] text-[var(--color-silver-200)]">{formatCurrency(subtotal)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-[var(--color-silver-400)] font-[family-name:var(--font-ui)]">IVA</span>
                            <input
                              type="number"
                              value={taxRate}
                              onChange={(e) => setTaxRate(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                              min={0}
                              max={100}
                              className={cn(
                                "w-16 rounded border px-2 py-1 text-xs text-right font-[family-name:var(--font-mono)]",
                                "bg-[var(--color-surface-1)] text-[var(--color-silver-200)] border-white/[0.06]",
                                "focus-visible:outline-2 focus-visible:outline-[var(--color-gold-400)]",
                              )}
                              aria-label="Tasa de IVA"
                            />
                            <span className="text-xs text-[var(--color-silver-500)]">%</span>
                          </div>
                          <span className="text-sm font-[family-name:var(--font-mono)] text-[var(--color-silver-300)]">{formatCurrency(tax)}</span>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
                          <span className="text-base font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">Total</span>
                          <span className="text-lg font-bold font-[family-name:var(--font-display)] text-[var(--color-gold-400)]">{formatCurrency(total)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Meta fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                      <div>
                        <label htmlFor="inv-due" className="block text-xs font-medium text-[var(--color-silver-400)] font-[family-name:var(--font-ui)] mb-1">
                          Fecha de vencimiento
                        </label>
                        <input
                          id="inv-due"
                          type="date"
                          value={dueDate}
                          onChange={(e) => setDueDate(e.target.value)}
                          className={cn(
                            "w-full rounded-lg border px-3 py-2 text-sm font-[family-name:var(--font-ui)]",
                            "bg-[var(--color-surface-1)] text-[var(--color-silver-200)] border-white/[0.06]",
                            "focus-visible:outline-2 focus-visible:outline-[var(--color-gold-400)]",
                            "min-h-[44px]",
                          )}
                        />
                      </div>
                      <div>
                        <label htmlFor="inv-notes" className="block text-xs font-medium text-[var(--color-silver-400)] font-[family-name:var(--font-ui)] mb-1">
                          Notas (opcional)
                        </label>
                        <input
                          id="inv-notes"
                          type="text"
                          value={invNotes}
                          onChange={(e) => setInvNotes(e.target.value)}
                          placeholder="Descripción adicional..."
                          className={cn(
                            "w-full rounded-lg border px-3 py-2 text-sm font-[family-name:var(--font-ui)]",
                            "bg-[var(--color-surface-1)] text-[var(--color-silver-200)] border-white/[0.06]",
                            "placeholder:text-[var(--color-silver-500)]",
                            "focus-visible:outline-2 focus-visible:outline-[var(--color-gold-400)]",
                            "min-h-[44px]",
                          )}
                        />
                      </div>
                    </div>

                    {/* Submit */}
                    <div className="mt-5">
                      <Button
                        variant="primary"
                        onClick={handleInvoiceSubmit}
                        disabled={invoiceMut.isPending || subtotal <= 0}
                        icon={invoiceMut.isPending ? undefined : <FileText size={16} />}
                        className="w-full sm:w-auto bg-[var(--color-gold-400)] text-[var(--color-abyss)] hover:brightness-110"
                      >
                        {invoiceMut.isPending ? "Creando factura…" : `Crear Factura — ${formatCurrency(total)}`}
                      </Button>
                      <p className="text-xs text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] mt-2">
                        La factura será enviada a aprobación HITL antes de emitirse.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── View: New Payment ── */}
            {activeView === "new-payment" && (
              <motion.div
                key="new-payment"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
              >
                <div className="glass-billing-panel p-5">
                  <div className="relative z-[1]">
                    <div className="mb-4">
                      <h3 className="text-sm font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-display)]">Registrar Pago</h3>
                      <p className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-ui)]">
                        Familia: {account.family_name || familyId}
                      </p>
                    </div>

                    {account.balance_due > 0 && (
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-[color-mix(in srgb,var(--color-gold-400)8%,transparent)] mb-4">
                        <CreditCard size={14} className="text-[var(--color-gold-400)]" />
                        <p className="text-sm font-[family-name:var(--font-ui)] text-[var(--color-silver-300)]">
                          Saldo pendiente: <span className="font-bold font-[family-name:var(--font-mono)] text-[var(--color-gold-400)]">{formatCurrency(account.balance_due)}</span>
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="pay-amount" className="block text-xs font-medium text-[var(--color-silver-400)] font-[family-name:var(--font-ui)] mb-1">Monto *</label>
                        <input
                          id="pay-amount"
                          type="number"
                          value={payAmount}
                          onChange={(e) => setPayAmount(e.target.value)}
                          min={0}
                          step={1000}
                          placeholder="₡ 0"
                          className={cn(
                            "w-full rounded-lg border px-3 py-2 text-sm font-[family-name:var(--font-mono)]",
                            "bg-[var(--color-surface-1)] text-[var(--color-silver-200)] border-white/[0.06]",
                            "placeholder:text-[var(--color-silver-500)]",
                            "focus-visible:outline-2 focus-visible:outline-[var(--color-gold-400)]",
                            "min-h-[44px]",
                          )}
                        />
                      </div>

                      <div>
                        <label htmlFor="pay-method" className="block text-xs font-medium text-[var(--color-silver-400)] font-[family-name:var(--font-ui)] mb-1">Método de pago</label>
                        <select
                          id="pay-method"
                          value={payMethod}
                          onChange={(e) => setPayMethod(e.target.value)}
                          className={cn(
                            "w-full rounded-lg border px-3 py-2 text-sm font-[family-name:var(--font-ui)]",
                            "bg-[var(--color-surface-1)] text-[var(--color-silver-200)] border-white/[0.06]",
                            "focus-visible:outline-2 focus-visible:outline-[var(--color-gold-400)]",
                            "min-h-[44px]",
                          )}
                        >
                          {Object.entries(PAYMENT_METHOD_CONFIG).map(([value, cfg]) => (
                            <option key={value} value={value}>{cfg.label}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label htmlFor="pay-ref" className="block text-xs font-medium text-[var(--color-silver-400)] font-[family-name:var(--font-ui)] mb-1">Referencia (opcional)</label>
                        <input
                          id="pay-ref"
                          type="text"
                          value={payRef}
                          onChange={(e) => setPayRef(e.target.value)}
                          placeholder="Número de transferencia, etc."
                          className={cn(
                            "w-full rounded-lg border px-3 py-2 text-sm font-[family-name:var(--font-ui)]",
                            "bg-[var(--color-surface-1)] text-[var(--color-silver-200)] border-white/[0.06]",
                            "placeholder:text-[var(--color-silver-500)]",
                            "focus-visible:outline-2 focus-visible:outline-[var(--color-gold-400)]",
                            "min-h-[44px]",
                          )}
                        />
                      </div>

                      <div>
                        <label htmlFor="pay-notes" className="block text-xs font-medium text-[var(--color-silver-400)] font-[family-name:var(--font-ui)] mb-1">Notas (opcional)</label>
                        <input
                          id="pay-notes"
                          type="text"
                          value={payNotes}
                          onChange={(e) => setPayNotes(e.target.value)}
                          placeholder="Observaciones..."
                          className={cn(
                            "w-full rounded-lg border px-3 py-2 text-sm font-[family-name:var(--font-ui)]",
                            "bg-[var(--color-surface-1)] text-[var(--color-silver-200)] border-white/[0.06]",
                            "placeholder:text-[var(--color-silver-500)]",
                            "focus-visible:outline-2 focus-visible:outline-[var(--color-gold-400)]",
                            "min-h-[44px]",
                          )}
                        />
                      </div>
                    </div>

                    {/* Unpaid invoices quick-fill */}
                    {account.invoices.filter((i) => i.status !== "paid" && i.status !== "cancelled").length > 0 && (
                      <div className="mt-4">
                        <p className="text-xs font-medium text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] mb-2">
                          Facturas pendientes (click para cargar monto):
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {account.invoices
                            .filter((i) => i.status !== "paid" && i.status !== "cancelled")
                            .map((inv) => (
                              <button
                                key={inv.id}
                                type="button"
                                onClick={() => setPayAmount(String(inv.total))}
                                className={cn(
                                  "glass-billing-preset text-xs font-[family-name:var(--font-mono)]",
                                  "min-h-[36px]",
                                )}
                              >
                                #{inv.id.slice(-6).toUpperCase()} — {formatCurrency(inv.total)}
                              </button>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Submit */}
                    <div className="mt-5">
                      <Button
                        variant="primary"
                        onClick={handlePaymentSubmit}
                        disabled={paymentMut.isPending || !payAmount}
                        icon={paymentMut.isPending ? undefined : <CreditCard size={16} />}
                        className="w-full sm:w-auto bg-[var(--color-emerald-400)] text-[var(--color-abyss)] hover:brightness-110"
                      >
                        {paymentMut.isPending ? "Procesando…" : `Registrar Pago${payAmount ? ` — ${formatCurrency(parseFloat(payAmount) || 0)}` : ""}`}
                      </Button>
                      <p className="text-xs text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] mt-2">
                        El pago será enviado a aprobación HITL antes de procesarse.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      ) : null}
    </div>
  );
}