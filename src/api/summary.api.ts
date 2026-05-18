import { apiClient, unwrap } from './client'
import type { Summary } from '@/schemas/summary.schema'

export const summaryApi = {
  get: (params?: { from?: string; to?: string }) =>
    unwrap<Summary>(apiClient.get('/summary', { params })),
}
