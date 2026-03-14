import React, { useState, useCallback, useRef } from 'react'
import type { Scene, GameState, Choice, Outcome, RollResult, JournalEntry } from '../types'
import { rollDice, difficultyLabel } from '../dice'
import DiceOverlay from './DiceOverlay'
import styles from './SceneView.module.css'

interface Props {
  scene: Scene
  state: GameState
  onChoice: (outcome: Outcome, entry: JournalEntry) => void
}

// Roman numerals for choice markers, matching the prototype
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI']

// ── Text selection ─────────────────────────────────────────────────────────────

function resolveText(texts: Scene['text'], playerClass: string): string {
  const key = playerClass as keyof Scene['text']
  return texts[key] ?? texts.default
}

// ── Dialogue detection: lines that start with " are dialogue ─────────────────

function isDialogue(line: string): boolean {
  return line.trim().startsWith('"') || line.trim().startsWith('\u201c')
}

// ── Choice visibility ──────────────────────────────────────────────────────────

function isChoiceVisible(choice: Choice, state: GameState): boolean {
  const req = choice.requires
  if (!req) return true
  if (req.class && req.class !== state.player.class) return false
  if (req.flags) {
    for (const [flag, required] of Object.entries(req.flags)) {
      if (Boolean(state.flags[flag]) !== required) return false
    }
  }
  if (req.inventory) {
    for (const item of req.inventory) {
      if (!state.inventory.includes(item)) return false
    }
  }
  return true
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

  const narrative = resolveText(scene.text, state.player.class)
  const paragraphs = narrative.split('\n\n').filter(Boolean)
  const visibleChoices = scene.choices.filter(c => isChoiceVisible(c, state))

  // Replace [missing person] placeholder
  function replacePlaceholder(text: string): string {
    return text.replace(/\[missing person\]/g, state.player.missing_person.name || '…')
  }

  const handleChoiceClick = useCallback((choice: Choice) => {
    activeChoiceText.current = replacePlaceholder(choice.text)
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
        outcomeText: shownOutcome.outcome.text,
      }
      onChoice(shownOutcome.outcome, entry)
      setShownOutcome(null)
      activeChoiceText.current = null
    }
  }, [shownOutcome, onChoice, scene, state, narrative])

  // Crumb: "Act I · Chapter I · Night, Day 1"
  const timeDisplay = state.world.time_of_day
  const crumb = `Act ${toRoman(state.world.act)} · Ch ${toRoman(state.world.chapter)} · ${capitalise(timeDisplay)}, Day ${state.world.day}`

  return (
    <div className={styles.centre}>
      {/* ── Top bar ── */}
      <div className={styles.sceneBar}>
        <span>{scene.title}</span>
        <span className={styles.crumb}>{crumb}</span>
      </div>

      {/* ── Narrative ── */}
      <div className={styles.narrative} key={scene.id}>
        {paragraphs.map((p, i) => {
          const dialogue = isDialogue(p)
          return (
            <p
              key={i}
              className={dialogue ? styles.nd : styles.np}
              style={dialogue ? undefined : { animationDelay: `${0.04 + i * 0.14}s` }}
              dangerouslySetInnerHTML={{ __html: p.replace(/<em>(.*?)<\/em>/g, '<em>$1</em>') }}
            />
          )
        })}

        {/* Outcome text */}
        {shownOutcome && (
          <div
            className={`${styles.outcomeBlock} ${shownOutcome.css ? styles[shownOutcome.css] : ''}`}
          >
            {shownOutcome.outcome.text.split('\n\n').map((p, i) => (
              <p key={i} style={{ marginBottom: '0.8em' }}>{p}</p>
            ))}
          </div>
        )}
      </div>

      {/* ── Choices ── */}
      <div className={styles.choices}>
        {shownOutcome ? (
          <button className={styles.ch} onClick={handleOutcomeContinue}>
            <span className={styles.mk}>›</span>
            <span className={styles.lb}>Continue</span>
          </button>
        ) : (
          visibleChoices.map((choice, i) => {
            const { label, css } = badgeContent(choice)
            return (
              <button
                key={choice.id}
                className={styles.ch}
                onClick={() => handleChoiceClick(choice)}
              >
                <span className={styles.mk}>{ROMAN[i] ?? String(i + 1)}</span>
                <span className={styles.lb}>{replacePlaceholder(choice.text)}</span>
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
