import { useCallback, useEffect, useState } from 'react'

export interface ApiState<T> {
  data: T | undefined
  error: Error | undefined
  loading: boolean
  reload: () => void
}

// In-memory cache for read-only reference endpoints (catalogs rarely change).
const cache = new Map<string, unknown>()

/** Fetch on mount / when `key` changes. Pass key=null to skip. */
export function useApi<T>(key: string | null, fetcher: () => Promise<T>): ApiState<T> {
  const [data, setData] = useState<T | undefined>(() => (key ? (cache.get(key) as T | undefined) : undefined))
  const [error, setError] = useState<Error>()
  const [loading, setLoading] = useState(key !== null && !cache.has(key))
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    if (key === null) return
    let alive = true
    const cached = cache.get(key) as T | undefined
    if (cached !== undefined && nonce === 0) {
      setData(cached)
      setLoading(false)
      setError(undefined)
      return
    }
    setLoading(true)
    setError(undefined)
    fetcher()
      .then((d) => {
        if (!alive) return
        cache.set(key, d)
        setData(d)
      })
      .catch((e: Error) => alive && setError(e))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
    // fetcher identity is intentionally ignored; key drives refetching
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, nonce])

  const reload = useCallback(() => {
    if (key) cache.delete(key)
    setNonce((n) => n + 1)
  }, [key])

  return { data, error, loading, reload }
}
