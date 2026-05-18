import { z } from 'zod'
import { transactionTypeEnum } from './category.schema'

export const summaryByCategorySchema = z.object({
  categoryId: z.number().int(),
  categoryName: z.string(),
  type: transactionTypeEnum,
  total: z.string(),
})

export type SummaryByCategory = z.infer<typeof summaryByCategorySchema>

export const summarySchema = z.object({
  totalIncome: z.string(),
  totalExpense: z.string(),
  balance: z.string(),
  byCategory: z.array(summaryByCategorySchema),
})

export type Summary = z.infer<typeof summarySchema>
