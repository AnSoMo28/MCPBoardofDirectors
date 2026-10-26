```markdown
# INSTRUCCIÓN DE CIERRE DE SESIÓN

## Generá el checkpoint completo para retomar sin pérdidas en el próximo chat.

### Contexto

Cada checkpoint es un documento de continuidad que permite a un nuevo chat retomar exactamente donde dejamos. El nuevo chat SIEMPRE recibe: `CLAUDE_CONTEXT.md` + este checkpoint. Entre ambos documentos deben cubrir el 100% del contexto necesario.

### Reglas de cierre:
- **TODO es PRODUCTION GRADE** — anotalo explícitamente en el checkpoint.
- **No omitir nada** — si algo se discutió, se decidió, se rechazó o se corrigió, debe aparecer.
- **Consolidar, no duplicar** — los pendientes se consolidan en UNA sola tabla sin repetidos.
- **El checkpoint es para OTRO MODELO** — debe ser autosuficiente. Si alguien no participó en esta sesión, con el checkpoint + CLAUDE_CONTEXT.md puede retomar exacto.
- **Formato de entrega de código (referencia):** BLOQUE A (líneas EXACTAS a reemplazar) → BLOQUE B (líneas nuevas). Nunca mezclar. Si es INSERT: "después de X, antes de Y". REWRITE = archivo completo. El nuevo chat debe conocer este formato.

---

### Formato del checkpoint:

```markdown
# CHECKPOINT — Fase [X] [COMPLETADA / EN PROGRESO] — [Título descriptivo]

**Fecha:** [mes año]
**Sesiones completadas:** [N] (histórico) / [N] (esta sesión)
**Archivos creados:** [N nuevos + N modificados]
**Líneas nuevas:** ~[total]
**Tools MCP nuevas:** [N] ([servidor])
**Tools MCP totales registradas:** [N+]
**Tools MCP backend-reales:** [N+] / **Tools MCP mock-only:** [N]
**Advisor rules nuevas:** [N] ([dominio])
**Advisor rules totales:** [N+]
**Agents auditados total:** [N de 19]
**Integration Verifier status:** [PASS/FAIL] — [N errors] / [N warnings]
**TODO ES PRODUCTION GRADE**

---

## 0. ROL SUPER ENRIQUECIDO — REGLA DE ORO

Reproducí INTEGRALMENTE la sección 2 de CLAUDE_CONTEXT.md (las 10 disciplinas, el proceso mental de 10 pasos, la postura operativa, la regla de oro). Esto es INVIOLABLE — el nuevo chat necesita leerlo para entender su identidad.

**Si hubo evolución del rol en esta sesión** (nueva disciplina, nuevo proceso, nueva postura), agregala aquí y marcala como ACTUALIZACIÓN para CLAUDE_CONTEXT.md.

---

## 1. LO QUE ESTAMOS CONSTRUYENDO (recordatorio)

Reproducí brevemente la sección 1 de CLAUDE_CONTEXT.md:
- Castillo AI Platform = "Sistema de Decisión Inteligente" (NO dashboard, NO ERP, NO CRM)
- Las 5 capas de inteligencia (datos → contexto → inteligencia client-side → cross-agent → acción inteligente)
- Arquitectura Advisor completa: 129+ rules, 17 agents, Generic AdvisorBanner, 5 AI tools, RAG engine
- Si esta sesión agregó una nueva capa o evolucionó una existente, documentalo aquí
- Todo PRODUCTION GRADE

---

## 2. LO QUE SE CREÓ EN ESTA SESIÓN

### Archivos Frontend (Nuevos)

| # | Ruta | Líneas | Contenido | Tools MCP que consume |
|---|------|--------|-----------|----------------------|
| 1 | `features/xxx/xxx.tsx` | ~N | [Qué hace] | [Qué tools] |

### Archivos Frontend (Modificados)

| # | Ruta | Acción | Qué se cambió | Por qué |
|---|------|--------|---------------|---------|
| 1 | `features/xxx/xxx.tsx` | QUIRÚRGICO / ENHANCE / REWRITE | [Qué] | [Por qué] |

