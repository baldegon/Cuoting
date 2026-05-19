# Cuoting — Dev Log

Este archivo es la bitácora viva del proyecto.

Objetivo:
- dejar trazabilidad de lo que hicimos
- saber qué estudiar cuando retomes
- ubicar rápido qué archivos tocar
- evitar volver a pensar desde cero

## Cómo usar este archivo

En cada bloque de trabajo registrar:
- qué se hizo
- por qué se hizo
- qué quedó pendiente
- qué conviene estudiar
- qué archivos mirar primero al retomar

## Regla nueva de aprendizaje

- Cada bug importante o situación con mucho valor técnico se anota DIRECTAMENTE acá.
- No solo como "se arregló", sino como **caso de estudio**:
  - qué lo rompió
  - qué supuesto era incorrecto
  - cómo detectarlo antes la próxima vez
  - qué concepto de software engineering conviene repasar

---

## 2026-05-13 — Arranque del proyecto

### Qué hicimos
- Se definió el nombre oficial del producto: **Cuoting**.
- Se ajustó el foco del MVP hacia **tarjetas + compras en cuotas**.
- Se detectó un requisito importante del dominio: una compra puede repartirse entre **más de una tarjeta**.
- Se eligió el stack **Astro + Supabase** para lanzar rápido el MVP.
- Se bootstrappeó el proyecto con:
  - Astro
  - TypeScript
  - Tailwind
  - Supabase SSR
  - login/logout
  - dashboard protegido
  - primer módulo de **cards**
- Se agregó migración SQL inicial para `cards` con enfoque por usuario y RLS.

### Por qué se hizo
- Queremos validar la idea en una semana.
- Ya dominás Astro + Supabase, así que conviene usar velocidad real y no teoría.
- El MVP necesita una base funcional hoy, no arquitectura perfecta.

### Qué estudiar
- Supabase Auth con Astro SSR
- RLS en Supabase para ownership por usuario
- modelado de cuotas, asignaciones y vencimientos
- manejo de fechas para cierres y vencimientos de tarjeta

### Qué tocar si retomás
- `src/lib/supabase.ts` → clientes y helpers de Supabase
- `src/middleware.ts` → protección de sesión/rutas
- `src/pages/login.astro` → login
- `src/pages/dashboard.astro` → dashboard inicial y cards
- `src/pages/api/cards/create.ts` → alta de tarjeta
- `supabase/migrations/0001_init_cards.sql` → base del modelo inicial
- `README.md` → pasos de setup local

### Próximo paso recomendado
- implementar **compras en cuotas**
- permitir asociar una compra a **una o más tarjetas**
- empezar a calcular cuotas activas por tarjeta

### Bloqueos / notas
- El entorno local necesita **Node >= 22.12.0**.
- Sin eso, Astro puede fallar al ejecutar comandos locales.

---

## 2026-05-14 — MVP compras en cuotas multi-tarjeta

### Qué hicimos
- Se agregó la migración `0002_purchases_installments.sql` con nuevas tablas:
  - `purchases`
  - `purchase_allocations`
  - `installment_plans`
  - `installments`
- Se configuraron RLS y políticas de lectura/alta por ownership (`auth.uid() = user_id`) para todas las tablas nuevas.
- Se implementó endpoint `POST /api/purchases/create` para crear una compra en cuotas con asignaciones por tarjeta.
- Se agregaron validaciones de servidor para:
  - datos obligatorios
  - cuotas válidas
  - montos positivos
  - tarjetas pertenecientes al usuario
  - suma de asignaciones igual al total de compra
- Se implementó generación automática de:
  - `purchase_allocations`
  - `installment_plans` (frecuencia mensual)
  - `installments` (con ajuste de redondeo en última cuota)
- Se actualizó `dashboard` con:
  - formulario de compra en cuotas
  - asignaciones dinámicas por tarjeta
  - listado de compras con resumen por tarjeta y estado (`active/completed`)

### Por qué
- El foco del producto es tarjetas + cuotas.
- Necesitábamos cerrar el bloque core del dominio para empezar a validar valor real del MVP.

