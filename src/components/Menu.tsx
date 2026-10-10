import React, { useState } from 'react'
import { saveGame } from '../gameState'
import { useSettings } from '../settings'
import type { GameState } from '../types'
import Panel from './Panel'
import styles from './Menu.module.css'

interface Props {
  state: GameState
  onClose: () => void
  onReturnToTitle: () => void
  onSettings: () => void
  onRestartChapter?: () => void
}

export default function Menu({ state, onClose, onReturnToTitle, onSettings, onRestartChapter }: Props) {
  const [confirmChapter, setConfirmChapter] = useState(false)
  const { settings, update } = useSettings()
  const [saved, setSaved] = useState(false)
  const [confirming, setConfirming] = useState(false)

  function handleSave() {
    saveGame(state)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <Panel title="Menu" onClose={onClose}>

        <div className={styles.body}>
          <button className={styles.row} onClick={onClose}>
            <span className={styles.rowLabel}>Resume</span>
          </button>

          <button className={styles.row} onClick={onSettings}>
            <span className={styles.rowLabel}>Settings</span>
          </button>

          <button className={styles.row} role="switch" aria-checked={settings.skipSeen} onClick={() => update({ skipSeen: !settings.skipSeen })}>
            <span className={styles.rowLabel}>Skip to the next choice I have not made</span>
            <span className={styles.rowHint}>{settings.skipSeen ? 'On' : 'Off'}</span>
          </button>

          <button className={styles.row} onClick={handleSave}>
            <span className={styles.rowLabel}>Save Game</span>
            {saved && <span className={styles.rowHint}>Saved</span>}
          </button>

          {onRestartChapter && (confirmChapter ? (
            <div className={styles.confirm}>
              <p className={styles.confirmText}>Go back to the start of this chapter? Everything since then is undone.</p>
              <div className={styles.confirmBtns}>
                <button className={`${styles.confirmBtn} ${styles.danger}`} onClick={onRestartChapter}>Go back</button>
                <button className={styles.confirmBtn} onClick={() => setConfirmChapter(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <button className={styles.row} onClick={() => setConfirmChapter(true)}>
              <span className={styles.rowLabel}>Return to the start of this chapter</span>
            </button>
          ))}

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
    </Panel>
  )
}
