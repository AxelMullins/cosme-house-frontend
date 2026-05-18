import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function TransactionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Transacciones</h1>
        <p className="text-muted-foreground text-sm">Ingresos y gastos registrados</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Próximamente</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Esta página va a tener la tabla de transacciones con filtros (tipo, categoría,
            rango de fechas) y paginación, además del modal para crear/editar (admin).
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
