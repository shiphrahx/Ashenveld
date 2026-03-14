import React from 'react'
import styles from './TitleScreen.module.css'
import StarField from './StarField'

interface Props {
  hasSave: boolean
  onNewGame: () => void
  onContinue: () => void
}

export default function TitleScreen({ hasSave, onNewGame, onContinue }: Props) {
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
        {hasSave && (
          <button className={styles.titleBtn} onClick={onContinue}>
            <span>Continue</span>
          </button>
        )}
        <button className={styles.titleBtn} onClick={onNewGame}>
          <span>{hasSave ? 'New Game' : 'Begin'}</span>
        </button>
      </div>
    </div>
  )
}
