import { useEffect, useMemo } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
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
import { DialogClose, DialogFooter } from '@/components/ui/dialog'
import { categoriesApi } from '@/api/categories.api'
import {
  transactionFormSchema,
  type Transaction,
  type TransactionFormInput,
  type TransactionFormValues,
} from '@/schemas/transaction.schema'

interface TransactionFormProps {
  initial?: Transaction
  isPending: boolean
  onSubmit: (input: TransactionFormInput) => void
}

const today = () => new Date().toISOString().slice(0, 10)

export function TransactionForm({ initial, isPending, onSubmit }: TransactionFormProps) {
  const form = useForm<TransactionFormValues, unknown, TransactionFormInput>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      type: initial?.type ?? 'EXPENSE',
      amount: initial ? parseFloat(initial.amount) : '',
      description: initial?.description ?? '',
      date: initial?.date ? initial.date.slice(0, 10) : today(),
      categoryId: initial?.categoryId ?? '',
    },
  })

  const type = form.watch('type')

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list(),
  })

  const filteredCategories = useMemo(
    () => (categories ?? []).filter((c) => c.type === type),
    [categories, type]
  )

  const currentCategoryId = form.watch('categoryId')

  useEffect(() => {
    if (
      typeof currentCategoryId === 'number' &&
      currentCategoryId > 0 &&
      filteredCategories.length > 0 &&
      !filteredCategories.some((c) => c.id === currentCategoryId)
    ) {
      form.setValue('categoryId', '', { shouldValidate: false })
    }
  }, [type, currentCategoryId, filteredCategories, form])

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="type">Tipo</Label>
        <Controller
          control={form.control}
          name="type"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="type">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INCOME">Ingreso</SelectItem>
                <SelectItem value="EXPENSE">Gasto</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="amount">Monto</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            {...form.register('amount')}
          />
          {form.formState.errors.amount && (
            <p className="text-sm text-destructive">{form.formState.errors.amount.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="date">Fecha</Label>
          <Input id="date" type="date" {...form.register('date')} />
          {form.formState.errors.date && (
            <p className="text-sm text-destructive">{form.formState.errors.date.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="categoryId">Categoría</Label>
        <Controller
          control={form.control}
          name="categoryId"
          render={({ field }) => (
            <Select
              value={field.value ? String(field.value) : ''}
              onValueChange={(v) => field.onChange(Number(v))}
              disabled={filteredCategories.length === 0}
            >
              <SelectTrigger id="categoryId">
                <SelectValue
                  placeholder={
                    filteredCategories.length === 0
                      ? `No hay categorías de tipo ${type === 'INCOME' ? 'Ingreso' : 'Gasto'}`
                      : 'Seleccioná una categoría'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {filteredCategories.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {form.formState.errors.categoryId && (
          <p className="text-sm text-destructive">{form.formState.errors.categoryId.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descripción (opcional)</Label>
        <Input
          id="description"
          placeholder="Compra de bombitas LED"
          maxLength={500}
          {...form.register('description')}
        />
        {form.formState.errors.description && (
          <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>
        )}
      </div>

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
    </form>
  )
}
