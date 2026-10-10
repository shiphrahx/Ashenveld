import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import type { Scene, GameState, Choice, Outcome, RollResult, JournalEntry, DiceOutcome, OutcomeKey } from '../types'
import { rollDice, resolveRoll, odds } from '../dice'
import { oddsWord, STAT_NAMES } from '../rules'
import { motionAllowed, useSettings } from '../settings'
import { meets } from '../conditions'
import { sceneText, resolveRich, CLASS_LABELS } from '../text'
import { Inline } from './Inline'
import Para from './Para'
import DiceOverlay from './DiceOverlay'
import { choiceTick, journalNote } from '../audio/ui'
import { playCue } from '../audio/cues'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { applyStateChanges, diffState } from '../gameState'
import { getNpc } from '../loader'
import { journalKeys } from './Journal'
import styles from './SceneView.module.css'

interface Props {
  scene: Scene
  state: GameState
  onChoice: (outcome: Outcome, entry: JournalEntry, choiceId: string) => void
  /** The player has read this scene before, in this run or another (G13). */
  seenBefore?: boolean
  /** E6: the chapter's title, for three seconds after it changes. */
  chapterNote?: { title: string; key: number } | null
}

// Roman numerals for choice markers, matching the prototype
// Choice numbers match the 1–6 shortcuts (U20).
const KEYS = ['1', '2', '3', '4', '5', '6']

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

