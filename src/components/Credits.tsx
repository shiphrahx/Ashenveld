import React from 'react'
import Panel from './Panel'
import styles from './Credits.module.css'

export default function Credits({ onClose }: { onClose: () => void }) {
  return (
    <Panel title="Credits" onClose={onClose}>
      <div className={styles.body}>
        <p><strong>Ashenveld</strong> is written and made by Shiphrah.</p>
        <p>Type: Cinzel, Atkinson Hyperlegible and Lora, all under the SIL Open Font Licence.</p>
        <p>Built with React and Vite. Sound, when it plays, is made in the browser as you go.</p>
        <p>Nothing you do here leaves this browser. Your game is saved on this device only.</p>
      </div>
    </Panel>
  )
}
