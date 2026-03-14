import React from 'react'
import styles from './GameOver.module.css'
import StarField from './StarField'

interface Props {
  playerName: string
  onRestart: () => void
}

export default function GameOver({ playerName, onRestart }: Props) {
  return (
    <div className={styles.screen}>
      <StarField />
      <div className={styles.content}>
        <div className={styles.eyebrow}>The forest takes what it is owed</div>
        <div className={styles.name}>Game Over</div>
        <div className={styles.rule} />
        <div className={styles.body}>
          You came back for someone you loved.<br />
          Ashenveld did not let you finish.<br /><br />
          What the forest takes, it keeps.
        </div>
        <button className={styles.btn} onClick={onRestart}>
          <span>Begin Again</span>
        </button>
      </div>
    </div>
  )
}
