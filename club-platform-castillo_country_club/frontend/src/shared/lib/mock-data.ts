// src/shared/lib/mock-data.ts
// Mock data alineado 1:1 con los types de cada feature

export function simulateDelay(ms = 300): Promise<void> {
  return new Promise((r) => setTimeout(r, ms + Math.random() * 200));
}

export function getMockResponse<T>(
  agent: string,
  tool: string,
  params: Record<string, unknown>,
): T | null {
  const key = `${agent}.${tool}`;
  const handler = REGISTRY[key];
  return handler ? (handler(params) as T) : null;
}

// ── Helpers ──
const NOW = new Date();
const dAgo = (n: number) =>
  new Date(NOW.getTime() - n * 86_400_000).toISOString();
const dFuture = (n: number) =>
  new Date(NOW.getTime() + n * 86_400_000).toISOString();
const ok = (msg: string) => ({ status: "success", message: msg });
const dateOnly = (n: number) => dAgo(n).slice(0, 10);

// ─────────────────────────────────────────────────
// FAMILIES — FamilyList / FamilyDetail
// ─────────────────────────────────────────────────

const FAMILIES = [
  {
    id: "fam-001",
    familyName: "Rodríguez Vargas",
    status: "active" as const,
    tier: "platino" as const,
    since: "2018-03-15",
    memberCount: 6,
    engagementScore: 92,
    totalBalance: 0,
    churnRisk: "low" as const,
    lastActivity: dAgo(1),
    address: "Residencial Los Laureles, Casa 42, Escazú",
    primaryContact: {
      id: "m-001",
      firstName: "Carlos",
      lastName: "Rodríguez",
      dateOfBirth: "1980-05-15",
      email: "carlos.rodriguez@email.com",
      phone: "2228-1234",
      role: "titular" as const,
      engagementScore: 92,
      activities: ["Golf", "Tenis", "Gimnasio"],
      status: "active" as const,
      joinedAt: "2018-03-15",
    },
    members: [],
  },
  {
    id: "fam-002",
    familyName: "Quirós Jiménez",
    status: "active" as const,
    tier: "oro" as const,
    since: "2019-07-22",
    memberCount: 4,
    engagementScore: 75,
    totalBalance: -45000,
    churnRisk: "low" as const,
    lastActivity: dAgo(3),
    address: "Condominio Valle del Sol, Santa Ana",
    primaryContact: {
      id: "m-002",
      firstName: "María",
      lastName: "Quirós",
      dateOfBirth: "1983-08-22",
      email: "maria.quiros@email.com",
      phone: "2282-5678",
      role: "titular" as const,
      engagementScore: 75,
      activities: ["Yoga", "Piscina"],
      status: "active" as const,
      joinedAt: "2019-07-22",
    },
    members: [],
  },
  {
    id: "fam-003",
    familyName: "Mora Solano",
    status: "suspended" as const,
    tier: "plata" as const,
    since: "2020-01-10",
    memberCount: 3,
    engagementScore: 34,
    totalBalance: -185000,
    churnRisk: "high" as const,
    lastActivity: dAgo(21),
    address: "Heredia Centro",
    primaryContact: {
      id: "m-003",
      firstName: "Roberto",
      lastName: "Mora",
      dateOfBirth: "1975-01-10",
      email: "roberto.mora@email.com",
      phone: "2237-9012",
      role: "titular" as const,
      engagementScore: 34,
      activities: ["Golf"],
      status: "active" as const,
      joinedAt: "2020-01-10",
    },
    members: [],
  },
  {
    id: "fam-004",
    familyName: "Castro Brenes",
    status: "active" as const,
    tier: "oro" as const,
    since: "2017-11-05",
    memberCount: 5,
    engagementScore: 88,
    totalBalance: 0,
    churnRisk: "low" as const,
    lastActivity: dAgo(2),
    address: "Curridabat, Lomas de Ayarco",
    primaryContact: {
      id: "m-004",
      firstName: "Ana",
      lastName: "Castro",
      dateOfBirth: "1981-11-05",
      email: "ana.castro@email.com",
      phone: "2272-3456",
      role: "titular" as const,
      engagementScore: 88,
      activities: ["Tenis", "Eventos Sociales"],
      status: "active" as const,
      joinedAt: "2017-11-05",
    },
    members: [],
  },
  {
    id: "fam-005",
    familyName: "Herrera Chaves",
    status: "active" as const,
    tier: "bronce" as const,
    since: "2024-06-18",
    memberCount: 2,
    engagementScore: 56,
    totalBalance: -32000,
    churnRisk: "medium" as const,
    lastActivity: dAgo(7),
    address: "San José, Barrio Escalante",
    primaryContact: {
      id: "m-005",
      firstName: "Diego",
      lastName: "Herrera",
      dateOfBirth: "1990-06-18",
      email: "diego.herrera@email.com",
      phone: "2253-7890",
      role: "titular" as const,
      engagementScore: 56,
      activities: ["Gimnasio"],
      status: "active" as const,
      joinedAt: "2024-06-18",
    },
    members: [],
  },
  {
    id: "fam-006",
    familyName: "Vargas Montero",
    status: "pending" as const,
    tier: "bronce" as const,
    since: "2025-05-01",
    memberCount: 2,
    engagementScore: 10,
    totalBalance: 0,
    churnRisk: "low" as const,
    lastActivity: dAgo(15),
    primaryContact: {
      id: "m-006",
      firstName: "Lucía",
      lastName: "Vargas",
      dateOfBirth: "1992-03-20",
      email: "lucia.vargas@email.com",
      phone: "2289-0011",
      role: "titular" as const,
      engagementScore: 10,
      activities: [],
      status: "active" as const,
      joinedAt: "2025-05-01",
    },
    members: [],
  },
];

function mockListFamilies(_params: Record<string, unknown>) {
  return {
    status: "success",
    families: FAMILIES,
    total: FAMILIES.length,
    page: 1,
    totalPages: 1,
    limit: 20,
  };
}

function mockGetFamilyDetail(params: Record<string, unknown>) {
  const id = (params.family_id as string) || (params.id as string) || "fam-001";
  const fam = FAMILIES.find((f) => f.id === id) || FAMILIES[0];
  return {
    status: "success",
    family: {
      ...fam,
      notes: "Familia muy activa en eventos deportivos",
      members: [
        { ...fam.primaryContact },
        {
          id: "m-010",
          firstName: "María Fernanda",
          lastName: "Rojas",
          dateOfBirth: "1983-08-12",
          email: "mf.rojas@email.com",
          phone: "2228-1235",
          role: "conyuge" as const,
          engagementScore: 78,
          activities: ["Yoga", "Piscina"],
          status: "active" as const,
          joinedAt: fam.since,
        },
        {
          id: "m-011",
          firstName: "Lucas",
          lastName: fam.primaryContact.lastName,
          dateOfBirth: "2007-02-20",
          email: "lucas@email.com",
          phone: "2228-1236",
          role: "hijo" as const,
          engagementScore: 65,
          activities: ["Natación"],
          status: "active" as const,
          joinedAt: fam.since,
        },
      ],
    },
    recentActivity: [
      { id: "act-001", type: "reservation" as const, description: "Reserva cancha de tenis", date: dAgo(2), amount: 15000 },
      { id: "act-002", type: "event" as const, description: "Taller de cocina gourmet", date: dAgo(5), amount: 45000 },
      { id: "act-003", type: "payment" as const, description: "Pago recibo mensual", date: dAgo(15), amount: 185000 },
    ],
    financialSummary: {
      currentBalance: fam.totalBalance,
      creditLimit: 500000,
      lastPaymentDate: dAgo(15),
      lastPaymentAmount: 185000,
      ytdCharges: 925000,
      ytdPayments: 750000,
    },
    socialConnections: [
      { connectedFamilyId: "fam-002", connectedFamilyName: "Quirós Jiménez", relationship: "Amigos de tenis", strength: 85 },
      { connectedFamilyId: "fam-004", connectedFamilyName: "Castro Brenes", relationship: "Compañeros de golf", strength: 70 },
    ],
  };
}

