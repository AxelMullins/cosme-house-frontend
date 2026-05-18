import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Loader2, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { loginSchema, type LoginInput } from '@/schemas/auth.schema'
import { authApi } from '@/api/auth.api'
import { useAuth } from './useAuth'
import { ApiRequestError } from '@/api/client'

export function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuth((s) => s.setAuth)

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      setAuth(data.token, data.user)
      toast.success(`¡Bienvenido, ${data.user.name}!`)
      navigate('/', { replace: true })
    },
    onError: (error: ApiRequestError) => {
      toast.error(error.message)
    },
  })

  const onSubmit = (data: LoginInput) => {
    loginMutation.mutate(data)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-primary/10 p-3">
              <Wallet className="size-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Cosme House</CardTitle>
          <CardDescription>Iniciá sesión para continuar</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@test.com"
                autoComplete="email"
                {...form.register('email')}
              />
              {form.formState.errors.email && (
                <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                {...form.register('password')}
              />
              {form.formState.errors.password && (
                <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
              {loginMutation.isPending && <Loader2 className="size-4 animate-spin" />}
              Ingresar
            </Button>

            {loginMutation.isPending && (
              <p className="text-xs text-center text-muted-foreground">
                Si el servidor estaba dormido puede tardar ~30s la primera vez
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
