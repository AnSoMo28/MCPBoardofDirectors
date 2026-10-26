# Architecture Guardian — Log Digest

- fuente: `report.json` · formato: json · 577871 líneas consumidas · encoding: utf-8
- guardian v4.1.1 · root: C:/Users/nipag/Documents/MCPClubesPrivados/club-platform-castillo_country_club/frontend · generado: 2026-10-22T04:58:01.969Z

## Veredicto
- FAIL ❌ · score: 8 / 10 (threshold 9.3) · 2168ms · 1151 archivos escaneados

## Volumen
| violaciones | errores | warnings | auto-fixable | archivos afectados | prom/arch | máx/arch |
|---:|---:|---:|---:|---:|---:|---:|
| 30075 | 15771 | 14304 | 511 | 1039 | 28.9 | 2410 |

30075 ocurrencias se reducen a **67 clases** de error y **4211 sugerencias** distintas — eso es lo que hay que auditar de verdad.
Pareto: los **top 349 archivos** concentran el 80% de las violaciones (33.6% de los afectados).

## Integridad (autodiagnóstico del auditor)
- ✅ sin anomalías: totales parseados = totales declarados por el guardian; log completo

## Violaciones por capa
| capa | total | errores | warns | % | archivos |
|---|---:|---:|---:|---:|---:|
| features | 23004 | 13289 | 9715 | 76.5% | 804 |
| shared | 6996 | 2460 | 4536 | 23.3% | 224 |
| stores | 34 | 2 | 32 | 0.1% | 5 |
| styles | 27 | 20 | 7 | 0.1% | 1 |
| app | 12 | 0 | 12 | 0.0% | 4 |
| (src root) | 2 | 0 | 2 | 0.0% | 1 |

## Violaciones por regla
| regla | severidad | total | errores | warns | % | auto-fix | archivos |
|---|---|---:|---:|---:|---:|---:|---:|
| X-22 | warn | 11495 | 0 | 11495 | 38.2% | 0 | 483 |
| X-13 | error | 8803 | 8803 | 0 | 29.3% | 0 | 321 |
| X-26 | error | 5249 | 5249 | 0 | 17.5% | 0 | 163 |
| X-23 | error | 487 | 487 | 0 | 1.6% | 0 | 48 |
| X-16 | error | 449 | 449 | 0 | 1.5% | 449 | 169 |
| C-19 | warn | 440 | 0 | 440 | 1.5% | 0 | 440 |
| X-25 | warn | 339 | 0 | 339 | 1.1% | 0 | 339 |
| X-27 | warn | 325 | 0 | 325 | 1.1% | 0 | 325 |
| B-57 | warn | 295 | 0 | 295 | 1.0% | 0 | 295 |
| B-76 | warn | 252 | 0 | 252 | 0.8% | 0 | 252 |
| B-56 | warn | 246 | 0 | 246 | 0.8% | 0 | 246 |
| B-77 | warn | 240 | 0 | 240 | 0.8% | 0 | 60 |
| B-73 | warn | 218 | 0 | 218 | 0.7% | 0 | 218 |
| C-09 | warn | 156 | 0 | 156 | 0.5% | 0 | 96 |
| X-14 | error | 137 | 137 | 0 | 0.5% | 0 | 68 |
| C-01 | error | 122 | 122 | 0 | 0.4% | 0 | 122 |
| B-70 | warn | 113 | 0 | 113 | 0.4% | 0 | 113 |
| X-28 | error | 113 | 113 | 0 | 0.4% | 0 | 113 |
| X-19 | error | 84 | 84 | 0 | 0.3% | 0 | 84 |
| X-21 | error | 84 | 84 | 0 | 0.3% | 0 | 84 |
| B-64 | warn | 68 | 0 | 68 | 0.2% | 0 | 68 |
| C-06 | error | 50 | 50 | 0 | 0.2% | 50 | 50 |
| X-20 | error | 48 | 48 | 0 | 0.2% | 0 | 18 |
| X-04 | error | 45 | 45 | 0 | 0.1% | 0 | 8 |
| X-10 | warn | 42 | 0 | 42 | 0.1% | 0 | 14 |
| X-18 | warn | 36 | 0 | 36 | 0.1% | 0 | 36 |
| X-02 | error | 30 | 30 | 0 | 0.1% | 0 | 29 |
| X-05 | error | 24 | 24 | 0 | 0.1% | 0 | 19 |
| B-78 | warn | 22 | 0 | 22 | 0.1% | 0 | 22 |
| X-06 | error | 12 | 12 | 0 | 0.0% | 0 | 8 |
| X-08 | warn | 12 | 0 | 12 | 0.0% | 0 | 8 |
| X-15 | error | 12 | 12 | 0 | 0.0% | 12 | 9 |
| H-06 | error | 10 | 10 | 0 | 0.0% | 0 | 2 |
| X-12 | warn | 5 | 0 | 5 | 0.0% | 0 | 5 |
| X-03 | error | 4 | 4 | 0 | 0.0% | 0 | 3 |
| B-79 | error | 3 | 3 | 0 | 0.0% | 0 | 1 |
| X-01 | error | 2 | 2 | 0 | 0.0% | 0 | 1 |
| X-07 | error | 2 | 2 | 0 | 0.0% | 0 | 2 |
| X-09 | error | 1 | 1 | 0 | 0.0% | 0 | 1 |

