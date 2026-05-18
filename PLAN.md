# Plan de implementación — Cosme House Frontend

Plan completo para continuar el desarrollo en otra sesión. Este documento captura el contexto, el estado actual, y los pasos pendientes.

---

## Contexto

Frontend del finance tracker de Cosme House (negocio de productos de diseño: lámparas, decoración). Consume la API ya deployada:

- **Backend en producción**: https://cosme-house-backend.onrender.com
- **Repo backend**: https://github.com/AxelMullins/cosme-house-backend (hermana de esta carpeta)
- **DB**: Supabase PostgreSQL
- **Admin de prueba**: `admin@test.com` / `password123`

⚠️ El backend está en plan free de Render, **se duerme tras 15 min sin tráfico** → primer request tarda ~30s.

---

## Stack elegido

| Categoría | Lib | Versión |
|---|---|---|
| Build | Vite | 8 |
| Framework | React | 19 |
| Lenguaje | TypeScript | 6 |
| Estilos | Tailwind CSS | 4 (CSS-first con `@theme`) |
| UI | shadcn/ui (Radix) | copy-paste en `src/components/ui/` |
| Routing | React Router | 7 |
| Data fetching | TanStack Query | 5 |
| HTTP | Axios | 1 |
| Forms | React Hook Form + `@hookform/resolvers/zod` | 7 / 5 |
| Validación | Zod | 4 |
| State global | Zustand (solo auth) | 5 |
| Toasts | Sonner | 2 |
| Charts | Recharts | 3 (instalado, sin uso aún) |
| Fechas | date-fns | 4 (instalado, sin uso aún) |
| Iconos | lucide-react | — |

---

## ✅ Implementado (Fases 1-10)

### Fase 1 — Setup
- Vite + React + TS scaffold
- Tailwind 4 vía plugin de Vite y `@import "tailwindcss"` en `src/index.css`
- Path alias `@/` configurado en `vite.config.ts` y `tsconfig.app.json`
- shadcn `components.json` configurado (style: new-york, baseColor: neutral)
- Variables CSS de tema con OKLCH (light + dark mode preparado)
- `.env` con `VITE_API_BASE_URL` apuntando al backend de producción

### Fase 2 — API layer + schemas
- `src/api/client.ts`: axios instance con interceptor JWT (token desde localStorage) + interceptor 401 → logout automático + `ApiRequestError` class + helper `unwrap()` que parsea `{success, data}` del backend
- `src/api/auth.api.ts`, `categories.api.ts`, `transactions.api.ts`, `summary.api.ts`
- `src/schemas/common.ts`: `ApiResponse<T>`, `Pagination`
- `src/schemas/auth.schema.ts`: `Role`, `User`, `loginSchema`, `LoginResponse`
- `src/schemas/category.schema.ts`: `Category`, `categoryFormSchema`
- `src/schemas/transaction.schema.ts`: `Transaction`, `transactionFormSchema`, `transactionFiltersSchema`
- `src/schemas/summary.schema.ts`: `Summary`, `SummaryByCategory`

### Fase 3 — Autenticación
- `src/features/auth/useAuth.ts`: Zustand store con persist a localStorage (key `cosme_house_auth`). Token también en localStorage separado (key `cosme_house_token`) para el interceptor
- `src/features/auth/LoginPage.tsx`: form con React Hook Form + Zod, mutation con TanStack Query, toast feedback, hint de "cold start" durante el loading
- `src/features/auth/ProtectedRoute.tsx`: wrapper para rutas privadas, soporta `requireRole`

### Fase 4 — Layout
- `src/components/shared/AppLayout.tsx`: sidebar (Dashboard / Transacciones / Categorías) + topbar con avatar y dropdown del usuario (info + logout)
- Sidebar oculta en mobile (`hidden md:flex`) — falta drawer mobile

### Fase 5 — Dashboard
- `src/features/dashboard/DashboardPage.tsx`: 3 KPIs (Ingresos / Gastos / Balance) + lista de desglose por categoría
- Empty state cuando no hay transacciones

### Fase 6 — CRUD de Categorías
- `src/features/categories/CategoryForm.tsx` reutilizable (crear/editar) con RHF + Zod
- `CategoriesPage.tsx`: botón "Nueva categoría" admin-only, filtros chip Todas/Ingresos/Gastos, edit/delete por fila, `AlertDialog` de confirmación
- Manejo específico del **409** (`CATEGORY_IN_USE`) → toast "No se puede borrar — tiene transacciones asociadas"
- Mutations invalidan `['categories']` y `['summary']`

