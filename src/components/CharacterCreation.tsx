import React, { useState } from 'react'
import styles from './CharacterCreation.module.css'
import StarField from './StarField'
import { modifierForStat } from '../rules'

export interface CreationResult {
  gender: string
  playerClass: string
  missingPersonName: string
  missingPersonRelationship: string
  playerName: string
}

interface Props {
  onComplete: (result: CreationResult) => void
  onBack?: () => void
}

const PILL_STAT_KEY: Record<string, string> = {
  STR: 'strength', DEX: 'dexterity', STA: 'stamina',
  INT: 'intelligence', MAN: 'mana', CHA: 'charisma', PER: 'perception',
}

const CLASS_DATA = [
  {
    id: 'commander',
    name: 'The Commander',
    archetype: 'Knight · Lord · Warlord',
    tag: 'Courage',
    quote: '"I protect the people I love."',
    desc: 'You command through presence. Rooms reorganise around you. You don\'t just win fights — you end them before they start. Ashenveld will test whether the people worth protecting still trust you to do it.',
    peaks: ['STR ▲', 'STA ▲', 'CHA ▲'],
    lows:  ['MAN ▼'],
    stats: { strength: 16, dexterity: 11, stamina: 14, intelligence: 11, mana: 6, charisma: 14, perception: 10 },
  },
  {
    id: 'arcane',
    name: 'The Arcane',
    archetype: 'Mage · Seer · Cursed blood',
    tag: 'Intellect',
    quote: '"I need to understand why."',
    desc: 'You read what others cannot see — the residue of old magic, the invisible architecture of a room, what happened here before the people left. The curse spreading across Ashenveld speaks a language you almost recognise.',
    peaks: ['INT ▲', 'MAN ▲', 'PER ▲'],
    lows:  ['STR ▼'],
    stats: { strength: 7, dexterity: 10, stamina: 9, intelligence: 16, mana: 16, charisma: 11, perception: 14 },
  },
  {
    id: 'ranger',
    name: 'The Ranger',
    archetype: 'Hunter · Tracker · Wilderness',
    tag: 'Instinct',
    quote: '"I follow my instincts."',
    desc: 'You read land and creature the way others read faces. You move through hostile terrain without being seen, find things that don\'t want to be found, and survive conditions that would kill anyone else. Ashenveld\'s forests remember you.',
    peaks: ['DEX ▲', 'STA ▲', 'PER ▲'],
    lows:  ['CHA ▼'],
    stats: { strength: 12, dexterity: 16, stamina: 14, intelligence: 11, mana: 7, charisma: 9, perception: 16 },
  },
  {
    id: 'cipher',
    name: 'The Cipher',
    archetype: 'Spy · Courtesan · Shadow noble',
    tag: 'Resilience',
    quote: '"I survived. I\'m still here."',
    desc: 'You read people like open books — their fears, their wants, the small betrayals their faces make before their mouths catch up. In a land where everyone is hiding something, this is the most dangerous skill of all.',
    peaks: ['CHA ▲', 'INT ▲', 'DEX ▲'],
    lows:  ['STR ▼'],
    stats: { strength: 8, dexterity: 14, stamina: 10, intelligence: 14, mana: 9, charisma: 16, perception: 13 },
  },
]

const RELATIONS = [
  'Childhood friend',
  'Former lover',
  'Sibling',
  'Mentor',
  'Parent',
  'The one who got away',
]

const CLASS_LABELS: Record<string, string> = {
  commander: 'The Commander',
  arcane: 'The Arcane',
  ranger: 'The Ranger',
  cipher: 'The Cipher',
}

/** Radio cards: Enter and Space choose; arrow keys move to the next card and choose it. */
function radioKeys(e: React.KeyboardEvent, pick: () => void, move: (delta: number) => void) {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); return }
  const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
  if (!d) return
  e.preventDefault()
  move(d)
  const group = (e.currentTarget as HTMLElement).parentElement
  const cards = [...(group?.querySelectorAll<HTMLElement>('[role="radio"]') ?? [])]
  const i = cards.indexOf(e.currentTarget as HTMLElement)
  cards[(i + d + cards.length) % cards.length]?.focus()
}

const GENDERS = ['Woman', 'Man', 'Neither'] as const

