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
