import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import type { User } from '@/schemas/auth.schema'
import type { UserCreateInput, UserUpdateInput } from '@/schemas/user.schema'

export function UsersPage() {
  const currentUserId = useAuth((s) => s.user?.id)
  const queryClient = useQueryClient()

  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [deleting, setDeleting] = useState<User | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list(),
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['users'] })

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
    mutationFn: (id: number) => usersApi.remove(id),
    onSuccess: () => {
      toast.success('Usuario eliminado')
      invalidate()
      setDeleting(null)
    },
    onError: (err: ApiRequestError) => {
      toast.error(err.message)
      setDeleting(null)
    },
  })

  const users = data ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Usuarios</h1>
          <p className="text-muted-foreground text-sm">
            Administración de cuentas con acceso al sistema
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="size-4" />
          Nuevo usuario
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="w-[100px]">Rol</TableHead>
                  <TableHead className="w-[110px]">Creado</TableHead>
                  <TableHead className="w-[100px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => {
                  const isSelf = u.id === currentUserId
                  return (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">
                        {u.name}
                        {isSelf && (
                          <span className="ml-2 text-xs text-muted-foreground">(vos)</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{u.email}</TableCell>
                      <TableCell>
                        <Badge variant={u.role === 'ADMIN' ? 'default' : 'secondary'}>
                          {u.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {u.createdAt ? formatDate(u.createdAt) : '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => setEditing(u)}
                            aria-label={`Editar ${u.name}`}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleting(u)}
                            disabled={isSelf}
                            aria-label={`Eliminar ${u.name}`}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
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

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a borrar <strong>{deleting?.name}</strong> ({deleting?.email}). Si tiene
              transacciones asociadas la operación va a fallar.
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
