import { z } from 'zod'

export const paginationSchema = z.object({
  page: z.number().int(),
  limit: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
})

export type Pagination = z.infer<typeof paginationSchema>

export const apiErrorSchema = z.object({
  message: z.string(),
  code: z.string().optional(),
})

export type ApiError = z.infer<typeof apiErrorSchema>

export type ApiResponse<T> =
  | { success: true; data: T; pagination?: Pagination }
  | { success: false; error: ApiError }
