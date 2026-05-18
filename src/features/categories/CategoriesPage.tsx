import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { categoriesApi } from '@/api/categories.api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export function CategoriesPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list(),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Categorías</h1>
        <p className="text-muted-foreground text-sm">Tipos de ingreso y gasto disponibles</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex justify-center py-8">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {error && <p className="text-destructive">Error al cargar categorías</p>}
          {data && data.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No hay categorías cargadas.
            </p>
          )}
          {data && data.length > 0 && (
            <div className="grid gap-2 sm:grid-cols-2">
              {data.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-md border"
                >
                  <span
                    className={cn(
                      'inline-block size-2 rounded-full',
                      cat.type === 'INCOME' ? 'bg-emerald-500' : 'bg-destructive'
                    )}
                  />
                  <span className="text-sm flex-1">{cat.name}</span>
                  <span className="text-xs text-muted-foreground">{cat.type}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
