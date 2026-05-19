# Mobile Responsive Design Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Optimizar integralmente el diseño responsive del frontend de Cosme House para que sea totalmente usable en mobile (≥ 375px) y tablet, sin regresiones en desktop.

**Architecture:** Drawer lateral (Sheet basado en Radix Dialog) reemplaza la sidebar oculta en mobile. Tablas usan scroll horizontal + selector de columnas configurable (persistido en localStorage). Cada página recibe ajustes específicos de padding, grids, tipografía y comportamiento de botones usando los breakpoints default de Tailwind.

**Tech Stack:** React 19 + Vite + Tailwind v4 + shadcn/ui + Radix UI + TanStack Query. Sin framework de tests — verificación es manual en DevTools.

**Spec:** `docs/superpowers/specs/2026-05-19-mobile-responsive-design.md`

---

## Notas para el implementador

- **No hay tests automáticos.** La verificación es manual con `npm run dev` y DevTools (Toggle device toolbar).
- **Type-check + lint** se corre con `npm run build` (que hace `tsc -b && vite build`).
- **Path alias:** `@/*` apunta a `src/*` (definido en `tsconfig.json` y `vite.config.ts`).
- **Breakpoints Tailwind (sin custom config):**
  - `sm`: 640px
  - `md`: 768px
  - `lg`: 1024px
- **Viewports de prueba:** iPhone SE (375), iPhone 14 (390), iPad (768), Desktop (1280).
- **Commits frecuentes:** un commit por task, mensaje convencional (`feat`, `fix`, `refactor`, `chore`).

---

## File Structure

**Archivos a crear:**

- `src/lib/hooks/useIsMobile.ts` — hook para reaccionar al viewport actual
- `src/lib/hooks/useColumnVisibility.ts` — hook con persistencia localStorage
- `src/components/ui/sheet.tsx` — componente Sheet (drawer lateral)
- `src/components/shared/ColumnVisibilityMenu.tsx` — popover con checkboxes

**Archivos a modificar:**

- `src/components/ui/dialog.tsx` — padding responsive del content
- `src/components/shared/AppLayout.tsx` — hamburger + drawer mobile
- `src/features/dashboard/DashboardPage.tsx` — header, KPI grid, chart
- `src/features/transactions/TransactionsPage.tsx` — header, filtros, tabla, pagination
- `src/features/transactions/TransactionForm.tsx` — grid responsive, submit full-width mobile
- `src/features/users/UsersPage.tsx` — header, tabla
- `src/features/users/UserForm.tsx` — submit full-width mobile
- `src/features/categories/CategoriesPage.tsx` — header, filter chips, cards
- `src/features/categories/CategoryForm.tsx` — submit full-width mobile

---

## Task 1: Hook `useIsMobile`

**Files:**
- Create: `src/lib/hooks/useIsMobile.ts`

- [ ] **Step 1: Crear el archivo del hook**

```ts
import { useEffect, useState } from 'react'

const MOBILE_QUERY = '(max-width: 767px)'

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(MOBILE_QUERY).matches
  })

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  return isMobile
}
```

- [ ] **Step 2: Type-check**

Run: `npm run build`
Expected: build success (sin errores TS).

- [ ] **Step 3: Commit**

```bash
git add src/lib/hooks/useIsMobile.ts
git commit -m "feat(hooks): add useIsMobile viewport hook"
```

---

## Task 2: Hook `useColumnVisibility`

**Files:**
- Create: `src/lib/hooks/useColumnVisibility.ts`

- [ ] **Step 1: Crear el archivo del hook**

```ts
import { useCallback, useState } from 'react'

export interface ColumnDef<K extends string> {
  id: K
  label: string
  defaultVisible?: boolean
  defaultVisibleMobile?: boolean
}

type Visibility<K extends string> = Record<K, boolean>

function computeDefaults<K extends string>(
  columns: readonly ColumnDef<K>[],
  isMobile: boolean
): Visibility<K> {
  const result = {} as Visibility<K>
  for (const col of columns) {
    const desktop = col.defaultVisible ?? true
    const mobile = col.defaultVisibleMobile ?? desktop
    result[col.id] = isMobile ? mobile : desktop
  }
  return result
}

function readStorage<K extends string>(
  storageKey: string,
  columns: readonly ColumnDef<K>[]
): Visibility<K> | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const result = {} as Visibility<K>
    let allKnown = true
    for (const col of columns) {
      const value = parsed[col.id]
      if (typeof value !== 'boolean') {
        allKnown = false
        break
      }
      result[col.id] = value
    }
    return allKnown ? result : null
  } catch {
    return null
  }
}

export function useColumnVisibility<K extends string>(
  storageKey: string,
  columns: readonly ColumnDef<K>[]
): [Visibility<K>, (next: Visibility<K>) => void] {
  const [visible, setVisibleState] = useState<Visibility<K>>(() => {
    const stored = readStorage(storageKey, columns)
    if (stored) return stored
    const isMobile =
      typeof window !== 'undefined' &&
      window.matchMedia('(max-width: 767px)').matches
    return computeDefaults(columns, isMobile)
  })

  const setVisible = useCallback(
    (next: Visibility<K>) => {
      setVisibleState(next)
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next))
      } catch {
        // localStorage puede fallar en modo privado — silencioso
      }
    },
    [storageKey]
  )

  return [visible, setVisible]
}
```

