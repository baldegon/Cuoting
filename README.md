# Cuoting MVP Bootstrap (Astro + Supabase)

Vertical slice inicial con:
- Astro + TypeScript + Tailwind
- Supabase Auth (login/logout)
- Ruta protegida (`/dashboard`)
- Módulo `cards` (crear y listar tarjetas del usuario)

## Requisitos

- Node.js `>=22.12.0`
- Cuenta/proyecto de Supabase

## Setup local

1. Instalar dependencias:
   ```bash
   npm install
   ```
2. Copiar variables de entorno:
   ```bash
   cp .env.example .env
   ```
   En Windows PowerShell:
   ```powershell
   Copy-Item .env.example .env
   ```
3. Completar `.env` con:
   - `PUBLIC_SUPABASE_URL`
   - `PUBLIC_SUPABASE_ANON_KEY`
4. Ejecutar la migración SQL en Supabase SQL Editor:
    - `supabase/migrations/0001_init_cards.sql`
    - `supabase/migrations/0002_purchases_installments.sql`
5. En Supabase, habilitar Email/Password en Auth Providers.
6. Registrar usuario desde `/register` (ya no hace falta alta manual en Supabase Auth).

## Ejecutar

```bash
npm run dev
```

## Rutas principales

- `/login` → login con email/password
- `/register` → registro con email/password
- `/dashboard` → ruta protegida, muestra cuotas pendientes y acciones para agregar tarjeta/compra en cuotas
- `/api/auth/login` → action login
- `/api/auth/register` → action registro
- `/api/auth/logout` → action logout
- `/api/cards/create` → action crear tarjeta
- `/api/purchases/create` → action crear compra en cuotas con asignaciones multi-tarjeta
- `/api/installments/mark-paid` → action marcar una cuota puntual como pagada

## Seguridad

La tabla `cards` usa RLS con políticas para que cada usuario lea/cree solo sus propios datos (`auth.uid() = user_id`).

Las tablas `purchases`, `purchase_allocations`, `installment_plans` e `installments` también usan RLS por ownership del usuario autenticado.

## Notas del MVP de compras en cuotas

- Cada compra tiene un total y una cantidad de cuotas.
- El total se reparte entre una o más tarjetas (`purchase_allocations`).
- Por cada asignación se genera un plan mensual y sus cuotas.
- Validación de servidor: la suma de asignaciones debe coincidir con el total de la compra.
- Reparto por cuota: división a 2 decimales y ajuste final en la última cuota de cada plan.
- En el dashboard se prioriza el listado de cuotas pendientes y se puede marcar cada cuota como pagada.
- Los formularios de "Agregar tarjeta" y "Agregar compra en cuotas" se abren desde botones de acción en el dashboard.
- El cambio de estado de cuota es idempotente: si ya está pagada, la acción responde éxito igual.
