# Cosme House — Frontend

Frontend del finance tracker. Consume la API en https://cosme-house-backend.onrender.com.

## Stack

- **Vite 8** + **React 19** + **TypeScript 6**
- **Tailwind CSS 4** (CSS-first config con `@theme`)
- **shadcn/ui** (componentes copy-paste, basados en Radix)
- **React Router 7** (browser router)
- **TanStack Query 5** (data fetching + cache)
- **React Hook Form + Zod** (forms tipados con validación)
- **Zustand** (auth store con persist en localStorage)
- **Axios** (HTTP client con interceptor JWT)
- **Sonner** (toasts)
- **Recharts** (charts — instalado, sin uso aún)
- **date-fns** (utilidades de fecha — instalado, sin uso aún)

## Scripts

```bash
npm run dev      # Dev server (http://localhost:5173)
npm run build    # Type check + production build
npm run preview  # Preview del build
npm run lint     # ESLint
```

## Setup

1. Instalar dependencias:
   ```bash
   npm install
   ```

2. Configurar `.env`:
   ```
   VITE_API_BASE_URL=https://cosme-house-backend.onrender.com/api
   ```
   (ya creado con el valor de prod)

3. Levantar dev:
   ```bash
   npm run dev
   ```

4. Abrir http://localhost:5173 y loguearse con `admin@test.com` / `password123`.

## Estructura

```
src/
├── api/                # Cliente axios + funciones por endpoint
│   ├── client.ts       # Instancia axios con interceptors (JWT, 401 → logout)
│   ├── auth.api.ts
│   ├── categories.api.ts
│   ├── transactions.api.ts
│   └── summary.api.ts
├── schemas/            # Schemas Zod (espejos de los del backend)
│   ├── common.ts       # ApiResponse, Pagination, ApiError
│   ├── auth.schema.ts
│   ├── category.schema.ts
│   ├── transaction.schema.ts
│   └── summary.schema.ts
├── components/
│   ├── ui/             # shadcn primitives (button, input, card, etc.)
│   └── shared/         # AppLayout
├── features/
│   ├── auth/           # LoginPage, useAuth (zustand store), ProtectedRoute
│   ├── dashboard/      # DashboardPage (KPIs + breakdown)
│   ├── categories/     # CategoriesPage (listado)
│   └── transactions/   # TransactionsPage (placeholder)
├── lib/
│   └── utils.ts        # cn(), formatCurrency, formatDate
├── App.tsx             # QueryClientProvider + RouterProvider + Toaster
├── routes.tsx          # Definición del router
└── main.tsx            # Entry point
```

## Estado actual

**Implementado (Fases 1-5 del plan):**
- Setup completo (Vite, Tailwind 4, shadcn, path alias `@/`)
- API layer tipada con axios + interceptor JWT + manejo de 401
- Schemas Zod alineados con el backend
- Auth completo: login con form + Zod, store persistido, ProtectedRoute, logout
- Layout con sidebar + topbar + dropdown del usuario
- Dashboard con 3 KPIs y desglose por categoría
- Listado de categorías

**Pendiente (Fases 6-9):**
- CRUD de categorías (modal con form, delete con confirmación)
- CRUD de transacciones (tabla con filtros, paginación, modal)
- Filtros de rango de fecha en dashboard + charts (Recharts)
- Skeletons / empty states / polish
- Deploy en Vercel

## Notas técnicas

- **`amount` viene como string** desde la API (Decimal). Parsear con `parseFloat()` para display, mandar como number al crear.
- **Cold start de Render**: primer request tras 15 min de inactividad puede tardar ~30s. El LoginPage muestra un hint cuando se está esperando.
- **Auth flow**: token en localStorage + Zustand. El interceptor axios lo inyecta automáticamente. En 401, limpia el storage y redirige a `/login`.
- **shadcn**: los componentes están copiados en `src/components/ui/` (no es un paquete instalable). Para agregar más en el futuro, usar `npx shadcn@latest add <componente>` o copiar manualmente desde https://ui.shadcn.com/docs/components.