## Top 25 archivos
| archivo | total | errores | warns | reglas dominantes |
|---|---:|---:|---:|---|
| src/shared/mocks/contracts.ts | 2410 | 1 | 2409 | X-22×2409, X-28×1 |
| src/features/sports/types.ts | 624 | 1 | 623 | X-22×623, X-28×1 |
| src/features/facilities/types.ts | 585 | 11 | 574 | X-22×574, X-20×10, X-28×1 |
| src/features/cultural/types.ts | 476 | 4 | 472 | X-22×472, X-20×4 |
| src/features/engagement/types.ts | 452 | 14 | 438 | X-22×438, X-23×10, X-20×3 |
| src/features/communications/types.ts | 370 | 0 | 370 | X-22×370 |
| src/features/operations/components/DailyBriefing.tsx | 354 | 337 | 17 | X-26×332, X-22×11, C-09×3 |
| src/features/operations/components/SmartSchedule.tsx | 341 | 310 | 31 | X-26×305, X-22×28, C-01×1 |
| src/features/members/types.ts | 272 | 16 | 256 | X-22×256, X-23×16 |
| src/features/operations/components/ComplianceCheck.tsx | 269 | 257 | 12 | X-26×254, X-22×9, C-01×1 |
| src/features/finance/types.ts | 253 | 0 | 253 | X-22×253 |
| src/features/finance/components/FinanceIntelligencePanel.tsx | 241 | 238 | 3 | X-26×235, X-19×1, X-14×1 |
| src/features/finance/components/FinancialIntelligence.tsx | 231 | 228 | 3 | X-26×222, X-14×3, C-01×1 |
| src/features/finance/components/NarrativeEngine.tsx | 216 | 213 | 3 | X-26×208, X-23×3, X-19×1 |
| src/features/dashboard/types.ts | 214 | 1 | 213 | X-22×213, X-28×1 |
| src/features/recommendations/types.ts | 206 | 1 | 205 | X-22×205, X-28×1 |
| src/features/recommendations/components/RecQuarterlyTimeline.css | 198 | 190 | 8 | X-13×187, B-77×5, X-14×3 |
| src/features/wellness/types.ts | 198 | 1 | 197 | X-22×197, X-28×1 |
| src/shared/lib/advisor-engine/evolution-types.ts | 185 | 1 | 184 | X-22×184, X-28×1 |
| src/features/recommendations/components/RecActivityCards.css | 183 | 177 | 6 | X-13×176, B-77×2, X-28×1 |
| src/features/recommendations/components/RecClusterViz.css | 178 | 171 | 7 | X-13×170, B-77×3, X-28×1 |
| src/features/finance/components/SeasonalCalendar.tsx | 175 | 165 | 10 | X-26×152, X-23×10, X-22×8 |
| src/features/age-group/components/AgeGroupIntelligencePanel.css | 165 | 162 | 3 | X-13×162, B-57×1, B-78×1 |
| src/features/recommendations/components/RecFamilyStream.css | 165 | 158 | 7 | X-13×158, B-77×3, B-56×1 |
| src/shared/types/ai-intelligence.ts | 158 | 9 | 149 | X-22×149, H-06×8, X-04×1 |

