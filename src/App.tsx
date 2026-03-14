import React, { useEffect, useState, useCallback } from 'react'
import type { GameState, Scene, Outcome, JournalEntry } from './types'
import { initLoader, resolveScene, getActMeta } from './loader'
import {
  createFreshState,
  applyStateChanges,
  advanceTime,
  checkCurse,
  saveGame,
  loadGame,
  hasSave,
  deleteSave,
} from './gameState'
import TitleScreen from './components/TitleScreen'
import StarField from './components/StarField'
import GameOver from './components/GameOver'
import Journal from './components/Journal'
import Items from './components/Items'
import People from './components/People'
import CharacterCreation, { type CreationResult } from './components/CharacterCreation'
import SceneView from './components/SceneView'
import SceneArt from './components/SceneArt'
import Sidebar from './components/Sidebar'
import styles from './App.module.css'

type AppPhase = 'loading' | 'title' | 'creation' | 'game' | 'gameover' | 'error'

// Keep #root class in sync with phase so CSS can adjust overflow/height
function setRootClass(phase: AppPhase) {
  const root = document.getElementById('root')
  if (!root) return
  root.className = phase === 'game' || phase === 'loading' || phase === 'error' || phase === 'gameover'
    ? 'game'
    : phase === 'creation'
    ? 'creation'
    : 'title'
}

export default function App() {
  const [phase, setPhase] = useState<AppPhase>('loading')
  const [error, setError] = useState<string | null>(null)
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [currentScene, setCurrentScene] = useState<Scene | null>(null)
  const [saveExists, setSaveExists] = useState(false)
  const [journalOpen, setJournalOpen] = useState(false)
  const [itemsOpen, setItemsOpen] = useState(false)
  const [peopleOpen, setPeopleOpen] = useState(false)

  useEffect(() => { setRootClass(phase) }, [phase])

  // ── Startup ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    initLoader()
      .then(() => {
        setSaveExists(hasSave())
        setPhase('title')
      })
      .catch(err => {
        setError(String(err))
        setPhase('error')
      })
  }, [])

  // ── Navigate to scene ─────────────────────────────────────────────────────────
  const navigateTo = useCallback(async (sceneId: string, state: GameState) => {
    try {
      const scene = await resolveScene(sceneId)
      let next: GameState = { ...state, current_scene: sceneId }

      if (scene.on_enter.time_advance) {
        next = advanceTime(next, scene.on_enter.time_advance)
      }
      if (scene.on_enter.state_changes) {
        next = applyStateChanges(next, scene.on_enter.state_changes)
      }
      next = { ...next, world: { ...next.world, current_location: scene.location } }
      next = checkCurse(next)

      if (next.player.resources.health <= 0) {
        deleteSave()
        setGameState(next)
        setPhase('gameover')
        return
      }

      setGameState(next)
      setCurrentScene(scene)
      saveGame(next)
    } catch (err) {
      setError(`Failed to load scene "${sceneId}": ${err}`)
      setPhase('error')
    }
  }, [])

  // ── Title actions ─────────────────────────────────────────────────────────────
  const handleNewGame = useCallback(() => {
    deleteSave()
    setSaveExists(false)
    setPhase('creation')
  }, [])

  const handleContinue = useCallback(async () => {
    const saved = loadGame()
    if (!saved) { setPhase('creation'); return }
    setPhase('game')
    await navigateTo(saved.current_scene, saved)
  }, [navigateTo])

  // ── Creation complete ─────────────────────────────────────────────────────────
  const handleCreationComplete = useCallback(async (result: CreationResult) => {
    const state = createFreshState(
      result.playerName,
      result.gender,
      result.playerClass,
      result.missingPersonName,
      result.missingPersonRelationship,
    )

    // Seed initial NPC closeness values from act 1 meta
    try {
      const meta = getActMeta(1)
      for (const [id, npc] of Object.entries(meta.npcs)) {
        if (npc.initial_closeness !== 0) {
          state.relationships[id] = { closeness: npc.initial_closeness }
        }
      }
    } catch { /* meta may not be loaded yet — fine, defaults are 0 */ }

    setPhase('game')
    await navigateTo('act1_ch1_barge_arrival', state)
  }, [navigateTo])

  // ── Game over ─────────────────────────────────────────────────────────────────
  const handleRestart = useCallback(() => {
    deleteSave()
    setSaveExists(false)
    setGameState(null)
    setCurrentScene(null)
    setPhase('title')
  }, [])

  // ── Choice resolved ───────────────────────────────────────────────────────────
  const handleChoice = useCallback(async (outcome: Outcome, entry: JournalEntry) => {
    if (!gameState) return
    let next = applyStateChanges(gameState, outcome.state_changes)
    next = { ...next, journal: [...(next.journal ?? []), entry] }
    if (!outcome.next_scene) return  // ending reached — stay on current scene
    await navigateTo(outcome.next_scene, next)
  }, [gameState, navigateTo])

  // ── Location name ─────────────────────────────────────────────────────────────
  function locationName(): string {
    if (!gameState || !currentScene) return ''
    try {
      const meta = getActMeta(currentScene.act)
      return meta.locations[currentScene.location]?.name ?? currentScene.location
    } catch {
      return currentScene.location
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  if (phase === 'loading') {
    return (
      <div className={styles.loading}>
        <span className={styles.loadingText}>Loading…</span>
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div className={styles.error}>
        <p className={styles.errorText}>{error ?? 'An unknown error occurred.'}</p>
      </div>
    )
  }

  if (phase === 'title') {
    return (
      <TitleScreen
        hasSave={saveExists}
        onNewGame={handleNewGame}
        onContinue={handleContinue}
      />
    )
  }

  if (phase === 'creation') {
    return <CharacterCreation onComplete={handleCreationComplete} />
  }

  if (phase === 'gameover' && gameState) {
    return (
      <GameOver
        playerName={gameState.player.name}
        onRestart={handleRestart}
      />
    )
  }

  if (phase === 'game' && gameState && currentScene) {
    return (
      <>
        <StarField />
        <div className={styles.shell}>
          <SceneArt locationName={locationName()} />
          <SceneView scene={currentScene} state={gameState} onChoice={handleChoice} />
          <Sidebar state={gameState} onJournal={() => setJournalOpen(true)} onItems={() => setItemsOpen(true)} onPeople={() => setPeopleOpen(true)} />
          {journalOpen && (
            <Journal entries={gameState.journal ?? []} onClose={() => setJournalOpen(false)} />
          )}
          {itemsOpen && (
            <Items inventory={gameState.inventory} onClose={() => setItemsOpen(false)} />
          )}
          {peopleOpen && (
            <People state={gameState} onClose={() => setPeopleOpen(false)} />
          )}
        </div>
      </>
    )
  }

  // Phase is 'game' but scene not yet loaded
  return (
    <div className={styles.loading}>
      <span className={styles.loadingText}>Loading scene…</span>
    </div>
  )
}
