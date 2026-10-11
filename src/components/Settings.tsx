import React from 'react'
import { useSettings, type Settings as S } from '../settings'
import Panel from './Panel'
import styles from './Settings.module.css'

interface Props {
  onClose: () => void
}

const PREVIEW = 'Somebody put a cup on the fountain’s edge. Then somebody else put another cup.'

function Options<K extends keyof S>({ label, field, options }: { label: string; field: K; options: Array<[S[K], string]> }) {
  const { settings, update } = useSettings()
  const id = `set-${String(field)}`
  function onKey(e: React.KeyboardEvent, i: number) {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const next = (i + step + options.length) % options.length
    update({ [field]: options[next][0] } as Partial<S>)
    const group = (e.currentTarget as HTMLElement).parentElement
    ;(group?.children[next] as HTMLElement | undefined)?.focus()
  }
  return (
    <div className={styles.row}>
      <span className={styles.label} id={id}>{label}</span>
      <div className={styles.options} role="radiogroup" aria-labelledby={id}>
        {options.map(([value, text], i) => {
          const on = settings[field] === value
          return (
            <button
              key={String(value)}
              role="radio"
              aria-checked={on}
              tabIndex={on ? 0 : -1}
              className={`${styles.option} ${on ? styles.on : ''}`}
              onClick={() => update({ [field]: value } as Partial<S>)}
              onKeyDown={e => onKey(e, i)}
            >{text}</button>
          )
        })}
      </div>
    </div>
  )
}

function Volume() {
  const { settings, update } = useSettings()
  return (
    <div className={styles.row}>
      <label className={styles.label} htmlFor="set-volume">Volume</label>
      <input id="set-volume" type="range" min={0} max={100} step={5} className={styles.slider}
        value={Math.round(settings.volume * 100)}
        aria-valuetext={`${Math.round(settings.volume * 100)}%`}
        onChange={e => update({ volume: Number(e.target.value) / 100 })} />
    </div>
  )
}

export default function Settings({ onClose }: Props) {
  return (
    <Panel title="Settings" onClose={onClose}>
      <div className={styles.body}>
        <section aria-labelledby="set-reading">
          <h3 id="set-reading" className={styles.group}>Reading</h3>
          <p className={styles.preview}>{PREVIEW}</p>
          <Options label="Text size" field="textSize" options={[['normal', 'Normal'], ['large', 'Large'], ['larger', 'Larger']]} />
          <Options label="Line spacing" field="lineSpacing" options={[['normal', 'Normal'], ['loose', 'Loose']]} />
          <Options label="Letter spacing" field="letterSpacing" options={[['normal', 'Normal'], ['wide', 'Wide']]} />
          <Options label="Font" field="font" options={[['sans', 'Hyperlegible'], ['serif', 'Serif'], ['system', 'System']]} />
        </section>

        <section aria-labelledby="set-motion">
          <h3 id="set-motion" className={styles.group}>Motion</h3>
          <Options label="Movement" field="motion" options={[['system', 'System'], ['reduced', 'Reduced'], ['full', 'Full']]} />
          <Options label="Text appears" field="textReveal" options={[['fade', 'Fade in'], ['instant', 'At once']]} />
          <Options label="Screen effects" field="screenEffects" options={[[true, 'On'], [false, 'Off']]} />
        </section>

        <section aria-labelledby="set-sound">
          <h3 id="set-sound" className={styles.group}>Sound</h3>
          <Volume />
          <Options label="Ambience" field="ambience" options={[[true, 'On'], [false, 'Off']]} />
          <Options label="All sound" field="muted" options={[[false, 'On'], [true, 'Muted']]} />
        </section>

        <section aria-labelledby="set-play">
          <h3 id="set-play" className={styles.group}>Play</h3>
          <Options label="Odds on choices" field="odds" options={[['words', 'In words'], ['percent', 'As a percentage']]} />
          <Options label="Change notices" field="toasts" options={[[true, 'On'], [false, 'Off']]} />
          <Options label="Scenes you have read" field="skipSeen" options={[[false, 'Show in full'], [true, 'Skip to the choice']]} />
        </section>
      </div>
    </Panel>
  )
}