## Hotspots repetidos (misma regla × mismo archivo, ≥3)
| regla | archivo | repeticiones |
|---|---|---:|
| X-13 | src/features/age-group/AgeGroupDashboard.css | 61 |
| X-13 | src/features/age-group/components/AgeGroupAdvisorBanner.css | 45 |
| X-13 | src/features/age-group/components/AgeGroupDistributionPanel.css | 91 |
| X-13 | src/features/age-group/components/AgeGroupHealthScore.css | 58 |
| X-13 | src/features/age-group/components/AgeGroupIntelligencePanel.css | 162 |
| X-13 | src/features/age-group/components/AgeGroupProgramsPanel.css | 65 |
| X-13 | src/features/age-group/components/AgeGroupTrendsPanel.css | 76 |
| X-23 | src/features/age-group/components/AgeGroupTrendsPanel.tsx | 5 |
| X-13 | src/features/age-group/components/AgingOutStrip.css | 24 |
| X-13 | src/features/age-group/components/CohortVitals.css | 55 |
| X-13 | src/features/age-group/components/GenerationalPrism.css | 24 |
| X-13 | src/features/age-group/components/IntelligenceCompass.css | 12 |
| X-13 | src/features/age-group/components/RippleWave.css | 24 |
| X-23 | src/features/age-group/config.ts | 45 |
| X-23 | src/features/age-group/hooks/useAgeGroupDashboard.ts | 4 |
… y 980 más (ver digest.json)

## Firmas de mensaje (top 30)
| ocurrencias | regla(s) | firma | primera aparición |
|---:|---|---|---|
| 11495 | X-22 | Interface "«q»" field "«q»" not readonly | src/app/providers.tsx:L18 · Interface "ProvidersProps" field "children" not readonly |
| 5249 | X-26 | Tailwind utilities in className: "«q»" | src/features/ai-system/AISystemPage.tsx:L329 · Tailwind utilities in className: "w-3.5 h-3.5" |
| 4562 | X-13 | Hardcoded color literal: #HEX | src/features/age-group/AgeGroupDashboard.css:L58 · Hardcoded color literal: #F0F2F5 |
| 4235 | X-13 | Hardcoded color literal: RGB() | src/features/age-group/AgeGroupDashboard.css:L122 · Hardcoded color literal: rgba(0, 0, 0, 0.2) |
| 449 | X-16 | backdrop-filter without -webkit-backdrop-filter mirror | src/features/ai-system/AISystemPage.css:L286 · backdrop-filter without -webkit-backdrop-filter mirror |
| 440 | C-19 | Missing file header (@level + @namespace) | src/app/App.tsx:L1 · Missing file header (@level + @namespace) |
| 339 | X-25 | Missing § section markers | src/app/App.tsx:L1 · Missing § section markers |
| 333 | X-23 | Hex color in TS/TSX string: "«q»" | src/features/age-group/components/AgeGroupProgramsPanel.tsx:L216 · Hex color in TS/TSX string: "#a09890" |
| 325 | X-27 | Exported component without data-testid | src/app/App.tsx:L1 · Exported component without data-testid |
| 295 | B-57 | Missing mobile breakpoint (max-width: 480px) | src/features/age-group/AgeGroupDashboard.css:L1 · Missing mobile breakpoint (max-width: 480px) |
| 252 | B-76 | Selector block after keyframes — keyframes go after styles, before @media | src/features/age-group/AgeGroupDashboard.css:L572 · Selector block after keyframes — keyframes go after styles, before @media |
| 246 | B-56 | Missing tablet breakpoint (max-width: 768px) | src/features/ai-system/AISystemPage.css:L1 · Missing tablet breakpoint (max-width: 768px) |
| 240 | B-77 | Keyframe "«q»" not namespaced | src/features/cultural/CulturalDashboard.css:L535 · Keyframe "cdFadeIn" not namespaced |
| 218 | B-73 | Missing @media print block (§N+N) | src/features/ai-system/AISystemPage.css:L1 · Missing @media print block (§N+6) |
| 156 | C-09 | Button without aria-label and without visible text | src/features/ai-system/AISystemPage.tsx:L351 · Button without aria-label and without visible text |
| 137 | X-14 | transition: all — specify properties | src/features/auth/LoginPage.css:L839 · transition: all — specify properties |
| 131 | X-23 | Hex color in TS/TSX string: '«q»' | src/features/cultural/CulturalDashboard.tsx:L60 · Hex color in TS/TSX string: '#60a5fa' |
| 122 | C-01 | Component has styles but no co-located CSS import | src/features/cultural/components/CulturalAdvisorBanner.tsx:L1 · Component has styles but no co-located CSS import |
| 113 | B-70 | Missing reduced-motion block (§N+N) | src/features/approvals/components/ParamsPreview.css:L1 · Missing reduced-motion block (§N+4) |
| 111 | X-28 | Banned font family: Inter | src/features/age-group/AgeGroupDashboard.css:L174 · Banned font family: Inter |
| 84 | X-19 | Banned animation dependency: framer-motion | src/features/ai-system/AISystemPage.tsx:L14 · Banned animation dependency: framer-motion |
| 84 | X-21 | Default export | src/features/ai-system/AISystemPage.tsx:L488 · Default export |
| 68 | B-64 | Missing light mode overrides (§N+N) | src/features/communications/AnnouncementBoard.css:L1 · Missing light mode overrides (§N+3) |
| 50 | C-06 | CSS file exists but is not imported | src/features/members/components/MemberAmbientCanvas.tsx:L1 · CSS file exists but is not imported |
| 42 | X-10 | Console in advisor rules — rules must be pure | src/shared/lib/advisor-engine/calibration-storage.ts:L71 · Console in advisor rules — rules must be pure |
| 36 | X-18 | Deprecated token --font-body | src/features/communications/AnnouncementBoard.css:L598 · Deprecated token --font-body |
| 36 | X-04 | Inline advisor logic buildInsight() outside advisor-engine | src/features/facilities/lib/advisor/facilitiesRules.ts:L100 · Inline advisor logic buildInsight() outside advisor-engine |
| 30 | X-02 | Local "«q»" duplicates shared/ primitive | src/features/communications/components/CommunicationOverview.tsx:L557 · Local "TrendIcon" duplicates shared/ primitive |
| 26 | X-20 | '«q»' type (: any) | src/features/cultural/components/CulturalLivingCalendar.tsx:L332 · 'any' type (: any) |
| 22 | B-78 | N keyframes in file (max N) | src/features/age-group/components/AgeGroupIntelligencePanel.css:L1 · 11 keyframes in file (max 6) |