// ─────────────────────────────────────────────────
// EVENTS — EventCalendar / EventDetail
// ─────────────────────────────────────────────────

const EVENTS = [
  {
    id: "evt-001",
    title: "Torneo de Golf de Primavera",
    description: "Torneo anual de golf con categorías A, B y C. Incluye almuerzo y premiación.",
    type: "sports" as const,
    status: "published" as const,
    startDate: dateOnly(-12),
    endDate: dateOnly(-12),
    startTime: "07:00",
    endTime: "16:00",
    location: "Campo de Golf 18 Hoyos",
    facilityId: "fac-006",
    facilityName: "Campo de Golf",
    maxCapacity: 48,
    currentRsvps: 32,
    waitlistCount: 0,
    cost: 25000,
    isFree: false,
    requiresRsvp: true,
    rsvpDeadline: dateOnly(-15),
    organizer: "Comité de Deportes",
    tags: ["golf", "torneo", "deporte"],
    aiSummary: "Torneo popular con alta demanda. Considerar aumentar cupos.",
  },
  {
    id: "evt-002",
    title: "Cena de Gala — Aniversario del Club",
    description: "Celebración del aniversario con cena de 4 tiempos y música en vivo.",
    type: "social" as const,
    status: "published" as const,
    startDate: dateOnly(-25),
    endDate: dateOnly(-25),
    startTime: "19:00",
    endTime: "23:30",
    location: "Salón de Eventos Dorado",
    facilityId: "fac-004",
    facilityName: "Salón de Eventos Dorado",
    maxCapacity: 120,
    currentRsvps: 85,
    waitlistCount: 5,
    cost: 35000,
    isFree: false,
    requiresRsvp: true,
    rsvpDeadline: dateOnly(-28),
    organizer: "Gerencia General",
    tags: ["gala", "aniversario", "social"],
    aiSummary: "Evento insignia del año. Excelente nivel de RSVP.",
  },
  {
    id: "evt-003",
    title: "Clase de Yoga Familiar",
    description: "Sesión de yoga para todas las edades. Traer tapete.",
    type: "sports" as const,
    status: "published" as const,
    startDate: dateOnly(-3),
    endDate: dateOnly(-3),
    startTime: "08:00",
    endTime: "09:30",
    location: "Gimnasio Castillo",
    facilityId: "fac-003",
    facilityName: "Gimnasio Castillo",
    maxCapacity: 20,
    currentRsvps: 12,
    waitlistCount: 0,
    cost: 0,
    isFree: true,
    requiresRsvp: true,
    organizer: "Bienestar",
    tags: ["yoga", "familia", "wellness"],
  },
  {
    id: "evt-004",
    title: "Campamento Juvenil de Verano",
    description: "Campamento de una semana para jóvenes de 10 a 16 años.",
    type: "kids" as const,
    status: "draft" as const,
    startDate: dateOnly(-45),
    endDate: dateOnly(-52),
    startTime: "09:00",
    endTime: "15:00",
    location: "Área Verde Central",
    maxCapacity: 30,
    currentRsvps: 0,
    waitlistCount: 0,
    cost: 75000,
    isFree: false,
    requiresRsvp: true,
    organizer: "Área Juvenil",
    tags: ["campamento", "jóvenes", "verano"],
  },
  {
    id: "evt-005",
    title: "Taller de Cocina Gourmet",
    description: "Chef invitado enseña cocina costarricense contemporánea.",
    type: "gastronomic" as const,
    status: "published" as const,
    startDate: dateOnly(-8),
    endDate: dateOnly(-8),
    startTime: "18:00",
    endTime: "21:00",
    location: "Restaurante La Terraza",
    facilityId: "fac-005",
    facilityName: "Restaurante La Terraza",
    maxCapacity: 16,
    currentRsvps: 15,
    waitlistCount: 3,
    cost: 45000,
    isFree: false,
    requiresRsvp: true,
    organizer: "Chef Ejecutivo",
    tags: ["cocina", "gourmet", "taller"],
  },
  {
    id: "evt-006",
    title: "Noche de Karaoke",
    description: "Noche de entretenimiento para toda la familia.",
    type: "social" as const,
    status: "published" as const,
    startDate: dateOnly(-5),
    endDate: dateOnly(-5),
    startTime: "20:00",
    endTime: "23:00",
    location: "Bar del Club",
    maxCapacity: 40,
    currentRsvps: 28,
    waitlistCount: 0,
    cost: 0,
    isFree: true,
    requiresRsvp: false,
    organizer: "Comité Social",
    tags: ["karaoke", "social", "diversión"],
  },
];

function mockListEvents(_params: Record<string, unknown>) {
  return {
    status: "success",
    events: EVENTS,
    total: EVENTS.length,
    page: 1,
    totalPages: 1,
  };
}

function mockGetEventDetail(params: Record<string, unknown>) {
  const id = (params.event_id as string) || (params.id as string) || "evt-001";
  const evt = EVENTS.find((e) => e.id === id) || EVENTS[0];
  return {
    status: "success",
    event: evt,
    rsvps: [
      { id: "rsvp-001", familyId: "fam-001", familyName: "Rodríguez Vargas", memberCount: 4, status: "confirmed" as const, respondedAt: dAgo(20), notes: "" },
      { id: "rsvp-002", familyId: "fam-004", familyName: "Castro Brenes", memberCount: 3, status: "confirmed" as const, respondedAt: dAgo(18), notes: "Vegetariano" },
      { id: "rsvp-003", familyId: "fam-002", familyName: "Quirós Jiménez", memberCount: 2, status: "pending" as const, respondedAt: dAgo(10) },
      { id: "rsvp-004", familyId: "fam-005", familyName: "Herrera Chaves", memberCount: 2, status: "declined" as const, respondedAt: dAgo(8) },
    ],
    relatedEvents: EVENTS.filter((e) => e.id !== id).slice(0, 3),
    aiInsights: {
      predictedAttendance: Math.round(evt.currentRsvps * 0.85),
      capacityRisk: (evt.currentRsvps / evt.maxCapacity > 0.8 ? "high" : "low") as "low" | "medium" | "high",
      sentimentFromLastSimilar: 4.2,
      recommendation: "Excelente nivel de RSVP. Considerar abrir lista de espera.",
    },
  };
}

// ─────────────────────────────────────────────────
// FACILITIES — FacilityMap / FacilityDetail / Reservations
// ─────────────────────────────────────────────────

