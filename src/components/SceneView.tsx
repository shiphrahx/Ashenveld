import React, { useState, useCallback, useRef } from 'react'
import type { Scene, GameState, Choice, Outcome, RollResult, JournalEntry } from '../types'
import { rollDice, difficultyLabel } from '../dice'
import { meets } from '../conditions'
import { sceneText, resolveRich, CLASS_LABELS } from '../text'
import { Inline } from './Inline'
import DiceOverlay from './DiceOverlay'
import styles from './SceneView.module.css'

interface Props {
  scene: Scene
  state: GameState
  onChoice: (outcome: Outcome, entry: JournalEntry, choiceId: string) => void
}

// Roman numerals for choice markers, matching the prototype
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI']

// ── Dialogue detection: lines that start with " are dialogue ─────────────────

function isDialogue(line: string): boolean {
  return line.trim().startsWith('"') || line.trim().startsWith('“')
}

// ── Choice visibility ──────────────────────────────────────────────────────────

function isChoiceVisible(choice: Choice, state: GameState, sceneId: string): boolean {
  if (choice.once && state.taken?.[`${sceneId}:${choice.id}`]) return false
  return meets(choice.requires, state)
}

// ── Badge label from dice ──────────────────────────────────────────────────────

const STAT_SHORT: Record<string, string> = {
  strength: 'STR', dexterity: 'DEX', stamina: 'STA',
  intelligence: 'INT', mana: 'MAN', charisma: 'CHA', perception: 'PER',
}

function badgeContent(choice: Choice): { label: string; css: string } {
  if (!choice.roll) return { label: 'No roll', css: 'none' }
  const { label, css } = difficultyLabel(choice.roll.dc)
  const stat = STAT_SHORT[choice.roll.stat] ?? choice.roll.stat.toUpperCase()
  return { label: `${stat} · ${choice.roll.dc}`, css }
}

// ── Which outcome key was resolved ───────────────────────────────────────────

function outcomeClass(rollResult: RollResult, choice: Choice): string {
  if (choice.outcomes.success && rollResult.outcome === 'success') return 'success'
  if (choice.outcomes.success_at_cost && rollResult.outcome === 'success_at_cost') return 'partial'
  if (rollResult.outcome === 'failure') return 'fail'
  return ''
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SceneView({ scene, state, onChoice }: Props) {
  const [rollResult, setRollResult] = useState<RollResult | null>(null)
  const [activeChoice, setActiveChoice] = useState<Choice | null>(null)
  const [shownOutcome, setShownOutcome] = useState<{ outcome: Outcome; css: string } | null>(null)
  const activeChoiceText = useRef<string | null>(null)
  const activeChoiceId = useRef<string | null>(null)

  const { main, aside } = sceneText(scene, state)
  const narrative = [...main, ...aside].join('\n\n')
  const visibleChoices = scene.choices.filter(c => isChoiceVisible(c, state, scene.id))
  const outcomeText = shownOutcome ? resolveRich(shownOutcome.outcome.text, state) : ''

  const handleChoiceClick = useCallback((choice: Choice) => {
    activeChoiceText.current = resolveRich(choice.text, state)
    activeChoiceId.current = choice.id
    if (choice.roll) {
      const result = rollDice(choice.roll, state)
      setActiveChoice(choice)
      setRollResult(result)
    } else {
      const outcome = choice.outcomes.default
      if (outcome) setShownOutcome({ outcome, css: '' })
    }
  }, [state])

  const handleDiceContinue = useCallback(() => {
    if (!rollResult || !activeChoice) return
    const key = rollResult.outcome
    const outcome = activeChoice.outcomes[key] ?? activeChoice.outcomes.default
    const css = outcomeClass(rollResult, activeChoice)
    setRollResult(null)
    setActiveChoice(null)
    if (outcome) setShownOutcome({ outcome, css })
  }, [rollResult, activeChoice])

  const handleOutcomeContinue = useCallback(() => {
    if (shownOutcome && activeChoiceText.current) {
      const entry: JournalEntry = {
        sceneId: scene.id,
        sceneTitle: scene.title,
        location: scene.location,
        timeOfDay: state.world.time_of_day,
        day: state.world.day,
        text: narrative,
        choiceText: activeChoiceText.current,
        outcomeText,
      }
      onChoice(shownOutcome.outcome, entry, activeChoiceId.current ?? '')
      setShownOutcome(null)
      activeChoiceText.current = null
      activeChoiceId.current = null
    }
  }, [shownOutcome, onChoice, scene, state, narrative, outcomeText])

  // Crumb: "Act I · Chapter I · Night, Day 1"
  const timeDisplay = state.world.time_of_day
  const crumb = `Act ${toRoman(state.world.act)} · Ch ${toRoman(state.world.chapter)} · ${capitalise(timeDisplay)}, Day ${state.world.day}`

  return (
    <div className={styles.centre} data-scene-id={scene.id}>
      {/* ── Top bar ── */}
      <div className={styles.sceneBar}>
        <span>{scene.title}</span>
        <span className={styles.crumb}>{crumb}</span>
      </div>

      {/* ── Narrative ── */}
      <div className={styles.narrative} key={scene.id}>
        {main.map((p, i) => {
          const dialogue = isDialogue(p)
          return (
            <p
              key={i}
              className={dialogue ? styles.nd : styles.np}
              style={dialogue ? undefined : { animationDelay: `${0.04 + i * 0.14}s` }}
            ><Inline text={p} /></p>
          )
        })}

        {aside.length > 0 && (
          <aside
            className={styles.lens}
            aria-label={`${CLASS_LABELS[state.player.class]}: your read`}
            style={{ animationDelay: `${0.04 + main.length * 0.14}s` }}
          >
            <div className={styles.lensLabel}>{CLASS_LABELS[state.player.class]}</div>
            {aside.map((p, i) => <p key={i}><Inline text={p} /></p>)}
          </aside>
        )}

        {/* Outcome text */}
        {shownOutcome && (
          <div
            className={`${styles.outcomeBlock} ${shownOutcome.css ? styles[shownOutcome.css] : ''}`}
          >
            {outcomeText.split(/\n{2,}/).filter(Boolean).map((p, i) => (
              <p key={i} style={{ marginBottom: '0.8em' }}><Inline text={p} /></p>
            ))}
          </div>
        )}
      </div>

      {/* ── Choices ── */}
      <div className={styles.choices}>
        {shownOutcome ? (
          <button className={styles.ch} data-choice-id="continue" onClick={handleOutcomeContinue}>
            <span className={styles.mk}>›</span>
            <span className={styles.lb}>Continue</span>
          </button>
        ) : (
          visibleChoices.map((choice, i) => {
            const { label, css } = badgeContent(choice)
            return (
              <button
                key={choice.id}
                data-choice-id={choice.id}
                className={styles.ch}
                onClick={() => handleChoiceClick(choice)}
              >
                <span className={styles.mk}>{ROMAN[i] ?? String(i + 1)}</span>
                <span className={styles.lb}><Inline text={resolveRich(choice.text, state)} /></span>
                <span className={`${styles.badge} ${styles[css]}`}>{label}</span>
              </button>
            )
          })
        )}
      </div>

      {/* ── Dice overlay ── */}
      {rollResult && (
        <DiceOverlay result={rollResult} onContinue={handleDiceContinue} />
      )}
    </div>
  )
}

function toRoman(n: number): string {
  const map: Array<[number, string]> = [
    [10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']
  ]
  let result = ''
  let rem = n
  for (const [val, sym] of map) {
    while (rem >= val) { result += sym; rem -= val }
  }
  return result
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