/** Names: trimmed, 2 to 24 characters, none of the characters the story text uses for markup. */
const cleanName = (v: string) => v.replace(/[[\]<>*]/g, '').slice(0, 24)
const nameOk = (v: string) => v.trim().length >= 2 && v.trim().length <= 24

function Progress({ step }: { step: number }) {
  return (
    <ol className={styles.navProgress} aria-label="Steps">
      {[1, 2, 3, 4].map(i => (
        <li key={i} aria-current={i === step ? 'step' : undefined}
          className={`${styles.progDot} ${i < step ? styles.done : ''} ${i === step ? styles.active : ''}`}>
          <span className={styles.srOnly}>Step {i}{i < step ? ', done' : ''}</span>
        </li>
      ))}
    </ol>
  )
}

const GOOD_AT: Record<string, string> = {
  commander: 'Standing firm and giving orders.',
  arcane: 'Sensing the curse and reading the old texts.',
  ranger: 'Moving unseen and reading the land.',
  cipher: 'Reading people and talking your way through.',
}
const STAT_ORDER: Array<[string, string]> = [['strength', 'STR'], ['dexterity', 'DEX'], ['stamina', 'STA'], ['intelligence', 'INT'], ['mana', 'MAN'], ['charisma', 'CHA'], ['perception', 'PER']]