const FACILITIES = [
  { id: "fac-001", name: "Piscina Olímpica", type: "pool" as const, status: "available" as const, description: "Piscina olímpica de 50m con 6 carriles", location: "Zona Norte", capacity: 60, currentOccupancy: 32, utilizationRate: 72, operatingHours: { open: "06:00", close: "20:00" }, requiresReservation: false, allowsGuests: true, amenities: ["Duchas", "Casilleros", "Bar", "Tumbonas"], nextMaintenance: dateOnly(-30) },
  { id: "fac-002", name: "Cancha de Tenis Principal", type: "sports_court" as const, status: "available" as const, description: "Cancha de tenis con superficie de arcilla", location: "Zona Deportiva", capacity: 8, currentOccupancy: 4, utilizationRate: 85, operatingHours: { open: "06:00", close: "21:00" }, requiresReservation: true, allowsGuests: true, amenities: ["Iluminación nocturna", "Vestidores"], nextMaintenance: dateOnly(-15) },
  { id: "fac-003", name: "Gimnasio Castillo", type: "gym" as const, status: "available" as const, description: "Gimnasio equipado con zona de pesas y cardio", location: "Zona Wellness", capacity: 40, currentOccupancy: 18, utilizationRate: 55, operatingHours: { open: "05:00", close: "22:00" }, requiresReservation: false, allowsGuests: false, amenities: ["Pesas", "Cardio", "Clases grupales", "Sauna"], nextMaintenance: dateOnly(-60) },
  { id: "fac-004", name: "Salón de Eventos Dorado", type: "event_hall" as const, status: "available" as const, description: "Salón principal para eventos formales", location: "Edificio Principal", capacity: 150, currentOccupancy: 0, utilizationRate: 40, operatingHours: { open: "08:00", close: "23:00" }, requiresReservation: true, allowsGuests: true, amenities: ["Sonido", "Iluminación", "Cocina"], hourlyRate: 85000, nextMaintenance: dateOnly(-90) },
  { id: "fac-005", name: "Restaurante La Terraza", type: "restaurant" as const, status: "available" as const, description: "Restaurante principal con vista al jardín", location: "Zona Gastronómica", capacity: 80, currentOccupancy: 35, utilizationRate: 65, operatingHours: { open: "07:00", close: "22:00" }, requiresReservation: false, allowsGuests: true, amenities: ["Terraza", "Bar", "Menú infantil"], nextMaintenance: dateOnly(-45) },
  { id: "fac-006", name: "Campo de Golf 18 Hoyos", type: "other" as const, status: "available" as const, description: "Campo de golf profesional de 18 hoyos", location: "Zona Sur", capacity: 72, currentOccupancy: 28, utilizationRate: 48, operatingHours: { open: "06:00", close: "18:00" }, requiresReservation: true, allowsGuests: true, amenities: ["Pro shop", "Driving range", "Carritos"], hourlyRate: 35000, nextMaintenance: dateOnly(-7) },
];

function mockListFacilities(_params: Record<string, unknown>) {
  return { status: "success", facilities: FACILITIES, total: FACILITIES.length };
}

function mockGetFacilityDetail(params: Record<string, unknown>) {
  const id = (params.facility_id as string) || (params.id as string) || "fac-001";
  const fac = FACILITIES.find((f) => f.id === id) || FACILITIES[0];
  return {
    status: "success",
    facility: fac,
    upcomingReservations: [
      { id: "res-001", facilityId: fac.id, facilityName: fac.name, familyId: "fam-001", familyName: "Rodríguez Vargas", date: dateOnly(-1), startTime: "09:00", endTime: "10:30", status: "confirmed" as const, guestCount: 0, createdBy: "Carlos Rodríguez" },
      { id: "res-002", facilityId: fac.id, facilityName: fac.name, familyId: "fam-004", familyName: "Castro Brenes", date: dateOnly(-1), startTime: "11:00", endTime: "12:30", status: "confirmed" as const, guestCount: 0, createdBy: "Ana Castro" },
    ],
    utilizationHistory: [
      { date: dateOnly(-150), utilization: 55, reservations: 12 },
      { date: dateOnly(-120), utilization: 60, reservations: 14 },
      { date: dateOnly(-90), utilization: 58, reservations: 13 },
      { date: dateOnly(-60), utilization: 65, reservations: 16 },
      { date: dateOnly(-30), utilization: 70, reservations: 18 },
      { date: dateOnly(-1), utilization: fac.utilizationRate, reservations: 20 },
    ],
    maintenanceLog: [
      { id: "mnt-001", type: "scheduled" as const, description: "Limpieza profunda", performedAt: dAgo(30), performedBy: "Equipo de Mantenimiento", cost: 180000, status: "completed" as const },
      { id: "mnt-002", type: "emergency" as const, description: "Reparación sistema filtrado", performedAt: dAgo(90), performedBy: "Contratista externo", cost: 450000, status: "completed" as const },
    ],
  };
}

function mockGetReservations() {
  return {
    status: "success",
    reservations: [
      { id: "res-001", facilityId: "fac-002", facilityName: "Cancha de Tenis", familyId: "fam-001", familyName: "Rodríguez Vargas", date: dateOnly(-1), startTime: "09:00", endTime: "10:30", status: "confirmed" as const, guestCount: 0, createdBy: "Carlos" },
      { id: "res-002", facilityId: "fac-002", facilityName: "Cancha de Tenis", familyId: "fam-004", familyName: "Castro Brenes", date: dateOnly(-1), startTime: "11:00", endTime: "12:30", status: "confirmed" as const, guestCount: 0, createdBy: "Ana" },
      { id: "res-003", facilityId: "fac-004", facilityName: "Salón de Eventos", familyId: "fam-002", familyName: "Quirós Jiménez", date: dateOnly(-2), startTime: "18:00", endTime: "22:00", status: "pending" as const, guestCount: 25, createdBy: "María" },
      { id: "res-004", facilityId: "fac-001", facilityName: "Piscina", familyId: "fam-003", familyName: "Mora Solano", date: dateOnly(-1), startTime: "14:00", endTime: "16:00", status: "confirmed" as const, guestCount: 2, createdBy: "Roberto" },
    ],
    total: 4,
  };
}

// ─────────────────────────────────────────────────
// FINANCE — FinancialDashboard / FamilyAccount
// ─────────────────────────────────────────────────

function mockFinancialSummary() {
  return {
    status: "success",
    period: "current_quarter",
    period_label: "Q1 2025",
    total_revenue: 125_000_000,
    total_expenses: 89_000_000,
    net_income: 36_000_000,
    profit_margin: 28.8,
    revenue_change_pct: 8.2,
    expense_change_pct: 3.1,
    revenue_by_category: [
      { category: "dues", label: "Cuotas de membresía", amount: 78_000_000, percentage: 62.4, trend_pct: 5.0 },
      { category: "facilities", label: "Instalaciones", amount: 18_000_000, percentage: 14.4, trend_pct: 12.3 },
      { category: "events", label: "Eventos", amount: 15_000_000, percentage: 12.0, trend_pct: 8.5 },
      { category: "food_beverage", label: "Gastronomía", amount: 14_000_000, percentage: 11.2, trend_pct: 15.2 },
    ],
    expense_by_category: [
      { category: "staff", label: "Personal", amount: 45_000_000, budget: 44_000_000, variance: -1_000_000, variance_pct: -2.3 },
      { category: "maintenance", label: "Mantenimiento", amount: 22_000_000, budget: 25_000_000, variance: 3_000_000, variance_pct: 12.0 },
      { category: "operations", label: "Operaciones", amount: 12_000_000, budget: 13_000_000, variance: 1_000_000, variance_pct: 7.7 },
      { category: "marketing", label: "Marketing", amount: 10_000_000, budget: 10_000_000, variance: 0, variance_pct: 0 },
    ],
    monthly_trend: [
      { month: "2025-01", month_label: "Ene", revenue: 38_000_000, expenses: 29_000_000, net: 9_000_000 },
      { month: "2025-02", month_label: "Feb", revenue: 42_000_000, expenses: 30_000_000, net: 12_000_000 },
      { month: "2025-03", month_label: "Mar", revenue: 45_000_000, expenses: 30_000_000, net: 15_000_000 },
    ],
  };
}

