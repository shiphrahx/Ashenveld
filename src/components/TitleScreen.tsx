import React, { useState } from 'react'
import styles from './TitleScreen.module.css'
import StarField from './StarField'
import Settings from './Settings'
import Endings from './Endings'
import Credits from './Credits'
import { loadMeta } from '../gameState'

interface Props {
  hasSave: boolean
  saveEnded?: boolean
  /** "Tam · The Cipher · Act II, Day 7" */
  saveSummary?: string
  onNewGame: () => void
  onContinue: () => void
}

export default function TitleScreen({ hasSave, saveEnded = false, saveSummary, onNewGame, onContinue }: Props) {
  const [confirming, setConfirming] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [endingsOpen, setEndingsOpen] = useState(false)
  const [creditsOpen, setCreditsOpen] = useState(false)
  const [noteOpen, setNoteOpen] = useState(false)
  const anyEnding = loadMeta().endings.length > 0

  return (
    <div className={styles.titleScreen}>
      <div className={styles.titleBg} />
      <StarField />
      <div className={styles.titleContent}>
        <div className={styles.titleName}>Ashenveld</div>
        <div className={styles.titleRule} />
        <div className={styles.titleTagline}>
          You left Ashenveld eleven years ago.<br />
          Now somebody you love has gone missing there.
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
            {hasSave && saveSummary && <p id="save-summary" className={styles.saveSummary}>{saveSummary}</p>}
            {hasSave && (
              <button className={styles.titleBtn} onClick={onContinue} aria-describedby={saveSummary ? 'save-summary' : undefined}>
                <span>{saveEnded ? 'View ending' : 'Continue'}</span>
              </button>
            )}
            <button className={styles.titleBtn} onClick={hasSave ? () => setConfirming(true) : onNewGame}>
              <span>{hasSave ? 'New Game' : 'Begin'}</span>
            </button>
            <div className={styles.titleLinks}>
              <button className={styles.titleLink} onClick={() => setSettingsOpen(true)}>Settings</button>
              {anyEnding && <button className={styles.titleLink} onClick={() => setEndingsOpen(true)}>Endings</button>}
              <button className={styles.titleLink} onClick={() => setCreditsOpen(true)}>Credits</button>
            </div>
            <button className={styles.noteLink} aria-expanded={noteOpen} onClick={() => setNoteOpen(o => !o)}>Content note</button>
            {noteOpen && <p className={styles.titleSmall}>Themes: loss, illness, coercion, military occupation.</p>}
          </>
        )}
      </div>
      {settingsOpen && <Settings onClose={() => setSettingsOpen(false)} />}
      {endingsOpen && <Endings onClose={() => setEndingsOpen(false)} />}
      {creditsOpen && <Credits onClose={() => setCreditsOpen(false)} />}
    </div>
  )
}