## Sugerencias distintas (top 15)
| peticiones | sugerencia |
|---:|---|
| 8803 | Use a token var(--color-*) or add to STRUCTURAL_COLOR_ALLOWLIST with rationale |
| 113 | Use --font-display / --font-mono / --font-ui tokens |
| 12 | Replace with var(--ease-apple) |
| 487 | Reference var(--color-*) from CSS, or centralize in config |
| 449 | Add -webkit-backdrop-filter on the line before (Safari/iOS) |
| 84 | CSS animations only (BASE Rule N) |
| 5249 | Use BEM CSS classes (CHECKLIST C-N) |
| 84 | Named export; entrypoints belong in manifest DEFAULT_EXPORT_ALLOWLIST |
| 24 | Promote the shared surface to @shared/ (BASE Rule N) |
| 137 | transition: transform N.25s var(--ease-apple), opacity N.2s ease |
| 18 | import { TrendIcon } from "«q»"; |
| 122 | Create <Name>.css and import it (BASE Rule N) |
| 48 | Use unknown + type guard (CHECKLIST A-N) |
| 12 | useMCPQuery (reads) / useMCPMutation (writes) from @shared/hooks/useMCPQuery |
| 1 | import { ScoreGauge } from "«q»"; |

## Archivos bajo threshold (869)
- src/features/cultural/CulturalDashboard.css — score 3
- src/features/cultural/components/EntertainmentRadar.css — score 3.3
- src/features/facilities/components/BookingFormModal.css — score 3.3
- src/shared/components/ai/AIBoardBriefViewer.css — score 3.4
- src/shared/components/ai/AIDecisionPanel.css — score 3.4
- src/shared/components/ml/HypotheticalSimulator.css — score 3.4
- src/features/cultural/components/AIEntertainmentDesigner.css — score 3.7
- src/features/cultural/components/AIExhibitionCurator.css — score 3.7
- src/features/cultural/components/AIGalaArchitect.css — score 3.7
- src/features/cultural/components/AIProgramDesigner.css — score 3.7
- src/features/cultural/components/AISocialArchitect.css — score 3.7
- src/styles/globals.css — score 3.8
- src/features/cultural/components/CulturalLivingCalendar.css — score 4
- src/features/facilities/components/ComfortDashboard.css — score 4
- src/features/facilities/components/SpaceROICalculator.css — score 4
- src/features/finance/components/ReportGenerator.css — score 4.1
- src/shared/components/ai/AISimulationPanel.css — score 4.1
- src/shared/components/ai/TwinResults.css — score 4.1
- src/shared/components/chat/AIChatWidget.css — score 4.1
- src/shared/components/layout/NotificationCenter.css — score 4.1
- src/shared/components/layout/WelcomeModal.css — score 4.1
- src/features/facilities/components/FacilityIntelligenceStream.css — score 4.3
- src/features/facilities/components/SpatialGraphView.css — score 4.3
- src/features/recommendations/components/RecPredictions.css — score 4.3
- src/features/members/Member360Dashboard.css — score 4.4

