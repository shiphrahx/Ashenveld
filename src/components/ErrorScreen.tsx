import React from 'react'
import styles from './Status.module.css'

interface Props {
  error: string
  onRetry: () => void
  onTitle: () => void
}

/** When the story will not load (U17). The save is never touched here. */
export default function ErrorScreen({ error, onRetry, onTitle }: Props) {
  return (
    <div className={styles.screen} role="alert">
      <h1 className={styles.heading}>The story did not load</h1>
      <p className={styles.plain}>The game's files couldn't be read. Try again, or go back to the title.</p>
      <div className={styles.buttons}>
        <button className={styles.btn} onClick={onRetry} autoFocus>Try again</button>
        <button className={styles.btn} onClick={onTitle}>Title</button>
      </div>
      <details className={styles.details}>
        <summary>Details</summary>
        <pre>{error}</pre>
      </details>
    </div>
  )
}
