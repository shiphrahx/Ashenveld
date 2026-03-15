import React, { useState } from 'react'
import { saveGame } from '../gameState'
import type { GameState } from '../types'
import styles from './Menu.module.css'

interface Props {
  state: GameState
  onClose: () => void
  onReturnToTitle: () => void
}

export default function Menu({ state, onClose, onReturnToTitle }: Props) {
  const [saved, setSaved] = useState(false)
  const [confirming, setConfirming] = useState(false)

  function handleSave() {
    saveGame(state)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.title}>Menu</span>
          <button className={styles.close} onClick={onClose}>✕</button>
        </div>

        <div className={styles.body}>
          <button className={styles.row} onClick={handleSave}>
            <span className={styles.rowLabel}>Save Game</span>
            {saved && <span className={styles.rowHint}>Saved</span>}
          </button>

          <div className={styles.divider} />

          {confirming ? (
            <div className={styles.confirm}>
              <p className={styles.confirmText}>Return to the title screen?</p>
              <div className={styles.confirmBtns}>
                <button className={`${styles.confirmBtn} ${styles.danger}`} onClick={onReturnToTitle}>Return to Title</button>
                <button className={styles.confirmBtn} onClick={() => setConfirming(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <button className={`${styles.row} ${styles.rowDanger}`} onClick={() => setConfirming(true)}>
              <span className={styles.rowLabel}>Return to Title</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
