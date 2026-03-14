import React, { useEffect, useRef } from 'react'
import styles from './TitleScreen.module.css'

interface Props {
  hasSave: boolean
  onNewGame: () => void
  onContinue: () => void
}

export default function TitleScreen({ hasSave, onNewGame, onContinue }: Props) {
  const starsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = starsRef.current
    if (!el) return
    for (let i = 0; i < 80; i++) {
      const s = document.createElement('div')
      s.className = styles.star
      const size = Math.random() * 1.5 + 0.5
      s.style.cssText = `
        width:${size}px; height:${size}px;
        top:${Math.random() * 100}%;
        left:${Math.random() * 100}%;
        --dur:${3 + Math.random() * 5}s;
        --del:${Math.random() * 6}s;
        --lo:${0.1 + Math.random() * 0.2};
        --hi:${0.4 + Math.random() * 0.5};
      `
      el.appendChild(s)
    }
  }, [])

  return (
    <div className={styles.titleScreen}>
      <div className={styles.titleBg} />
      <div className={styles.stars} ref={starsRef} />
      <div className={styles.titleContent}>
        <div className={styles.titleEyebrow}>A story of return</div>
        <div className={styles.titleName}>Ashenveld</div>
        <div className={styles.titleRule} />
        <div className={styles.titleTagline}>
          You left this place behind.<br />
          Now something you love has disappeared into it.
        </div>
        {hasSave && (
          <button className={styles.titleBtn} onClick={onContinue}>
            <span>Continue</span>
          </button>
        )}
        <button className={styles.titleBtn} onClick={onNewGame}>
          <span>{hasSave ? 'New Game' : 'Begin'}</span>
        </button>
      </div>
    </div>
  )
}
