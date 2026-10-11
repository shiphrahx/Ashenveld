import React from 'react'
import { classify } from '../text'
import { Inline } from './Inline'
import styles from './Para.module.css'

/** Narration with speech picked out: each "…" span is a quote. */
function Said({ text }: { text: string }) {
  const parts = text.split(/("[^"\n]*")/g)
  return <>{parts.map((s, i) => s.startsWith('"') && s.endsWith('"') && s.length > 1
    ? <q key={i} className={styles.said}><Inline text={s} /></q>
    : <Inline key={i} text={s} />)}</>
}

/** One paragraph of story text: a letter, an inscription, or body text (U14). */
export default function Para({ text, className, style }: { text: string; className?: string; style?: React.CSSProperties }) {
  const { kind, text: t } = classify(text)
  if (kind === 'letter') return (
    <blockquote className={`${styles.letter} ${className ?? ''}`} style={style}>
      {t.split('\n').map((line, i) => <p key={i}><Inline text={line} /></p>)}
    </blockquote>
  )
  if (kind === 'inscription') return <p className={`${styles.inscription} ${className ?? ''}`} style={style}>{t}</p>
  return <p className={`${styles.body} ${className ?? ''}`} style={style}><Said text={t} /></p>
}
