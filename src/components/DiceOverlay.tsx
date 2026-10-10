import React, { useEffect, useState } from 'react'
import type { RollResult } from '../types'
import { STAT_NAMES, RULES } from '../rules'
import styles from './DiceOverlay.module.css'

interface Props {
  result: RollResult
  onContinue: () => void
  /** Commander only, on a failed Charisma roll, once per act. */
  onCommand?: () => void
}

const OUTCOME_LABELS: Record<string, string> = {
  success: 'Success',
  success_at_cost: 'Success, at a cost',
  failure: 'Failed',
}

const signed = (n: number) => `${n >= 0 ? '+' : '−'}${Math.abs(n)}`

export default function DiceOverlay({ result, onContinue, onCommand }: Props) {
  // Trigger re-animation on each new result
  const [animKey, setAnimKey] = useState(0)
  useEffect(() => { setAnimKey(k => k + 1) }, [result.d20])

  const stat = STAT_NAMES[result.statName] ?? result.statName
  const toSucceed = result.dc + RULES.successMargin
  const toScrape = result.dc + RULES.costMargin

  const outcomeClass =
    result.outcome === 'success'          ? styles.success :
    result.outcome === 'success_at_cost'  ? styles.partial :
                                            styles.fail

  const numColour =
    result.outcome === 'success'          ? 'var(--success-lit)' :
    result.outcome === 'success_at_cost'  ? 'var(--partial-lit)' :
                                            'var(--fail-lit)'

  return (
    <div className={styles.diceOv} role="dialog" aria-modal="true" aria-label={`${stat} check`}>
      <div className={styles.dStat}>{stat}</div>
      <div className={styles.dTarget}>{toSucceed} to succeed · {toScrape} to scrape through</div>

      <div key={animKey} className={styles.dNum} style={{ color: numColour }}>{result.total}</div>

      <ul className={styles.dSum} aria-label="How the roll adds up">
        <li className={styles.chip}>d20 {result.d20}</li>
        <li className={styles.chip}>{stat} {signed(result.modifier)}</li>
        {result.bonuses.map(b => <li key={b.label} className={styles.chip}>{b.label} {signed(b.value)}</li>)}
        <li className={styles.chip}>= {result.total}</li>
      </ul>

      <div className={styles.dLine} />

      <div className={`${styles.dVerdict} ${outcomeClass}`} aria-live="assertive">
        <strong>{OUTCOME_LABELS[result.outcome]}</strong>
        {result.commanded && <span className={styles.commanded}> You gave the order.</span>}
      </div>

      <div className={styles.dButtons}>
        <button className={styles.dBtn} data-dice-continue onClick={onContinue} autoFocus>Continue</button>
        {onCommand && <button className={styles.dBtn} onClick={onCommand} data-command>Command</button>}
      </div>
    </div>
  )
}