### Archivos Backend (Nuevos/Modificados)

| # | Ruta | Acción | Contenido |
|---|------|--------|-----------|
| 1 | `backend/xxx/xxx.py` | NUEVO / ENHANCE | [Qué] |

### Archivos de Infraestructura / Scripts (Nuevos/Modificados)

| # | Ruta | Acción | Contenido |
|---|------|--------|-----------|
| 1 | `scripts/xxx.ts` | NUEVO / MODIFY | [Qué hace] |

### Mock System (si aplica)

| Tool | Server | Contract | Factory | Registry | Backend |
|------|--------|----------|---------|----------|---------|
| `tool_name` | `server` | ✅ existe | ✅ nueva | ✅ nueva | ⬜ |

### Tools MCP auditadas/conectadas en esta sesión

| # | Tool | Server | Backend real | Mock | Tipo | Aprobación | Destino frontend |
|---|------|--------|-------------|------|------|-----------|-----------------|
| 1 | `tool_name` | `server` | ✅/⬜ | ✅/⬜ | datos/mutation/inteligencia | AUTO/SEMI/HITL | Componente |

---

## 3. HALLAZGOS DE ESTA SESIÓN

| # | Hallazgo | Severidad | Estado |
|---|---------|-----------|--------|
| 1 | [Diferencia entre esperado y real] | ALTA/MEDIA/BAJA | ✅ Resuelto / ⬜ Pendiente / ⚠️ Parcialmente |

Incluir TODO: bugs encontrados, tipos que no matcheaban, imports rotos, field name mismatches, tools que no existían, mocks incompletos, decisiones de diseño forzadas por hallazgos, tokens fantasma detectados, bugs críticos de runtime (callMCPTool sin import, queryClient sin declarar).

---

## 4. PATRONES ESTABLECIDOS / ACTUALIZADOS

### Si se creó un patrón NUEVO:

**Patrón: [Nombre] ([Fase])**

**Concepto:** [Qué hace en una oración]

**Niveles:**
```
[Nivel 1]: ...
[Nivel 2]: ...
```

**Ejemplo de código:**
```typescript
// código real del patrón
```

**Cuándo se aplica:** [Contextos específicos]
**Fases futuras donde se replica:** [Lista]
**Archivos donde ya está implementado:** [Lista]

### Si se actualizó un patrón existente:

**Patrón: [Nombre] — actualizado en [Fase]**

**Qué cambió:** [Detalle]
**Archivos afectados:** [Lista]

### Patrones que aplicaron sin cambios:
Solo listar nombre + fase de origen.

### Patrones clave del proyecto (siempre presentes):
- **P1:** Auto-load Context + On-demand Intelligence
- **P5:** Health Score Composite (5 factores ponderados, 0-100)
- **P9:** Defensive Data Rendering (?? null, ?? [], safe chains)
- **P14:** Advisor Banner Pattern (post-F21)
- **P20:** Shared Advisor UI Config (IMPACT_CONFIG centralizado)
- **P40:** Generic AdvisorBanner (1 engine + N thin wrappers)
- **P41:** Dashboard Intelligence Layer (intelligence ENCIMA de tabs existentes)
- **P42:** Advisor Hook Architecture (buildCtx → RULES → evaluateRules)

---

## 5. ADVISOR ARCHITECTURE UPDATE

**Si esta sesión modificó la arquitectura Advisor:**

### Advisor nuevo o modificado:
| Fase | Advisor | Reglas | Capas | Actions | AI Features | Estado |
|------|---------|--------|-------|---------|-------------|--------|
| X | useXxxAdvisor | N | N | N | [lista] | ✅ |

### Nuevas reglas Advisor:
Listar CADA regla con: #, nombre, condición, impacto (HIGH/MEDIUM/LOW), output.

### Nuevas acciones Advisor:
| Insight ID | Tool MCP | Server | Approval | Params |
|-----------|----------|--------|----------|--------|

### AI tools nuevas/modificadas:
| Tool | Server | Input | Output | Approval | Backend |
|------|--------|-------|--------|----------|---------|

### Advisor Architecture completa (siempre incluir resumen):

