# Optimización Responsive Mobile — Cosme House Frontend

**Fecha:** 2026-05-19
**Estado:** Aprobado (pendiente de plan de implementación)
**Alcance:** Optimización integral del diseño responsive para mobile (< 768px) y tablet (< 1024px). Desktop ya funciona y se mantiene.

## Contexto

Cosme House es una app de gestión financiera personal (ingresos/gastos) construida con React 19 + Vite + Tailwind v4 + shadcn/ui + Radix. El layout actual está pensado para desktop:

- La sidebar de navegación usa `hidden md:flex` — en mobile **no existe ninguna forma de navegar** entre páginas.
- Las tablas de `TransactionsPage` (7 columnas) y `UsersPage` (6 columnas) se desbordan o se cortan en pantallas chicas.
- Padding, tipografía y grids no están optimizados para viewports < 768px.

Objetivo: que la app sea totalmente usable en mobile (iPhone SE 375px en adelante), sin sacrificar la experiencia desktop existente.

**Breakpoints:** defaults de Tailwind (`sm: 640px`, `md: 768px`, `lg: 1024px`). Optimización principal para `< 640px` y `640-768px`.

## Decisiones de diseño

1. **Navegación mobile:** botón hamburger + drawer lateral (Sheet basado en Radix Dialog). Reutiliza los mismos `navItems` que la sidebar de desktop, respetando el filtro por rol.
2. **Tablas mobile:** scroll horizontal con wrapper `overflow-x-auto`, más un selector de columnas (popover con checkboxes) que persiste preferencias en `localStorage`. En mobile, algunas columnas secundarias arrancan ocultas por defecto.
3. **Layout adaptable:** padding, grids y tipografía con clases responsive de Tailwind aplicadas en cada vista.

## Arquitectura

### Componente nuevo: `Sheet`

Ubicación: `src/components/ui/sheet.tsx`.

Wrapper sobre `@radix-ui/react-dialog` (ya instalado) que provee variantes laterales (`left`, `right`, `top`, `bottom`). Sigue el patrón estándar de shadcn/ui (`Sheet`, `SheetContent`, `SheetTrigger`, `SheetHeader`, `SheetTitle`).

Solo se necesita la variante `left` para el drawer de navegación, pero se implementa el componente completo siguiendo el patrón.

### Componente nuevo: `ColumnVisibilityMenu`

Ubicación: `src/components/shared/ColumnVisibilityMenu.tsx`.

**API:**
```ts
interface Column<K extends string> {
  id: K
  label: string
  defaultVisible?: boolean        // default true
  defaultVisibleMobile?: boolean  // default = defaultVisible
}

interface Props<K extends string> {
  storageKey: string              // e.g. "cols:transactions"
  columns: readonly Column<K>[]
  visible: Record<K, boolean>
  onChange: (next: Record<K, boolean>) => void
}
```

**Hook asociado:** `useColumnVisibility<K>(storageKey, columns)` retorna `[visible, setVisible]`:

- En primer mount, lee `localStorage[storageKey]`. Si existe y es válido, lo usa.
- Si no existe, calcula defaults: detecta viewport vía `window.matchMedia('(min-width: 768px)')` y aplica `defaultVisible` (desktop) o `defaultVisibleMobile` (mobile).
- Cualquier cambio se persiste en `localStorage`.
- No re-detecta viewport al cambiar tamaño — la preferencia, una vez seteada, es del usuario.

**UI:** botón con ícono `Columns3` (lucide) + label "Columnas" → `Popover` con un checkbox por cada columna. No permite ocultar todas (mínimo 1 visible).

### Modificaciones al `AppLayout`

Archivo: `src/components/shared/AppLayout.tsx`.

**Estado nuevo:** `const [mobileNavOpen, setMobileNavOpen] = useState(false)`.

**Header:**
- Padding: `px-4 md:px-6`.
- Altura: `h-14 md:h-16`.
- Nuevo botón hamburger a la izquierda, visible solo en `< md`:
  ```tsx
  <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileNavOpen(true)}>
    <Menu className="size-5" />
  </Button>
  ```
- Layout del header: el hamburger queda a la izquierda, el dropdown del avatar a la derecha (con `justify-between`).

**Sidebar desktop:** sin cambios. `hidden md:flex` se mantiene.

**Drawer mobile:** nuevo bloque, monta el `Sheet` con `side="left"`. Contiene el mismo branding (Wallet + "Cosme House") y la misma lista `navItems` que la sidebar de desktop. Cada `NavLink` cierra el drawer (`onClick={() => setMobileNavOpen(false)}`).

**Main:** padding `p-4 md:p-6`.

### Modificaciones al `DialogContent` (componente base)

Archivo: `src/components/ui/dialog.tsx`.

- Padding del content: `p-4 md:p-6` (era `p-6`).
- `DialogHeader`: `gap-1.5` ya está bien, sin cambios.
- `DialogFooter`: agregar `flex-col-reverse md:flex-row` para que los botones queden apilados en mobile (Confirmar arriba, Cancelar abajo). Los botones individuales pasan a `w-full md:w-auto` donde corresponda (esto se aplica en cada página que use diálogos de confirmación).