### Fase 7 — CRUD de Transacciones
- `src/features/transactions/TransactionForm.tsx`: type / amount / date / category (filtrada por type, se resetea con un `useEffect` cuando el type cambia) / description
- ⚠️ Para que `z.coerce.number()` no rompa los tipos de RHF: el schema exporta `TransactionFormValues = z.input` (entrada del form) y `TransactionFormInput = z.output` (después de coerce). El form usa `useForm<Values, unknown, Output>` así `handleSubmit` recibe los tipos transformados
- `TransactionsPage.tsx`: filtros sincronizados con URL params via `useSearchParams` (`type`, `categoryId`, `from`, `to`, `page`), tabla con `Badge` por tipo, paginación con `keepPreviousData`, acciones admin-only

### Fase 8 — Polish del Dashboard
- DateRangePicker con inputs `type="date"` nativos (decisión: no instalar `react-day-picker` para evitar nueva dep; upgrade pendiente si se quiere calendar popover)
- Donut chart con Recharts (`PieChart`): paleta verde para INCOME, roja para EXPENSE
- `<Skeleton>` loaders para KPIs, chart y lista de recientes
- Card "Últimas 5 transacciones" con link "Ver todas → /transactions"

### Fase 9 — Deploy a Vercel
- Frontend desplegado en Vercel; auto-deploy en push a `main`
- Env `VITE_API_BASE_URL` configurada apuntando a `https://cosme-house-backend.onrender.com/api`
- CORS del backend abierto a todos los origins (ver nota de seguridad abajo)

### Fase 10 — CRUD de Usuarios

**Backend** (`cosme-house-backend`):
- `src/services/user.service.js` con `PUBLIC_USER_SELECT` (excluye `password`); hash bcrypt salt 10 en create/update
- `src/controllers/user.controller.js` con validación Zod (create: `password.min(8)` + `role`; update: todos opcionales)
- `src/routes/user.routes.js` con `authenticate` + `requireRole('ADMIN')` a nivel router
- Registrado en `src/app.js` bajo `/api/users`
- Protecciones de seguridad:
  - `CANNOT_CHANGE_OWN_ROLE` (400) si el actor intenta cambiar su propio rol
  - `CANNOT_DELETE_SELF` (400) si el actor intenta borrarse a sí mismo
  - `USER_IN_USE` (409) si el usuario tiene transacciones asociadas
  - `DUPLICATE_EMAIL` (409) en create/update con email existente

**Frontend**:
- `src/schemas/user.schema.ts`: re-export de `User`/`Role` desde `auth.schema` + `userCreateSchema` (password requerido) y `userUpdateSchema` (password opcional con transform `''` → `undefined`)
- `src/api/users.api.ts`: list/create/update/remove
- `src/features/users/UserForm.tsx`: forms separados create/edit; en edit el campo password tiene placeholder *"Dejar vacío para no cambiar"*, el select de rol se deshabilita si estás editándote a vos mismo (`disableRole`)
- `src/features/users/UsersPage.tsx`: tabla con badge de rol, marca `(vos)` en tu propia fila, botón eliminar deshabilitado para uno mismo
- Ruta `/users` envuelta en `<ProtectedRoute requireRole="ADMIN" />` en `routes.tsx`
- Ítem "Usuarios" en sidebar de `AppLayout.tsx` filtrado por `requireRole` admin-only

### Componentes shadcn implementados
`button`, `input`, `label`, `card`, `separator`, `dropdown-menu`, `avatar`, `sonner`, `dialog`, `select`, `alert-dialog`, `badge`, `table`, `skeleton`, `popover`

---

## Convenciones y decisiones tomadas

### Arquitectura
- **Feature-based folders**: cada feature (auth, dashboard, etc.) tiene sus propias páginas/componentes/hooks
- **API layer separada**: nunca importar `apiClient` desde un componente, siempre vía `*.api.ts`
- **Schemas Zod compartidos**: los mismos schemas se usan para validar forms (`*FormSchema`) y para los tipos de la API (`*Schema`)

### Manejo de errores
- `apiClient.interceptors.response` captura todos los errores HTTP
- Lanza `ApiRequestError` con `{message, code, status}` accesibles
- 401 → limpia token y redirige a `/login` automáticamente
- En componentes: usar `try/catch` o `onError` de mutations + `toast.error(err.message)`