### Qué estudiar
- Cómo convertir la creación de compra en una operación transaccional (RPC/función SQL) para evitar estados parciales ante errores intermedios.
- Estrategia de pago de cuota (`pending` → `paid`) y cómo impacta en dashboard y métricas.

### Qué tocar si retomás
- `supabase/migrations/0002_purchases_installments.sql` → modelo de compras/asignaciones/planes/cuotas y RLS.
- `src/pages/api/purchases/create.ts` → validaciones y generación de planes/cuotas.
- `src/pages/dashboard.astro` → formulario y listado de compras en cuotas.

### Próximo paso
- agregar acción para marcar cuotas como pagadas y recalcular estado real de compra/tarjeta.

### Bloqueos / notas
- La creación hoy no es transaccional de punta a punta: si falla una inserción intermedia puede quedar data parcial.
- Para MVP es aceptable, pero hay que endurecerlo antes de escalar.

---

## 2026-05-16 — Endurecimiento P0 de consistencia y auth

### Qué hicimos
- Se reemplazó la creación de compra por un RPC SQL atómico (`create_purchase_atomic`) para crear compra + asignaciones + planes + cuotas en una sola transacción.
- Se simplificó `POST /api/purchases/create` para conservar validaciones actuales y delegar la escritura completa al RPC.
- Se endureció `src/middleware.ts` resolviendo usuario con `supabase.auth.getUser()` y exponiendo `locals.supabase` + `locals.user`.
- Se corrigió `POST /api/cards/create` para manejar errores de inserción y responder por query params (`card_error`, `card_success`).
- Se sanitizó login para no exponer mensajes crudos de Supabase (`Credenciales inválidas`).
- Se actualizó dashboard para mostrar feedback de creación de tarjetas por query params.

### Por qué
- Evitar estados parciales al fallar inserciones intermedias en compras multi-tabla.
- Reducir riesgo de confiar solo en sesión local y reforzar resolución de usuario en server.
- Evitar errores silenciosos y mantener UX de feedback consistente en el dashboard.

### Qué estudiar
- Si conviene mover más validaciones al RPC (sin duplicar lógica con API).
- Estrategia de observabilidad mínima para errores de rutas API en producción.

### Qué tocar si retomás
- `supabase/migrations/0003_purchase_atomic_rpc.sql` → función transaccional de creación de compra.
- `src/pages/api/purchases/create.ts` → validaciones + llamada RPC.
- `src/middleware.ts` y `src/types/astro.d.ts` → resolución robusta de usuario y locals tipados.
- `src/pages/api/cards/create.ts` y `src/pages/dashboard.astro` → feedback explícito de alta de tarjetas.
- `src/pages/api/auth/login.ts` → mensaje de error sanitizado.

### Próximo paso
- Agregar logging mínimo de errores API para distinguir fallos de validación vs fallos de infraestructura.

### Bloqueos / notas
- El RPC requiere ejecutar la nueva migración en DB antes de usar creación de compras.

---

## 2026-05-16 — Fix de crash SSR en `npm run dev`

### Qué hicimos
- Se diagnosticó el crash de runtime: `TypeError: cookies.getAll is not a function` en `src/lib/supabase.ts`.
- Se corrigió la lectura de cookies para Supabase SSR usando `request.headers.get('cookie')` como fuente.
- Se cambió la firma de `getSupabaseServerClient` para recibir `(cookies, request)`.
- Se actualizaron todos los callsites para pasar `request`:
  - `src/middleware.ts`
  - `src/pages/dashboard.astro`
  - `src/pages/api/auth/login.ts`
  - `src/pages/api/auth/logout.ts`
  - `src/pages/api/cards/create.ts`
  - `src/pages/api/purchases/create.ts`
- Se validó que `npm run dev` levanta correctamente (puerto alternativo si 4321 está ocupado).

### Por qué
- La implementación previa asumía una API de `AstroCookies` que no estaba disponible en runtime.
- Eso provocaba unhandled rejection y rompía el flujo de auth antes de renderizar páginas.

