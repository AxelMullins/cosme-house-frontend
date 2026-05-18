import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DialogFooter, DialogClose } from '@/components/ui/dialog'
import { categoryFormSchema, type CategoryFormInput, type Category } from '@/schemas/category.schema'

interface CategoryFormProps {
  initial?: Category
  isPending: boolean
  onSubmit: (input: CategoryFormInput) => void
}

export function CategoryForm({ initial, isPending, onSubmit }: CategoryFormProps) {
  const form = useForm<CategoryFormInput>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: initial?.name ?? '',
      type: initial?.type ?? 'EXPENSE',
    },
  })

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nombre</Label>
        <Input id="name" placeholder="Lámparas" autoFocus {...form.register('name')} />
        {form.formState.errors.name && (
          <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">Tipo</Label>
        <Controller
          control={form.control}
          name="type"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="type">
                <SelectValue placeholder="Seleccioná un tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INCOME">Ingreso</SelectItem>
                <SelectItem value="EXPENSE">Gasto</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
        {form.formState.errors.type && (
          <p className="text-sm text-destructive">{form.formState.errors.type.message}</p>
        )}
      </div>

      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline" disabled={isPending}>
            Cancelar
          </Button>
        </DialogClose>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="size-4 animate-spin" />}
          {initial ? 'Guardar cambios' : 'Crear categoría'}
        </Button>
      </DialogFooter>
    </form>
  )
}