```
TOTAL: 129+ deterministic rules + 5 AI tools
+ RAG engine (8 tools, hybrid search, reranking)
+ Generic AdvisorBanner (1 engine + N thin wrappers)
+ 11 executable actions + reaction feedback loop
+ predictive pre-fetch + conversational context
0 tokens client-side + AI reasoning backend + RAG retrieval
```

---

## 6. DECISIONES DE DISEÑO

| # | Decisión | Alternativa descartada | Razón | Impacto |
|---|---------|----------------------|-------|---------|
| 1 | [Qué decidimos] | [Qué no hicimos] | [Por qué] | [Qué afecta en el futuro] |

**IMPORTANTE:** Documentar TODAS las decisiones, incluyendo las que el usuario rechazó. Esto evita que un nuevo chat proponga algo que ya se descartó.

---

## 7. ESTADO COMPLETO DE FASES

| Fase | Contenido | Estado |
|------|-----------|--------|
| F1-FXX | [Resumen] | ✅ |
| **FXX** | **[Fase actual] — [título]** | **✅ COMPLETADA / 🔄 EN PROGRESO (X/Y bloques)** |
| **FXX+1** | **[Siguiente fase] — [título]** | **⬜ SIGUIENTE** |
| FXX+2 | [Descripción] | ⬜ |
| ... | ... | ... |

**Incluir TODAS las fases completadas + las pendientes restantes.**
**Incluir sub-bloques con su estado si la fase tuvo múltiples bloques.**

---

## 8. PRÓXIMA FASE — Desglose detallado

### [Nombre de la fase]

**Objetivo:** [Qué logra esta fase en una oración]

**Agentes backend a leer:**
```
backend/src/club_mcp/agents/xxx_agent.py
backend/src/club_mcp/models/xxx.py
```

**Tools MCP a auditar:**

| # | Tool (estimada) | Agente | Tipo esperado | Approval esperado | Destino frontend |
|---|-----------------|--------|---------------|-------------------|-----------------|
| 1 | `tool_name` | `agent` | datos/mutation/inteligencia | AUTO/SEMI/HITL | Componente |

**Bloques propuestos:**

| # | Bloque | Archivos a crear/modificar | Contenido | Dependencias |
|---|--------|---------------------------|-----------|-------------|
| B1 | [Nombre] | [Lista] | [Qué hace] | [Qué necesita] |

**ApprovalQueue impact:** [Si hay tools HITL nuevas, qué se agrega]

**Archivos que el usuario debe pegar en el próximo chat:**
```
1. Este checkpoint
2. CLAUDE_CONTEXT.md
3. backend/src/club_mcp/agents/xxx_agent.py
4. backend/src/club_mcp/models/xxx.py
5. frontend/src/features/xxx/XxxDashboard.tsx
```

---

## 9. AGENTES AUDITADOS — LISTA ACTUALIZADA

| # | Agente | Server | Tools totales | HITL | AUTO | SEMI | Inteligencia | Fase auditado | Frontend conectado | Estado |
|---|--------|--------|--------------|------|------|------|-------------|---------------|-------------------|--------|
| 1 | `name` | `server` | N | N | N | N | [tools de intel] | FX | Componente ✅ | ✅ Completo / ⬜ Parcial / ⬜ Sin auditar |

**Totales:** X agents completamente auditados, Y parcialmente, Z sin auditar. ~N tools MCP.

---

## 10. PENDIENTES ACUMULADOS (CONSOLIDADO)

| # | Issue | Severidad | Archivo(s) | Fase sugerida | Origen |
|---|-------|-----------|-----------|---------------|--------|
| 1 | [Descripción] | ALTA/MEDIA/BAJA | `ruta/archivo.tsx` | FX | [En qué fase se descubrió] |

**Reglas:**
- NO repetir issues ya resueltos
- Incluir TODOS los pendientes de todas las sesiones (consolidar)
- Si un pendiente se resolvió esta sesión, eliminarlo de la lista
- Si un pendiente cambió de severidad, actualizarlo
- Cada pendiente nuevo de esta sesión se marca con "(NUEVO)"
- Incluir herramientas mock-only como pendientes de backend migration (Check 6 del Verifier)

