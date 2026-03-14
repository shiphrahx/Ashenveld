import React, { useState } from 'react'
import styles from './CharacterCreation.module.css'
import StarField from './StarField'

export interface CreationResult {
  gender: string
  playerClass: string
  missingPersonName: string
  missingPersonRelationship: string
  playerName: string
}

interface Props {
  onComplete: (result: CreationResult) => void
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

export default function CharacterCreation({ onComplete }: Props) {
  const [step, setStep] = useState(1)
  const [gender, setGender] = useState<string | null>(null)
  const [playerClass, setPlayerClass] = useState<string | null>(null)
  const [missingName, setMissingName] = useState('')
  const [relation, setRelation] = useState<string | null>(null)
  const [playerName, setPlayerName] = useState('')
  const [finishing, setFinishing] = useState(false)

  function goTo(n: number) {
    setStep(n)
  }

  function finish() {
    setFinishing(true)
    // small delay to show final screen before handing off
    setTimeout(() => {
      onComplete({
        gender: gender!,
        playerClass: playerClass!,
        missingPersonName: missingName.trim(),
        missingPersonRelationship: (relation ?? '').toLowerCase(),
        playerName: playerName.trim(),
      })
    }, 800)
  }

  const genderPronoun = gender === 'woman' ? 'She' : 'He'
  const genderPossessive = gender === 'woman' ? 'her' : 'his'
  const cls = playerClass ? CLASS_LABELS[playerClass] : 'a traveller'

  // ── Final screen ──
  if (finishing) {
    return (
      <div className={styles.finalScreen}>
        <div className={styles.finalSummary}>
          <div className={styles.finalClass}>
            {cls} · {gender === 'woman' ? 'Woman' : 'Man'}
          </div>
          <div className={styles.finalName}>{playerName.trim()}</div>
          <div className={styles.finalRule} />
          <div className={styles.finalText}>
            {genderPronoun} came back to Ashenveld for{' '}
            <strong>{missingName.trim() || 'them'}</strong> —{' '}
            {genderPossessive} {(relation ?? '').toLowerCase()}.
            Over a year missing. One letter. Then silence.<br /><br />
            The river barge docks at Crestfall before dawn.
            The town is quieter than {genderPronoun === 'She' ? 'she' : 'he'} remembers.
          </div>
        </div>
        <button className={styles.beginBtn}>Enter Ashenveld</button>
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
                The world of Ashenveld treats you the same either way.
                This is only about how you see yourself.
              </div>
            </div>

            <div className={styles.genderRow}>
              {(['Man', 'Woman'] as const).map(g => (
                <div
                  key={g}
                  className={`${styles.genderCard} ${gender === g ? styles.selected : ''}`}
                  onClick={() => setGender(g)}
                >
                  <div className={styles.check} />
                  <div className={styles.genderIcon}>
                    <svg viewBox="0 0 48 48">
                      <circle cx="24" cy="16" r="10" />
                      <path d="M10 46c0-7.73 6.27-14 14-14s14 6.27 14 14" />
                    </svg>
                  </div>
                  <div className={styles.genderLabel}>{g}</div>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.stepNav}>
            <button className={styles.navBack} disabled>← Back</button>
            <div className={styles.navProgress}>
              <div className={`${styles.progDot} ${styles.active}`} />
              <div className={styles.progDot} />
              <div className={styles.progDot} />
              <div className={styles.progDot} />
            </div>
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

            <div className={styles.classGrid}>
              {CLASS_DATA.map(c => (
                <div
                  key={c.id}
                  className={`${styles.classCard} ${playerClass === c.id ? styles.selected : ''}`}
                  onClick={() => setPlayerClass(c.id)}
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
                    {c.peaks.map(s => (
                      <span key={s} className={`${styles.statPill} ${styles.peak}`}>{s}</span>
                    ))}
                    {c.lows.map(s => (
                      <span key={s} className={`${styles.statPill} ${styles.low}`}>{s}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.stepNav}>
            <button className={styles.navBack} onClick={() => goTo(1)}>← Back</button>
            <div className={styles.navProgress}>
              <div className={`${styles.progDot} ${styles.done}`} />
              <div className={`${styles.progDot} ${styles.active}`} />
              <div className={styles.progDot} />
              <div className={styles.progDot} />
            </div>
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
                  maxLength={32}
                  value={missingName}
                  onChange={e => setMissingName(e.target.value)}
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
                    You grew up with{' '}
                    <strong>{missingName.trim() || 'them'}</strong>{' '}
                    in Ashenveld —{' '}
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
            <div className={styles.navProgress}>
              <div className={`${styles.progDot} ${styles.done}`} />
              <div className={`${styles.progDot} ${styles.done}`} />
              <div className={`${styles.progDot} ${styles.active}`} />
              <div className={styles.progDot} />
            </div>
            <button
              className={styles.navNext}
              disabled={missingName.trim().length < 2 || !relation}
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
                  maxLength={32}
                  value={playerName}
                  onChange={e => setPlayerName(e.target.value)}
                />
              </div>

              {playerName.trim() && (
                <div className={styles.namePreview}>
                  <div className={styles.namePreviewText}>
                    <strong>{playerName.trim()}</strong>.{' '}
                    {genderPronoun} left Ashenveld eleven years ago and built another life
                    somewhere else. {genderPronoun} was {cls}.{' '}
                    {genderPronoun} kept {genderPossessive} reasons for leaving to{' '}
                    {genderPossessive}self. Now {genderPronoun === 'She' ? 'she' : 'he'} is coming back.
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className={styles.stepNav}>
            <button className={styles.navBack} onClick={() => goTo(3)}>← Back</button>
            <div className={styles.navProgress}>
              <div className={`${styles.progDot} ${styles.done}`} />
              <div className={`${styles.progDot} ${styles.done}`} />
              <div className={`${styles.progDot} ${styles.done}`} />
              <div className={`${styles.progDot} ${styles.active}`} />
            </div>
            <button
              className={styles.navNext}
              disabled={playerName.trim().length < 2}
              onClick={finish}
            ><span>Enter Ashenveld →</span></button>
          </div>
        </div>
      )}
    </div>
  )
}
