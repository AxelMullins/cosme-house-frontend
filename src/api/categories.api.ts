import { apiClient, unwrap } from './client'
import type { Category, CategoryFormInput } from '@/schemas/category.schema'
import type { TransactionType } from '@/schemas/category.schema'

export const categoriesApi = {
  list: (params?: { type?: TransactionType }) =>
    unwrap<Category[]>(apiClient.get('/categories', { params })),

  create: (input: CategoryFormInput) =>
    unwrap<Category>(apiClient.post('/categories', input)),

  update: (id: number, input: Partial<CategoryFormInput>) =>
    unwrap<Category>(apiClient.put(`/categories/${id}`, input)),

  remove: (id: number) => apiClient.delete(`/categories/${id}`),
}