---

## 11. VERIFICACIÓN CONTRA REGLAS

### Para cada archivo NUEVO:

| Regla | Estado | Evidencia |
|-------|--------|-----------|
| #1 Tokens | ✅/❌ | [Evidencia] |
| #2 No blur | ✅/❌/N/A | |
| #3 ChartTheme | ✅/❌/N/A | |
| ... | | |
| #29 Check domain-enums/ai-intelligence antes de crear tipos | ✅/❌/N/A | |

### Para archivos MODIFICADOS:
Solo listar las reglas que aplican al cambio específico (no re-verificar todo el archivo).

### Integration Verifier (si existe):
```
Comando: pnpm verify:integration
Resultado: PASS/FAIL — N errors / N warnings
Check 1 (Router): N/N valid
Check 2 (Mock): N/N in registry (N backend fallback)
Check 3 (Phantom tokens): N found
Check 4 (Raw buttons): N in shared
Check 5 (PermissionGate): N/N routes
Check 6 (Backend missing): N mock-only
Check 7 (Duplicates): N found
```

### Resumen:
**Violaciones a corregir AHORA:** [N]
**Violaciones ya flagged como pendientes:** [N]
**Reglas sin violaciones:** [N/29]

---

## 12. ACTUALIZACIONES PARA CLAUDE_CONTEXT.md

Listá SOLO los cambios necesarios con el contenido exacto:

### Si hay cambios:
```markdown
### Sección X: [Nombre] — [AGREGAR / REEMPLAZAR / ACTUALIZAR]

[Contenido exacto a agregar/reemplazar]
```

### Si no hay cambios:
"Sin cambios necesarios en CLAUDE_CONTEXT.md."

---

## 13. QUICK START PARA NUEVO CHAT

### Paso 1 — Pegar contexto (en orden):
```
1. CLAUDE_CONTEXT.md (siempre primero)
2. Este checkpoint
```

### Paso 2 — Confirmar rol:
```
"Confirmá que entendés tu rol como Principal AI Systems Architect (sección 2 de CLAUDE_CONTEXT.md) 
y las 29+ reglas (sección 7). Después decí 'Listo'."
```

### Paso 3 — Pedir archivos para la siguiente fase:
```
"Pasame estos archivos para FXX — [Nombre de fase]:
1. [backend agent .py]
2. [backend models .py]
3. [frontend componente principal]"
```

### Paso 4 — Pedir auditoría:
```
"Auditá el agente y los modelos contra [lo que corresponda]"
```

### Paso 5 — Pedir propuesta:
```
"Proponé la arquitectura de FXX con los bloques"
```

### Paso 6 — Aprobar + generar:
```
"Aprobado — generá Bloque 1"
```

### Paso 7 — Checkpoint:
```
"Generá el checkpoint de FXX"
```

---

## 14. DECISION LOG

| Fecha | Decisión | Razón | Impacto en trabajo futuro |
|-------|---------|-------|--------------------------|
| [Fecha] | [Qué decidimos] | [Por qué] | [Qué no hacer / Qué sí hacer en futuras fases] |

**Reglas:**
- Incluir TODAS las decisiones de esta sesión
- Incluir decisiones que el usuario RECHAZÓ (con razón)
- Incluir decisiones que se CORRIGIERON durante la sesión
- Formato: una fila por decisión, concisa pero completa

---

## 15. FASES RESTANTES (PLAN MAESTRO)

| # | Fase | Contenido | Prioridad | Depende de | Estado |
|---|------|-----------|-----------|-----------|--------|
| F43 | Integration Testing + Wiring | [Descripción] | ALTA | F40+F41+F42 | ✅/🔄/⬜ |
| F44 | ML models reales | [Descripción] | BAJA | F43 | ⬜ |
| F45 | Real data integration | [Descripción] | BAJA | F44 | ⬜ |
| ... | ... | ... | ... | ... | ⬜ |

**Incluir TODAS las fases restantes del plan maestro actualizado.**

---

## 16. AGENTES BACKEND — TOOLS DETALLADAS (si hubo cambios)

