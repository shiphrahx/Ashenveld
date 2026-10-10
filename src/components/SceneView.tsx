import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import type { Scene, GameState, Choice, Outcome, RollResult, JournalEntry, DiceOutcome, OutcomeKey } from '../types'
import { rollDice, resolveRoll, odds } from '../dice'
import { oddsWord, STAT_NAMES } from '../rules'
import { useSettings } from '../settings'
import { meets } from '../conditions'
import { sceneText, resolveRich, CLASS_LABELS } from '../text'
import { Inline } from './Inline'
import DiceOverlay from './DiceOverlay'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { applyStateChanges, diffState } from '../gameState'
import { getNpc } from '../loader'
import { journalKeys } from './Journal'
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

// ── Locked choices (G12) ───────────────────────────────────────────────────────

/** Choices with a hint whose requirement fails: shown disabled, two at most, class locks first. */
function lockedChoices(scene: Scene, state: GameState): Choice[] {
  return scene.choices
    .filter(c => c.locked_hint && !meets(c.requires, state) && !(c.once && state.taken?.[`${scene.id}:${c.id}`]))
    .sort((a, b) => Number(Boolean(b.requires?.class)) - Number(Boolean(a.requires?.class)))
    .slice(0, 2)
}

// ── Choice tag: stat and odds in words (G4) ───────────────────────────────────

const pct = (x: number) => `${Math.round(x * 100)}%`

export function rollTag(choice: Choice, state: GameState, mode: 'words' | 'percent' = 'words') {
  if (!choice.roll) return null
  const { stat, bonuses } = resolveRoll(choice.roll, state)
  const o = odds(choice.roll, state)
  const notFailing = 1 - o.failure
  const word = mode === 'percent' ? pct(notFailing) : oddsWord(notFailing)
  const css = notFailing >= 0.65 ? 'easy' : notFailing >= 0.45 ? 'medium' : 'hard'
  const detail = [`Success ${pct(o.success)} · At a cost ${pct(o.cost)} · Fail ${pct(o.failure)}`,
    ...bonuses.map(b => `${b.value > 0 ? '+' : '−'}${Math.abs(b.value)} ${b.label}`)]
  return { label: `${STAT_NAMES[stat] ?? stat} · ${word}`, css, detail }
}