export default function CharacterCreation({ onComplete, onBack }: Props) {
  const [step, setStep] = useState(1)
  const [gender, setGender] = useState<string | null>(null)
  const [playerClass, setPlayerClass] = useState<string | null>(null)
  const [missingName, setMissingName] = useState('')
  const [relation, setRelation] = useState<string | null>(null)
  const [playerName, setPlayerName] = useState('')
  const [finishing, setFinishing] = useState(false)
  const [showDesc, setShowDesc] = useState(false)
  const chosen = CLASS_DATA.find(c => c.id === playerClass)

  function goTo(n: number) {
    setStep(n)
  }

  function finish() {
    setFinishing(true)
  }

  function enter() {
    onComplete({
      gender: gender!,
      playerClass: playerClass!,
      missingPersonName: missingName.trim(),
      missingPersonRelationship: (relation ?? '').toLowerCase(),
      playerName: playerName.trim(),
    })
  }

  // Neither reads as they/their. The game is in the second person, so this only shapes the summary.
  const genderPronoun = gender === 'Woman' ? 'She' : gender === 'Man' ? 'He' : 'They'
  const genderPossessive = gender === 'Woman' ? 'her' : gender === 'Man' ? 'his' : 'their'
  const genderSelf = gender === 'Woman' ? 'herself' : gender === 'Man' ? 'himself' : 'themself'
  const was = genderPronoun === 'They' ? 'were' : 'was'
  const is = genderPronoun === 'They' ? 'are' : 'is'
  const cls = playerClass ? CLASS_LABELS[playerClass] : 'a traveller'

  // ── Final screen ──
  if (finishing) {
    return (
      <div className={styles.finalScreen}>
        <div className={styles.finalSummary}>
          <div className={styles.finalClass}>
            {cls} · {gender}
          </div>
          <div className={styles.finalName}>{playerName.trim()}</div>
          <div className={styles.finalRule} />
          <div className={styles.finalText}>
            {genderPronoun} came back to Ashenveld for{' '}
            <strong>{missingName.trim() || 'them'}</strong> —{' '}
            {genderPossessive} {(relation ?? '').toLowerCase()}.
            Over a year missing. One letter. Then silence.<br /><br />
            The river barge docks at Crestfall at nightfall.
            The town is quieter than {genderPronoun.toLowerCase()} {genderPronoun === 'They' ? 'remember' : 'remembers'}.
          </div>
        </div>
        <button className={styles.beginBtn} onClick={enter} autoFocus>Enter Ashenveld</button>
        <button className={styles.navBack} onClick={() => { setFinishing(false); setStep(4) }}>← Back</button>
      </div>
    )
  }

  return (
    <div className={styles.creationScreen}>
      <StarField />

      {/* ── STEP 1: GENDER ── */}
      {step === 1 && (
        <div className={styles.step}>
          <div className={styles.stepInner}>
            <div className={styles.stepHeader}>
              <div className={styles.stepNum}>Step 1 of 4</div>
              <div className={styles.stepTitle}>Who are you?</div>
              <div className={styles.stepSub}>
                The world of Ashenveld treats you the same whichever you choose.
                This is only about how you see yourself.
              </div>
            </div>

            <div className={styles.genderRow} role="radiogroup" aria-label="Who are you?">
              {GENDERS.map(g => (
                <div
                  key={g}
                  role="radio"
                  aria-checked={gender === g}
                  tabIndex={0}
                  className={`${styles.genderCard} ${gender === g ? styles.selected : ''}`}
                  onClick={() => setGender(g)}
                  onKeyDown={e => radioKeys(e, () => setGender(g), d => setGender(GENDERS[(GENDERS.indexOf(g) + d + GENDERS.length) % GENDERS.length]))}
                >
                  <div className={styles.check} />
                  <div className={styles.genderLabel}>{g}</div>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.stepNav}>
            <button className={styles.navBack} onClick={onBack}>← Back</button>
            <Progress step={step} />
            <button
              className={styles.navNext}
              disabled={!gender}
              onClick={() => goTo(2)}
            ><span>Next →</span></button>
          </div>
        </div>
      )}

      {/* ── STEP 2: CLASS ── */}
      {step === 2 && (
        <div className={styles.step}>
          <div className={styles.stepInner}>
            <div className={styles.stepHeader}>
              <div className={styles.stepNum}>Step 2 of 4</div>
              <div className={styles.stepTitle}>When things get hard, who are you?</div>
              <div className={styles.stepSub}>
                Your class shapes how you move through Ashenveld — what you notice,
                what doors open, what the darkness does to you.
              </div>
            </div>

            <button className={styles.moreToggle} aria-expanded={showDesc} onClick={() => setShowDesc(v => !v)}>
              {showDesc ? 'Fewer words' : 'More about each class'}
            </button>
            <div className={`${styles.classGrid} ${showDesc ? styles.showDesc : ''}`} role="radiogroup" aria-label="Your class">
              {CLASS_DATA.map(c => (
                <div
                  key={c.id}
                  role="radio"
                  aria-checked={playerClass === c.id}
                  aria-label={c.name}
                  tabIndex={0}
                  className={`${styles.classCard} ${playerClass === c.id ? styles.selected : ''}`}
                  onClick={() => setPlayerClass(c.id)}
                  onKeyDown={e => radioKeys(e, () => setPlayerClass(c.id), d => setPlayerClass(CLASS_DATA[(CLASS_DATA.findIndex(x => x.id === c.id) + d + CLASS_DATA.length) % CLASS_DATA.length].id))}
                >
                  <div className={styles.classTop}>
                    <div>
                      <div className={styles.className}>{c.name}</div>
                      <div className={styles.classArchetype}>{c.archetype}</div>
                    </div>
                    <div className={styles.classTag}>{c.tag}</div>
                  </div>
                  <div className={styles.classQuote}>{c.quote}</div>
                  <div className={styles.classDesc}>{c.desc}</div>
                  <div className={styles.classStats}>
                    {c.peaks.map(s => {
                      const val = c.stats[PILL_STAT_KEY[s.slice(0, 3)] as keyof typeof c.stats]
                      return (
                        <span key={s} className={`${styles.statPill} ${styles.peak}`}>
                          {s} <span className={styles.pillVal}>{val}</span>
                        </span>
                      )
                    })}
                    {c.lows.map(s => {
                      const val = c.stats[PILL_STAT_KEY[s.slice(0, 3)] as keyof typeof c.stats]
                      return (
                        <span key={s} className={`${styles.statPill} ${styles.low}`}>
                          {s} <span className={styles.pillVal}>{val}</span>
                        </span>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
            {chosen && (
              <div className={styles.chosen} aria-live="polite">
                <div className={styles.chosenGood}>{chosen.name}: {GOOD_AT[chosen.id]}</div>
                <ul className={styles.chosenStats}>
                  {STAT_ORDER.map(([k, label]) => {
                    const v = chosen.stats[k as keyof typeof chosen.stats]
                    const m = modifierForStat(v)
                    return <li key={k}><span>{label}</span> {v} · {m >= 0 ? '+' : '−'}{Math.abs(m)}</li>
                  })}
                </ul>
              </div>
            )}
          </div>

          <div className={styles.stepNav}>
            <button className={styles.navBack} onClick={() => goTo(1)}>← Back</button>
            <Progress step={step} />
            <button
              className={styles.navNext}
              disabled={!playerClass}
              onClick={() => goTo(3)}
            ><span>Next →</span></button>
          </div>
        </div>
      )}

      {/* ── STEP 3: MISSING PERSON ── */}
      {step === 3 && (
        <div className={styles.step}>
          <div className={styles.stepInner}>
            <div className={styles.stepHeader}>
              <div className={styles.stepNum}>Step 3 of 4</div>
              <div className={styles.stepTitle}>Who did you lose?</div>
              <div className={styles.stepSub}>
                They disappeared into Ashenveld over a year ago. You received one letter
                after that. Then nothing. You came back for them.
              </div>
            </div>

            <div className={styles.missingForm}>
              <div className={styles.fieldGroup}>
                <div className={styles.fieldLabel}>Their name</div>
                <input
                  className={styles.fieldInput}
                  type="text"
                  placeholder="The name you say when no one is listening"
                  maxLength={24}
                  value={missingName}
                  onChange={e => setMissingName(cleanName(e.target.value))}
                />
              </div>

              <div className={styles.fieldGroup}>
                <div className={styles.fieldLabel}>Your relationship</div>
                <div className={styles.relationGrid}>
                  {RELATIONS.map(r => (
                    <button
                      key={r}
                      className={`${styles.relBtn} ${relation === r ? styles.selected : ''}`}
                      onClick={() => setRelation(r)}
                    >{r}</button>
                  ))}
                </div>
              </div>

              {(missingName.trim() || relation) && (
                <div className={styles.missingPreview}>
                  <div className={styles.previewText}>
                    {relation === 'Parent' ? <><strong>{missingName.trim() || 'They'}</strong> raised you in Ashenveld</>
                      : relation === 'Mentor' ? <><strong>{missingName.trim() || 'They'}</strong> taught you everything you were good at</>
                      : <>You grew up with <strong>{missingName.trim() || 'them'}</strong> in Ashenveld</>}
                    {' '}—{' '}
                    {relation ? `your ${relation.toLowerCase()}` : 'someone you loved'}.
                    When you left, you told yourself you would come back for them.
                    You didn't. Then their letter arrived, and you understood that leaving
                    had been the mistake that made everything else possible.
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className={styles.stepNav}>
            <button className={styles.navBack} onClick={() => goTo(2)}>← Back</button>
            <Progress step={step} />
            <button
              className={styles.navNext}
              disabled={!nameOk(missingName) || !relation}
              onClick={() => goTo(4)}
            ><span>Next →</span></button>
          </div>
        </div>
      )}

      {/* ── STEP 4: YOUR NAME ── */}
      {step === 4 && (
        <div className={styles.step}>
          <div className={styles.stepInner}>
            <div className={styles.stepHeader}>
              <div className={styles.stepNum}>Step 4 of 4</div>
              <div className={styles.stepTitle}>What is your name?</div>
              <div className={styles.stepSub}>
                The name you left Ashenveld with.
                The name some people here still remember.
              </div>
            </div>

            <div className={styles.nameForm}>
              <div className={styles.fieldGroup}>
                <div className={styles.fieldLabel}>Your name</div>
                <input
                  className={styles.fieldInput}
                  type="text"
                  placeholder="Your name"
                  maxLength={24}
                  value={playerName}
                  onChange={e => setPlayerName(cleanName(e.target.value))}
                />
              </div>

              {playerName.trim() && (
                <div className={styles.namePreview}>
                  <div className={styles.namePreviewText}>
                    <strong>{playerName.trim()}</strong>.{' '}
                    {genderPronoun} left Ashenveld eleven years ago and built another life
                    somewhere else. {genderPronoun} {was} {cls}.{' '}
                    {genderPronoun} kept {genderPossessive} reasons for leaving to{' '}
                    {genderSelf}. Now {genderPronoun.toLowerCase()} {is} coming back.
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className={styles.stepNav}>
            <button className={styles.navBack} onClick={() => goTo(3)}>← Back</button>
            <Progress step={step} />
            <button
              className={styles.navNext}
              disabled={!nameOk(playerName)}
              onClick={finish}
            ><span>Enter Ashenveld →</span></button>
          </div>
        </div>
      )}
    </div>
  )
}