### Qué estudiar
- Diferencias entre `Astro.cookies` y `Request.headers` según runtime/adaptador.
- Buenas prácticas de integración entre Astro SSR y `@supabase/ssr`.

### Qué tocar si retomás
- `src/lib/supabase.ts` → estrategia de extracción/seteo de cookies SSR.
- `src/middleware.ts` → inicialización de cliente server y resolución de usuario.

### Próximo paso
- Ejecutar smoke test completo: login, alta tarjeta, alta compra multi-tarjeta, validaciones de error.

### Bloqueos / notas
- Si `4321` está en uso, Astro levanta en `4322` automáticamente.

---

## 2026-05-16 — Registro de usuarios para usabilidad MVP

### Qué hicimos
- Se creó la nueva pantalla `/register` con formulario de email, contraseña y confirmación de contraseña.
- Se implementó `POST /api/auth/register` con validaciones mínimas de servidor:
  - campos obligatorios
  - contraseña mínima de 8 caracteres
  - confirmación de contraseña
- Se integró `supabase.auth.signUp` con manejo de ambos modos de Auth:
  - si requiere confirmación por email, redirige a `/login` con mensaje de éxito
  - si hay sesión inmediata (autoconfirm), redirige a `/dashboard`
- Se sanitizaron errores del registro para no exponer mensajes internos de Supabase.
- Se actualizó `/login` para mostrar mensaje `success` por query params y link a registro.
- Se agregó link de vuelta a login dentro de `/register`.
- Se actualizó README para documentar el flujo de registro real del MVP.

### Por qué
- Necesitábamos poder probar el producto end-to-end sin crear usuarios manualmente en Supabase Auth.
- El flujo de feedback por query params mantiene consistencia con el resto del MVP.

### Qué estudiar
- Cómo personalizar plantillas de email de confirmación en Supabase Auth para mejorar onboarding.
- Cuándo conviene forzar confirmación obligatoria vs autoconfirm en ambientes de test y producción.

### Qué tocar si retomás
- `src/pages/register.astro` → UI de registro y feedback visual.
- `src/pages/api/auth/register.ts` → validaciones, signUp y redirecciones.
- `src/pages/login.astro` → feedback `success` + acceso a registro.

### Próximo paso
- Agregar logging mínimo en `register` para diferenciar fallos de validación vs infraestructura.

### Bloqueos / notas
- El comportamiento final depende de la configuración de confirmación de email en Supabase (ambos caminos ya cubiertos en el backend).

---

## Plantilla para próximas entradas

---

## 2026-05-19 — Caso de estudio: crash SSR del dashboard en producción

### Qué hicimos
- Se diagnosticó el HTTP 500 real en Vercel dentro de `/dashboard`.
- Se confirmó con logs de producción que el error era: `TypeError: Reduce of empty array with no initial value`.
- Se identificó la causa en `src/pages/dashboard.astro`: `purchases?.reduce(...)` estaba escrito sin `initialValue`.
- Se corrigió el cálculo de `pendingPurchases` usando `(purchases ?? []).reduce(..., [])`.
- Se corrigió además la lectura de `allocation.cards`, porque TypeScript lo infería como array y no como objeto único.
- Se verificó que el build vuelve a compilar sin errores.

### Por qué
- En producción un usuario podía entrar al dashboard sin compras cargadas.
- En ese caso, `reduce` sobre array vacío rompía TODO el render SSR.
- Además el tipado incorrecto de `cards` estaba generando ruido real del IDE y podía ocultar nombres de tarjeta en la UI.

### Qué estudiar
- Diferencia entre `array.reduce(fn)` y `array.reduce(fn, initialValue)`.
- Por qué SSR falla más fuerte que una vista cliente cuando una transformación explota antes de renderizar.
- Cómo leer errores en cascada de TypeScript y detectar la causa raíz en vez de perseguir síntomas.
- Normalización de shape de datos anidados en respuestas de Supabase.

### Qué tocar si retomás
- `src/pages/dashboard.astro` → cálculo de `pendingPurchases`, lectura de relaciones anidadas y render de cuotas pendientes.

### Próximo paso
- Seguir revisando el dashboard con datos reales de usuarios para detectar más supuestos frágiles antes de abrir más la beta.

