import { useQuery } from '@tanstack/react-query'
import { TrendingUp, TrendingDown, Wallet, Loader2 } from 'lucide-react'
import { summaryApi } from '@/api/summary.api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, cn } from '@/lib/utils'

export function DashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['summary'],
    queryFn: () => summaryApi.get(),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="text-center text-destructive">
        Error al cargar el resumen
      </div>
    )
  }

  const balance = parseFloat(data.balance)
  const balanceColor = balance >= 0 ? 'text-emerald-600' : 'text-destructive'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Resumen general de ingresos y gastos</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <KPICard
          title="Ingresos"
          value={formatCurrency(data.totalIncome)}
          icon={<TrendingUp className="size-5 text-emerald-600" />}
          valueClassName="text-emerald-600"
        />
        <KPICard
          title="Gastos"
          value={formatCurrency(data.totalExpense)}
          icon={<TrendingDown className="size-5 text-destructive" />}
          valueClassName="text-destructive"
        />
        <KPICard
          title="Balance"
          value={formatCurrency(data.balance)}
          icon={<Wallet className="size-5 text-muted-foreground" />}
          valueClassName={balanceColor}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Desglose por categoría</CardTitle>
        </CardHeader>
        <CardContent>
          {data.byCategory.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Aún no hay transacciones registradas. Empezá creando una desde "Transacciones".
            </p>
          ) : (
            <div className="space-y-2">
              {data.byCategory.map((cat) => (
                <div key={cat.categoryId} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        'inline-block size-2 rounded-full',
                        cat.type === 'INCOME' ? 'bg-emerald-500' : 'bg-destructive'
                      )}
                    />
                    <span className="text-sm">{cat.categoryName}</span>
                  </div>
                  <span
                    className={cn(
                      'text-sm font-medium',
                      cat.type === 'INCOME' ? 'text-emerald-600' : 'text-destructive'
                    )}
                  >
                    {cat.type === 'EXPENSE' ? '-' : '+'}
                    {formatCurrency(cat.total)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

interface KPICardProps {
  title: string
  value: string
  icon: React.ReactNode
  valueClassName?: string
}

function KPICard({ title, value, icon, valueClassName }: KPICardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className={cn('text-2xl font-bold', valueClassName)}>{value}</div>
      </CardContent>
    </Card>
  )
}
