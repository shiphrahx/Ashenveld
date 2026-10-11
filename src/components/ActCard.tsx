import React, { useEffect, useRef } from 'react'
import styles from './ActCard.module.css'

interface Props {
  act: number
  title: string
  /** G14: "You have become: Listener", and what it does. */
  trait?: { name: string; effect: string }
  onContinue: () => void
}

const ROMAN = ['', 'I', 'II', 'III']

/** E6: shown before the first scene of each act. */
export default function ActCard({ act, title, trait, onContinue }: Props) {
  const btn = useRef<HTMLButtonElement>(null)
  useEffect(() => { btn.current?.focus() }, [])
  return (
    <div className={styles.card} data-interstitial data-act-card={act} role="dialog" aria-modal="true" aria-labelledby="act-card-title">
      <div className={styles.inner}>
        <div className={styles.eyebrow}>Act {ROMAN[act] ?? act}</div>
        <h1 id="act-card-title" className={styles.title}>{title}</h1>
        <div className={styles.rule} aria-hidden="true" />
        {trait && (
          <p className={styles.trait}>You have become: <strong>{trait.name}</strong><br />{trait.effect}</p>
        )}
        <button ref={btn} className={styles.btn} onClick={onContinue}>Continue</button>
      </div>
    </div>
  )
}