function mockFamilyAccount() {
  return {
    status: "success",
    account: {
      family_id: "fam-001",
      family_name: "Rodríguez Vargas",
      account_number: "CTA-001",
      balance: -185_000,
      credit_limit: 500_000,
      status: "current",
      last_payment_date: dAgo(15),
      last_payment_amount: 250_000,
      next_due_date: dFuture(13),
      monthly_dues: 185_000,
      ytd_spent: 925_000,
      ytd_paid: 750_000,
      aging_30: 185_000,
      aging_60: 0,
      aging_90_plus: 0,
    } satisfies import("@/features/finance/types").FamilyAccountData,
    transactions: [
      { id: "tx-001", date: dAgo(2), description: "Membresía mensual Mayo", category: "dues", category_label: "Membresía", amount: -185_000, type: "charge", reference: "REF-001", status: "completed" },
      { id: "tx-002", date: dAgo(5), description: "Almuerzo Restaurante La Terraza", category: "food_beverage", category_label: "Gastronomía", amount: -32_000, type: "charge", reference: "REF-002", facility_name: "Restaurante La Terraza", status: "completed" },
      { id: "tx-003", date: dAgo(8), description: "Reserva Cancha de Tenis", category: "facilities", category_label: "Instalaciones", amount: -15_000, type: "charge", reference: "REF-003", facility_name: "Cancha de Tenis", status: "completed" },
      { id: "tx-004", date: dAgo(12), description: "Taller de Cocina Gourmet", category: "events", category_label: "Eventos", amount: -45_000, type: "charge", reference: "REF-004", facility_name: "Restaurante La Terraza", status: "completed" },
      { id: "tx-005", date: dAgo(15), description: "Pago recibo #1847", category: "payment", category_label: "Pago", amount: 250_000, type: "payment", reference: "PAY-1847", status: "completed" },
    ] satisfies import("@/features/finance/types").Transaction[],
    invoices: [
      { id: "inv-001", invoice_number: "F-2025-001", date: dAgo(30), due_date: dAgo(15), amount: 185_000, paid_amount: 185_000, balance: 0, status: "paid", items: [{ description: "Membresía Abril 2025", quantity: 1, unit_price: 185_000, total: 185_000 }] },
      { id: "inv-002", invoice_number: "F-2025-002", date: dAgo(1), due_date: dFuture(13), amount: 185_000, paid_amount: 0, balance: 185_000, status: "pending", items: [{ description: "Membresía Mayo 2025", quantity: 1, unit_price: 185_000, total: 185_000 }] },
    ] satisfies import("@/features/finance/types").Invoice[],
  };
}


// ─────────────────────────────────────────────────
// GUESTS — GuestList / GuestRegistration / GuestTodaySummary
// ─────────────────────────────────────────────────

function mockListGuests() {
  return {
    status: "success",
    checkins: [
      { id: "ci-001", guest_id: "gst-001", guest_name: "Juan Pérez", host_family_id: "fam-001", host_family_name: "Rodríguez Vargas", host_member_name: "Carlos Rodríguez", facility_id: "fac-005", facility_name: "Restaurante La Terraza", check_in_time: "2025-05-18T10:30:00", check_out_time: null, status: "active" as const, purpose: "social", purpose_label: "Social", approved_by: "staff-001", approved_by_name: "María López" },
      { id: "ci-002", guest_id: "gst-002", guest_name: "Laura Méndez", host_family_id: "fam-004", host_family_name: "Castro Brenes", host_member_name: "Ana Castro", facility_id: "fac-003", facility_name: "Gimnasio Castillo", check_in_time: "2025-05-18T09:00:00", check_out_time: null, status: "active" as const, purpose: "sports", purpose_label: "Deportes", approved_by: "staff-001", approved_by_name: "María López" },
      { id: "ci-003", guest_id: "gst-003", guest_name: "Pedro Sánchez", host_family_id: "fam-002", host_family_name: "Quirós Jiménez", host_member_name: "María Quirós", facility_id: "fac-001", facility_name: "Piscina", check_in_time: "2025-05-17T14:00:00", check_out_time: "2025-05-17T18:00:00", status: "departed" as const, purpose: "pool", purpose_label: "Piscina", approved_by: "staff-002", approved_by_name: "Carlos Mora" },
    ],
    total: 3,
    date: dateOnly(0),
    active_count: 2,
    departed_count: 1,
    total_count: 3,
  };
}

function mockGuestSummary() {
  return {
    status: "success",
    date: dateOnly(0),
    total_expected: 5,
    checked_in: 2,
    departed: 1,
    currently_present: 2,
    by_facility: [
      { facility_id: "fac-005", facility_name: "Restaurante", count: 1 },
      { facility_id: "fac-003", facility_name: "Gimnasio", count: 1 },
    ],
    by_purpose: [
      { purpose: "social", label: "Social", count: 1 },
      { purpose: "sports", label: "Deportes", count: 1 },
    ],
  };
}

// ─────────────────────────────────────────────────
// COMMUNICATIONS — CommunicationCenter / AnnouncementBoard
// ─────────────────────────────────────────────────

const ANNOUNCEMENTS = [
  { id: "ann-001", title: "Mantenimiento programado de piscina", body: "La piscina estará cerrada del 20 al 22 de abril por mantenimiento preventivo del sistema de filtrado.", category: "maintenance", category_label: "Mantenimiento", audience: ["all" as const], audience_label: "Todos", status: "published" as const, priority: "important" as const, author_id: "adm-001", author_name: "Gerencia", published_at: dAgo(2), scheduled_at: null, expires_at: dFuture(5), created_at: dAgo(2), updated_at: dAgo(2), views_count: 87 },
  { id: "ann-002", title: "Nuevo horario del gimnasio", body: "A partir del 1 de mayo, el gimnasio abrirá de 5:00 AM a 10:00 PM de lunes a domingo.", category: "general", category_label: "General", audience: ["socios" as const], audience_label: "Miembros", status: "published" as const, priority: "normal" as const, author_id: "adm-001", author_name: "Gerencia", published_at: dAgo(5), scheduled_at: null, expires_at: dFuture(30), created_at: dAgo(5), updated_at: dAgo(5), views_count: 112 },
  { id: "ann-003", title: "Inscripciones abiertas: Torneo de Golf", body: "Ya están abiertas las inscripciones para el Torneo de Golf de Primavera. Cupos limitados a 48 jugadores.", category: "events", category_label: "Eventos", audience: ["socios" as const], audience_label: "Miembros", status: "published" as const, priority: "normal" as const, author_id: "adm-002", author_name: "Comité de Eventos", published_at: dAgo(1), scheduled_at: null, expires_at: dFuture(10), created_at: dAgo(1), updated_at: dAgo(1), views_count: 45 },
  { id: "ann-004", title: "Descuento en catering para eventos", body: "Durante el mes de mayo, los socios Platino y Oro disfrutan de 15% de descuento en catering.", category: "general", category_label: "General", audience: ["socios" as const], audience_label: "Miembros", status: "published" as const, priority: "normal" as const, author_id: "adm-001", author_name: "Marketing", published_at: dAgo(3), scheduled_at: null, expires_at: dFuture(25), created_at: dAgo(3), updated_at: dAgo(3), views_count: 62 },
];

