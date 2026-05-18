import { z } from 'zod'

export const roleEnum = z.enum(['ADMIN', 'VIEWER'])
export type Role = z.infer<typeof roleEnum>

export const userSchema = z.object({
  id: z.number().int(),
  email: z.email(),
  name: z.string(),
  role: roleEnum,
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
})

export type User = z.infer<typeof userSchema>

export const loginSchema = z.object({
  email: z.email('Email inválido'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
})

export type LoginInput = z.infer<typeof loginSchema>

export const loginResponseSchema = z.object({
  token: z.string(),
  user: userSchema,
})

export type LoginResponse = z.infer<typeof loginResponseSchema>
