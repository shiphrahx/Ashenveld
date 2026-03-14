import React from 'react'
import { getMasterIndex } from '../loader'
import styles from './Items.module.css'

interface Props {
  inventory: string[]
  onClose: () => void
}

export default function Items({ inventory, onClose }: Props) {
  const index = getMasterIndex()
  const itemDefs = index.inventory_items

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.title}>Items</span>
          <button className={styles.close} onClick={onClose}>✕</button>
        </div>

        <div className={styles.body}>
          {inventory.length === 0 ? (
            <div className={styles.empty}>You are carrying nothing.</div>
          ) : (
            inventory.map(id => {
              const def = itemDefs[id]
              const name = id.replace(/_/g, ' ')
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
      </div>
    </div>
  )
}
