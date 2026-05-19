import { useCallback, useState } from 'react'

export interface ColumnDef<K extends string> {
  id: K
  label: string
  defaultVisible?: boolean
  defaultVisibleMobile?: boolean
}

type Visibility<K extends string> = Record<K, boolean>

function computeDefaults<K extends string>(
  columns: readonly ColumnDef<K>[],
  isMobile: boolean
): Visibility<K> {
  const result = {} as Visibility<K>
  for (const col of columns) {
    const desktop = col.defaultVisible ?? true
    const mobile = col.defaultVisibleMobile ?? desktop
    result[col.id] = isMobile ? mobile : desktop
  }
  return result
}

function readStorage<K extends string>(
  storageKey: string,
  columns: readonly ColumnDef<K>[]
): Visibility<K> | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const result = {} as Visibility<K>
    let allKnown = true
    for (const col of columns) {
      const value = parsed[col.id]
      if (typeof value !== 'boolean') {
        allKnown = false
        break
      }
      result[col.id] = value
    }
    return allKnown ? result : null
  } catch {
    return null
  }
}

export function useColumnVisibility<K extends string>(
  storageKey: string,
  columns: readonly ColumnDef<K>[]
): [Visibility<K>, (next: Visibility<K>) => void] {
  const [visible, setVisibleState] = useState<Visibility<K>>(() => {
    const stored = readStorage(storageKey, columns)
    if (stored) return stored
    const isMobile =
      typeof window !== 'undefined' &&
      window.matchMedia('(max-width: 767px)').matches
    return computeDefaults(columns, isMobile)
  })

  const setVisible = useCallback(
    (next: Visibility<K>) => {
      setVisibleState(next)
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next))
      } catch {
        // localStorage puede fallar en modo privado — silencioso
      }
    },
    [storageKey]
  )

  return [visible, setVisible]
}
