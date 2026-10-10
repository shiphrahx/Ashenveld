import React from 'react'
import { useSettings } from '../settings'
import { Icon } from './icons'
import styles from './MuteButton.module.css'

/** The speaker button (E3). Muting is instant. */
export default function MuteButton({ className = '' }: { className?: string }) {
  const { settings, update } = useSettings()
  const muted = settings.muted
  return (
    <button className={`${styles.mute} ${className}`} onClick={() => update({ muted: !muted })}
      aria-pressed={muted} aria-label="Mute sound" title={muted ? 'Sound is muted' : 'Mute sound'} data-mute>
      <Icon name={muted ? 'soundOff' : 'sound'} />
    </button>
  )
}