export default function SceneView({ scene, state, onChoice, seenBefore = false, chapterNote = null }: Props) {
  const { settings } = useSettings()
  const [rollResult, setRollResult] = useState<RollResult | null>(null)
  const [activeChoice, setActiveChoice] = useState<Choice | null>(null)
  const [shownOutcome, setShownOutcome] = useState<{ outcome: Outcome; css: string; key: OutcomeKey; tag?: string } | null>(null)
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
    choiceTick()
    activeChoiceText.current = resolveRich(choice.text, state)
    activeChoiceId.current = choice.id
    if (choice.roll) {
      const result = rollDice(choice.roll, state)
      setActiveChoice(choice)
      setRollResult(result)
    } else {
      const outcome = choice.outcomes.default
      if (outcome) { setShownOutcome({ outcome, css: '', key: 'default' }); playCue(outcome.cue) }
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
    const word = { success: 'Success', success_at_cost: 'At a cost', failure: 'Failed' }[rollResult.outcome]
    choiceTick()
    if (outcome) { setShownOutcome({ outcome, css, key, tag: `${STAT_NAMES[rollResult.statName] ?? rollResult.statName} · ${word}` }); playCue(outcome.cue) }
  }, [rollResult, activeChoice])

  const handleOutcomeContinue = useCallback(() => {
    if (shownOutcome && activeChoiceText.current) {
      choiceTick()
      if (changes.some(c => c.key === 'journal')) journalNote()
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
  }, [shownOutcome, onChoice, scene, state, changes])

  // Crumb: "Act II · Chapter 3" and "Day 7 · Evening"
  const place = `Act ${toRoman(state.world.act)} · Chapter ${state.world.chapter}`
  const clock = scene.when?.hide_clock ? '' : `Day ${state.world.day} · ${capitalise(state.world.time_of_day)}`

  // On a phone, a long list of choices scrolls with the story instead of being pinned.
  const narrow = useMediaQuery('(max-width: 719px)')
  const inlineChoices = narrow && !shownOutcome && visibleChoices.length > 3

  // U2: when an outcome shows, the scene text collapses to its last paragraph.
  const [showScene, setShowScene] = useState(false)

  // ── E7: the text fade, capped, and skippable ────────────────────────────────
  const instantReveal = settings.textReveal === 'instant' || seenBefore || !motionAllowed(settings)
  const [revealed, setRevealed] = useState(instantReveal)
  const [choicesReady, setChoicesReady] = useState(instantReveal)
  const finishReveal = useCallback(() => { setRevealed(true); setChoicesReady(true) }, [])
  const storyRef = useRef<HTMLDivElement>(null)
  const outcomeRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (!shownOutcome) return
    setShowScene(false)
    storyRef.current?.scrollTo({ top: 0 })
    outcomeRef.current?.focus({ preventScroll: true })
  }, [shownOutcome])

  useEffect(() => { setShowScene(false) }, [scene.id, state.visited[scene.id]])

  // U6: a new scene starts at its title for screen readers and keyboard users.
  useEffect(() => {
    if (document.activeElement?.closest('[data-panel]')) return
    titleRef.current?.focus({ preventScroll: true })
  }, [scene.id, state.visited[scene.id]])

  // A seen scene can start folded, straight to the choices (G13).
  const skipping = seenBefore && settings.skipSeen && !shownOutcome
  const collapsed = (Boolean(shownOutcome) || skipping) && !showScene
  const shownMain = collapsed ? (aside.length ? [] : main.slice(-1)) : main
  const shownAside = collapsed ? aside.slice(-1) : aside

  // Every paragraph, of every kind, in one sequence that takes at most a second to start.
  const revealCount = shownMain.length + (shownAside.length ? 1 : 0)
  const revealStep = Math.min(0.14, 1.0 / Math.max(1, revealCount))
  const dimNow = settings.screenEffects ? Math.min(1, state.world.curse_spread / 100) : 0
  const revealSecs = 0.5 + 0.5 * dimNow                       // E4: slower as The Dimming rises
  useEffect(() => {
    const instant = instantReveal || collapsed
    setRevealed(instant)
    setChoicesReady(instant)
    if (instant) return
    const total = (revealCount - 1) * revealStep + revealSecs
    const a = setTimeout(() => setRevealed(true), total * 1000)
    const b = setTimeout(() => setChoicesReady(true), Math.min(total, 1.2) * 1000)
    // A key press anywhere completes it.
    const key = (e: KeyboardEvent) => { if (!['Tab', 'Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) finishReveal() }
    window.addEventListener('keydown', key)
    return () => { clearTimeout(a); clearTimeout(b); window.removeEventListener('keydown', key) }
  // Once per scene entry.
  }, [scene.id, state.visited[scene.id]])

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
          <kbd className={styles.mk} aria-hidden="true">{KEYS[i] ?? String(i + 1)}</kbd>
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
        <h1 className={styles.sceneTitle} ref={titleRef} tabIndex={-1}>
          {scene.title}
          {seenBefore && <span className={styles.seenMark}>seen before</span>}
          {chapterNote && <span key={chapterNote.key} className={styles.chapterNote} data-chapter-note>{chapterNote.title}</span>}
        </h1>
        <span className={styles.crumb}>
          <span>{place}</span>
          {clock && <span className={styles.clock} data-clock>{clock}</span>}
        </span>
      </div>

      {/* ── Narrative ── */}
      <div className={`${styles.narrative} ${seenBefore ? styles.seen : ''} ${revealed ? styles.revealed : ''}`} key={scene.id} ref={storyRef}
        data-narrative onClick={revealed ? undefined : finishReveal}
        style={{ '--reveal': `${revealSecs}s` } as React.CSSProperties}>
        <div className={styles.measure}>
          {collapsed && (
            <button className={styles.showScene} onClick={() => setShowScene(true)}>Show the scene again</button>
          )}
          <div className={collapsed ? styles.faded : undefined}>
            {shownMain.map((p, i) => (
              <Para key={i} text={p} className={styles.np} style={{ animationDelay: `${i * revealStep}s` }} />
            ))}

            {shownAside.length > 0 && (
              <aside
                className={styles.lens}
                aria-label={`${CLASS_LABELS[state.player.class]}: your read`}
                style={{ animationDelay: `${shownMain.length * revealStep}s` }}
              >
                <div className={styles.lensLabel}>{CLASS_LABELS[state.player.class]}</div>
                {shownAside.map((p, i) => <Para key={i} text={p} />)}
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
              {shownOutcome.tag && (
                <div className={styles.resultTag} data-result>
                  <span className={styles.resultDot} aria-hidden="true" />{shownOutcome.tag}
                </div>
              )}
              {outcomeText.split(/\n{2,}/).filter(Boolean).map((p, i) => (
                <Para key={i} text={p} style={{ marginBottom: '0.8em' }} />
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

          {inlineChoices && <div className={`${styles.choices} ${styles.choicesInline} ${choicesReady ? '' : styles.waiting}`} data-waiting={choicesReady ? undefined : ''} inert={!choicesReady}>{choiceButtons}</div>}
        </div>
      </div>

      {/* ── Choices ── */}
      {!inlineChoices && <div className={`${styles.choices} ${choicesReady ? '' : styles.waiting}`} data-waiting={choicesReady ? undefined : ''} inert={!choicesReady}>{choiceButtons}</div>}

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
