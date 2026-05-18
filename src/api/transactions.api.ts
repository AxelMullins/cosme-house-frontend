import { apiClient, unwrap } from './client'
import type { Transaction, TransactionFormInput, TransactionFilters } from '@/schemas/transaction.schema'
import type { Pagination } from '@/schemas/common'

type PaginatedResponse<T> = {
  success: true
  data: T[]
  pagination: Pagination
}

export const transactionsApi = {
  list: async (filters: Partial<TransactionFilters> = {}) => {
    const response = await apiClient.get<PaginatedResponse<Transaction>>('/transactions', {
      params: filters,
    })
    return {
      data: response.data.data,
      pagination: response.data.pagination,
    }
  },

  getById: (id: number) => unwrap<Transaction>(apiClient.get(`/transactions/${id}`)),

  create: (input: TransactionFormInput) =>
    unwrap<Transaction>(apiClient.post('/transactions', input)),

  update: (id: number, input: Partial<TransactionFormInput>) =>
    unwrap<Transaction>(apiClient.put(`/transactions/${id}`, input)),

  remove: (id: number) => apiClient.delete(`/transactions/${id}`),
}
