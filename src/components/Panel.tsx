import React, { useEffect, useId, useRef } from 'react'
import styles from './Panel.module.css'

interface Props {
  title: string
  onClose: () => void
  wide?: boolean
  children: React.ReactNode
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'

/**
 * A side drawer on wide screens and a full-screen sheet on narrow ones.
 * It is a modal dialog: focus moves in, Tab is trapped, Esc closes, and
 * focus goes back to whatever opened it.
 */
export default function Panel({ title, onClose, wide = false, children }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const titleId = useId()

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    const first = ref.current?.querySelector<HTMLElement>(FOCUSABLE)
    first?.focus()
    return () => { opener?.focus?.() }
  }, [])

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { e.stopPropagation(); onClose(); return }
    if (e.key !== 'Tab' || !ref.current) return
    const items = [...ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(el => el.offsetParent !== null)
    if (!items.length) return
    const first = items[0], last = items[items.length - 1]
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        ref={ref}
        className={`${styles.panel} ${wide ? styles.wide : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={e => e.stopPropagation()}
        onKeyDown={onKeyDown}
        data-panel
      >
        <div className={styles.header}>
          <h2 id={titleId} className={styles.title}>{title}</h2>
          <button className={styles.close} onClick={onClose} aria-label={`Close ${title}`}>
            <span aria-hidden="true">✕</span> <span className={styles.closeWord}>Close</span>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
