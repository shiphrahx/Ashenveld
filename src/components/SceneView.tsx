import React, { useState, useCallback, useRef, useEffect } from 'react'
import type { Scene, GameState, Choice, Outcome, RollResult, JournalEntry, DiceOutcome } from '../types'
import { rollDice, difficultyLabel } from '../dice'
import { meets } from '../conditions'
import { sceneText, resolveRich, CLASS_LABELS } from '../text'
import { Inline } from './Inline'
import DiceOverlay from './DiceOverlay'
import { useMediaQuery } from '../hooks/useMediaQuery'
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
    // Never leave the player without an outcome: fall back to the nearest result.
    const order: Record<DiceOutcome, DiceOutcome[]> = {
      success: ['success', 'success_at_cost', 'failure'],
      success_at_cost: ['success_at_cost', 'success', 'failure'],
      failure: ['failure', 'success_at_cost', 'success'],
    }
    const outcome = order[rollResult.outcome].map(k => activeChoice.outcomes[k]).find(Boolean) ?? activeChoice.outcomes.default
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

  // Crumb: "Act II · Chapter 3" and "Day 7 · Evening"
  const place = `Act ${toRoman(state.world.act)} · Chapter ${state.world.chapter}`
  const clock = scene.when?.hide_clock ? '' : `Day ${state.world.day} · ${capitalise(state.world.time_of_day)}`

  // On a phone, a long list of choices scrolls with the story instead of being pinned.
  const narrow = useMediaQuery('(max-width: 719px)')
  const inlineChoices = narrow && !shownOutcome && visibleChoices.length > 3

  // U2: when an outcome shows, the scene text collapses to its last paragraph.
  const [showScene, setShowScene] = useState(false)
  const storyRef = useRef<HTMLDivElement>(null)
  const outcomeRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (!shownOutcome) return
    setShowScene(false)
    storyRef.current?.scrollTo({ top: 0 })
    outcomeRef.current?.focus({ preventScroll: true })
  }, [shownOutcome])

  // U6: a new scene starts at its title for screen readers and keyboard users.
  useEffect(() => {
    if (document.activeElement?.closest('[data-panel]')) return
    titleRef.current?.focus({ preventScroll: true })
  }, [scene.id, state.visited[scene.id]])

  const collapsed = Boolean(shownOutcome) && !showScene
  const shownMain = collapsed ? (aside.length ? [] : main.slice(-1)) : main
  const shownAside = collapsed ? aside.slice(-1) : aside

  const choiceButtons = shownOutcome ? (
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
  )

  return (
    <div className={styles.centre} data-scene-id={scene.id}>
      {/* ── Top bar ── */}
      <div className={styles.sceneBar}>
        <h1 className={styles.sceneTitle} ref={titleRef} tabIndex={-1}>{scene.title}</h1>
        <span className={styles.crumb}>
          <span>{place}</span>
          {clock && <span className={styles.clock} data-clock>{clock}</span>}
        </span>
      </div>

      {/* ── Narrative ── */}
      <div className={styles.narrative} key={scene.id} ref={storyRef}>
        <div className={styles.measure}>
          {collapsed && (
            <button className={styles.showScene} onClick={() => setShowScene(true)}>Show the scene again</button>
          )}
          <div className={collapsed ? styles.faded : undefined}>
            {shownMain.map((p, i) => {
              const dialogue = isDialogue(p)
              return (
                <p
                  key={i}
                  className={dialogue ? styles.nd : styles.np}
                  style={dialogue ? undefined : { animationDelay: `${0.04 + i * 0.14}s` }}
                ><Inline text={p} /></p>
              )
            })}

            {shownAside.length > 0 && (
              <aside
                className={styles.lens}
                aria-label={`${CLASS_LABELS[state.player.class]}: your read`}
                style={{ animationDelay: `${0.04 + shownMain.length * 0.14}s` }}
              >
                <div className={styles.lensLabel}>{CLASS_LABELS[state.player.class]}</div>
                {shownAside.map((p, i) => <p key={i}><Inline text={p} /></p>)}
              </aside>
            )}
          </div>

          {/* Outcome text */}
          {shownOutcome && (
            <div
              ref={outcomeRef}
              tabIndex={-1}
              aria-live="polite"
              data-outcome
              className={`${styles.outcomeBlock} ${shownOutcome.css ? styles[shownOutcome.css] : ''}`}
            >
              {outcomeText.split(/\n{2,}/).filter(Boolean).map((p, i) => (
                <p key={i} style={{ marginBottom: '0.8em' }}><Inline text={p} /></p>
              ))}
            </div>
          )}

          {inlineChoices && <div className={`${styles.choices} ${styles.choicesInline}`}>{choiceButtons}</div>}
        </div>
      </div>

      {/* ── Choices ── */}
      {!inlineChoices && <div className={styles.choices}>{choiceButtons}</div>}

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
