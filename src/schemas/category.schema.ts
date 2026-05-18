import { z } from 'zod'

export const transactionTypeEnum = z.enum(['INCOME', 'EXPENSE'])
export type TransactionType = z.infer<typeof transactionTypeEnum>

export const categorySchema = z.object({
  id: z.number().int(),
  name: z.string(),
  type: transactionTypeEnum,
  createdAt: z.string(),
})

export type Category = z.infer<typeof categorySchema>

export const categoryFormSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').max(80, 'Máximo 80 caracteres'),
  type: transactionTypeEnum,
})

export type CategoryFormInput = z.infer<typeof categoryFormSchema>