### Bloqueos / notas
- Este fue un bug gordo y vale como referencia de aprendizaje: el problema no era "la lógica de negocio" sino un supuesto inválido sobre datos vacíos.
- Lección clave: si una transformación de arrays alimenta SSR, siempre asumir que puede venir vacío.

---

## 2026-05-18 — Marcar cuotas como pagadas (MVP)

### Qué hicimos
- Se agregó `POST /api/installments/mark-paid` para marcar una cuota por `installment_id`.
- El endpoint valida usuario autenticado y ownership de cuota con join hasta `purchases.user_id`.
- Se implementó comportamiento idempotente (`paid` vuelve éxito sin romper flujo).
- Se agregó policy RLS de `update` para `installments` en migración `0004_installments_update_policy.sql`.
- Se actualizó `dashboard` para listar cuotas por compra y mostrar botón `Marcar pagada` en pendientes.
- Se agregó feedback por query params (`installment_success`, `installment_error`) consistente con el resto del dashboard.
- Se ajustó el hint de estado para reflejar cuotas pendientes reales por compra.

### Por qué
- El MVP necesitaba cerrar el loop operativo real: no solo crear cuotas, también registrar pagos de cuotas individuales.

### Qué estudiar
- Cómo agregar cálculo de métricas derivadas (deuda pendiente por tarjeta / por compra) sin sobrecargar el query del dashboard.
- Si conviene mover la transición `pending -> paid` a un RPC transaccional dedicado para reglas futuras (ej. auditoría).

### Qué tocar si retomás
- `src/pages/api/installments/mark-paid.ts` → endpoint de pago de cuota.
- `src/pages/dashboard.astro` → listado detallado de cuotas + acción por cuota.
- `supabase/migrations/0004_installments_update_policy.sql` → policy de update para cuotas.

### Próximo paso
- Agregar filtro visual en dashboard para ver solo cuotas pendientes y acelerar carga operativa.

### Bloqueos / notas
- La migración `0004` debe ejecutarse antes de probar marcado de cuotas, si no el update falla por RLS.

---

## 2026-05-18 — Ajuste UX dashboard: acciones separadas + foco en pendientes

### Qué hicimos
- Se cambió el dashboard para mostrar dos acciones claras con botones separados: **Agregar tarjeta** y **Agregar compra en cuotas**.
- Se movieron ambos formularios a modo enfocado por query param (`/dashboard?action=card` y `/dashboard?action=purchase`) para evitar ruido visual permanente.
- Se dejó el resumen principal del dashboard enfocado en **cuotas pendientes** únicamente.
- Se reemplazó el listado por compra completa por un listado de pendientes con datos relevantes por cuota:
  - nombre de compra
  - resumen de asignación/tarjeta (si existe)
  - número de cuota
  - vencimiento
  - monto
  - estado pendiente
  - acción `Marcar pagada`
- Se mantuvo el feedback por query params y el flujo existente de `mark-paid` sin cambios de API.

### Por qué
- El usuario pidió reducir fricción: acciones separadas y dashboard más operativo para el día a día.
- Ver compras completadas junto con pendientes agregaba ruido y ocultaba lo urgente.

### Qué estudiar
- Si conviene persistir la última vista de acción usada (`action`) para mejorar continuidad de uso.
- Formato local de fechas/montos para mejorar legibilidad de vencimientos en el listado de pendientes.

### Qué tocar si retomás
- `src/pages/dashboard.astro` → acciones del dashboard, render condicional de formularios, listado de cuotas pendientes.
- `README.md` → nota de comportamiento del dashboard.

### Próximo paso
- Evaluar micro-mejora visual para destacar vencimientos más próximos (sin cambiar backend).

### Bloqueos / notas
- No hay bloqueos técnicos; cambio limitado a UX/UI de la vista.

---

## Plantilla para próximas entradas

### Fecha

#### Qué hicimos
-

#### Por qué
-

#### Qué estudiar
-

#### Qué tocar si retomás
-

#### Próximo paso
-

#### Bloqueos / notas
-
