import React from 'react'
import type { GameState } from '../types'
import { loadMeta } from '../gameState'
import { CLASS_LABELS, paragraphs } from '../text'
import { Inline } from './Inline'
import StarField from './StarField'
import styles from './EndScreen.module.css'

interface Props {
  state: GameState
  closingText: string
  onPlayAgain: () => void
  onTitle: () => void
}

export const ENDING_COUNT = 5

/** "Your road here": four to six lines built from flags. */
export function roadLines(s: GameState): string[] {
  const f = (k: string) => Boolean(s.flags[k])
  const lines = [`You came back as ${CLASS_LABELS[s.player.class] ?? 'a traveller'}.`]
  if (f('maret_joined')) lines.push('Maret walked into the forest with you.')
  else if (f('maret_sent_back')) lines.push('You sent Maret back to her people.')
  if (f('ritual_complete')) lines.push('The seal held.')
  else if (f('ritual_partial')) lines.push('The seal held in part.')
  if (f('issa_taken_by_compact')) lines.push('The Compact took Issa.')
  else if (f('issa_agreement_reached') || f('issa_remains_at_camp')) lines.push('Issa stayed at the camp.')
  if (f('seriva_admitted_guilt')) lines.push('Seriva admitted what she did.')
  if (f('rootless_aligned')) lines.push('You stood with the Rootless.')
  else if (f('compact_aligned')) lines.push('You stood with the Compact.')
  else if (f('ashenveld_settlement_reached')) lines.push('You brokered a settlement.')
  return lines.slice(0, 6)
}

export default function EndScreen({ state, closingText, onPlayAgain, onTitle }: Props) {
  const found = loadMeta().endings.length
  const title = state.ended?.title ?? 'The End'

  return (
    <div className={styles.screen}>
      <StarField />
      <main className={styles.content} data-ending-id={state.ended?.id}>
        <div className={styles.eyebrow}>An ending</div>
        <h1 className={styles.title}>{title}</h1>
        <div className={styles.rule} />

        {closingText && (
          <div className={styles.closing}>
            {paragraphs(closingText).map((p, i) => <p key={i}><Inline text={p} /></p>)}
          </div>
        )}

        <section className={styles.road} aria-labelledby="road-title">
          <h2 id="road-title" className={styles.roadTitle}>Your road here</h2>
          <ul>
            {roadLines(state).map(l => <li key={l}>{l}</li>)}
          </ul>
        </section>

        <div className={styles.found}>Endings found: {Math.min(found, ENDING_COUNT)} of {ENDING_COUNT}</div>

        <div className={styles.buttons}>
          <button className={styles.btn} onClick={onPlayAgain}><span>Play again</span></button>
          <button className={styles.btn} onClick={onTitle}><span>Title</span></button>
        </div>
      </main>
    </div>
  )
}