function mockListAnnouncements() {
  return { status: "success", announcements: ANNOUNCEMENTS, total: ANNOUNCEMENTS.length, page: 1, page_size: 20, total_pages: 1 };
}

function mockCommunicationCenter() {
  return {
    status: "success",
    stats: { total_sent: 45, this_month: 8, open_rate: 78.5, engagement_rate: 42.3 },
    recent: ANNOUNCEMENTS,
    templates: [
      { id: "tpl-001", name: "Aviso de Mantenimiento", description: "Plantilla para avisos de mantenimiento", category: "maintenance", subject_template: "Mantenimiento: {{facility}}", body_template: "", variables: ["facility", "dates"], usage_count: 8, last_used_at: dAgo(2) },
      { id: "tpl-002", name: "Invitación a Evento", description: "Plantilla para invitaciones", category: "events", subject_template: "Evento: {{event_name}}", body_template: "", variables: ["event_name", "date", "location"], usage_count: 12, last_used_at: dAgo(1) },
    ],
  };
}

// ─────────────────────────────────────────────────
// ENGAGEMENT — EngagementDashboard / Campaigns / Surveys
// ─────────────────────────────────────────────────

function mockEngagementOverview() {
  return {
    status: "success",
    total_families: 145,
    avg_score: 72,
    distribution: [
      { level: "thriving", label: "Excelente", count: 35, percentage: 24, color: "#1a3a2a" },
      { level: "active", label: "Activo", count: 52, percentage: 36, color: "#5a7a9e" },
      { level: "moderate", label: "Moderado", count: 33, percentage: 23, color: "#c8a951" },
      { level: "at_risk", label: "En Riesgo", count: 17, percentage: 12, color: "#b87333" },
      { level: "dormant", label: "Inactivo", count: 8, percentage: 5, color: "#c0392b" },
    ],
    at_risk_count: 17,
    dormant_count: 8,
    improving_count: 22,
    declining_count: 11,
    top_risk_factors: [
      { factor: "no_recent_activity", factor_label: "Sin actividad reciente", count: 14, percentage: 56 },
      { factor: "low_attendance", factor_label: "Baja asistencia a eventos", count: 10, percentage: 40 },
      { factor: "no_engagement", factor_label: "Sin interacción con comunicaciones", count: 7, percentage: 28 },
    ],
    engagement_trend: [
      { month: "2025-01", month_label: "Ene", avg_score: 68, active_pct: 58, at_risk_pct: 14 },
      { month: "2025-02", month_label: "Feb", avg_score: 70, active_pct: 60, at_risk_pct: 13 },
      { month: "2025-03", month_label: "Mar", avg_score: 71, active_pct: 61, at_risk_pct: 12 },
      { month: "2025-04", month_label: "Abr", avg_score: 72, active_pct: 62, at_risk_pct: 12 },
    ],
  };
}

function mockListFamilyEngagement() {
  return {
    status: "success",
    families: FAMILIES.map((f) => ({
      family_id: f.id,
      family_name: f.familyName,
      engagement_score: f.engagementScore,
      engagement_level: f.engagementScore >= 80 ? "thriving" : f.engagementScore >= 60 ? "active" : f.engagementScore >= 40 ? "moderate" : f.engagementScore >= 20 ? "at_risk" : "dormant",
      trend: f.engagementScore > 70 ? "improving" : f.engagementScore < 50 ? "declining" : "stable",
      trend_pct: f.engagementScore > 70 ? 5.2 : f.engagementScore < 50 ? -3.1 : 0.5,
      last_activity_date: dAgo(Math.floor(Math.random() * 14) + 1),
      last_activity_label: "Hace " + (Math.floor(Math.random() * 14) + 1) + " días",
      activities_attended_30d: Math.floor(Math.random() * 8),
      activities_attended_90d: Math.floor(Math.random() * 20),
      facility_usage_pct: Math.round(30 + Math.random() * 60),
      events_rsvp_rate: Math.round(40 + Math.random() * 50),
      communication_open_rate: Math.round(50 + Math.random() * 40),
      referrals_count: Math.floor(Math.random() * 3),
      feedback_given: Math.floor(Math.random() * 5),
      risk_factors: f.churnRisk === "high" ? ["no_recent_activity", "low_attendance"] : [],
    })),
    total: FAMILIES.length,
    page: 1,
    page_size: 10,
    total_pages: 1,
  };
}


function mockListCampaigns() {
  return {
    status: "success",
    campaigns: [
      { id: "cmp-001", name: "Reactivación Verano 2025", description: "Campaña para reactivar familias inactivas", status: "active" as const, target_level: "at_risk", target_level_label: "Familias en Riesgo", target_count: 17, reached_count: 14, responded_count: 8, reactivated_count: 3, response_rate: 57, reactivation_rate: 38, channel: "email", channel_label: "Correo Electrónico", message_template: "Hola {{name}}, te extrañamos en el club...", start_date: dAgo(14), end_date: dFuture(16), created_at: dAgo(14) },
      { id: "cmp-002", name: "Encuesta Compromiso Familiar", description: "Encuesta masiva para medir satisfacción", status: "completed" as const, target_level: "all_inactive", target_level_label: "Todos los Inactivos", target_count: 145, reached_count: 145, responded_count: 89, reactivated_count: 0, response_rate: 61, reactivation_rate: 0, channel: "email", channel_label: "Correo Electrónico", message_template: "", start_date: dAgo(30), end_date: dAgo(16), created_at: dAgo(30) },
      { id: "cmp-003", name: "Bienvenida Nuevos Socios Q1", description: "Onboarding personalizado", status: "completed" as const, target_level: "at_risk", target_level_label: "Nuevos socios", target_count: 12, reached_count: 12, responded_count: 8, reactivated_count: 7, response_rate: 67, reactivation_rate: 88, channel: "phone", channel_label: "Llamada Telefónica", message_template: "", start_date: dAgo(60), end_date: dAgo(30), created_at: dAgo(60) },
    ],
    total: 3,
  };
}