Solo incluir si esta sesión auditó un agente nuevo o descubrió tools nuevas.

### [Nombre agente] — N tools

| Tool | Approval | Tipo | Descripción | Backend real | Mock |
|------|----------|------|-------------|-------------|------|
| `tool_name` | HITL/AUTO/SEMI | mutation/datos/inteligencia | [Qué hace] | ✅/⬜ | ✅/⬜ |

---

## 17. MOCK REGISTRY — ACTUALIZACIÓN (si hubo cambios)

### [Server name] (N tools)

| # | Tool | Backend real | Mock | Tipo | Approval |
|---|------|-------------|------|------|----------|
| 1 | `tool_name` | ✅/⬜ | ✅/⬜ | [tipo] | [approval] |

**Regla del mock-registry:** Es un domain-keyed object:
```typescript
// CORRECTO:
domain_name: {
  tool_name: (params) => createMockToolName(params),
},
```

---

## 18. TYPES ALIGNMENT (si hubo cambios)

| Enum/Interface | Backend (Python) | Frontend (types.ts) | Match |
|---------------|------------------|---------------------|-------|
| `EnumName` | values: [...] | values: [...] | ✅ / ❌ (detalle) |

**Reglas de tipos:**
- Cross-domain enums → `domain-enums.ts` (source of truth)
- AI generic types → `ai-intelligence.ts` (source of truth)
- Domain-specific → `features/*/types.ts`
- Siempre buscar antes de crear (Regla #29)
- Enums maestros actualmente: 21+ (incluyendo ScenarioType)

---

## 19. CROSS-DOMAIN INTEGRATION MAP (si hubo cambios)

| Dominio origen | Señal | Dominio destino | Tipo | Estado |
|---------------|-------|----------------|------|--------|
| [Dominio A] | [Qué dato produce] | [Dominio B] | inbound/outbound | ✅ Conectado / ⬜ Pendiente |

---

## 20. INTEGRATION VERIFIER STATUS

### Resultado de la última ejecución:
```
Fecha: [fecha]
Comando: pnpm verify:integration
Resultado: PASS/FAIL

| Check | Resultado | Interpretación |
|-------|-----------|---------------|
| 1. Router imports | N/N | ✅/⚠️ |
| 2. Mock registry | N/N (N backend fallback) | ✅/⚠️ |
| 3. Phantom tokens | N found | ✅/⚠️ |
| 4. Raw buttons | N non-primitive | ✅/⚠️ |
| 5. PermissionGate | N/N routes | ✅/⚠️ |
| 6. Backend missing | N mock-only | ⚠️ roadmap |
| 7. Duplicate routes | N found | ✅/⚠️ |

Errors: N | Warnings: N
```

### Acciones tomadas post-verifier:
| # | Action | Estado |
|---|--------|--------|
| 1 | [Qué se hizo con los findings] | ✅/⬜ |

---

IMPORTANTE:
- Usá TODA la información de esta conversación, no solo lo último.
- Si hubo correcciones durante la sesión, incluilas en hallazgos.
- Si hubo bugs no resueltos, incluilos en pendientes.
- El checkpoint debe ser SUFICIENTE para que alguien que no participó en esta sesión pueda retomar exactamente donde dejamos.
- SIEMPRE incluir el rol enriquecido (sección 0) y el recordatorio de lo que construimos (sección 1).
- SIEMPRE incluir el Quick Start (sección 13) con los pasos concretos.
- SIEMPRE incluir el plan maestro de fases restantes (sección 15).
- SIEMPRE incluir la lista actualizada de agentes auditados (sección 9).
- SIEMPRE incluir el Integration Verifier status (sección 20).
- Las secciones que no aplican (ej: Advisor update si no hubo cambios Advisor) se omiten con "Sin cambios esta sesión."
- Todo lo que estamos creando es PRODUCTION GRADE — ANOTALO.
- El formato de entrega de código entre chats es BLOQUE A/B — el nuevo chat debe conocer esta convención.
- Hay 29 reglas de diseño (no 22) — actualizar referencia.
- Hay 10 disciplinas (no 9) — Creative Direction se agregó como disciplina #10.
- El total de Advisor rules es 129+ (no 81) — actualizar referencia.
- Los agents auditados son 17 de 19 — actualizar referencia.
```

---

## 2. Prompt limpio — solo lo nuevo

Ver el bloque de arriba. El prompt original tenía **18 secciones (0-18)**. El corregido tiene **21 secciones (0-20)**.

---

## 3. Qué agregué y por qué

### Secciones nuevas:

| Sección nueva | Qué es | Por qué la agregué |
|---|---|---|
| **§20 — Integration Verifier Status** | Captura el output del verifier en el checkpoint | Para que el próximo chat sepa exacto qué checks pasaron y qué warnings hay, sin tener que re-ejecutar |
| **§19 — Cross-Domain Integration Map** | Mapeo de señales entre dominios | Los advisors nuevos (AgeGroup, Guest, Satisfaction, ML) tienen cross-domain signals que deben documentarse |
| **Header — Tools MCP backend-reales vs mock-only** | Desglose en metadata del checkpoint | Los 32 tools mock-only son roadmap de backend — el próximo chat necesita saber qué es real y qué es mock |

### Cambios en secciones existentes:

| Sección | Qué cambié | Por qué |
|---|---|---|
| **Header** | +`Tools MCP backend-reales`, +`Agents auditados total`, +`Integration Verifier status`, +`TODO ES PRODUCTION GRADE` | Metadata ejecutiva que antes no estaba visible de un vistazo |
| **§0** | Cambiado "9 disciplinas" → "10 disciplinas" | Creative Direction se agregó como disciplina #10 en la sesión |
| **§1** | +`Arquitectura Advisor completa: 129+ rules, 17 agents, Generic AdvisorBanner` | El recordatorio debe incluir la magnitud actual del sistema |
| **§3** | +`tokens fantasma detectados, bugs críticos de runtime (callMCPTool sin import, queryClient sin declarar)` | Dos bugs críticos que encontramos en F43 — el próximo chat debe saber que existieron |
| **§4** | +`### Patrones clave del proyecto (siempre presentes)` con P1, P5, P9, P14, P20, P40, P41, P42 | El próximo chat necesita estos 8 patrones como referencia inmediata sin buscar en CLAUDE_CONTEXT |
| **§5** | +`### Advisor Architecture completa (siempre incluir resumen)` con bloque de totales | El Advisor Architecture se volvió tan grande que necesita un resumen siempre-presente en cada checkpoint |
| **§10** | +`Incluir herramientas mock-only como pendientes de backend migration (Check 6 del Verifier)` | Los 32 tools del Check 6 son pendientes reales que deben rastrearse |
| **§11** | +Integration Verifier output section, cambiado "24 reglas" → "29 reglas" | El verifier existe ahora y debe reportarse; hay 29 reglas, no 22 |
| **§13** | Cambiado "22+ reglas" → "29+ reglas" | Consistencia con el conteo real |
| **§17** | +Regla del mock-registry pattern (domain-keyed object) | Pattern establecido en F40 que el nuevo chat debe conocer |
| **§18** | +`21+` enums maestros, +reglas de tipos (domain-enums, ai-intelligence, Regla #29) | El type system se volvió complejo — necesita referencia rápida |
| **§2 (metadata)** | +`Archivos de Infraestructura / Scripts` como tabla nueva | F43 creó el Integration Verifier script — los scripts de infraestructura tienen su propia categoría |

### Reglas globales nuevas (al final del prompt):

| Regla nueva | Por qué |
|---|---|
| "El formato de entrega de código entre chats es BLOQUE A/B" | El usuario usa este formato — el nuevo chat debe conocerlo desde el inicio |
| "Hay 29 reglas de diseño (no 22)" | Corrección de referencia |
| "Hay 10 disciplinas (no 9)" | Corrección de referencia |
| "El total de Advisor rules es 129+ (no 81)" | Corrección de referencia |
| "Los agents auditados son 17 de 19" | Corrección de referencia |
| "TODO es PRODUCTION GRADE — ANOTALO" | Refuerzo — el usuario lo pidió explícitamente |

---
