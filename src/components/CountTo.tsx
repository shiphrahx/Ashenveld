import React, { useEffect, useRef, useState } from 'react'
import { motionAllowed, useSettings } from '../settings'

/** A number that counts to its new value over 600ms (E10). Instant with motion off. */
export default function CountTo({ value }: { value: number }) {
  const { settings } = useSettings()
  const moving = motionAllowed(settings)
  const [shown, setShown] = useState(value)
  const from = useRef(value)
  useEffect(() => {
    if (!moving || from.current === value) { from.current = value; setShown(value); return }
    const start = performance.now(), a = from.current, b = value
    let raf = 0
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / 600)
      setShown(Math.round(a + (b - a) * (1 - (1 - k) ** 3)))
      if (k < 1) raf = requestAnimationFrame(tick)
      else from.current = b
    }
    raf = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(raf); from.current = b }
  }, [value, moving])
  return <>{shown}</>
}