function mockSurveyResults() {
  return {
    status: "success",
    survey_id: "srv-001",
    survey_name: "Encuesta de Satisfacción Q1 2025",
    total_responses: 89,
    completion_rate: 79.5,
    avg_overall_score: 4.2,
    avg_nps: 72,
    nps_distribution: { promoters: 65, passives: 17, detractors: 7 },
    question_summaries: [
      { question_id: "q1", question: "Calidad de las instalaciones", type: "rating", avg_score: 4.5 },
      { question_id: "q2", question: "Servicio al cliente", type: "rating", avg_score: 4.1 },
      { question_id: "q3", question: "Actividades disponibles", type: "rating", avg_score: 4.3 },
      { question_id: "q4", question: "Comunicación del club", type: "rating", avg_score: 3.8 },
    ],
    sentiment_breakdown: { positive: 62, positive_pct: 70, neutral: 18, neutral_pct: 20, negative: 9, negative_pct: 10 },
    ai_insights: [
      { id: "ins-001", type: "strength" as const, title: "Instalaciones destacadas", description: "Los socios valoran especialmente la piscina y el gimnasio.", confidence: 0.92, related_questions: ["q1"] },
      { id: "ins-002", type: "improvement" as const, title: "Mejorar comunicación", description: "La comunicación sobre eventos y cambios de horario necesita mejorar.", confidence: 0.85, related_questions: ["q4"] },
      { id: "ins-003", type: "trend" as const, title: "NPS en ascenso", description: "El NPS ha mejorado 8 puntos respecto al trimestre anterior.", confidence: 0.88, related_questions: [] },
    ],
    recent_comments: [
      { id: "cmt-001", family_name: "Rodríguez Vargas", comment: "Las instalaciones son excelentes, especialmente la piscina.", sentiment: "positive" as const, date: dAgo(5) },
      { id: "cmt-002", family_name: "Mora Solano", comment: "Me gustaría más variedad en clases de fitness.", sentiment: "neutral" as const, date: dAgo(4) },
      { id: "cmt-003", family_name: "Castro Brenes", comment: "El servicio en el restaurante ha mejorado mucho.", sentiment: "positive" as const, date: dAgo(3) },
      { id: "cmt-004", family_name: "Herrera Chaves", comment: "Falta mejor señalización en el campo de golf.", sentiment: "neutral" as const, date: dAgo(2) },
      { id: "cmt-005", family_name: "Quirós Jiménez", comment: "Excelente ambiente familiar. Mis hijos aman el club.", sentiment: "positive" as const, date: dAgo(1) },
    ],
  };
}

function mockGetSurvey() {
  return {
    status: "success",
    id: "srv-001",
    name: "Encuesta de Satisfacción Q1 2025",
    description: "Tu opinión nos ayuda a mejorar.",
    event_type: "general",
    is_active: true,
    usage_count: 1,
    avg_completion_rate: 79.5,
    questions: [
      { id: "q1", order: 1, type: "nps" as const, question: "¿Qué tan probable es que recomiendes el Castillo a un amigo?", required: true },
      { id: "q2", order: 2, type: "rating" as const, question: "Calidad de las instalaciones", description: "Del 1 al 5", required: true, options: ["1", "2", "3", "4", "5"] },
      { id: "q3", order: 3, type: "choice" as const, question: "¿Tu actividad favorita?", required: true, options: ["Golf", "Tenis", "Piscina", "Restaurante", "Gimnasio", "Eventos"] },
      { id: "q4", order: 4, type: "text" as const, question: "¿Qué mejorarías del club?", required: false },
    ],
  };
}

// ─────────────────────────────────────────────────
// DOCUMENTS — DocumentRepository / KnowledgeQuery
// ─────────────────────────────────────────────────

const DOCS = [
  { id: "doc-001", title: "Estatutos del Castillo Country Club", type: "bylaw" as const, category: "Legal", description: "Estatutos vigentes aprobados por la Asamblea General", tags: ["estatutos", "legal", "asamblea"], created_by: "Junta Directiva", created_at: dAgo(365), updated_at: dAgo(30), version: 3, status: "published" as const, access_roles: ["ADMIN", "JUNTA", "SOCIO"], file_size_bytes: 2_457_600, mime_type: "application/pdf" },
  { id: "doc-002", title: "Reglamento de Uso de Piscina", type: "regulation" as const, category: "Instalaciones", description: "Normas de uso, horarios y seguridad de la piscina olímpica", tags: ["piscina", "reglamento", "seguridad"], created_by: "Gerencia", created_at: dAgo(180), updated_at: dAgo(15), version: 2, status: "published" as const, access_roles: ["ADMIN", "STAFF", "SOCIO"], file_size_bytes: 524_288, mime_type: "application/pdf" },
  { id: "doc-003", title: "Acta Asamblea General Q1 2025", type: "minutes" as const, category: "Gobernanza", description: "Acta de la asamblea general celebrada en marzo 2025", tags: ["acta", "asamblea", "gobierno"], created_by: "Secretaría", created_at: dAgo(45), updated_at: dAgo(45), version: 1, status: "published" as const, access_roles: ["ADMIN", "JUNTA"], file_size_bytes: 1_048_576, mime_type: "application/pdf" },
  { id: "doc-004", title: "Política de Invitados y Eventos Privados", type: "policy" as const, category: "Operaciones", description: "Política vigente sobre invitados, eventos privados y day passes", tags: ["invitados", "eventos", "política"], created_by: "Gerencia", created_at: dAgo(90), updated_at: dAgo(10), version: 4, status: "published" as const, access_roles: ["ADMIN", "STAFF", "SOCIO"], file_size_bytes: 786_432, mime_type: "application/pdf" },
  { id: "doc-005", title: "Informe Financiero Q1 2025", type: "financial_report" as const, category: "Finanzas", description: "Estado de resultados y balance general del primer trimestre", tags: ["finanzas", "trimestral", "balance"], created_by: "Contabilidad", created_at: dAgo(20), updated_at: dAgo(20), version: 1, status: "published" as const, access_roles: ["ADMIN", "JUNTA"], file_size_bytes: 3_145_728, mime_type: "application/pdf" },
  { id: "doc-006", title: "Contrato de Catering 2025", type: "contract" as const, category: "Legal", description: "Contrato vigente con proveedor de catering para eventos", tags: ["contrato", "catering", "proveedor"], created_by: "Administración", created_at: dAgo(120), updated_at: dAgo(120), version: 1, status: "published" as const, access_roles: ["ADMIN"], file_size_bytes: 1_572_864, mime_type: "application/pdf" },
  { id: "doc-007", title: "Boletín Informativo Mayo 2025", type: "newsletter" as const, category: "Comunicaciones", description: "Boletín mensual con noticias, eventos y novedades", tags: ["boletín", "noticias", "mayo"], created_by: "Marketing", created_at: dAgo(5), updated_at: dAgo(5), version: 1, status: "published" as const, access_roles: ["ADMIN", "STAFF", "SOCIO", "JUNTA"], file_size_bytes: 2_097_152, mime_type: "application/pdf" },
  { id: "doc-008", title: "Formulario de Reservación", type: "form" as const, category: "Operaciones", description: "Formulario estándar para reservar instalaciones del club", tags: ["formulario", "reserva", "instalaciones"], created_by: "Operaciones", created_at: dAgo(200), updated_at: dAgo(60), version: 5, status: "published" as const, access_roles: ["ADMIN", "STAFF", "SOCIO"], file_size_bytes: 262_144, mime_type: "application/pdf" },
];

function mockSearchDocuments(params: Record<string, unknown>) {
  const query = ((params.query as string) || "").toLowerCase();
  let filtered = DOCS;
  if (query) {
    filtered = DOCS.filter((d) =>
      d.title.toLowerCase().includes(query) ||
      d.description.toLowerCase().includes(query) ||
      d.tags.some((t) => t.includes(query)),
    );
  }
  const types = params.document_types as string[] | undefined;
  if (types && types.length > 0) {
    filtered = filtered.filter((d) => types.includes(d.type));
  }
  return {
    status: "success",
    results: filtered.map((doc) => ({
      document: doc,
      relevance_score: query ? 0.5 + Math.random() * 0.5 : 0.8 + Math.random() * 0.2,
      snippet: doc.description,
      highlighted_terms: query ? [query] : [],
    })),
    total: filtered.length,
    query_time_ms: Math.floor(20 + Math.random() * 80),
  };
}

