import React, { useState, useEffect, useRef } from 'react'
import type { GameState } from '../types'
import { useLocationImage } from '../hooks/useLocationImage'
import { getLocation } from '../loader'
import { motionAllowed, useSettings } from '../settings'
import Atmosphere from './Atmosphere'
import styles from './SceneArt.module.css'

interface Props {
  locationName: string
  gameState: GameState
  /** What the picture shows, for screen readers. Until the art manifest (A13) it is the place's description. */
  alt?: string
  /** E9: hold the moving layers still. */
  frozen?: boolean
}

export default function SceneArt({ locationName, gameState, alt = '', frozen = false }: Props) {
  const { settings } = useSettings()
  const locationId = gameState.world.current_location
  const imageSrc = useLocationImage(locationId, gameState)

  // Two-slot crossfade: current (visible) and next (loading behind)
  const [displayed, setDisplayed] = useState<string | null>(null)
  const [incoming, setIncoming] = useState<string | null>(null)
  const [fading, setFading] = useState(false)
  const incomingRef = useRef<string | null>(null)

  // E6: a new day is stamped across the top of the art for 2.5 seconds.
  const [stamp, setStamp] = useState<string | null>(null)
  const lastDay = useRef(gameState.world.day)
  useEffect(() => {
    const day = gameState.world.day
    if (day > lastDay.current) {
      const part = gameState.world.time_of_day
      setStamp(`Day ${day} · ${part.charAt(0).toUpperCase()}${part.slice(1)}`)
      const t = setTimeout(() => setStamp(null), 2500)
      lastDay.current = day
      return () => clearTimeout(t)
    }
    lastDay.current = day
  }, [gameState.world.day])

  useEffect(() => {
    if (imageSrc === displayed) return

    if (imageSrc === null) {
      setDisplayed(null)
      setIncoming(null)
      setFading(false)
      return
    }

    incomingRef.current = imageSrc
    setIncoming(imageSrc)
    setFading(false)
  }, [imageSrc])

  function handleIncomingLoad() {
    if (incoming === null || incoming !== incomingRef.current) return
    // New image is ready — trigger crossfade
    setFading(true)
    setTimeout(() => {
      setDisplayed(incomingRef.current)
      setIncoming(null)
      setFading(false)
    }, 700)
  }

  function handleIncomingError() {
    setIncoming(null)
  }

  const showPlaceholder = displayed === null && !fading

  return (
    <div className={styles.scenePanel}>
      <div className={styles.sceneArt}>
        {showPlaceholder && (
          <div className={styles.placeholder}>
            <span className={styles.placeholderText}>{locationName}</span>
          </div>
        )}

        {displayed !== null && (
          <img
            key={displayed}
            src={displayed}
            alt={alt}
            className={styles.locationImg}
            style={{ opacity: fading ? 0 : 1 }}
          />
        )}

        {incoming !== null && (
          <img
            key={incoming}
            src={incoming}
            alt=""
            aria-hidden="true"
            className={styles.locationImg}
            style={{ opacity: fading ? 1 : 0, zIndex: 2 }}
            onLoad={handleIncomingLoad}
            onError={handleIncomingError}
          />
        )}

        {stamp && <div key={stamp} className={styles.dayStamp} data-day-stamp>{stamp}</div>}

        <Atmosphere kind={getLocation(locationId)?.atmosphere ?? 'none'} dimming={gameState.world.curse_spread}
          moving={motionAllowed(settings)} frozen={frozen} />
      </div>
      <div className={styles.sceneFooter} data-location-name>{locationName}</div>
    </div>
  )
}
