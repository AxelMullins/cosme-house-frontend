import { Columns3, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import type { ColumnDef } from '@/lib/hooks/useColumnVisibility'

interface ColumnVisibilityMenuProps<K extends string> {
  columns: readonly ColumnDef<K>[]
  visible: Record<K, boolean>
  onChange: (next: Record<K, boolean>) => void
}

export function ColumnVisibilityMenu<K extends string>({
  columns,
  visible,
  onChange,
}: ColumnVisibilityMenuProps<K>) {
  const visibleCount = columns.reduce((acc, c) => acc + (visible[c.id] ? 1 : 0), 0)

  const toggle = (id: K) => {
    const next = { ...visible, [id]: !visible[id] }
    const nextCount = columns.reduce((acc, c) => acc + (next[c.id] ? 1 : 0), 0)
    if (nextCount === 0) return // nunca permitir ocultar todas
    onChange(next)
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Columns3 className="size-4" />
          <span className="hidden sm:inline">Columnas</span>
          <span className="text-xs text-muted-foreground tabular-nums">
            {visibleCount}/{columns.length}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-2">
        <div className="space-y-0.5">
          {columns.map((col) => {
            const isOn = visible[col.id]
            return (
              <button
                key={col.id}
                type="button"
                onClick={() => toggle(col.id)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <span
                  className={cn(
                    'flex size-4 items-center justify-center rounded-sm border',
                    isOn ? 'bg-primary border-primary text-primary-foreground' : 'border-input'
                  )}
                >
                  {isOn && <Check className="size-3" />}
                </span>
                <span className="flex-1 text-left">{col.label}</span>
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
