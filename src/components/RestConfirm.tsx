import React from 'react'
import Panel from './Panel'
import styles from './RestConfirm.module.css'

interface Props {
  cost?: number
  onRest: () => void
  onClose: () => void
}

/** The confirm before a night's rest (G9). */
export default function RestConfirm({ cost = 0, onRest, onClose }: Props) {
  return (
    <Panel title="Rest" onClose={onClose}>
      <div className={styles.body}>
        <p className={styles.question}>Rest until morning? The Dimming keeps spreading while you sleep.</p>
        {cost > 0 && <p className={styles.cost}>A room costs {cost} coin.</p>}
        <div className={styles.buttons}>
          <button className={styles.btn} onClick={onRest} data-rest-confirm>Rest</button>
          <button className={styles.btn} onClick={onClose}>Not yet</button>
        </div>
      </div>
    </Panel>
  )
}
