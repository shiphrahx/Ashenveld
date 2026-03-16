import { useMemo } from 'react'
import type { GameState } from '../types'
import { imageMap } from '../data/imageMap'

const BASE = import.meta.env.BASE_URL

export function useLocationImage(
  locationId: string,
  gameState: GameState,
): string | null {
  return useMemo(() => {
    let resolvedId = locationId

    if (locationId === 'crestfall_tallow_inn' && gameState.world.act >= 2) {
      resolvedId = 'crestfall_tallow_inn_day'
    } else if (locationId === 'ruins_source_chamber' && gameState.flags.ritual_complete === true) {
      resolvedId = 'ruins_source_chamber_sealed'
    }

    const filename = imageMap[resolvedId]
    if (!filename) return null

    return `${BASE}resources/images/${filename}`
  }, [locationId, gameState.world.act, gameState.flags.ritual_complete])
}
