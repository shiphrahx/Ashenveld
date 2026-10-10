import React from 'react'
import Panel from './Panel'
import styles from './KeysHelp.module.css'

const KEYS: Array<[string, string]> = [
  ['1 – 6', 'Pick that choice'],
  ['Enter, Space', 'Continue'],
  ['J', 'Journal'],
  ['I', 'Items'],
  ['M', 'Map'],
  ['P', 'People'],
  ['R', 'Rest, where you can'],
  ['Esc', 'Close the open panel, or open the menu'],
  ['?', 'Show this list'],
]

export default function KeysHelp({ onClose }: { onClose: () => void }) {
  return (
    <Panel title="Keys" onClose={onClose}>
      <div className={styles.body}>
        <dl className={styles.list}>
          {KEYS.map(([k, what]) => (
            <div key={k} className={styles.row}>
              <dt><kbd className={styles.key}>{k}</kbd></dt>
              <dd>{what}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Panel>
  )
}
