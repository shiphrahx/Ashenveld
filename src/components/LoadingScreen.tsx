import React, { useEffect, useState } from 'react'
import styles from './Status.module.css'

/** The word, a thin bar, and after four seconds a reassurance (U17). */
export default function LoadingScreen() {
  const [slow, setSlow] = useState(false)
  useEffect(() => { const t = setTimeout(() => setSlow(true), 4000); return () => clearTimeout(t) }, [])
  return (
    <div className={styles.screen} role="status" aria-live="polite">
      <div className={styles.word}>Ashenveld</div>
      <div className={styles.bar} aria-hidden="true"><span /></div>
      <p className={styles.note}>{slow ? 'Still loading the story…' : ' '}</p>
    </div>
  )
}