### Modificaciones por página

#### `DashboardPage.tsx`

- **Header:** título y filtros de fecha en columna en mobile, fila en `md+`:
  ```tsx
  <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
  ```
- **Inputs de fecha:** `flex-1` en mobile (sin `w-[150px]`), `md:w-[150px]` en desktop.
- **KPI grid:** `grid gap-3 grid-cols-2 md:grid-cols-3`. La card de Balance lleva `col-span-2 md:col-span-1`.
- **KPI value:** `text-xl md:text-2xl`.
- **Pie chart:** `outerRadius` dinámico — usar `useMemo` con `window.innerWidth` o (mejor) un container observer; alternativa simpler: dejar el `ResponsiveContainer` y reducir `outerRadius` a `80` en mobile via prop. Solución elegida: hook `useIsMobile()` simple basado en `matchMedia` que vive en `src/lib/hooks/useIsMobile.ts`.
- **Legend:** `wrapperStyle={{ fontSize: '12px' }}`, `height={undefined}` para que se ajuste automáticamente.

#### `TransactionsPage.tsx`

- **Header:** botón "Nueva transacción" — en mobile se reduce a icon-only (`size="icon"` con `Plus`) y label en `md+`. Texto "Transacciones" + "Ingresos y gastos registrados" sin cambios.
- **Filtros (grid):** `grid grid-cols-2 lg:grid-cols-5 gap-3`. El botón "Limpiar" se quita del grid y se mueve al header al lado del botón nuevo:
  ```tsx
  {hasActiveFilters && (
    <Button variant="ghost" size="icon" onClick={clearFilters} aria-label="Limpiar filtros">
      <X className="size-4" />
    </Button>
  )}
  ```
- **Tabla:**
  - Wrapper: `<div className="overflow-x-auto -mx-4 md:mx-0">` alrededor de la `Table`.
  - Usa `ColumnVisibilityMenu` con `storageKey="cols:transactions"`.
  - Columnas: `{ date, type, category, description, user, amount, actions }`.
  - Defaults mobile: ocultar `user` y `description`.
  - Defaults desktop: todas visibles.
  - El menú de columnas se renderiza arriba de la tabla, alineado a la derecha, dentro del mismo `Card` (justo antes del `<Table>`).
- **Botones de acción** (`Pencil`, `Trash2`): `size-9 md:size-8` para mejor touch target en mobile.
- **Pagination:** `flex flex-col gap-3 md:flex-row md:items-center md:justify-between`. Botones "Anterior/Siguiente" full-width en mobile (`flex-1`), auto en desktop.

#### `UsersPage.tsx`

- **Tabla:**
  - Mismo wrapper de scroll horizontal.
  - `ColumnVisibilityMenu` con `storageKey="cols:users"`.
  - Columnas: `{ name, email, role, transactions, createdAt, actions }`.
  - Defaults mobile: ocultar `email` y `createdAt`.
- Botones de acción: `size-9 md:size-8`.
- Header: igual a Transactions, "Nuevo usuario" icon-only en mobile.

#### `CategoriesPage.tsx`

- **Grid:** ya es `grid gap-2 sm:grid-cols-2` — se mantiene.
- **Filter chips:** wrap container `flex flex-wrap gap-2`.
- **Header:** "Nueva categoría" icon-only en mobile (igual patrón que las otras).
- **Cards de categoría:** asegurar `min-w-0` en el span del nombre para que `truncate` funcione cuando hay acciones a la derecha.

#### `LoginPage.tsx`

- Sin cambios estructurales. Verificar visualmente que el card luce bien en 375px (padding del card es `p-6` por default — está OK).

#### Formularios (`TransactionForm`, `CategoryForm`, `UserForm`)

- Campos lado a lado pasan a `grid grid-cols-1 sm:grid-cols-2 gap-4`.
- Botón submit: `w-full md:w-auto`.

### Hook auxiliar: `useIsMobile`

Ubicación: `src/lib/hooks/useIsMobile.ts`.

```ts
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
  )
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)')
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])
  return isMobile
}
```

Usado solo donde la decisión necesita reaccionar al viewport actual (ej. `outerRadius` del PieChart, defaults iniciales de columnas).

## Plan de testing manual

Probar cada vista en DevTools con device toolbar a:

- **iPhone SE** (375 × 667) — caso más chico realista
- **iPhone 14** (390 × 844)
- **iPad** (768 × 1024) — boundary del breakpoint `md`
- **Desktop** (1280 × 800) — verificar que no hay regresiones

Para cada viewport verificar:

- Navegación: drawer abre/cierra, links funcionan, se cierra al navegar.
- Tablas: scroll horizontal funciona, menú de columnas muestra/oculta, persiste en localStorage.
- Dashboard: KPIs no se desbordan, pie chart legible, fechas usables.
- Diálogos: confirmación de delete legible y operable.
- Login: card centrado, sin overflow horizontal.

## Trabajo fuera de alcance

- Modo oscuro: existe el CSS pero no hay toggle. No se agrega aquí.
- PWA / install prompt.
- Animaciones más allá de las que provee Radix por default.
- Refactor del state management o de la API.
- Tests automatizados (no hay framework instalado).