function mockKnowledgeQuery(params: Record<string, unknown>) {
  const q = ((params.question as string) || "").toLowerCase();
  let answer: string;
  let sources: Array<{ document_id: string; title: string; snippet: string; relevance: number; document_type: string }>;

  if (q.includes("piscina") || q.includes("nadar")) {
    answer = "Basándome en los documentos del club, la piscina olímpica opera de lunes a domingo de 6:00 AM a 8:00 PM. Los menores de 12 años deben estar acompañados por un adulto. Se permite el uso de flotadores para niños.";
    sources = [
      { document_id: "doc-002", title: "Reglamento de Uso de Piscina", snippet: "La piscina olímpica está disponible para todos los socios y sus invitados durante el horario de operación.", relevance: 0.95, document_type: "regulation" },
      { document_id: "doc-001", title: "Estatutos del Castillo", snippet: "Las instalaciones deportivas estarán disponibles para todos los socios en buen standing.", relevance: 0.72, document_type: "bylaw" },
    ];
  } else if (q.includes("invitado") || q.includes("guest")) {
    answer = "Cada socio puede traer hasta 4 invitados por visita. Los invitados deben estar registrados en recepción. Hay un máximo de 6 visitas por invitado al año. Los day passes están disponibles con aprobación de gerencia.";
    sources = [{ document_id: "doc-004", title: "Política de Invitados", snippet: "Cada miembro puede invitar hasta cuatro (4) personas por visita.", relevance: 0.97, document_type: "policy" }];
  } else if (q.includes("reserv") || q.includes("booking")) {
    answer = "Las reservaciones se realizan a través del sistema del club. Las canchas de tenis se reservan con hasta 7 días de anticipación en bloques de 90 minutos. El salón de eventos requiere 30 días de anticipación y depósito del 50%.";
    sources = [{ document_id: "doc-008", title: "Formulario de Reservación", snippet: "Las reservaciones pueden realizarse con anticipación variable: canchas (7 días), salones (30 días), campo de golf (3 días).", relevance: 0.91, document_type: "form" }];
  } else {
    answer = "Encontré información relevante en varios documentos del club. Los estatutos establecen que el Castillo Country Club es una organización privada dedicada al esparcimiento y deporte. Para consultas específicas, te recomiendo revisar el documento más relevante en la sección de Documentación.";
    sources = [{ document_id: "doc-001", title: "Estatutos del Castillo", snippet: "El Castillo Country Club es una asociación civil sin fines de lucro.", relevance: 0.82, document_type: "bylaw" }];
  }

  return {
    status: "success",
    answer,
    sources,
    confidence: sources[0]?.relevance ?? 0.5,
    conversation_id: (params.conversation_id as string) || `conv-${Date.now()}`,
  };
}

// ─────────────────────────────────────────────────
// REPORTS — BoardReport / RiskMatrix
// ─────────────────────────────────────────────────

function mockBoardReport(params: Record<string, unknown>) {
  const period = (params.period as string) || "2025-Q1";
  return {
    status: "success",
    id: "rpt-001",
    title: `Reporte de Junta Directiva — ${period}`,
    type: "quarterly",
    period,
    generated_at: dAgo(5),
    generated_by: "ai",
    approved_by: "Lic. Patricia Herrera",
    executive_summary: `El ${period} cerró con resultados financieros sólidos. Los ingresos totales alcanzaron los ₡125 millones, un crecimiento del 8.2% respecto al periodo anterior. La membresía se mantiene en 145 familias activas, con 17 identificadas como en riesgo.\n\nEl NPS de satisfacción se mantiene en 72 puntos. Las instalaciones deportivas muestran una ocupación promedio del 61%, con la cancha de tenis como la más demandada (85%).\n\nSe recomienda implementar un programa de reactivación para las familias en riesgo y evaluar la expansión de horarios del gimnasio.`,
    sections: [
      { id: "sec-001", title: "Situación Financiera", content: "Los ingresos por cuotas representaron el 62% del total, seguidos por instalaciones (14%) y eventos (12%). Los gastos se mantuvieron dentro del presupuesto con un margen neto del 28.8%.", type: "narrative" },
      { id: "sec-002", title: "Análisis de Membresía", content: "La tasa de retención se mantiene en 94%. Sin embargo, 17 familias (12%) muestran señales de desengagement. Causas principales: falta de actividades para jóvenes (35%), insatisfacción con relación calidad-precio (28%).", type: "narrative", ai_confidence: 0.85 },
      { id: "sec-003", title: "Recomendaciones Estratégicas", content: "1. Programa de reactivación para familias en riesgo.\n2. Ampliar horario del gimnasio a 5AM-10PM.\n3. Crear programa de actividades juveniles.\n4. Evaluar inversión en señalización digital para golf.\n5. Fortalecer comunicación con notificaciones push.", type: "recommendation", ai_confidence: 0.78 },
    ],
    metadata: {
      total_families: 145,
      active_members: 487,
      revenue_total: 125_000_000,
      revenue_change_pct: 8.2,
      occupancy_rate: 61.5,
      satisfaction_nps: 72,
      youth_engagement_pct: 68,
      senior_engagement_pct: 55,
    },
  };
}

function mockRiskMatrix() {
  return {
    status: "success",
    total_risks: 6,
    critical: 1,
    high: 2,
    medium: 2,
    low: 1,
    items: [
      { id: "risk-001", title: "Flujo de caja trimestral", description: "Riesgo de desbalance estacional en ingresos durante Q3.", category: "financial", probability: 3, impact: 3, score: 9, level: "high", mitigation: "Crear fondo de reserva equivalente a 2 meses.", owner: "CFO", identified_at: dAgo(60) },
      { id: "risk-002", title: "Rotación de personal clave", description: "El chef ejecutivo y gerente tienen ofertas de la competencia.", category: "operational", probability: 3, impact: 4, score: 12, level: "high", mitigation: "Plan de retención con bonos de permanencia.", owner: "RRHH", identified_at: dAgo(30) },
      { id: "risk-003", title: "Satisfacción socios nuevos", description: "Socios 2024 muestran NPS 15 puntos menor que socios históricos.", category: "reputational", probability: 4, impact: 4, score: 16, level: "critical", mitigation: "Programa de onboarding con mentor asignado.", owner: "Gerencia", identified_at: dAgo(45) },
      { id: "risk-004", title: "Cumplimiento ambiental", description: "Nueva regulación de aguas residuales requiere actualización.", category: "regulatory", probability: 2, impact: 3, score: 6, level: "medium", mitigation: "Auditoría ambiental y plan de adecuación.", owner: "Mantenimiento", identified_at: dAgo(90) },
      { id: "risk-005", title: "Competencia clubes privados", description: "Nuevo club en Santa Ana ofrece instalaciones modernas.", category: "strategic", probability: 3, impact: 3, score: 9, level: "high", mitigation: "Diferenciación por tradición y servicio.", owner: "Junta", identified_at: dAgo(120) },
      { id: "risk-006", title: "Sistema de reservas obsoleto", description: "Limitaciones técnicas que afectan la experiencia del usuario.", category: "technological", probability: 2, impact: 2, score: 4, level: "low", mitigation: "Migración a nueva plataforma en curso.", owner: "IT", identified_at: dAgo(60) },
    ],
  };
}