/** Ranger: what a choice will cost, before it's made (G5). */
function groundMarks(choice: Choice): string[] {
  const outs = Object.values(choice.outcomes).filter(Boolean)
  const marks: string[] = []
  if (outs.some(o => (o!.state_changes?.world?.curse_spread ?? 0) > 0)) marks.push('exposure')
  if (outs.some(o => (o!.state_changes?.resources?.health ?? 0) < 0)) marks.push('tiring')
  return marks
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
  const { settings } = useSettings()
  const [rollResult, setRollResult] = useState<RollResult | null>(null)
  const [activeChoice, setActiveChoice] = useState<Choice | null>(null)
  const [shownOutcome, setShownOutcome] = useState<{ outcome: Outcome; css: string; key: OutcomeKey } | null>(null)
  const activeChoiceText = useRef<string | null>(null)
  const activeChoiceId = useRef<string | null>(null)

  const { main, aside } = sceneText(scene, state)
  const visibleChoices = scene.choices.filter(c => isChoiceVisible(c, state, scene.id))
  const locked = lockedChoices(scene, state)
  const outcomeText = shownOutcome ? resolveRich(shownOutcome.outcome.text, state) : ''
  // G5, the Cipher's Read: a private line the first time someone's closeness moves.
  const reads = useMemo(() => {
    if (!shownOutcome || state.player.class !== 'cipher') return []
    return Object.keys(shownOutcome.outcome.state_changes.relationships ?? {})
      .filter(id => getNpc(id)?.read && !state.counters?.[`read:${id}`])
      .map(id => ({ id, text: getNpc(id)!.read! }))
  }, [shownOutcome, state])
  useEffect(() => { for (const r of reads) extraChanges.current[`read:${r.id}`] = 1 }, [reads])

  // U7: what this outcome changes, shown under it so cause and effect stay together.
  const changes = useMemo(
    () => shownOutcome ? diffState(state, applyStateChanges(state, shownOutcome.outcome.state_changes), journalKeys) : [],
    [shownOutcome, state],
  )

  const handleChoiceClick = useCallback((choice: Choice) => {
    activeChoiceText.current = resolveRich(choice.text, state)
    activeChoiceId.current = choice.id
    if (choice.roll) {
      const result = rollDice(choice.roll, state)
      setActiveChoice(choice)
      setRollResult(result)
    } else {
      const outcome = choice.outcomes.default
      if (outcome) setShownOutcome({ outcome, css: '', key: 'default' })
    }
  }, [state])

  // Counters the outcome should also apply: Command used, a Cipher read shown.
  const extraChanges = useRef<Record<string, number>>({})

  const commandKey = `command_used_act${state.world.act}`
  const canCommand = Boolean(rollResult && !rollResult.commanded && rollResult.outcome === 'failure'
    && rollResult.statName === 'charisma' && state.player.class === 'commander' && !state.counters?.[commandKey])
  const handleCommand = useCallback(() => {
    if (!rollResult) return
    extraChanges.current[commandKey] = 1
    setRollResult({ ...rollResult, outcome: 'success_at_cost', commanded: true })
  }, [rollResult, commandKey])

  const handleDiceContinue = useCallback(() => {
    if (!rollResult || !activeChoice) return
    // Never leave the player without an outcome: fall back to the nearest result.
    const order: Record<DiceOutcome, DiceOutcome[]> = {
      success: ['success', 'success_at_cost', 'failure'],
      success_at_cost: ['success_at_cost', 'success', 'failure'],
      failure: ['failure', 'success_at_cost', 'success'],
    }
    const key: OutcomeKey = order[rollResult.outcome].find(k => activeChoice.outcomes[k]) ?? 'default'
    const outcome = activeChoice.outcomes[key]
    const css = outcomeClass(rollResult, activeChoice)
    setRollResult(null)
    setActiveChoice(null)
    if (outcome) setShownOutcome({ outcome, css, key })
  }, [rollResult, activeChoice])

  const handleOutcomeContinue = useCallback(() => {
    if (shownOutcome && activeChoiceText.current) {
      const entry: JournalEntry = {
        sceneId: scene.id,
        choiceId: activeChoiceId.current ?? '',
        outcomeKey: shownOutcome.key,
        day: state.world.day,
        part: state.world.time_of_day,
      }
      const extra = extraChanges.current
      const outcome = Object.keys(extra).length
        ? { ...shownOutcome.outcome, state_changes: { ...shownOutcome.outcome.state_changes, counters: { ...shownOutcome.outcome.state_changes.counters, ...extra } } }
        : shownOutcome.outcome
      extraChanges.current = {}
      onChoice(outcome, entry, activeChoiceId.current ?? '')
      setShownOutcome(null)
      activeChoiceText.current = null
      activeChoiceId.current = null
    }
  }, [shownOutcome, onChoice, scene, state])

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
      const tag = rollTag(choice, state, settings.odds)
      const marks = state.player.class === 'ranger' ? groundMarks(choice) : []
      const tipId = `tip-${scene.id}-${choice.id}`
      return (
        <button
          key={choice.id}
          data-choice-id={choice.id}
          data-roll-stat={tag ? resolveRoll(choice.roll!, state).stat : undefined}
          className={styles.ch}
          onClick={() => handleChoiceClick(choice)}
          aria-describedby={tag ? tipId : undefined}
        >
          <span className={styles.mk}>{ROMAN[i] ?? String(i + 1)}</span>
          <span className={styles.lb}><Inline text={resolveRich(choice.text, state)} /></span>
          {marks.map(m => <span key={m} className={styles.mark}>{m}</span>)}
          {tag && <span className={`${styles.badge} ${styles[tag.css]}`}>{tag.label}</span>}
          {tag && (
            <span className={styles.tagTip} id={tipId} role="tooltip">
              {tag.detail.map(d => <span key={d}>{d}</span>)}
            </span>
          )}
        </button>
      )
    }).concat(locked.map(choice => (
      <button key={choice.id} className={`${styles.ch} ${styles.locked}`} disabled data-locked-id={choice.id}
        aria-label={`${resolveRich(choice.text, state)}. ${choice.locked_hint}`}>
        <span className={styles.mk} aria-hidden="true">·</span>
        <span className={styles.lb}><Inline text={resolveRich(choice.text, state)} /></span>
        <span className={styles.lockHint}>{choice.locked_hint}</span>
      </button>
    )))
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
              {reads.length > 0 && (
                <aside className={styles.lens} aria-label="The Cipher: your read">
                  <div className={styles.lensLabel}>The Read</div>
                  {reads.map(r => <p key={r.id}><Inline text={r.text} /></p>)}
                </aside>
              )}
              {changes.length > 0 && (
                <ul className={styles.chips} aria-label="What changed">
                  {changes.map((c, i) => <li key={i} className={styles.chip}>{c.text}</li>)}
                </ul>
              )}
            </div>
          )}

          {inlineChoices && <div className={`${styles.choices} ${styles.choicesInline}`}>{choiceButtons}</div>}
        </div>
      </div>

      {/* ── Choices ── */}
      {!inlineChoices && <div className={styles.choices}>{choiceButtons}</div>}

      {/* ── Dice overlay ── */}
      {rollResult && (
        <DiceOverlay result={rollResult} onContinue={handleDiceContinue} onCommand={canCommand ? handleCommand : undefined} />
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
