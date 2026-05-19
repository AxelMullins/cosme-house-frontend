import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
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
import { usersApi } from '@/api/users.api'
import { ApiRequestError } from '@/api/client'
import { useAuth } from '@/features/auth/useAuth'
import { UserForm } from './UserForm'
import { formatDate } from '@/lib/utils'
import { ColumnVisibilityMenu } from '@/components/shared/ColumnVisibilityMenu'
import {
  useColumnVisibility,
  type ColumnDef,
} from '@/lib/hooks/useColumnVisibility'
import type { User } from '@/schemas/auth.schema'
import type {
  UserCreateInput,
  UserListItem,
  UserUpdateInput,
} from '@/schemas/user.schema'

type UserColumnId = 'name' | 'email' | 'role' | 'transactions' | 'createdAt' | 'actions'

const USER_COLUMNS: readonly ColumnDef<UserColumnId>[] = [
  { id: 'name', label: 'Nombre' },
  { id: 'email', label: 'Email', defaultVisibleMobile: false },
  { id: 'role', label: 'Rol' },
  { id: 'transactions', label: 'Transacc.' },
  { id: 'createdAt', label: 'Creado', defaultVisibleMobile: false },
  { id: 'actions', label: 'Acciones' },
]

export function UsersPage() {
  const currentUserId = useAuth((s) => s.user?.id)
  const queryClient = useQueryClient()

  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [deleting, setDeleting] = useState<UserListItem | null>(null)
  const [reassignTo, setReassignTo] = useState<string>('')

  const { data, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list(),
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['users'] })
    queryClient.invalidateQueries({ queryKey: ['transactions'] })
    queryClient.invalidateQueries({ queryKey: ['summary'] })
  }

  const createMutation = useMutation({
    mutationFn: (input: UserCreateInput) => usersApi.create(input),
    onSuccess: () => {
      toast.success('Usuario creado')
      invalidate()
      setCreating(false)
    },
    onError: (err: ApiRequestError) => toast.error(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: number; input: Partial<UserUpdateInput> }) =>
      usersApi.update(id, input),
    onSuccess: () => {
      toast.success('Usuario actualizado')
      invalidate()
      setEditing(null)
    },
    onError: (err: ApiRequestError) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: ({ id, reassignTo }: { id: number; reassignTo?: number }) =>
      usersApi.remove(id, reassignTo),
    onSuccess: () => {
      toast.success('Usuario eliminado')
      invalidate()
      setDeleting(null)
      setReassignTo('')
    },
    onError: (err: ApiRequestError) => toast.error(err.message),
  })

  const users = data ?? []

  const reassignOptions = useMemo(
    () => users.filter((u) => u.id !== deleting?.id),
    [users, deleting?.id]
  )

  useEffect(() => {
    if (!deleting) setReassignTo('')
  }, [deleting])

  const hasTransactions = (deleting?._count.transactions ?? 0) > 0
  const canConfirmDelete = !hasTransactions || reassignTo !== ''

  const [columns, setColumns] = useColumnVisibility<UserColumnId>('cols:users', USER_COLUMNS)

  return (
    <div className="space-y-6">
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

      <Card>
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
      </Card>

      <Dialog open={creating} onOpenChange={(open) => !open && setCreating(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo usuario</DialogTitle>
            <DialogDescription>
              Los usuarios con rol ADMIN pueden crear, editar y eliminar datos.
            </DialogDescription>
          </DialogHeader>
          <UserForm
            mode="create"
            isPending={createMutation.isPending}
            onSubmit={(input) => createMutation.mutate(input)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar usuario</DialogTitle>
            <DialogDescription>
              Dejá la contraseña vacía si no querés cambiarla.
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <UserForm
              mode="edit"
              initial={editing}
              isPending={updateMutation.isPending}
              disableRole={editing.id === currentUserId}
              onSubmit={(input) => updateMutation.mutate({ id: editing.id, input })}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a borrar <strong>{deleting?.name}</strong> ({deleting?.email}).
              {hasTransactions ? (
                <>
                  {' '}Tiene{' '}
                  <strong>{deleting?._count.transactions} transacciones</strong>{' '}
                  asociadas — elegí a quién reasignárselas antes de continuar.
                </>
              ) : (
                ' Esta acción no se puede deshacer.'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {hasTransactions && (
            <div className="space-y-2">
              <Label htmlFor="reassignTo">Reasignar transacciones a</Label>
              <Select value={reassignTo} onValueChange={setReassignTo}>
                <SelectTrigger id="reassignTo">
                  <SelectValue placeholder="Seleccioná un usuario" />
                </SelectTrigger>
                <SelectContent>
                  {reassignOptions.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.name} ({u.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                if (!deleting || !canConfirmDelete) return
                deleteMutation.mutate({
                  id: deleting.id,
                  reassignTo: reassignTo ? Number(reassignTo) : undefined,
                })
              }}
              disabled={deleteMutation.isPending || !canConfirmDelete}
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
