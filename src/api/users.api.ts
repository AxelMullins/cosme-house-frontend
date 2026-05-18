import { apiClient, unwrap } from './client'
import type { User } from '@/schemas/auth.schema'
import type {
  UserCreateInput,
  UserListItem,
  UserUpdateInput,
} from '@/schemas/user.schema'

export const usersApi = {
  list: () => unwrap<UserListItem[]>(apiClient.get('/users')),

  create: (input: UserCreateInput) => unwrap<User>(apiClient.post('/users', input)),

  update: (id: number, input: Partial<UserUpdateInput>) =>
    unwrap<User>(apiClient.put(`/users/${id}`, input)),

  remove: (id: number, reassignTo?: number) =>
    apiClient.delete(`/users/${id}`, {
      data: reassignTo ? { reassignTo } : undefined,
    }),
}
