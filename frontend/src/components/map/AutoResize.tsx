import { useEffect } from 'react'
import { useMap } from 'react-leaflet'

/** Leaflet measures its container once; re-measure whenever the container resizes. */
export function AutoResize() {
  const map = useMap()
  useEffect(() => {
    const el = map.getContainer()
    const ro = new ResizeObserver(() => map.invalidateSize({ pan: false }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [map])
  return null
}
