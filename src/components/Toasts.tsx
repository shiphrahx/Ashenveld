import React, { useEffect } from 'react'
import styles from './Toasts.module.css'

export interface Toast { id: number; text: string }

interface Props {
  toasts: Toast[]
  onDone: (id: number) => void
}

const LIFE_MS = 4000

/** Changes from entering a scene, which have no outcome to sit under. */
export default function Toasts({ toasts, onDone }: Props) {
  useEffect(() => {
    const timers = toasts.map(t => setTimeout(() => onDone(t.id), LIFE_MS))
    return () => timers.forEach(clearTimeout)
  }, [toasts, onDone])

  return (
    <div className={styles.stack} aria-live="polite" role="status">
      {toasts.slice(-3).map(t => <div key={t.id} className={styles.toast}>{t.text}</div>)}
    </div>
  )
}
