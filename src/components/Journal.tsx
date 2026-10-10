import React, { useEffect, useState } from 'react'
import type { GameState, JournalEntry, Scene, DayPart } from '../types'
import { getNotes, getChapterOf, peekScene, resolveScene } from '../loader'
import { meets } from '../conditions'
import { resolveRich, applyTokens, sceneText } from '../text'
import { Inline } from './Inline'
import Panel from './Panel'
import styles from './Journal.module.css'

interface Props {
  state: GameState
  scene: Scene
  onClose: () => void
}

type Tab = 'now' | 'know' | 'story'

const GROUPS = ['People', 'The Curse', 'The Ruins', 'The Factions']
const RESULT: Record<string, string> = { success: 'Success', success_at_cost: 'At a cost', failure: 'Failed' }
const cap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s

/** The goal line: a scene's own objective, or its chapter's. */
export function currentObjective(scene: Scene, s: GameState): string {
  const raw = scene.objective ?? getChapterOf(scene.id)?.objective ?? ''
  return raw ? applyTokens(raw, s) : ''
}

export function visibleLeads(s: GameState): string[] {
  return getNotes().leads.filter(l => meets(l.when, s)).map(l => applyTokens(l.text, s))
}

export function knownNotes(s: GameState) {
  return getNotes().notes.filter(n => s.flags[n.flag]).map(n => ({ ...n, text: applyTokens(n.text, s) }))
}

/** Keys for everything the journal shows, so the app can tell when something is new. */
export function journalKeys(s: GameState): string[] {
  const notes = getNotes()
  return [
    ...notes.leads.filter(l => meets(l.when, s)).map(l => `lead:${l.text}`),
    ...notes.notes.filter(n => s.flags[n.flag]).map(n => `note:${n.flag}`),
  ]
}

function Entry({ entry, state }: { entry: JournalEntry; state: GameState }) {
  const [open, setOpen] = useState(false)
  const scene = peekScene(entry.sceneId)
  const choice = scene?.choices.find(c => c.id === entry.choiceId)
  const title = scene?.title || entry.sceneTitle || ''
  const choiceText = choice ? resolveRich(choice.text, state) : entry.choiceText ?? ''
  const outcome = choice && entry.outcomeKey ? choice.outcomes[entry.outcomeKey] : undefined
  const outcomeText = outcome ? resolveRich(outcome.text, state) : entry.outcomeText ?? ''
  const tag = entry.outcomeKey ? RESULT[entry.outcomeKey] : undefined
  const body = scene ? (() => { const t = sceneText(scene, state); return [...t.main, ...t.aside] })() : (entry.text ?? '').split(/\n{2,}/)

  return (
    <li className={styles.entry}>
      <button className={styles.entryHead} aria-expanded={open} onClick={() => setOpen(o => !o)}>
        <span className={styles.entryTitle}>{title}</span>
        <span className={styles.entryChoice}><Inline text={choiceText} /></span>
        {tag && <span className={styles.tag}>{tag}</span>}
      </button>
      {open && (
        <div className={styles.entryBody}>
          {body.filter(Boolean).map((p, i) => <p key={i}><Inline text={p} /></p>)}
          <p className={styles.chose}><span className={styles.choiceLabel}>You chose</span> <Inline text={choiceText} /></p>
          {outcomeText.split(/\n{2,}/).filter(Boolean).map((p, i) => <p key={`o${i}`} className={styles.outcome}><Inline text={p} /></p>)}
        </div>
      )}
    </li>
  )
}

export default function Journal({ state, scene, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('now')
  const [, setLoaded] = useState(0)
  const entries = state.journal ?? []

  // The story so far is rebuilt from scene data. Make sure every chapter it needs is loaded.
  useEffect(() => {
    const missing = [...new Set(entries.map(e => e.sceneId))].filter(id => !peekScene(id))
    if (!missing.length) return
    Promise.all(missing.map(id => resolveScene(id).catch(() => null))).then(() => setLoaded(n => n + 1))
  }, [entries])

  const objective = currentObjective(scene, state)
  const leads = visibleLeads(state)
  const notes = knownNotes(state)

  const byDay = new Map<number, JournalEntry[]>()
  for (const e of entries) byDay.set(e.day, [...(byDay.get(e.day) ?? []), e])

  const TABS: Array<[Tab, string]> = [['now', 'Now'], ['know', 'What you know'], ['story', 'Story so far']]

  return (
    <Panel title="Journal" onClose={onClose}>
      <div className={styles.tabs} role="tablist" aria-label="Journal sections">
        {TABS.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} aria-controls={`jt-${id}`} id={`jtab-${id}`}
            className={`${styles.tab} ${tab === id ? styles.tabOn : ''}`} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      <div className={styles.body} role="tabpanel" id={`jt-${tab}`} aria-labelledby={`jtab-${tab}`}>
        {tab === 'now' && (
          <>
            {objective && (
              <section className={styles.section}>
                <h3 className={styles.heading}>Now</h3>
                <p className={styles.objective}>{objective}</p>
              </section>
            )}
            <section className={styles.section}>
              <h3 className={styles.heading}>Open leads</h3>
              {leads.length ? <ul className={styles.list}>{leads.map(l => <li key={l}>{l}</li>)}</ul>
                : <p className={styles.empty}>Nothing to follow up yet.</p>}
            </section>
          </>
        )}

        {tab === 'know' && (
          notes.length === 0 ? <p className={styles.empty}>You have not learned anything worth writing down yet.</p> :
          GROUPS.map(g => {
            const inGroup = notes.filter(n => n.group === g)
            if (!inGroup.length) return null
            return (
              <section key={g} className={styles.section}>
                <h3 className={styles.heading}>{g}</h3>
                <ul className={styles.list}>{inGroup.map(n => <li key={n.flag}>{n.text}</li>)}</ul>
              </section>
            )
          })
        )}

        {tab === 'story' && (
          entries.length === 0 ? <p className={styles.empty}>Nothing recorded yet.</p> :
          [...byDay.entries()].map(([day, list]) => (
            <section key={day} className={styles.section}>
              <h3 className={styles.heading}>Day {day}{list[0].part ? ` · ${cap(list[0].part as DayPart)}` : ''}</h3>
              <ol className={styles.entries}>
                {list.map((e, i) => <Entry key={`${day}-${i}`} entry={e} state={state} />)}
              </ol>
            </section>
          ))
        )}
      </div>
    </Panel>
  )
}
