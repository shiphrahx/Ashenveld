import React, { useState } from 'react'
import styles from './TitleScreen.module.css'
import StarField from './StarField'
import Settings from './Settings'
import Endings from './Endings'
import { loadMeta } from '../gameState'

interface Props {
  hasSave: boolean
  saveEnded?: boolean
  onNewGame: () => void
  onContinue: () => void
}

export default function TitleScreen({ hasSave, saveEnded = false, onNewGame, onContinue }: Props) {
  const [confirming, setConfirming] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [endingsOpen, setEndingsOpen] = useState(false)
  const anyEnding = loadMeta().endings.length > 0

  return (
    <div className={styles.titleScreen}>
      <div className={styles.titleBg} />
      <StarField />
      <div className={styles.titleContent}>
        <div className={styles.titleEyebrow}>A story of return</div>
        <div className={styles.titleName}>Ashenveld</div>
        <div className={styles.titleRule} />
        <div className={styles.titleTagline}>
          You left this place behind.<br />
          Now something you love has disappeared into it.
        </div>
        {confirming ? (
          <div className={styles.confirm} role="alertdialog" aria-labelledby="confirm-text">
            <p id="confirm-text" className={styles.confirmText}>Starting again replaces your saved game.</p>
            <div className={styles.confirmBtns}>
              <button className={styles.titleBtn} onClick={onNewGame} autoFocus><span>Start again</span></button>
              <button className={styles.titleBtn} onClick={() => setConfirming(false)}><span>Keep my save</span></button>
            </div>
          </div>
        ) : (
          <>
            {hasSave && (
              <button className={styles.titleBtn} onClick={onContinue}>
                <span>{saveEnded ? 'View ending' : 'Continue'}</span>
              </button>
            )}
            <button className={styles.titleBtn} onClick={hasSave ? () => setConfirming(true) : onNewGame}>
              <span>{hasSave ? 'New Game' : 'Begin'}</span>
            </button>
            <div className={styles.titleLinks}>
              <button className={styles.titleLink} onClick={() => setSettingsOpen(true)}>Settings</button>
              {anyEnding && <button className={styles.titleLink} onClick={() => setEndingsOpen(true)}>Endings</button>}
            </div>
          </>
        )}
      </div>
      {settingsOpen && <Settings onClose={() => setSettingsOpen(false)} />}
      {endingsOpen && <Endings onClose={() => setEndingsOpen(false)} />}
    </div>
  )
}
