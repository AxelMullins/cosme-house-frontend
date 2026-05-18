import { z } from 'zod'
import { roleEnum, userSchema } from './auth.schema'

export { roleEnum }
export type { User, Role } from './auth.schema'

export const userListItemSchema = userSchema

export const userCreateSchema = z.object({
  email: z.email('Email inválido').trim(),
  password: z
    .string()
    .min(8, 'Mínimo 8 caracteres')
    .max(72, 'Máximo 72 caracteres'),
  name: z.string().trim().min(2, 'Mínimo 2 caracteres'),
  role: roleEnum,
})

export type UserCreateInput = z.infer<typeof userCreateSchema>

export const userUpdateSchema = z.object({
  email: z.email('Email inválido').trim(),
  password: z
    .string()
    .min(8, 'Mínimo 8 caracteres')
    .max(72, 'Máximo 72 caracteres')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  name: z.string().trim().min(2, 'Mínimo 2 caracteres'),
  role: roleEnum,
})

export type UserUpdateInput = z.infer<typeof userUpdateSchema>
