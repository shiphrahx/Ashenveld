import React, { useEffect, useRef } from 'react'
import styles from './StarField.module.css'

export default function StarField() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
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

  return <div className={styles.stars} ref={ref} />
}