## Muestras por regla dominante (hasta 8 reglas × 3 ejemplos)

### X-22 — 11495 ocurrencias (38.2%)
- src/app/providers.tsx:L18 · Interface "ProvidersProps" field "children" not readonly
- src/features/age-group/hooks/useAgeGroupAdvisor.ts:L74 · Interface "BracketMeta" field "id" not readonly
- src/features/age-group/hooks/useAgeGroupAdvisor.ts:L75 · Interface "BracketMeta" field "label" not readonly

### X-13 — 8803 ocurrencias (29.3%)
- src/features/age-group/AgeGroupDashboard.css:L58 · Hardcoded color literal: #F0F2F5
- src/features/age-group/AgeGroupDashboard.css:L67 · Hardcoded color literal: #8A95A5
- src/features/age-group/AgeGroupDashboard.css:L84 · Hardcoded color literal: #3DAA70

### X-26 — 5249 ocurrencias (17.5%)
- src/features/ai-system/AISystemPage.tsx:L329 · Tailwind utilities in className: "w-3.5 h-3.5"
- src/features/ai-system/AISystemPage.tsx:L331 · Tailwind utilities in className: "w-3.5 h-3.5"
- src/features/ai-system/AISystemPage.tsx:L334 · Tailwind utilities in className: "text-xs"

### X-23 — 487 ocurrencias (1.6%)
- src/features/age-group/components/AgeGroupProgramsPanel.tsx:L216 · Hex color in TS/TSX string: "#a09890"
- src/features/age-group/components/AgeGroupTrendsPanel.tsx:L613 · Hex color in TS/TSX string: "#a09890"
- src/features/age-group/components/AgeGroupTrendsPanel.tsx:L679 · Hex color in TS/TSX string: "#ccc"

### X-16 — 449 ocurrencias (1.5%)
- src/features/ai-system/AISystemPage.css:L286 · backdrop-filter without -webkit-backdrop-filter mirror
- src/features/ai-system/AISystemPage.css:L350 · backdrop-filter without -webkit-backdrop-filter mirror
- src/features/ai-system/AISystemPage.css:L504 · backdrop-filter without -webkit-backdrop-filter mirror
  - 💡 449 auto-fixables: `npx tsx tools/architecture-guardian.ts --fix` las resuelve

### C-19 — 440 ocurrencias (1.5%)
- src/app/App.tsx:L1 · Missing file header (@level + @namespace)
- src/app/RoleRedirect.tsx:L1 · Missing file header (@level + @namespace)
- src/app/providers.tsx:L1 · Missing file header (@level + @namespace)

### X-25 — 339 ocurrencias (1.1%)
- src/app/App.tsx:L1 · Missing § section markers
- src/app/RoleRedirect.tsx:L1 · Missing § section markers
- src/app/providers.tsx:L1 · Missing § section markers

### X-27 — 325 ocurrencias (1.1%)
- src/app/App.tsx:L1 · Exported component without data-testid
- src/app/RoleRedirect.tsx:L1 · Exported component without data-testid
- src/app/providers.tsx:L1 · Exported component without data-testid
