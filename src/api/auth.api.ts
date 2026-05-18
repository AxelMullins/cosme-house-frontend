import { apiClient, unwrap } from './client'
import type { LoginInput, LoginResponse, User } from '@/schemas/auth.schema'

export const authApi = {
  login: (input: LoginInput) =>
    unwrap<LoginResponse>(apiClient.post('/auth/login', input)),

  me: () => unwrap<User>(apiClient.get('/auth/me')),
}
