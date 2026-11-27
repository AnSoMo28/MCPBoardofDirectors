# ADR-0013 — Puerto de evidencia: el gobierno como artefacto verificable (Ola 4.4 · Q-GOV-04 charter, cierre de Ola 4)

**Estado:** Aceptado · **Fecha:** 2026-11-27 · **Base:** ADR-0010 (ledger + recibos) · ADR-0011 (constitución ejecutable) · ADR-0012 (four-eyes + backtesting)

## Contexto

Ola 4 construyó el gobierno como dato verificable: ledger doble sellado (4.1), constitución ejecutable con economía (4.2), doble aprobación en la cadena + contrafactual computable (4.3). Pero cada pieza exporta por su lado: el ledger tiene `a_json`, el recibo viaja suelto, el backtesting produce un espejo y un informe. Cuando el tercero (auditor, seguro, regulador, junta) pide «demuéstrame que este gobierno operó bajo las reglas que dice operar», la respuesta tiene que ser UN artefacto, no cuatro instrucciones de ensamblado. El charter (guía G40 §8, S40f) cierra la ola con exactamente eso: **puerto de evidencia + bundle verificable + bump G42**.

Nota de identidad: el Q-GOV-04 **cerrado** en G8 (`verify-master-consistency.py`) es el del censo G9 §15-P2; este es el del charter Ola 4 §5.4 — ID colisionado, misma anotación de reconciliación que Q-GOV-01/02 en G40/G41.

## Decisiones

### D1 — El bundle ES una cadena, no un ZIP: raíz Merkle única sobre componentes canónicos

`puerto_evidencia.py` empaqueta constitución + ledger principal + espejos contrafactuales (con sus informes) como **componentes** (`nombre` + `contenido` canon), cada uno con `sha = sha256(nombre + \n + contenido)` — renombrar no puede hacer pasar un contenido por otro. El **manifiesto** los lista en orden alfabético y amarra TODOS los hashes en una **raíz Merkle** (misma primitiva RFC 6962 del ledger). Por qué Merkle y no un dict de hashes suelto: un dict verifica cada archivo pero deja el manifiesto mismo sin ancla — un emisor deshonesto regeneraría manifiesto y archivo juntos. La raíz publicada fuera de banda (acta, póliza, board) congela el estado COMPLETO del gobierno en 64 caracteres; cualquier mutación posterior de cualquier componente cambia la raíz.

El **orden del snapshot**: el bundle contiene el ledger AL momento del snapshot; el sello `snapshot_evidencia` es el evento SIGUIENTE. Una raíz no puede amarrar el evento que la declara — el sello demuestra que el snapshot ocurrió sin auto-incluirse, y `eventos_al_snapshot` en sus detalles calza exacto con el conteo del manifiesto.

### D2 — Verificación offline COMPLETA: el bundle no confía en nada declarado

`BundleEvidencia.desde_json` re-verifica todo desde el artefacto: (1) el conjunto de componentes declarados existe y cada hash recalculado calza; (2) la raíz Merkle se re-deriva; (3) el ledger exportado re-verifica su cadena completa y su conteo; (4) la constitución RE-CARGA por `cargar_constitucion` (misma puerta del runtime) y su sha/versión calzan con el manifiesto. La emisión es igual de fail-closed: sin constitución, ledger corrupto o espejo roto → `EvidenciaInvalida` — el puerto no exporta evidencia que no verifica (exportarla sería peor que no exportar: daría fe de algo falso). Las utilidades del tercero (`raiz_de`, `contar_veredictos`) heredan el fail-closed: la raíz de un bundle roto no existe.

Para que el componente de constitución sea EXACTAMENTE el documento validado, `Constitucion` retiene su `documento_canon` (campo aditivo con default, mismo patrón de `protocolo` en 4.3): el puerto exporta el canon que se validó, no una re-serialización que podría divergir del sha sellado.

### D3 — El puerto nace SIN cableado del runtime — cerrar la ola es tener el artefacto

Igual que el ledger en 4.1 (ADR-0010 D3): el puerto entrega el contrato + la suite, NO un endpoint MCP. `PuertoEvidencia.emitir()` existe para que el runtime/CI lo consuma cuando el ciclo 5.x lo pida (p. ej. snapshot al cierre de sesión, bundle mensual al seguro); la suite de contrato blinda esa integración. Cerrar Ola 4 significa que el gobierno del club VIAJA como evidencia verificable — la superficie MCP queda intacta (capa backend, cero tools nuevas).

## Consecuencias

- (+) Ola 4 CERRADA: ledger → constitución → motor+economía → four-eyes → contrafactual → **evidencia portable**. El ciclo completo con la misma ley de diseño (piso determinista verificable offline primero, ADR-0009).
- (+) La raíz Merkle del bundle es el «acta de 64 caracteres»: publicable en junta, póliza o board; detecta cualquier mutación posterior del bundle completo.
- (+) Los contrafactuales dejan de ser análisis perecederos: un espejo en el bundle es evidencia del mismo rango que el ledger real (misma cadena de custodia).
- (+) `documento_canon` en `Constitucion` cierra una brecha latente: la exportación siempre calza con el sha sellado, también con constituciones custom (tests, propuestas de reforma).
- (−) El bundle completo crece con el ledger (exporta eventos, no solo raíces): para ledgers grandes, el recibo Merkle por evento (4.1) sigue siendo el artefacto O(log n) — el bundle es el snapshot de cierre, no el mecanismo de consulta cotidiana.
- (−) La CLI standalone del tercero envuelve `verificar_bundle` pero vive como script aparte (siguiente parche si el ciclo 5 la pide); hoy la verificación programática es completa y la función es stdlib-pura.

## Próximo paso (charter)

Cierre de Ola 4: bump G42 (masters v9.36 → v9.37, «Ola 4 absorbida: gobierno como dato verificable 4.1→4.4») + retomar DV-001 (retro vanguardia Ola 3) según la guía consolidada vigente.
