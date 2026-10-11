import React, { useEffect, useRef, useState } from 'react'
import type { RollResult } from '../types'
import { STAT_NAMES, RULES } from '../rules'
import { motionAllowed, useSettings } from '../settings'
import { diceFace, diceSuccess, diceCost, diceFailure } from '../audio/ui'
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

/** E2 timing. The roll is already decided; this is display only. */
const ROLL_MS = 700
const LAND_MS = 150
const CHIP_MS = 300

type Phase = 'roll' | 'land' | 'sum' | 'done'

export default function DiceOverlay({ result, onContinue, onCommand }: Props) {
  const { settings } = useSettings()
  const moving = motionAllowed(settings)
  const [phase, setPhase] = useState<Phase>(moving ? 'roll' : 'done')
  const [face, setFace] = useState(result.d20)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const continueRef = useRef<HTMLButtonElement>(null)

  const stat = STAT_NAMES[result.statName] ?? result.statName
  const toSucceed = result.dc + RULES.successMargin
  const toScrape = result.dc + RULES.costMargin
  const chips = [
    `d20 ${result.d20}`,
    `${stat} ${signed(result.modifier)}`,
    ...result.bonuses.map(b => `${b.label} ${signed(b.value)}`),
    `= ${result.total}`,
  ]

  const clear = () => { for (const t of timers.current) clearTimeout(t); timers.current = [] }
  const finish = () => { clear(); setFace(result.d20); setPhase('done') }

  // Roll: a new face every 60ms, slowing over the last 200ms, then land, then the sum.
  useEffect(() => {
    if (!moving) return
    let t = 0
    while (t < ROLL_MS) {
      const gap = t < ROLL_MS - 200 ? 60 : 60 + (t - (ROLL_MS - 200)) * 0.6
      t += gap
      if (t >= ROLL_MS) break
      timers.current.push(setTimeout(() => { setFace(1 + Math.floor(Math.random() * 20)); diceFace() }, t))
    }
    timers.current.push(setTimeout(() => { setFace(result.d20); setPhase('land'); diceFace() }, ROLL_MS))
    timers.current.push(setTimeout(() => setPhase('sum'), ROLL_MS + LAND_MS))
    timers.current.push(setTimeout(() => setPhase('done'), ROLL_MS + LAND_MS + CHIP_MS))
    return clear
  // The result is fixed for the life of the overlay, except when Command changes the outcome.
  }, [])

  // Click, Space or Enter during the roll skips to the verdict.
  useEffect(() => {
    if (phase === 'done') return
    const skip = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); finish() }
    }
    window.addEventListener('keydown', skip, true)
    return () => window.removeEventListener('keydown', skip, true)
  }, [phase])

  // The verdict: its sound once, and the button takes focus.
  useEffect(() => {
    if (phase !== 'done') return
    ;({ success: diceSuccess, success_at_cost: diceCost, failure: diceFailure }[result.outcome])()
    continueRef.current?.focus()
  }, [phase, result.outcome])

  const outcomeClass =
    result.outcome === 'success'          ? styles.success :
    result.outcome === 'success_at_cost'  ? styles.partial :
                                            styles.fail

  const added = result.total - result.d20
  const announce = `${stat} check. Rolled ${result.d20}, ${added >= 0 ? 'plus' : 'minus'} ${Math.abs(added)}. ${result.total} against ${toSucceed}. ${OUTCOME_LABELS[result.outcome]}.`
  const shown = phase === 'sum' || phase === 'done'

  return (
    <div className={styles.diceOv} role="dialog" aria-modal="true" aria-label={`${stat} check`}
      onClick={() => { if (phase !== 'done') finish() }} data-dice-phase={phase}>
      <div className={styles.dStat}>{stat}</div>
      <div className={styles.dTarget}>{toSucceed} to succeed · {toScrape} to scrape through</div>

      <div className={`${styles.dNum} ${phase === 'land' ? styles.land : ''} ${phase === 'done' || phase === 'sum' ? outcomeClass : ''}`} aria-hidden="true">{face}</div>

      <ul className={styles.dSum} aria-label="How the roll adds up">
        {chips.map((c, i) => (
          <li key={c} className={`${styles.chip} ${shown ? styles.chipIn : ''}`}
            style={{ transitionDelay: phase === 'sum' ? `${(i * CHIP_MS) / chips.length}ms` : '0ms' }}>{c}</li>
        ))}
      </ul>

      <div className={styles.dLine} />

      <div className={`${styles.dVerdict} ${outcomeClass} ${phase === 'done' ? styles.verdictIn : ''}`}>
        <strong>{OUTCOME_LABELS[result.outcome]}</strong>
        {result.commanded && <span className={styles.commanded}> You gave the order.</span>}
      </div>

      {/* Said once, when the verdict is in. */}
      <div className={styles.srOnly} aria-live="assertive">{phase === 'done' ? announce : ''}</div>

      <div className={styles.dButtons} style={{ visibility: phase === 'done' ? 'visible' : 'hidden' }}>
        <button ref={continueRef} className={styles.dBtn} data-dice-continue onClick={onContinue}>Continue</button>
        {onCommand && <button className={styles.dBtn} onClick={onCommand} data-command>Command</button>}
      </div>
    </div>
  )
}
