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
    desc: 'You were a soldier, and then you led soldiers. People tend to do what you tell them, and most fights you stop before they start.',
    peaks: ['STR ▲', 'STA ▲', 'CHA ▲'],
    lows:  ['MAN ▼'],
    stats: { strength: 16, dexterity: 11, stamina: 14, intelligence: 11, mana: 6, charisma: 14, perception: 10 },
  },
  {
    id: 'arcane',
    name: 'The Arcane',
    archetype: 'Mage · Seer · Cursed blood',
    desc: 'You were trained in the old magic and can feel it where other people feel nothing. The curse on Ashenveld is written in something close to a language you know.',
    peaks: ['INT ▲', 'MAN ▲', 'PER ▲'],
    lows:  ['STR ▼'],
    stats: { strength: 7, dexterity: 10, stamina: 9, intelligence: 16, mana: 16, charisma: 11, perception: 14 },
  },
  {
    id: 'ranger',
    name: 'The Ranger',
    archetype: 'Hunter · Tracker · Wilderness',
    desc: 'You spent your years out of doors, hunting and tracking. You can cross bad country without being seen and live on very little. You know these forests better than most.',
    peaks: ['DEX ▲', 'STA ▲', 'PER ▲'],
    lows:  ['CHA ▼'],
    stats: { strength: 12, dexterity: 16, stamina: 14, intelligence: 11, mana: 7, charisma: 9, perception: 16 },
  },
  {
    id: 'cipher',
    name: 'The Cipher',
    archetype: 'Spy · Courtesan · Shadow noble',
    desc: 'You made your living finding out what people would rather keep quiet. You can usually tell when somebody is lying, and you lie well yourself.',
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
const GENDER_LABEL: Record<string, string> = { Woman: 'A woman', Man: 'A man', Neither: 'Neither' }
/** "your sibling", but "the one who got away". */
const yourRel = (r: string | null) => !r ? 'someone you loved' : r.startsWith('The ') ? r.toLowerCase() : `your ${r.toLowerCase()}`

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
            You have come back to Ashenveld for{' '}
            <strong>{missingName.trim() || 'them'}</strong>, {yourRel(relation)}.
            The barge reaches Crestfall at nightfall.
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
              <div className={styles.stepTitle}>Are you a woman or a man?</div>
              <div className={styles.stepSub}>
                People in Crestfall will call you ma'am, sir, or traveller.
              </div>
            </div>

            <div className={styles.genderRow} role="radiogroup" aria-label="Are you a woman or a man?">
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
                  <div className={styles.genderLabel}>{GENDER_LABEL[g]}</div>
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
              <div className={styles.stepTitle}>What did you do while you were away?</div>
              <div className={styles.stepSub}>
                It decides what you are good at and what you notice.
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
                  </div>
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
                They went missing in Ashenveld over a year ago. You had one letter
                from them, and then nothing.
              </div>
            </div>

            <div className={styles.missingForm}>
              <div className={styles.fieldGroup}>
                <div className={styles.fieldLabel}>Their name</div>
                <input
                  className={styles.fieldInput}
                  type="text"
                  placeholder="Their name"
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
                    , {yourRel(relation)}.
                    When you left, you said you would come back for them. You never did.
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
                    <strong>{playerName.trim()}</strong>. You left Ashenveld eleven years ago
                    and have not been back.
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