// ─────────────────────────────────────────────────
// EXECUTIVE DASHBOARD — ExecutiveDashboard
// ─────────────────────────────────────────────────

function mockExecutiveSummary(params: Record<string, unknown>) {
  return {
    status: "success",
    message: "Resumen ejecutivo generado",
    summary: {
      period: (params.period as string) || "current_quarter",
      total_families: 145,
      active_members: 487,
      revenue_total: 125_000_000,
      revenue_change_pct: 8.2,
      expenses_total: 89_000_000,
      net_income: 36_000_000,
      occupancy_rate: 61.5,
      satisfaction_nps: 72,
      upcoming_events: 6,
      pending_reservations: 14,
      at_risk_families: 17,
      new_members_this_month: 3,
      guest_visits_today: 2,
      top_activity: "Restaurante",
      anomaly_count: 3,
    },
  };
}

// ─────────────────────────────────────────────────
// REGISTRY — dispatch table
// ─────────────────────────────────────────────────

type MockFn = (params: Record<string, unknown>) => unknown;

const REGISTRY: Record<string, MockFn> = {
  // Families
  "families.list_families": mockListFamilies,
  "families.get_family_detail": mockGetFamilyDetail,
  "families.create_family": () => ok("Familia creada exitosamente"),
  "families.update_family": () => ok("Familia actualizada"),
  // Events
  "events.list_events": mockListEvents,
  "events.get_event_detail": mockGetEventDetail,
  "events.create_event": () => ok("Evento creado"),
  // Facilities
  "facilities.list_facilities": mockListFacilities,
  "facilities.get_facility_detail": mockGetFacilityDetail,
  "facilities.get_reservations": mockGetReservations,
  // Finance
  "finance.get_financial_summary": mockFinancialSummary,
  "finance.get_family_account": mockFamilyAccount,
  "finance.get_my_account": mockFamilyAccount,
  // Guests
  "guests.list_todays_guests": mockListGuests,
  "guests.get_today_summary": mockGuestSummary,
  "guests.register_guest": () => ok("Invitado registrado exitosamente"),
  // Communications
  "communications.list_announcements": mockListAnnouncements,
  "communications.get_communication_center_data": mockCommunicationCenter,
  "communications.send_emergency": () => ok("Emergencia transmitida"),
  // Engagement
  "engagement.get_engagement_overview": mockEngagementOverview,
  "engagement.list_family_engagement": mockListFamilyEngagement,
  "engagement.list_campaigns": mockListCampaigns,
  "engagement.get_survey_results": mockSurveyResults,
  "engagement.get_survey": mockGetSurvey,
  "engagement.submit_survey": () => ok("Encuesta enviada. ¡Gracias!"),
  // Documents
  "documents.search_documents": mockSearchDocuments,
  "knowledge.query": mockKnowledgeQuery,
  // Reports
  "reports.get_board_report": mockBoardReport,
  "reports.get_risk_matrix": mockRiskMatrix,
  // Dashboard
  "executive_dashboard.get_executive_summary": mockExecutiveSummary,
  "executive_dashboard.generate_ai_analysis": mockGenerateAiAnalysis,
};
// ── Agregar al final del REGISTRY ──

function mockGenerateAiAnalysis(params: Record<string, unknown>) {
  const scope = (params.scope as string) || "executive";
  return {
    status: "success",
    scope,
    executive_summary:
      "El trimestre cerró con márgenes sólidos (+28.8%) y crecimiento sostenido de ingresos (+8.2%). " +
      "Sin embargo, hay señales tempranas de desengagement en el segmento 36-55 años que correlaciona con la caída del NPS " +
      "(de +42 a +35 en 9 meses). Las anomalías detectadas en F&B (+18% presupuesto) requieren atención inmediata. " +
      "El grupo juvenil (13-17) muestra participación +2.5pp, una oportunidad para capitalizar.",
    risk_score: { value: 7.2, max: 10, factors: ["churn_risk", "nps_decline", "budget_overrun", "new_member_dissatisfaction"] },
    trend: "stable",
    confidence: 0.85,
    horizon_days: 90,
    cross_domain_insights: [
      { domains: ["engagement", "satisfaction"], insight: "Segmento 36-55 años: engagement −12pp coincide con NPS −7pts", correlation: "Correlación fuerte (r=0.82) entre engagement score y NPS en este segmento" },
      { domains: ["finance", "operations"], insight: "F&B +18% presupuesto erosiona margen operativo en 2.3pp", correlation: "Eventos privados sin mínimo de consumo son el driver principal" },
      { domains: ["engagement", "membership"], insight: "Jóvenes 13-17 participación +2.5pp → oportunidad de crecimiento", correlation: "Familias con hijos en este rango muestran 40% más retención" },
    ],
    risk_alerts: [
      { severity: "critical", title: "Satisfacción socios nuevos", description: "Socios 2024 muestran NPS 15 puntos menor que socios históricos. Riesgo reputacional alto.", affected_segment: "Nuevos socios (< 12 meses)" },
      { severity: "high", title: "23 familias en riesgo de churn", description: "Sin actividad en 30+ días y engagement score < 40. Programa de reactivación necesario.", affected_segment: "12% membresía total" },
      { severity: "medium", title: "Rotación de personal clave", description: "Chef ejecutivo y gerente deportivo con ofertas de la competencia.", affected_segment: "Operaciones" },
    ],
    recommendations: [
      { priority: "high", action: "Programa onboarding con mentor para nuevos socios", justification: "Socios nuevos retienen +40% con mentor asignado según datos internos", estimated_impact: "₡8-12M/año en retención", domain: "membership" },
      { priority: "high", action: "Revisar contratos F&B y establecer mínimo de consumo", justification: "Eventos privados sin mínimo generan sobrecosto 18% del presupuesto", estimated_impact: "−₡3.5M/año en gastos", domain: "finance" },
      { priority: "medium", action: "Ampliar programas juveniles (13-17 años)", justification: "Grupo muestra participación +2.5pp y correlaciona con retención familiar", estimated_impact: "+₡2M/año + engagement familiar", domain: "engagement" },
      { priority: "medium", action: "Plan de retención con bonos para personal clave", justification: "Chef ejecutivo y gerente deportivo evaluando ofertas externas", estimated_impact: "Evitar ₡5-8M en costos de reemplazo", domain: "operations" },
    ],
    projection: {
      method: "Regresión lineal (12 meses)",
      confidence: 0.82,
      optimistic: "+9.5% revenue próximo trimestre",
      base: "+6.2% revenue próximo trimestre",
      pessimistic: "+3.0% revenue próximo trimestre",
    },
    suggested_actions: [
      { label: "Contactar 23 familias en riesgo", action_type: "contact", target: "at_risk_families", priority: "high" },
      { label: "Reunión con proveedor F&B", action_type: "meeting", target: "fb_vendor", priority: "high" },
      { label: "Encuesta segmento 36-55", action_type: "review", target: "segment_survey", priority: "medium" },
      { label: "Ver plan de retención RRHH", action_type: "report", target: "hr_retention", priority: "medium" },
    ],
  };
}

// En el REGISTRY:

