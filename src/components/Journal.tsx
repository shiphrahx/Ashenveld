import React from 'react'
import type { JournalEntry } from '../types'
import Panel from './Panel'
import styles from './Journal.module.css'

interface Props {
  entries: JournalEntry[]
  onClose: () => void
}

export default function Journal({ entries, onClose }: Props) {
  return (
    <Panel title="Journal" onClose={onClose}>

        <div className={styles.body}>
          {entries.length === 0 ? (
            <div className={styles.empty}>Nothing recorded yet.</div>
          ) : (
            [...entries].reverse().map((entry, i) => (
              <div key={i} className={styles.entry}>
                <div className={styles.entryMeta}>
                  <span className={styles.entryTitle}>{entry.sceneTitle}</span>
                  <span className={styles.entryTime}>Day {entry.day} · {formatTime(entry.timeOfDay)}</span>
                </div>
                <div className={styles.entryText}>{entry.text}</div>
                <div className={styles.entryChoice}>
                  <span className={styles.choiceLabel}>You chose:</span> {entry.choiceText}
                </div>
                {entry.outcomeText && (
                  <div className={styles.entryOutcome}>{entry.outcomeText}</div>
                )}
                {i < entries.length - 1 && <div className={styles.divider} />}
              </div>
            ))
          )}
        </div>
    </Panel>
  )
}

function formatTime(raw: string): string {
  const dash = raw.indexOf(' — ')
  const label = dash !== -1 ? raw.slice(dash + 3) : raw
  return label.charAt(0).toUpperCase() + label.slice(1)
}
