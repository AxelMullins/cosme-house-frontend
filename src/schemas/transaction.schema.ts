import { z } from 'zod'
import { transactionTypeEnum, categorySchema } from './category.schema'

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato: YYYY-MM-DD')

export const transactionSchema = z.object({
  id: z.number().int(),
  type: transactionTypeEnum,
  amount: z.string(),
  description: z.string().nullable().optional(),
  date: z.string(),
  categoryId: z.number().int(),
  category: categorySchema.optional(),
  userId: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type Transaction = z.infer<typeof transactionSchema>

export const transactionFormSchema = z.object({
  type: transactionTypeEnum,
  amount: z.coerce.number().positive('Debe ser mayor a 0'),
  description: z.string().max(500).optional(),
  date: isoDate,
  categoryId: z.coerce.number().int().positive('Seleccioná una categoría'),
})

export type TransactionFormValues = z.input<typeof transactionFormSchema>
export type TransactionFormInput = z.output<typeof transactionFormSchema>

export const transactionFiltersSchema = z.object({
  type: transactionTypeEnum.optional(),
  categoryId: z.number().int().positive().optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
})

export type TransactionFilters = z.infer<typeof transactionFiltersSchema>
