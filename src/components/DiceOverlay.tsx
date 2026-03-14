import React, { useEffect, useState } from 'react'
import type { RollResult } from '../types'
import styles from './DiceOverlay.module.css'

interface Props {
  result: RollResult
  onContinue: () => void
}

const STAT_SHORT: Record<string, string> = {
  strength: 'STR', dexterity: 'DEX', stamina: 'STA',
  intelligence: 'INT', mana: 'MAN', charisma: 'CHA', perception: 'PER',
}

const OUTCOME_LABELS: Record<string, string> = {
  success: 'Success',
  success_at_cost: 'Success at a cost',
  failure: 'Failed',
}

export default function DiceOverlay({ result, onContinue }: Props) {
  // Trigger re-animation on each new result
  const [animKey, setAnimKey] = useState(0)
  useEffect(() => { setAnimKey(k => k + 1) }, [result.d20])

  const modStr = result.modifier >= 0 ? `+${result.modifier}` : `${result.modifier}`
  const stat = STAT_SHORT[result.statName] ?? result.statName.toUpperCase()

  const outcomeClass =
    result.outcome === 'success'          ? styles.success :
    result.outcome === 'success_at_cost'  ? styles.partial :
                                            styles.fail

  // The number colour matches the outcome
  const numColour =
    result.outcome === 'success'          ? '#6ab88a' :
    result.outcome === 'success_at_cost'  ? '#7aaadc' :
                                            '#c04848'

  return (
    <div className={styles.diceOv}>
      {/* stat + dc label */}
      <div className={styles.dStat}>{stat} check — DC {result.dc}</div>

      {/* big roll number */}
      <div
        key={animKey}
        className={styles.dNum}
        style={{ color: numColour }}
      >
        {result.total}
      </div>

      {/* breakdown: d20 (roll) +mod = total */}
      <div className={styles.dBreak}>
        d20 ({result.d20}) {modStr} = {result.total}
      </div>

      <div className={styles.dLine} />

      {/* verdict */}
      <div className={`${styles.dVerdict} ${outcomeClass}`}>
        <strong>{OUTCOME_LABELS[result.outcome]}</strong>
      </div>

      <button className={styles.dBtn} onClick={onContinue}>Continue</button>
    </div>
  )
}
