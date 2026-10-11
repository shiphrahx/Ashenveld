import { useMemo } from 'react'
import type { GameState } from '../types'
import { imageMap } from '../data/imageMap'

const BASE = import.meta.env.BASE_URL

/** The image for a place, without its size and extension; SceneArt adds @1x.webp and @2x.webp (B22). */
export function imageFor(locationId: string, gameState: Pick<GameState, 'world' | 'flags'>): string | null {
  let resolvedId = locationId
  if (locationId === 'crestfall_tallow_inn' && gameState.world.act >= 2) {
    resolvedId = 'crestfall_tallow_inn_day'
  } else if (locationId === 'ruins_source_chamber' && gameState.flags.ritual_complete === true) {
    resolvedId = 'ruins_source_chamber_sealed'
  }
  const filename = imageMap[resolvedId]
  return filename ? `${BASE}resources/images/${filename}` : null
}

export const IMG_SIZES = '(max-width: 720px) 100vw, 34vw'
export const srcSetFor = (base: string) => `${base}@1x.webp 640w, ${base}@2x.webp 1280w`

export function useLocationImage(locationId: string, gameState: GameState): string | null {
  return useMemo(() => imageFor(locationId, gameState),
    [locationId, gameState.world.act, gameState.flags.ritual_complete])
}
