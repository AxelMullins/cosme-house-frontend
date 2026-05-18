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

## ✅ Implementado (Fases 1-5)

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
- Falta: date range picker + chart de Recharts

### Componentes shadcn implementados
`button`, `input`, `label`, `card`, `separator`, `dropdown-menu`, `avatar`, `sonner`

---

## 🚧 Pendiente (Fases 6-9)

### Fase 6 — CRUD de Categorías (~1h)

**Goal**: completar `src/features/categories/CategoriesPage.tsx` con CRUD funcional.

**Componentes shadcn a agregar** (`npx shadcn@latest add <name>` o copiar de https://ui.shadcn.com):
- `dialog` — modal de crear/editar
- `select` — selector de tipo (INCOME/EXPENSE)
- `alert-dialog` — confirmación de borrar
- `table` — listado tabular (opcional, el grid actual también sirve)

**A implementar**:
1. Header con botón "Nueva categoría" (solo visible si `user.role === 'ADMIN'`)
2. Filtro por tipo (botones segmentados: Todas / Ingresos / Gastos)
3. Componente `<CategoryForm>` reutilizable (creación + edición) con React Hook Form + `categoryFormSchema`
4. Mutations con TanStack Query:
   - `useMutation` para create/update/delete
   - `onSuccess`: `queryClient.invalidateQueries({ queryKey: ['categories'] })`
5. AlertDialog antes de borrar
6. Manejo de error 409 (categoría con transacciones) → mostrar toast claro: "No se puede borrar — tiene transacciones asociadas"

**Tip**: el rol del usuario está en `useAuth((s) => s.user?.role)`. Las acciones de admin deberían estar ocultas para `VIEWER`.

### Fase 7 — CRUD de Transacciones (~2h)

**Goal**: completar `src/features/transactions/TransactionsPage.tsx`.

**Componentes shadcn a agregar**:
- `table` — listado paginado
- `dialog`, `select`, `alert-dialog` (si no están de Fase 6)
- `popover` + `calendar` — date picker (instalar `react-day-picker` si se usa el calendar de shadcn)
- `badge` — para el tipo INCOME/EXPENSE

**A implementar**:
1. Filtros sincronizados con URL params:
   - `type` (INCOME/EXPENSE/all)
   - `categoryId`
   - `from` / `to` (date range)
   - `page` (paginación)
   - Usar `useSearchParams` de React Router
2. Tabla con columnas: Fecha, Tipo (badge), Categoría, Descripción, Monto (formateado con `formatCurrency`), Acciones
3. Paginación inferior con info de total y botones prev/next
4. `<TransactionForm>` con campos: type, amount, date, categoryId (select cargado con `categoriesApi.list({type})`), description
5. ⚠️ **`amount` viene como string del backend** → en el form usar `coerce.number()` (ya está en `transactionFormSchema`), para mostrar parsear y formatear con `formatCurrency`
6. Acciones de crear/editar/borrar solo visibles para ADMIN

### Fase 8 — Polish del Dashboard (~1.5h)

**Componentes a agregar**:
- `popover` + `calendar` para el date range
- Chart de Recharts (PieChart o BarChart) en `DashboardPage`

**A implementar**:
1. `<DateRangePicker>` arriba del dashboard. Estado en URL o en useState local, pasarlo a `summaryApi.get({ from, to })`
2. Chart de breakdown por categoría:
   - Donut chart con todas las categorías (color verde para INCOME, rojo para EXPENSE)
   - O dos bar charts uno al lado del otro (income vs expense)
3. Skeleton loaders durante carga (usar `<Skeleton>` de shadcn)
4. Ultimas 5 transacciones (usar `transactionsApi.list({ limit: 5 })`)

### Fase 9 — Deploy a Vercel (~15 min)

1. Push a GitHub el repo del frontend (crear repo si no existe)
2. Conectar a Vercel desde su dashboard (https://vercel.com)
3. Vercel detecta Vite automáticamente
4. Agregar env var: `VITE_API_BASE_URL=https://cosme-house-backend.onrender.com/api`
5. Deploy
6. **Actualizar CORS del backend**:
   ```js
   // cosme-house-backend/src/app.js
   app.use(cors({
     origin: ['https://TU-DOMINIO.vercel.app', 'http://localhost:5173'],
     credentials: true
   }))
   ```
   Commit + push → Render redeploya solo.

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
5. ✅ Login con `admin@test.com` / `password123` para verificar que el backend responde
6. 🚧 Arrancar por **Fase 6** (Categorías CRUD): es la más simple y deja el patrón establecido para Fase 7
7. 🚧 Antes de empezar, agregar los componentes shadcn que vas a usar:
   ```bash
   npx shadcn@latest add dialog select alert-dialog
   ```

---

## Notas de seguridad / producción

- **CORS abierto a todo** en el backend (`cosme-house-backend/src/app.js:13`). Restringir antes de exponer el frontend en producción.
- **Password admin hardcodeada** en seed (`prisma/seed.js:20`). Cambiar antes de tener usuarios reales.
- **JWT en localStorage**: vulnerable a XSS. Para MVP está OK, en una v2 considerar httpOnly cookies (requiere ajustes en el backend para usar cookies en vez de header `Authorization`).
- **Sin rate limiting** en el backend. Para producción seria, agregar `express-rate-limit`.