- [ ] **Step 2: Type-check**

Run: `npm run build`
Expected: build success.

- [ ] **Step 3: Commit**

```bash
git add src/lib/hooks/useColumnVisibility.ts
git commit -m "feat(hooks): add useColumnVisibility with localStorage persistence"
```

---

## Task 3: Componente `Sheet`

**Files:**
- Create: `src/components/ui/sheet.tsx`

Esto reusa `@radix-ui/react-dialog` (ya instalado) y replica el patrón shadcn/ui.

- [ ] **Step 1: Crear `sheet.tsx`**

```tsx
import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { cva, type VariantProps } from 'class-variance-authority'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

const Sheet = DialogPrimitive.Root
const SheetTrigger = DialogPrimitive.Trigger
const SheetClose = DialogPrimitive.Close
const SheetPortal = DialogPrimitive.Portal

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className
    )}
    {...props}
  />
))
SheetOverlay.displayName = DialogPrimitive.Overlay.displayName

const sheetVariants = cva(
  'fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500',
  {
    variants: {
      side: {
        top: 'inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top',
        bottom:
          'inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
        left: 'inset-y-0 left-0 h-full w-3/4 max-w-sm border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left',
        right:
          'inset-y-0 right-0 h-full w-3/4 max-w-sm border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right',
      },
    },
    defaultVariants: { side: 'right' },
  }
)

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>,
    VariantProps<typeof sheetVariants> {}

const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  SheetContentProps
>(({ side = 'right', className, children, ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(sheetVariants({ side }), className)}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
        <X className="size-4" />
        <span className="sr-only">Cerrar</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </SheetPortal>
))
SheetContent.displayName = DialogPrimitive.Content.displayName

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col gap-2 text-center sm:text-left', className)} {...props} />
)
SheetHeader.displayName = 'SheetHeader'

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-lg font-semibold text-foreground', className)}
    {...props}
  />
))
SheetTitle.displayName = DialogPrimitive.Title.displayName

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetPortal,
  SheetOverlay,
  SheetContent,
  SheetHeader,
  SheetTitle,
}
```

- [ ] **Step 2: Type-check**

