```markdown
# INSTRUCCIÓN DE CIERRE DE SESIÓN

## Generá el checkpoint completo para retomar sin pérdidas en el próximo chat.

### Contexto

Cada checkpoint es un documento de continuidad que permite a un nuevo chat retomar exactamente donde dejamos. El nuevo chat SIEMPRE recibe: `CLAUDE_CONTEXT.md` + este checkpoint. Entre ambos documentos deben cubrir el 100% del contexto necesario.

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
**Advisor rules nuevas:** [N] ([dominio])
**Advisor rules totales:** [N]

---

## 0. ROL SUPER ENRIQUECIDO — REGLA DE ORO

Reproducí INTEGRALMENTE la sección 2 de CLAUDE_CONTEXT.md (las 9 disciplinas, el proceso mental de 10 pasos, la postura operativa, la regla de oro). Esto es INVIOLABLE — el nuevo chat necesita leerlo para entender su identidad.

**Si hubo evolución del rol en esta sesión** (nueva disciplina, nuevo proceso, nueva postura), agregala aquí y marcala como ACTUALIZACIÓN para CLAUDE_CONTEXT.md.

---

## 1. LO QUE ESTAMOS CONSTRUYENDO (recordatorio)

Reproducí brevemente la sección 1 de CLAUDE_CONTEXT.md:
- Castillo AI Platform = "Sistema de Decisión Inteligente" (NO dashboard, NO ERP, NO CRM)
- Las 5 capas de inteligencia (datos → contexto → inteligencia client-side → cross-agent → acción inteligente)
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

Incluir TODO: bugs encontrados, tipos que no matcheaban, imports rotos, field name mismatches, tools que no existían, mocks incompletos, decisiones de diseño forzadas por hallazgos.

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
- Cada nuevo pendiente nuevo de esta sesión se marca con "(NUEVO)"

---

## 11. VERIFICACIÓN CONTRA REGLAS

### Para cada archivo NUEVO:

| Regla | Estado | Evidencia |
|-------|--------|-----------|
| #1 Tokens | ✅/❌ | [Evidencia] |
| #2 No blur | ✅/❌/N/A | |
| #3 ChartTheme | ✅/❌/N/A | |
| ... | | |
| #24 Mock routing | ✅/❌/N/A | |

### Para archivos MODIFICADOS:
Solo listar las reglas que aplican al cambio específico (no re-verificar todo el archivo).

### Resumen:
**Violaciones a corregir AHORA:** [N]
**Violaciones ya flagged como pendientes:** [N]
**Reglas sin violaciones:** [N/24]

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
y las 22+ reglas (sección 7). Después decí 'Listo'."
```

### Paso 3 — Pedir archivos para la siguiente fase:
```
"Pasame estos archivos para FXX — [Nombre de fase]:
1. [backend agent .py]
2. [backend models .py]
3. [frontend componente principal]
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
| F23 | [Nombre] | [Descripción] | ALTA/MEDIA/BAJA | [Fases previas] | ⬜ |
| F24 | ... | ... | ... | ... | ⬜ |
| ... | ... | ... | ... | ... | ⬜ |

---

## 16. AGENTES BACKEND — TOOLS DETALLADAS (si hubo cambios)

Solo incluir si esta sesión auditó un agente nuevo o descubrió tools nuevas.

### [Nombre agente] — N tools

| Tool | Approval | Tipo | Descripción |
|------|----------|------|-------------|
| `tool_name` | HITL/AUTO/SEMI | mutation/datos/inteligencia | [Qué hace] |

---

## 17. MOCK REGISTRY — ACTUALIZACIÓN (si hubo cambios)

### [Server name] (N tools)

| # | Tool | Backend real | Mock | Tipo | Approval |
|---|------|-------------|------|------|----------|
| 1 | `tool_name` | ✅/⬜ | ✅/⬜ | [tipo] | [approval] |

---

## 18. TYPES ALIGNMENT (si hubo cambios)

| Enum/Interface | Backend (Python) | Frontend (types.ts) | Match |
|---------------|------------------|---------------------|-------|
| `EnumName` | values: [...] | values: [...] | ✅ / ❌ (detalle) |

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
- Las secciones que no aplican (ej: Advisor update si no hubo cambios Advisor) se omiten con "Sin cambios esta sesión."
- Todo lo que estamos creando es PRODUCTION GRADE ANOTALO
```