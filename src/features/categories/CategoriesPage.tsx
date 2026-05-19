import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { categoriesApi } from '@/api/categories.api'
import { useAuth } from '@/features/auth/useAuth'
import { ApiRequestError } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
import { cn } from '@/lib/utils'
import { CategoryForm } from './CategoryForm'
import type { Category, CategoryFormInput, TransactionType } from '@/schemas/category.schema'

type Filter = 'ALL' | TransactionType

export function CategoriesPage() {
  const role = useAuth((s) => s.user?.role)
  const isAdmin = role === 'ADMIN'
  const queryClient = useQueryClient()

  const [filter, setFilter] = useState<Filter>('ALL')
  const [editing, setEditing] = useState<Category | null>(null)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<Category | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list(),
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['categories'] })
    queryClient.invalidateQueries({ queryKey: ['summary'] })
  }

  const createMutation = useMutation({
    mutationFn: categoriesApi.create,
    onSuccess: () => {
      toast.success('Categoría creada')
      invalidate()
      setCreating(false)
    },
    onError: (err: ApiRequestError) => toast.error(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: number; input: CategoryFormInput }) =>
      categoriesApi.update(id, input),
    onSuccess: () => {
      toast.success('Categoría actualizada')
      invalidate()
      setEditing(null)
    },
    onError: (err: ApiRequestError) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => categoriesApi.remove(id),
    onSuccess: () => {
      toast.success('Categoría eliminada')
      invalidate()
      setDeleting(null)
    },
    onError: (err: ApiRequestError) => {
      if (err.status === 409) {
        toast.error('No se puede borrar — tiene transacciones asociadas')
      } else {
        toast.error(err.message)
      }
      setDeleting(null)
    },
  })

  const filtered = (data ?? []).filter((c) => filter === 'ALL' || c.type === filter)

  return (
    <div className="space-y-6">
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

      <div className="flex flex-wrap gap-2">
        <FilterChip active={filter === 'ALL'} onClick={() => setFilter('ALL')}>
          Todas
        </FilterChip>
        <FilterChip active={filter === 'INCOME'} onClick={() => setFilter('INCOME')}>
          Ingresos
        </FilterChip>
        <FilterChip active={filter === 'EXPENSE'} onClick={() => setFilter('EXPENSE')}>
          Gastos
        </FilterChip>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading && (
            <div className="flex justify-center py-8">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {error && <p className="text-destructive">Error al cargar categorías</p>}
          {data && filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              {data.length === 0
                ? 'No hay categorías cargadas.'
                : 'Ninguna categoría coincide con el filtro.'}
            </p>
          )}
          {filtered.length > 0 && (
            <div className="grid gap-2 sm:grid-cols-2">
              {filtered.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-md border"
                >
                  <span
                    className={cn(
                      'inline-block size-2 rounded-full',
                      cat.type === 'INCOME' ? 'bg-emerald-500' : 'bg-destructive'
                    )}
                  />
                  <span className="text-sm flex-1 min-w-0 truncate">{cat.name}</span>
                  <Badge variant={cat.type === 'INCOME' ? 'success' : 'danger'}>
                    {cat.type === 'INCOME' ? 'Ingreso' : 'Gasto'}
                  </Badge>
                  {isAdmin && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-9 md:size-8"
                        onClick={() => setEditing(cat)}
                        aria-label={`Editar ${cat.name}`}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-9 md:size-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleting(cat)}
                        aria-label={`Eliminar ${cat.name}`}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={creating} onOpenChange={(open) => !open && setCreating(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva categoría</DialogTitle>
            <DialogDescription>
              Las categorías agrupan ingresos o gastos para los reportes.
            </DialogDescription>
          </DialogHeader>
          <CategoryForm
            isPending={createMutation.isPending}
            onSubmit={(input) => createMutation.mutate(input)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar categoría</DialogTitle>
            <DialogDescription>
              Cambiar el tipo afecta cómo se calculan los reportes a partir de ahora.
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <CategoryForm
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
            <AlertDialogTitle>¿Eliminar categoría?</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a borrar <strong>{deleting?.name}</strong>. Si tiene transacciones asociadas,
              la operación va a fallar.
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

interface FilterChipProps {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}

function FilterChip({ active, onClick, children }: FilterChipProps) {
  return (
    <Button
      variant={active ? 'default' : 'outline'}
      size="sm"
      onClick={onClick}
    >
      {children}
    </Button>
  )
}
