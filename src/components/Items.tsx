import React from 'react'
import { getMasterIndex } from '../loader'
import Panel from './Panel'
import styles from './Items.module.css'

interface Props {
  inventory: string[]
  onClose: () => void
}

export default function Items({ inventory, onClose }: Props) {
  const index = getMasterIndex()
  const itemDefs = index.inventory_items

  return (
    <Panel title="Items" onClose={onClose}>

        <div className={styles.body}>
          {inventory.length === 0 ? (
            <div className={styles.empty}>You are carrying nothing.</div>
          ) : (
            inventory.map(id => {
              const def = itemDefs[id]
              const name = def?.name ?? id.replace(/_/g, ' ')
              const consumable = def?.consumable ?? false
              return (
                <div key={id} className={styles.item}>
                  <div className={styles.itemHeader}>
                    <span className={styles.itemName}>{name}</span>
                    {consumable && <span className={styles.itemTag}>Consumable</span>}
                  </div>
                  <div className={styles.itemDesc}>
                    {def?.description ?? 'No description available.'}
                  </div>
                </div>
              )
            })
          )}
        </div>
    </Panel>
  )
}
