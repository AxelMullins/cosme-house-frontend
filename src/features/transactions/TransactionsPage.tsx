import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { transactionsApi } from '@/api/transactions.api'
import { categoriesApi } from '@/api/categories.api'
import { ApiRequestError } from '@/api/client'
import { useAuth } from '@/features/auth/useAuth'
import { TransactionForm } from './TransactionForm'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import type {
  Transaction,
  TransactionFormInput,
} from '@/schemas/transaction.schema'
import type { TransactionType } from '@/schemas/category.schema'

const PAGE_SIZE = 20
const ALL = '__all__'

function parsePage(value: string | null): number {
  const n = Number(value)
  return Number.isInteger(n) && n > 0 ? n : 1
}

function parseType(value: string | null): TransactionType | undefined {
  return value === 'INCOME' || value === 'EXPENSE' ? value : undefined
}

function parseCategoryId(value: string | null): number | undefined {
  const n = Number(value)
  return Number.isInteger(n) && n > 0 ? n : undefined
}

function parseDate(value: string | null): string | undefined {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined
}

export function TransactionsPage() {
  const role = useAuth((s) => s.user?.role)
  const isAdmin = role === 'ADMIN'
  const queryClient = useQueryClient()

  const [searchParams, setSearchParams] = useSearchParams()

  const filters = useMemo(
    () => ({
      type: parseType(searchParams.get('type')),
      categoryId: parseCategoryId(searchParams.get('categoryId')),
      from: parseDate(searchParams.get('from')),
      to: parseDate(searchParams.get('to')),
      page: parsePage(searchParams.get('page')),
    }),
    [searchParams]
  )

  const updateParam = (key: string, value: string | undefined) => {
    const next = new URLSearchParams(searchParams)
    if (value === undefined || value === '') {
      next.delete(key)
    } else {
      next.set(key, value)
    }
    if (key !== 'page') next.delete('page')
    setSearchParams(next, { replace: true })
  }

  const clearFilters = () => {
    setSearchParams(new URLSearchParams(), { replace: true })
  }

  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [deleting, setDeleting] = useState<Transaction | null>(null)

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list(),
  })

  const queryKey = ['transactions', filters] as const

  const {
    data,
    isLoading,
    isFetching,
    error,
  } = useQuery({
    queryKey,
    queryFn: () =>
      transactionsApi.list({
        ...filters,
        limit: PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['transactions'] })
    queryClient.invalidateQueries({ queryKey: ['summary'] })
  }

  const createMutation = useMutation({
    mutationFn: transactionsApi.create,
    onSuccess: () => {
      toast.success('Transacción creada')
      invalidate()
      setCreating(false)
    },
    onError: (err: ApiRequestError) => toast.error(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: number; input: TransactionFormInput }) =>
      transactionsApi.update(id, input),
    onSuccess: () => {
      toast.success('Transacción actualizada')
      invalidate()
      setEditing(null)
    },
    onError: (err: ApiRequestError) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => transactionsApi.remove(id),
    onSuccess: () => {
      toast.success('Transacción eliminada')
      invalidate()
      setDeleting(null)
    },
    onError: (err: ApiRequestError) => {
      toast.error(err.message)
      setDeleting(null)
    },
  })

  const transactions = data?.data ?? []
  const pagination = data?.pagination
  const hasActiveFilters =
    filters.type !== undefined ||
    filters.categoryId !== undefined ||
    filters.from !== undefined ||
    filters.to !== undefined

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Transacciones</h1>
          <p className="text-muted-foreground text-sm">Ingresos y gastos registrados</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4" />
            Nueva transacción
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Tipo</Label>
              <Select
                value={filters.type ?? ALL}
                onValueChange={(v) => updateParam('type', v === ALL ? undefined : v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos</SelectItem>
                  <SelectItem value="INCOME">Ingresos</SelectItem>
                  <SelectItem value="EXPENSE">Gastos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Categoría</Label>
              <Select
                value={filters.categoryId ? String(filters.categoryId) : ALL}
                onValueChange={(v) =>
                  updateParam('categoryId', v === ALL ? undefined : v)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todas</SelectItem>
                  {(categories ?? []).map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Desde</Label>
              <Input
                type="date"
                value={filters.from ?? ''}
                onChange={(e) => updateParam('from', e.target.value || undefined)}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Hasta</Label>
              <Input
                type="date"
                value={filters.to ?? ''}
                onChange={(e) => updateParam('to', e.target.value || undefined)}
              />
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                disabled={!hasActiveFilters}
                className="w-full"
              >
                <X className="size-4" />
                Limpiar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <p className="text-destructive text-center py-8">
              Error al cargar las transacciones
            </p>
          ) : transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">
              {hasActiveFilters
                ? 'Ninguna transacción coincide con los filtros.'
                : 'Todavía no hay transacciones registradas.'}
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[110px]">Fecha</TableHead>
                    <TableHead className="w-[110px]">Tipo</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    {isAdmin && <TableHead className="w-[90px]" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>{formatDate(tx.date)}</TableCell>
                      <TableCell>
                        <Badge variant={tx.type === 'INCOME' ? 'success' : 'danger'}>
                          {tx.type === 'INCOME' ? 'Ingreso' : 'Gasto'}
                        </Badge>
                      </TableCell>
                      <TableCell className="truncate max-w-[160px]">
                        {tx.category?.name ?? '—'}
                      </TableCell>
                      <TableCell className="truncate max-w-[260px] text-muted-foreground">
                        {tx.description || '—'}
                      </TableCell>
                      <TableCell
                        className={cn(
                          'text-right font-medium tabular-nums',
                          tx.type === 'INCOME' ? 'text-emerald-600' : 'text-destructive'
                        )}
                      >
                        {tx.type === 'EXPENSE' ? '-' : '+'}
                        {formatCurrency(tx.amount)}
                      </TableCell>
                      {isAdmin && (
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              onClick={() => setEditing(tx)}
                              aria-label="Editar"
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-destructive hover:text-destructive"
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

              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 px-1">
                  <p className="text-xs text-muted-foreground">
                    Página {pagination.page} de {pagination.totalPages} · {pagination.total} total
                    {isFetching && (
                      <Loader2 className="size-3 inline animate-spin ml-2 text-muted-foreground" />
                    )}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        updateParam('page', String(Math.max(1, pagination.page - 1)))
                      }
                      disabled={pagination.page <= 1}
                    >
                      <ChevronLeft className="size-4" />
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateParam('page', String(pagination.page + 1))}
                      disabled={pagination.page >= pagination.totalPages}
                    >
                      Siguiente
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={creating} onOpenChange={(open) => !open && setCreating(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva transacción</DialogTitle>
            <DialogDescription>
              Registrá un ingreso o gasto. La fecha por defecto es hoy.
            </DialogDescription>
          </DialogHeader>
          <TransactionForm
            isPending={createMutation.isPending}
            onSubmit={(input) => createMutation.mutate(input)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar transacción</DialogTitle>
            <DialogDescription>
              Los cambios actualizan automáticamente el resumen del dashboard.
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <TransactionForm
              initial={editing}
              isPending={updateMutation.isPending}
              onSubmit={(input) => updateMutation.mutate({ id: editing.id, input })}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar transacción?</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a borrar la transacción del {deleting && formatDate(deleting.date)} por{' '}
              <strong>{deleting && formatCurrency(deleting.amount)}</strong>. Esta acción no se
              puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                if (deleting) deleteMutation.mutate(deleting.id)
              }}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && <Loader2 className="size-4 animate-spin" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