### Estado
- **Server state**: TanStack Query
- **Auth state**: Zustand con persist
- **Form state**: React Hook Form
- **URL state**: `useSearchParams` (para filtros, paginación)

### Formato de datos del backend
- Respuestas: `{ success: true, data: T }` o `{ success: false, error: { message, code } }`
- Listados paginados: `{ success: true, data: T[], pagination: { page, limit, total, totalPages } }`
- `amount` viene como **string** (Decimal), formatear con `formatCurrency` de `src/lib/utils.ts`
- Fechas como ISO strings, parsear con `new Date()` o `date-fns`

### shadcn / Tailwind 4
- Tailwind 4 NO usa `tailwind.config.js`, todo va en CSS con `@theme`
- Para agregar componentes shadcn: `npx shadcn@latest add <componente>` (CLI), o copiar source desde https://ui.shadcn.com/docs/components
- Si el CLI rompe, instalar la dependencia Radix manualmente (`npm install @radix-ui/react-X`) y copiar el .tsx

---

## Comandos útiles

```bash
# Desarrollo
npm run dev          # http://localhost:5173

# Verificar antes de commitear
npm run build        # tsc -b + vite build
npm run lint         # ESLint

# Agregar componente shadcn nuevo
npx shadcn@latest add dialog
npx shadcn@latest add select
npx shadcn@latest add table
npx shadcn@latest add alert-dialog
npx shadcn@latest add badge
npx shadcn@latest add skeleton
```

---

## Checklist para retomar el trabajo

1. ✅ `cd "C:\Users\Usuario\AXEL\Cosme House\cosme-house-frontend"`
2. ✅ `npm install` (si es PC distinta)
3. ✅ Verificar que `.env` tiene `VITE_API_BASE_URL`
4. ✅ `npm run dev` → http://localhost:5173
5. ✅ Login con admin (cambiar `admin@test.com` por el real desde la página de Usuarios)
6. ✅ Fases 6-10 implementadas

---

## Pendiente / mejoras futuras

- **`react-day-picker` + shadcn `calendar`**: reemplazar los `<input type="date">` nativos por un popover con calendar para una UX más fluida en filtros de Dashboard y Transacciones.
- **Code splitting**: el bundle final es ~1MB (Recharts es el principal culpable). Considerar `React.lazy` para la página de Dashboard o `rolldownOptions.output.codeSplitting`.
- **Drawer mobile**: la sidebar está oculta en mobile (`hidden md:flex`). Falta un drawer/hamburger para navegar.
- **Soft-delete de usuarios**: hoy el delete es físico; se podría agregar `active: boolean` al modelo `User` y filtrar inactivos en el login + lista.

---

## Notas de seguridad / producción

### Aplicado
- **CORS restringido** a `https://cosme-house-frontend.vercel.app` y `http://localhost:5173`. Si en el futuro Vercel asigna un dominio custom o se usan preview deploys, agregarlos a `ALLOWED_ORIGINS` en `cosme-house-backend/src/app.js`.
- **Auth revalida user en DB** (`middlewares/auth.js`): el JWT ya no se confía solo — cada request lee `role` desde Postgres. Demote/delete tienen efecto inmediato.
- **Self-signup eliminado**: `POST /api/auth/register` removido. La única vía de creación es la página de Usuarios (admin only).
- **Email trim + password max 72 bytes** en `auth.controller.js` y `user.controller.js` (límite real de bcrypt).
- **Self-protection en `/api/users`**: no podés borrarte ni cambiar tu propio rol.

### Deprioritized (no hay usuarios reales — solo Axel)
- **JWT en localStorage**: vulnerable a XSS. Migrar a httpOnly cookies + CSRF tokens es un refactor grande; sin usuarios externos, riesgo bajo.
- **Sin rate limiting** en `/api/auth/login` ni `/api/users`. Agregar `express-rate-limit` (5 intentos / 15 min por IP) si alguna vez el API queda expuesto a tráfico real.
- **Política de password débil** (solo `min(8)`). Reforzar con regex de complejidad si se incorporan VIEWERs externos.
- **Password admin hardcodeada en seed**: ya no es problema operativo — desde la UI podés crear tu admin real y borrar el de seed. Si vas a re-seedear la DB, cambiarla.
- **Sin audit log** de acciones admin (crear/eliminar usuarios, transacciones). Para un negocio con varios usuarios sería un must.
