import React, { useState, useEffect, useRef } from 'react'
import type { GameState } from '../types'
import { useLocationImage } from '../hooks/useLocationImage'
import styles from './SceneArt.module.css'

interface Props {
  locationName: string
  gameState: GameState
}

export default function SceneArt({ locationName, gameState }: Props) {
  const locationId = gameState.world.current_location
  const imageSrc = useLocationImage(locationId, gameState)

  // Two-slot crossfade: current (visible) and next (loading behind)
  const [displayed, setDisplayed] = useState<string | null>(null)
  const [incoming, setIncoming] = useState<string | null>(null)
  const [fading, setFading] = useState(false)
  const incomingRef = useRef<string | null>(null)

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
    }, 400)
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
            <span className={styles.placeholderText}>{locationId}</span>
          </div>
        )}

        {displayed !== null && (
          <img
            key={displayed}
            src={displayed}
            alt=""
            className={styles.locationImg}
            style={{ opacity: fading ? 0 : 1 }}
          />
        )}

        {incoming !== null && (
          <img
            key={incoming}
            src={incoming}
            alt=""
            className={styles.locationImg}
            style={{ opacity: fading ? 1 : 0, zIndex: 2 }}
            onLoad={handleIncomingLoad}
            onError={handleIncomingError}
          />
        )}
      </div>
      <div className={styles.sceneFooter}>{locationName}</div>
    </div>
  )
}
