import React from 'react'
import { getMasterIndex } from '../loader'
import { loadMeta } from '../gameState'
import Panel from './Panel'
import styles from './Endings.module.css'

/** The ending gallery: five slots, found ones by name (G13). */
export default function Endings({ onClose }: { onClose: () => void }) {
  const found = new Set(loadMeta().endings)
  const all = getMasterIndex().endings ?? []
  return (
    <Panel title="Endings" onClose={onClose}>
      <div className={styles.body}>
        <p className={styles.count}>{[...found].filter(id => all.some(e => e.id === id)).length} of {all.length} found</p>
        <ol className={styles.list}>
          {all.map(e => (
            <li key={e.id} className={found.has(e.id) ? styles.found : styles.missing}>
              {found.has(e.id) ? e.title : 'Not yet found'}
            </li>
          ))}
        </ol>
      </div>
    </Panel>
  )
}