Run: `npm run build`
Expected: build success. Nota: `class-variance-authority` ya está en `package.json`.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/sheet.tsx
git commit -m "feat(ui): add Sheet component for side drawers"
```

---

## Task 4: Componente `ColumnVisibilityMenu`

**Files:**
- Create: `src/components/shared/ColumnVisibilityMenu.tsx`

- [ ] **Step 1: Crear el componente**

```tsx
import { Columns3, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import type { ColumnDef } from '@/lib/hooks/useColumnVisibility'

interface ColumnVisibilityMenuProps<K extends string> {
  columns: readonly ColumnDef<K>[]
  visible: Record<K, boolean>
  onChange: (next: Record<K, boolean>) => void
}

export function ColumnVisibilityMenu<K extends string>({
  columns,
  visible,
  onChange,
}: ColumnVisibilityMenuProps<K>) {
  const visibleCount = columns.reduce((acc, c) => acc + (visible[c.id] ? 1 : 0), 0)

  const toggle = (id: K) => {
    const next = { ...visible, [id]: !visible[id] }
    const nextCount = columns.reduce((acc, c) => acc + (next[c.id] ? 1 : 0), 0)
    if (nextCount === 0) return // nunca permitir ocultar todas
    onChange(next)
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Columns3 className="size-4" />
          <span className="hidden sm:inline">Columnas</span>
          <span className="text-xs text-muted-foreground tabular-nums">
            {visibleCount}/{columns.length}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-2">
        <div className="space-y-0.5">
          {columns.map((col) => {
            const isOn = visible[col.id]
            return (
              <button
                key={col.id}
                type="button"
                onClick={() => toggle(col.id)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <span
                  className={cn(
                    'flex size-4 items-center justify-center rounded-sm border',
                    isOn ? 'bg-primary border-primary text-primary-foreground' : 'border-input'
                  )}
                >
                  {isOn && <Check className="size-3" />}
                </span>
                <span className="flex-1 text-left">{col.label}</span>
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npm run build`
Expected: build success.

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/ColumnVisibilityMenu.tsx
git commit -m "feat(shared): add ColumnVisibilityMenu popover"
```

---

## Task 5: Padding responsive en `DialogContent`

**Files:**
- Modify: `src/components/ui/dialog.tsx:35`

- [ ] **Step 1: Cambiar el `p-6` por `p-4 md:p-6` en `DialogContent`**

Cambiar la línea de `className` del `DialogPrimitive.Content` para que el padding sea responsive.

Reemplazá:

```tsx
'fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg',
```

Con:

```tsx
'fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 border bg-background p-4 md:p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg',
```

- [ ] **Step 2: Verificación visual rápida**

Run: `npm run dev`
Abrir DevTools en 375px, abrir un diálogo cualquiera (ej. "Nueva categoría"). Verificar que el contenido respira en mobile pero no se ve flojo en desktop (1280px).

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/dialog.tsx
git commit -m "refactor(ui): responsive padding on DialogContent"
```

---

## Task 6: Drawer mobile en `AppLayout`

**Files:**
- Modify: `src/components/shared/AppLayout.tsx` (reescritura completa)

- [ ] **Step 1: Reemplazar el contenido de `AppLayout.tsx`**

```tsx
import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  ArrowLeftRight,
  Tags,
  LogOut,
  Wallet,
  Users,
  Menu,
} from 'lucide-react'
import type { Role } from '@/schemas/auth.schema'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useAuth } from '@/features/auth/useAuth'
import { cn } from '@/lib/utils'

interface NavItem {
  to: string
  label: string
  icon: typeof LayoutDashboard
  end?: boolean
  requireRole?: Role
}

const navItems: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/transactions', label: 'Transacciones', icon: ArrowLeftRight },
  { to: '/categories', label: 'Categorías', icon: Tags },
  { to: '/users', label: 'Usuarios', icon: Users, requireRole: 'ADMIN' },
]

export function AppLayout() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((part) => part[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U'

  const items = navItems.filter(
    (item) => !item.requireRole || item.requireRole === user?.role
  )

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
      isActive
        ? 'bg-primary text-primary-foreground'
        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
    )

  return (
    <div className="flex min-h-screen bg-muted/20">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex flex-col w-60 bg-background border-r">
        <div className="h-16 flex items-center gap-2 px-6 border-b">
          <div className="rounded-md bg-primary/10 p-1.5">
            <Wallet className="size-4 text-primary" />
          </div>
          <span className="font-semibold">Cosme House</span>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {items.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={navLinkClass}>
              <item.icon className="size-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Drawer mobile */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetHeader className="h-14 flex-row items-center gap-2 px-4 border-b space-y-0">
            <div className="rounded-md bg-primary/10 p-1.5">
              <Wallet className="size-4 text-primary" />
            </div>
            <SheetTitle className="text-base">Cosme House</SheetTitle>
          </SheetHeader>
          <nav className="p-4 space-y-1">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setMobileNavOpen(false)}
                className={navLinkClass}
              >
                <item.icon className="size-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </SheetContent>
      </Sheet>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 md:h-16 flex items-center justify-between gap-2 px-4 md:px-6 border-b bg-background">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Abrir menú"
          >
            <Menu className="size-5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 ml-auto">
                <Avatar className="size-8">
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline text-sm">{user?.name}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="font-medium">{user?.name}</span>
                  <span className="text-xs text-muted-foreground font-normal">{user?.email}</span>
                  <span className="text-xs text-muted-foreground font-normal mt-1">
                    Rol: {user?.role}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="size-4" />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
```

Notas clave del cambio:
- Estado `mobileNavOpen` controla el `Sheet`.
- El `Sheet` ya viene oculto en desktop porque `mobileNavOpen` arranca en `false` y el botón hamburger es `md:hidden` — no hace falta esconder el Sheet con CSS.
- Header: hamburger izquierda (mobile), avatar derecha (con `ml-auto` para que quede a la derecha incluso si no hay hamburger).
- `min-w-0` en el wrapper del main para evitar overflow horizontal cuando el contenido tiene tablas anchas.

- [ ] **Step 2: Type-check**

Run: `npm run build`
Expected: build success.

- [ ] **Step 3: Verificación visual**

Run: `npm run dev`

En DevTools:
- 375px: verificar que aparece el hamburger arriba a la izquierda. Click → drawer abre desde la izquierda con los 3-4 links. Click en un link → drawer cierra + navega. Click en el overlay oscuro → drawer cierra.
- 768px (md): drawer ya no es accesible (hamburger oculto), sidebar fija visible.
- 1280px: sidebar fija, sin hamburger.

- [ ] **Step 4: Commit**

```bash
git add src/components/shared/AppLayout.tsx
git commit -m "feat(layout): hamburger menu + side drawer for mobile navigation"
```

---

## Task 7: Dashboard responsive

**Files:**
- Modify: `src/features/dashboard/DashboardPage.tsx`

- [ ] **Step 1: Cambiar el header**

En `DashboardPage.tsx` reemplazá el bloque `<div className="flex items-end justify-between gap-4 flex-wrap">` y todo su contenido por:

```tsx
<div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
  <div>
    <h1 className="text-2xl font-bold">Dashboard</h1>
    <p className="text-muted-foreground text-sm">
      Resumen general de ingresos y gastos
    </p>
  </div>

  <div className="flex items-end gap-2">
    <div className="space-y-1 flex-1 md:flex-none">
      <Label className="text-xs text-muted-foreground">Desde</Label>
      <Input
        type="date"
        value={range.from ?? ''}
        onChange={(e) => setRange((r) => ({ ...r, from: e.target.value || undefined }))}
        className="w-full md:w-[150px]"
      />
    </div>
    <div className="space-y-1 flex-1 md:flex-none">
      <Label className="text-xs text-muted-foreground">Hasta</Label>
      <Input
        type="date"
        value={range.to ?? ''}
        onChange={(e) => setRange((r) => ({ ...r, to: e.target.value || undefined }))}
        className="w-full md:w-[150px]"
      />
    </div>
    {hasRange && (
      <Button variant="outline" size="icon" onClick={() => setRange({})} aria-label="Limpiar fechas">
        <X className="size-4" />
      </Button>
    )}
  </div>
</div>
```

- [ ] **Step 2: KPI grid**

Cambiar la línea `<div className="grid gap-4 md:grid-cols-3">` (en `KPISection`, **dos ocurrencias** — la del estado loading y la del render normal) por:

```tsx
<div className="grid gap-3 grid-cols-2 md:grid-cols-3">
```

Y en el bloque del render normal, marcar la card de Balance con `col-span-2 md:col-span-1`:

Reemplazá el componente `KPICard` para aceptar `className`:

```tsx
interface KPICardProps {
  title: string
  value: string
  icon: React.ReactNode
  valueClassName?: string
  className?: string
}

function KPICard({ title, value, icon, valueClassName, className }: KPICardProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className={cn('text-xl md:text-2xl font-bold tabular-nums', valueClassName)}>{value}</div>
      </CardContent>
    </Card>
  )
}
```

Y donde se renderizan los 3 `KPICard`, agregar `className="col-span-2 md:col-span-1"` al de Balance:

```tsx
<KPICard
  title="Balance"
  value={formatCurrency(data.balance)}
  icon={<Wallet className="size-5 text-muted-foreground" />}
  valueClassName={balanceColor}
  className="col-span-2 md:col-span-1"
/>
```

- [ ] **Step 3: Pie chart responsive radius**

Importar el hook al inicio:

```tsx
import { useIsMobile } from '@/lib/hooks/useIsMobile'
```

En `CategoryBreakdownCard`, después de `const chartData = useMemo(...)`, agregar:

```tsx
const isMobile = useIsMobile()
const innerRadius = isMobile ? 45 : 55
const outerRadius = isMobile ? 75 : 95
```

Cambiar las props del `<Pie>`:

```tsx
<Pie
  data={chartData}
  dataKey="value"
  nameKey="name"
  cx="50%"
  cy="50%"
  innerRadius={innerRadius}
  outerRadius={outerRadius}
  paddingAngle={2}
>
```

Cambiar el `Legend`:

```tsx
<Legend
  verticalAlign="bottom"
  wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
  formatter={(value) => <span className="text-xs">{value}</span>}
/>
```

(quitar la prop `height={36}`.)

- [ ] **Step 4: Type-check**

Run: `npm run build`
Expected: build success.

- [ ] **Step 5: Verificación visual**

Run: `npm run dev`

- 375px: KPIs en 2 columnas + Balance abajo full-width. Filtros de fecha apilados debajo del título, se reparten el espacio. Pie chart legible, legend con labels chicas.
- 1280px: layout normal, sin regresiones.

- [ ] **Step 6: Commit**

```bash
git add src/features/dashboard/DashboardPage.tsx
git commit -m "feat(dashboard): responsive header, KPI grid and chart sizing"
```

---

## Task 8: Transactions — header + filtros + tabla con columnas

**Files:**
- Modify: `src/features/transactions/TransactionsPage.tsx`

- [ ] **Step 1: Agregar imports nuevos**

Al tope del archivo, agregar:

```tsx
import { ColumnVisibilityMenu } from '@/components/shared/ColumnVisibilityMenu'
import {
  useColumnVisibility,
  type ColumnDef,
} from '@/lib/hooks/useColumnVisibility'
```

- [ ] **Step 2: Definir columnas y conectar el hook**

Justo afuera del componente `TransactionsPage` (top-level del archivo), agregar:

```tsx
type TxColumnId = 'date' | 'type' | 'category' | 'description' | 'user' | 'amount' | 'actions'

const TX_COLUMNS: readonly ColumnDef<TxColumnId>[] = [
  { id: 'date', label: 'Fecha' },
  { id: 'type', label: 'Tipo' },
  { id: 'category', label: 'Categoría' },
  { id: 'description', label: 'Descripción', defaultVisibleMobile: false },
  { id: 'user', label: 'Usuario', defaultVisibleMobile: false },
  { id: 'amount', label: 'Monto' },
  { id: 'actions', label: 'Acciones' },
]
```

Dentro de `TransactionsPage`, después de los hooks de queries y antes del `return`, agregar:

```tsx
const visibleColumns = useMemo(() => TX_COLUMNS.filter((c) => c.id !== 'actions' || isAdmin), [isAdmin])
const [columns, setColumns] = useColumnVisibility<TxColumnId>('cols:transactions', visibleColumns)
```

Nota: `useMemo` ya está importado en el archivo. Si la columna `actions` no aplica (usuario VIEWER), se quita del menú.

- [ ] **Step 3: Modificar el header de la página**

Cambiar el bloque del header de la página por:

```tsx
<div className="flex items-start justify-between gap-3 flex-wrap">
  <div>
    <h1 className="text-2xl font-bold">Transacciones</h1>
    <p className="text-muted-foreground text-sm">Ingresos y gastos registrados</p>
  </div>
  <div className="flex items-center gap-2">
    {hasActiveFilters && (
      <Button
        variant="ghost"
        size="icon"
        onClick={clearFilters}
        aria-label="Limpiar filtros"
      >
        <X className="size-4" />
      </Button>
    )}
    {isAdmin && (
      <Button onClick={() => setCreating(true)}>
        <Plus className="size-4" />
        <span className="hidden sm:inline">Nueva transacción</span>
      </Button>
    )}
  </div>
</div>
```

- [ ] **Step 4: Modificar el bloque de filtros (quitar el botón "Limpiar")**

Cambiar el `<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">` por `<div className="grid gap-3 grid-cols-2 lg:grid-cols-5">` y **eliminar el último `<div className="flex items-end">` con el botón Limpiar** (que ahora vive en el header).

El grid queda con 4 elementos: Tipo, Categoría, Desde, Hasta.

- [ ] **Step 5: Agregar el menú de columnas arriba de la tabla**

Justo dentro del `<Card>` que envuelve la tabla, antes del bloque condicional `isLoading ? ... : transactions.length === 0 ? ... : <>...</>`, cambiar `<CardContent className="pt-6">` por:

```tsx
<CardContent className="pt-6">
  <div className="flex justify-end mb-3">
    <ColumnVisibilityMenu columns={visibleColumns} visible={columns} onChange={setColumns} />
  </div>
```

(Se renderiza siempre, incluso en estado loading/empty — es esperable.)

- [ ] **Step 6: Envolver la tabla en scroll horizontal y aplicar visibilidad**

Reemplazá el bloque `<Table>...</Table>` (todo el contenido entre las etiquetas `<Table>` y `</Table>`, incluyendo el `TableHeader` y `TableBody`) por:

```tsx
<div className="overflow-x-auto -mx-4 md:mx-0">
  <Table>
    <TableHeader>
      <TableRow>
        {columns.date && <TableHead className="w-[110px]">Fecha</TableHead>}
        {columns.type && <TableHead className="w-[110px]">Tipo</TableHead>}
        {columns.category && <TableHead>Categoría</TableHead>}
        {columns.description && <TableHead>Descripción</TableHead>}
        {columns.user && <TableHead className="w-[140px]">Usuario</TableHead>}
        {columns.amount && <TableHead className="text-right">Monto</TableHead>}
        {isAdmin && columns.actions && <TableHead className="w-[90px]" />}
      </TableRow>
    </TableHeader>
    <TableBody>
      {transactions.map((tx) => (
        <TableRow key={tx.id}>
          {columns.date && <TableCell>{formatDate(tx.date)}</TableCell>}
          {columns.type && (
            <TableCell>
              <Badge variant={tx.type === 'INCOME' ? 'success' : 'danger'}>
                {tx.type === 'INCOME' ? 'Ingreso' : 'Gasto'}
              </Badge>
            </TableCell>
          )}
          {columns.category && (
            <TableCell className="truncate max-w-[160px]">
              {tx.category?.name ?? '—'}
            </TableCell>
          )}
          {columns.description && (
            <TableCell className="truncate max-w-[260px] text-muted-foreground">
              {tx.description || '—'}
            </TableCell>
          )}
          {columns.user && (
            <TableCell className="truncate max-w-[140px] text-muted-foreground text-xs">
              {tx.user?.name ?? '—'}
            </TableCell>
          )}
          {columns.amount && (
            <TableCell
              className={cn(
                'text-right font-medium tabular-nums',
                tx.type === 'INCOME' ? 'text-emerald-600' : 'text-destructive'
              )}
            >
              {tx.type === 'EXPENSE' ? '-' : '+'}
              {formatCurrency(tx.amount)}
            </TableCell>
          )}
          {isAdmin && columns.actions && (
            <TableCell>
              <div className="flex justify-end gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-9 md:size-8"
                  onClick={() => setEditing(tx)}
                  aria-label="Editar"
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-9 md:size-8 text-destructive hover:text-destructive"
                  onClick={() => setDeleting(tx)}
                  aria-label="Eliminar"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </TableCell>
          )}
        </TableRow>
      ))}
    </TableBody>
  </Table>
</div>
```

- [ ] **Step 7: Mejorar la paginación responsive**

Reemplazá el bloque de pagination (`{pagination && pagination.totalPages > 1 && (...)}`) por:

```tsx
{pagination && pagination.totalPages > 1 && (
  <div className="flex flex-col gap-3 mt-4 px-1 md:flex-row md:items-center md:justify-between">
    <p className="text-xs text-muted-foreground text-center md:text-left">
      Página {pagination.page} de {pagination.totalPages} · {pagination.total} total
      {isFetching && (
        <Loader2 className="size-3 inline animate-spin ml-2 text-muted-foreground" />
      )}
    </p>
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => updateParam('page', String(Math.max(1, pagination.page - 1)))}
        disabled={pagination.page <= 1}
        className="flex-1 md:flex-none"
      >
        <ChevronLeft className="size-4" />
        Anterior
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => updateParam('page', String(pagination.page + 1))}
        disabled={pagination.page >= pagination.totalPages}
        className="flex-1 md:flex-none"
      >
        Siguiente
        <ChevronRight className="size-4" />
      </Button>
    </div>
  </div>
)}
```

- [ ] **Step 8: Type-check**

Run: `npm run build`
Expected: build success.

- [ ] **Step 9: Verificación visual**

Run: `npm run dev`

En `/transactions`:
- 375px: header con título + (botón "+" icon-only). Filtros 2x2. Tabla con scroll horizontal (se deslizan los datos). Menú "Columnas" abre popover, los checkboxes funcionan, ocultar columnas reduce la tabla, refrescar la página → preferencias persisten.
- 768px: filtros 2x2 todavía, header con label completo en el botón.
- 1024px+: filtros en una sola fila de 4 columnas. Tabla full sin scroll.

Casos a probar:
- Toggle el filtro de tipo → el botón "Limpiar" (icon-only) aparece al lado del "Nueva transacción". Click → limpia.
- Como ADMIN: la columna Acciones aparece en el menú.
- Como VIEWER: la columna Acciones no aparece en el menú.

- [ ] **Step 10: Commit**

```bash
git add src/features/transactions/TransactionsPage.tsx
git commit -m "feat(transactions): responsive table with column visibility menu"
```

---

## Task 9: Users — header + tabla con columnas

**Files:**
- Modify: `src/features/users/UsersPage.tsx`

- [ ] **Step 1: Agregar imports**

Al tope del archivo, agregar:

```tsx
import { ColumnVisibilityMenu } from '@/components/shared/ColumnVisibilityMenu'
import {
  useColumnVisibility,
  type ColumnDef,
} from '@/lib/hooks/useColumnVisibility'
```

- [ ] **Step 2: Definir columnas**

Top-level del archivo (afuera de `UsersPage`):

```tsx
type UserColumnId = 'name' | 'email' | 'role' | 'transactions' | 'createdAt' | 'actions'

const USER_COLUMNS: readonly ColumnDef<UserColumnId>[] = [
  { id: 'name', label: 'Nombre' },
  { id: 'email', label: 'Email', defaultVisibleMobile: false },
  { id: 'role', label: 'Rol' },
  { id: 'transactions', label: 'Transacc.' },
  { id: 'createdAt', label: 'Creado', defaultVisibleMobile: false },
  { id: 'actions', label: 'Acciones' },
]
```

Dentro de `UsersPage`, antes del `return`:

```tsx
const [columns, setColumns] = useColumnVisibility<UserColumnId>('cols:users', USER_COLUMNS)
```

- [ ] **Step 3: Modificar el header**

```tsx
<div className="flex items-start justify-between gap-3 flex-wrap">
  <div>
    <h1 className="text-2xl font-bold">Usuarios</h1>
    <p className="text-muted-foreground text-sm">
      Administración de cuentas con acceso al sistema
    </p>
  </div>
  <Button onClick={() => setCreating(true)}>
    <Plus className="size-4" />
    <span className="hidden sm:inline">Nuevo usuario</span>
  </Button>
</div>
```

- [ ] **Step 4: Menú de columnas + tabla con scroll y visibilidad**

Reemplazá el contenido del `<CardContent className="pt-6">` (todo el bloque condicional + tabla) por:

```tsx
<CardContent className="pt-6">
  <div className="flex justify-end mb-3">
    <ColumnVisibilityMenu columns={USER_COLUMNS} visible={columns} onChange={setColumns} />
  </div>
  {isLoading ? (
    <div className="flex justify-center py-12">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  ) : error ? (
    <p className="text-destructive text-center py-8">Error al cargar usuarios</p>
  ) : users.length === 0 ? (
    <p className="text-sm text-muted-foreground text-center py-12">
      No hay usuarios cargados.
    </p>
  ) : (
    <div className="overflow-x-auto -mx-4 md:mx-0">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.name && <TableHead>Nombre</TableHead>}
            {columns.email && <TableHead>Email</TableHead>}
            {columns.role && <TableHead className="w-[100px]">Rol</TableHead>}
            {columns.transactions && <TableHead className="w-[100px] text-right">Transacc.</TableHead>}
            {columns.createdAt && <TableHead className="w-[110px]">Creado</TableHead>}
            {columns.actions && <TableHead className="w-[100px]" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => {
            const isSelf = u.id === currentUserId
            return (
              <TableRow key={u.id}>
                {columns.name && (
                  <TableCell className="font-medium">
                    {u.name}
                    {isSelf && (
                      <span className="ml-2 text-xs text-muted-foreground">(vos)</span>
                    )}
                  </TableCell>
                )}
                {columns.email && (
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                )}
                {columns.role && (
                  <TableCell>
                    <Badge variant={u.role === 'ADMIN' ? 'default' : 'secondary'}>
                      {u.role}
                    </Badge>
                  </TableCell>
                )}
                {columns.transactions && (
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {u._count.transactions}
                  </TableCell>
                )}
                {columns.createdAt && (
                  <TableCell className="text-muted-foreground text-xs">
                    {u.createdAt ? formatDate(u.createdAt) : '—'}
                  </TableCell>
                )}
                {columns.actions && (
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-9 md:size-8"
                        onClick={() => setEditing(u)}
                        aria-label={`Editar ${u.name}`}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-9 md:size-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleting(u)}
                        disabled={isSelf}
                        aria-label={`Eliminar ${u.name}`}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )}
</CardContent>
```

- [ ] **Step 5: Type-check**

Run: `npm run build`
Expected: build success.

- [ ] **Step 6: Verificación visual**

Run: `npm run dev`

En `/users`:
- 375px: header con título + botón "+" icon-only. Tabla con scroll horizontal, columnas Email y Creado ocultas por default. Menú "Columnas" funciona. Botones de acción (lápiz/papelera) más grandes (36px).
- 1280px: todas las columnas visibles por default, layout normal.

- [ ] **Step 7: Commit**

```bash
git add src/features/users/UsersPage.tsx
git commit -m "feat(users): responsive table with column visibility menu"
```

---

## Task 10: Categories — header + filter chips

**Files:**
- Modify: `src/features/categories/CategoriesPage.tsx`

- [ ] **Step 1: Header con botón icon-only en mobile**

Reemplazá el bloque del header por:

```tsx
<div className="flex items-start justify-between gap-3 flex-wrap">
  <div>
    <h1 className="text-2xl font-bold">Categorías</h1>
    <p className="text-muted-foreground text-sm">Tipos de ingreso y gasto disponibles</p>
  </div>
  {isAdmin && (
    <Button onClick={() => setCreating(true)}>
      <Plus className="size-4" />
      <span className="hidden sm:inline">Nueva categoría</span>
    </Button>
  )}
</div>
```

- [ ] **Step 2: Filter chips con wrap**

Cambiar `<div className="flex gap-2">` (el de los `FilterChip`) por:

```tsx
<div className="flex flex-wrap gap-2">
```

- [ ] **Step 3: Cards con min-w-0 para truncate correcto**

En el bloque `{filtered.length > 0 && (...)}`, dentro del map de categorías, cambiar:

```tsx
<span className="text-sm flex-1 truncate">{cat.name}</span>
```

por:

```tsx
<span className="text-sm flex-1 min-w-0 truncate">{cat.name}</span>
```

Y aumentar el touch target de los botones de acción cambiando `className="size-8"` por `className="size-9 md:size-8"` en ambos botones (lápiz y papelera).

- [ ] **Step 4: Type-check**

Run: `npm run build`
Expected: build success.

- [ ] **Step 5: Verificación visual**

Run: `npm run dev`

En `/categories`:
- 375px: header con botón "+" icon-only. Filter chips se envuelven si hace falta. Cards en una columna. Botones de acción 36px. Nombre largo de categoría se trunca correctamente sin empujar a las acciones fuera de pantalla.
- 1280px: todo normal.

- [ ] **Step 6: Commit**

```bash
git add src/features/categories/CategoriesPage.tsx
git commit -m "feat(categories): responsive header and chips wrapping"
```

---

## Task 11: Forms — submit button responsive

**Files:**
- Modify: `src/features/transactions/TransactionForm.tsx`
- Modify: `src/features/users/UserForm.tsx`
- Modify: `src/features/categories/CategoryForm.tsx`

El `DialogFooter` ya hace `flex-col-reverse sm:flex-row` por default — los botones quedan apilados en mobile pero **no full-width**. Hay que hacer que los botones individuales se expandan en mobile.

- [ ] **Step 1: TransactionForm**

En `TransactionForm.tsx`, el grid de Monto+Fecha (`<div className="grid grid-cols-2 gap-4">`) cambiarlo a:

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
```

En el `DialogFooter`, cambiar los dos botones para que sean full-width en mobile:

```tsx
<DialogFooter>
  <DialogClose asChild>
    <Button type="button" variant="outline" disabled={isPending} className="w-full sm:w-auto">
      Cancelar
    </Button>
  </DialogClose>
  <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
    {isPending && <Loader2 className="size-4 animate-spin" />}
    {initial ? 'Guardar cambios' : 'Crear transacción'}
  </Button>
</DialogFooter>
```

- [ ] **Step 2: UserForm (ambas variantes Create y Edit)**

En `UserForm.tsx`, **en los dos `DialogFooter`** (uno en `CreateForm`, otro en `EditForm`), aplicar el mismo cambio:

```tsx
<DialogFooter>
  <DialogClose asChild>
    <Button type="button" variant="outline" disabled={isPending} className="w-full sm:w-auto">
      Cancelar
    </Button>
  </DialogClose>
  <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
    {isPending && <Loader2 className="size-4 animate-spin" />}
    {/* Mantener el texto original: "Crear usuario" para create, "Guardar cambios" para edit */}
  </Button>
</DialogFooter>
```

(Conservar los textos originales: `Crear usuario` en `CreateForm`, `Guardar cambios` en `EditForm`.)

- [ ] **Step 3: CategoryForm**

En `CategoryForm.tsx`, mismo patrón en el `DialogFooter`:

```tsx
<DialogFooter>
  <DialogClose asChild>
    <Button type="button" variant="outline" disabled={isPending} className="w-full sm:w-auto">
      Cancelar
    </Button>
  </DialogClose>
  <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
    {isPending && <Loader2 className="size-4 animate-spin" />}
    {initial ? 'Guardar cambios' : 'Crear categoría'}
  </Button>
</DialogFooter>
```

- [ ] **Step 4: Type-check**

Run: `npm run build`
Expected: build success.

- [ ] **Step 5: Verificación visual**

Run: `npm run dev`

Abrir cada uno de los diálogos (Nueva transacción, Nueva categoría, Nuevo usuario, Editar usuario) en 375px:
- Los campos del form se ven uno arriba del otro (en TransactionForm el grid Monto+Fecha también pasó a single column).
- Los botones Cancelar/Confirmar quedan full-width, apilados con Confirmar arriba.

En 1280px: layout horizontal sin cambios visibles desde el comportamiento anterior.

- [ ] **Step 6: Commit**

```bash
git add src/features/transactions/TransactionForm.tsx src/features/users/UserForm.tsx src/features/categories/CategoryForm.tsx
git commit -m "feat(forms): responsive layout and full-width buttons on mobile"
```

---

## Task 12: Verificación final integral

- [ ] **Step 1: Lint**

Run: `npm run lint`
Expected: sin errores (warnings tolerables si los hay).

- [ ] **Step 2: Build de producción**

Run: `npm run build`
Expected: build exitoso, sin errores TS.

- [ ] **Step 3: Smoke test cross-viewport**

Run: `npm run dev`

Para **cada viewport** (375, 390, 768, 1280) recorrer cada ruta y verificar:

- `/login` — card centrado, sin overflow horizontal.
- `/` (dashboard) — KPIs caben, filtros usables, chart legible.
- `/transactions` — header con botón compacto en mobile, filtros 2x2, tabla con scroll, menú columnas persiste.
- `/categories` — chips, cards, botones de acción tocables.
- `/users` (solo ADMIN) — tabla con scroll, columnas configurables.
- Drawer mobile: abre/cierra, navega correctamente.
- Diálogos: abrir cada uno, formulario operable, botones touch-friendly.

- [ ] **Step 4: Commit (si hubo fixes durante smoke test)**

Si encontraste algún ajuste menor durante el smoke test que no encaja en una task anterior, commiteá con:

```bash
git add -A
git commit -m "fix(responsive): minor adjustments after smoke test"
```

Si no hubo cambios, saltear este step.

---

## Final notes

- **Persistencia de columnas:** las preferencias quedan guardadas bajo `cols:transactions` y `cols:users` en `localStorage`. Si querés resetear durante testing: `localStorage.removeItem('cols:transactions')` desde DevTools.
- **Sin tests automáticos:** no hay framework instalado y agregar uno está fuera de alcance. La verificación es manual.
- **Sin cambios al backend:** todo este trabajo es puramente frontend.
