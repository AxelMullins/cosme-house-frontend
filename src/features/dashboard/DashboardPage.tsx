import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react'
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { summaryApi } from '@/api/summary.api'
import { transactionsApi } from '@/api/transactions.api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatDate, cn } from '@/lib/utils'

interface DateRange {
  from?: string
  to?: string
}

export function DashboardPage() {
  const [range, setRange] = useState<DateRange>({})

  const summaryQuery = useQuery({
    queryKey: ['summary', range],
    queryFn: () => summaryApi.get(range),
  })

  const recentQuery = useQuery({
    queryKey: ['transactions', 'recent', range],
    queryFn: () => transactionsApi.list({ ...range, limit: 5, page: 1 }),
  })

  const hasRange = !!(range.from || range.to)

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            Resumen general de ingresos y gastos
          </p>
        </div>

        <div className="flex items-end gap-2 flex-wrap">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Desde</Label>
            <Input
              type="date"
              value={range.from ?? ''}
              onChange={(e) => setRange((r) => ({ ...r, from: e.target.value || undefined }))}
              className="w-[150px]"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Hasta</Label>
            <Input
              type="date"
              value={range.to ?? ''}
              onChange={(e) => setRange((r) => ({ ...r, to: e.target.value || undefined }))}
              className="w-[150px]"
            />
          </div>
          {hasRange && (
            <Button variant="outline" size="sm" onClick={() => setRange({})}>
              <X className="size-4" />
              Limpiar
            </Button>
          )}
        </div>
      </div>

      <KPISection query={summaryQuery} />

      <div className="grid gap-4 lg:grid-cols-2">
        <CategoryBreakdownCard query={summaryQuery} />
        <RecentTransactionsCard query={recentQuery} />
      </div>
    </div>
  )
}

type SummaryQuery = ReturnType<typeof useQuery<Awaited<ReturnType<typeof summaryApi.get>>>>

function KPISection({ query }: { query: SummaryQuery }) {
  if (query.isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (query.error || !query.data) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-destructive">
          Error al cargar el resumen
        </CardContent>
      </Card>
    )
  }

  const data = query.data
  const balance = parseFloat(data.balance)
  const balanceColor = balance >= 0 ? 'text-emerald-600' : 'text-destructive'

  return (
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
        <div className={cn('text-2xl font-bold tabular-nums', valueClassName)}>{value}</div>
      </CardContent>
    </Card>
  )
}

const INCOME_COLORS = ['#10b981', '#059669', '#34d399', '#6ee7b7', '#a7f3d0']
const EXPENSE_COLORS = ['#ef4444', '#dc2626', '#f87171', '#fca5a5', '#fecaca']

function CategoryBreakdownCard({ query }: { query: SummaryQuery }) {
  const chartData = useMemo(() => {
    if (!query.data) return []
    return query.data.byCategory.map((cat, i) => {
      const palette = cat.type === 'INCOME' ? INCOME_COLORS : EXPENSE_COLORS
      return {
        name: cat.categoryName,
        value: parseFloat(cat.total),
        type: cat.type,
        color: palette[i % palette.length],
      }
    })
  }, [query.data])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Desglose por categoría</CardTitle>
      </CardHeader>
      <CardContent>
        {query.isLoading ? (
          <Skeleton className="h-[280px] w-full" />
        ) : chartData.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">
            Aún no hay transacciones registradas.
          </p>
        ) : (
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={95}
                  paddingAngle={2}
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value) => <span className="text-xs">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

type RecentQuery = ReturnType<
  typeof useQuery<Awaited<ReturnType<typeof transactionsApi.list>>>
>

function RecentTransactionsCard({ query }: { query: RecentQuery }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Últimas transacciones</CardTitle>
        <Button asChild variant="ghost" size="sm">
          <Link to="/transactions">
            Ver todas
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {query.isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between gap-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        ) : query.error || !query.data ? (
          <p className="text-destructive text-sm">Error al cargar transacciones</p>
        ) : query.data.data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">
            Sin movimientos en el período.
          </p>
        ) : (
          <div className="space-y-2">
            {query.data.data.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center gap-3 py-2 border-b last:border-0"
              >
                <Badge variant={tx.type === 'INCOME' ? 'success' : 'danger'} className="shrink-0">
                  {tx.type === 'INCOME' ? 'Ing' : 'Gas'}
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">
                    {tx.category?.name ?? '—'}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDate(tx.date)}</p>
                </div>
                <span
                  className={cn(
                    'text-sm font-medium tabular-nums shrink-0',
                    tx.type === 'INCOME' ? 'text-emerald-600' : 'text-destructive'
                  )}
                >
                  {tx.type === 'EXPENSE' ? '-' : '+'}
                  {formatCurrency(tx.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
