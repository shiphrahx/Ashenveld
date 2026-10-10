import React, { useEffect, useState, useCallback } from 'react'
import type { GameState, Scene, Outcome, JournalEntry } from './types'
import { initLoader, resolveScene, locationName } from './loader'
import {
  createFreshState,
  applyStateChanges,
  applyWhen,
  checkCurse,
  saveGame,
  loadGame,
  hasSave,
  deleteSave,
  recordEnding,
} from './gameState'
import { meets } from './conditions'
import TitleScreen from './components/TitleScreen'
import StarField from './components/StarField'
import GameOver from './components/GameOver'
import EndScreen from './components/EndScreen'
import Journal from './components/Journal'
import Items from './components/Items'
import People from './components/People'
import Menu from './components/Menu'
import Map from './components/Map'
import CharacterCreation, { type CreationResult } from './components/CharacterCreation'
import SceneView from './components/SceneView'
import SceneArt from './components/SceneArt'
import Sidebar from './components/Sidebar'
import styles from './App.module.css'

type AppPhase = 'loading' | 'title' | 'creation' | 'game' | 'ended' | 'gameover' | 'error'

// Keep #root class in sync with phase so CSS can adjust overflow/height
function setRootClass(phase: AppPhase) {
  const root = document.getElementById('root')
  if (!root) return
  root.className = phase === 'game' || phase === 'loading' || phase === 'error' || phase === 'gameover'
    ? 'game'
    : phase === 'creation' || phase === 'ended'
    ? 'creation'
    : 'title'
}

/** Follow route scenes until one that is shown. Route scenes are never rendered. */
async function followRoutes(sceneId: string, state: GameState): Promise<Scene> {
  let scene = await resolveScene(sceneId)
  for (let hops = 0; scene.route && hops < 5; hops++) {
    const hit = scene.route.find(r => meets(r.when, state)) ?? scene.route[scene.route.length - 1]
    scene = await resolveScene(hit.next)
  }
  return scene
}

export default function App() {
  const [phase, setPhase] = useState<AppPhase>('loading')
  const [error, setError] = useState<string | null>(null)
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [currentScene, setCurrentScene] = useState<Scene | null>(null)
  const [saveExists, setSaveExists] = useState(false)
  const [savedEnded, setSavedEnded] = useState(false)
  const [journalOpen, setJournalOpen] = useState(false)
  const [itemsOpen, setItemsOpen] = useState(false)
  const [peopleOpen, setPeopleOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [mapOpen, setMapOpen] = useState(false)
  const [lastOutcome, setLastOutcome] = useState<string>('')

  useEffect(() => { setRootClass(phase) }, [phase])

  const refreshSaveInfo = useCallback(() => {
    setSaveExists(hasSave())
    setSavedEnded(Boolean(loadGame()?.ended))
  }, [])

  // ── Startup ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    initLoader()
      .then(() => {
        refreshSaveInfo()
        setPhase('title')
      })
      .catch(err => {
        setError(String(err))
        setPhase('error')
      })
  }, [refreshSaveInfo])

  // ── Enter: after a choice and for a new game. Applies entry effects once. ─────
  const enterScene = useCallback(async (sceneId: string, state: GameState) => {
    try {
      const scene = await followRoutes(sceneId, state)
      let next: GameState = structuredClone(state)
      next.current_scene = scene.id
      next.visited[scene.id] = (next.visited[scene.id] ?? 0) + 1
      next.world.act = scene.act
      next.world.chapter = scene.chapter
      next.world.current_location = scene.location
      if (scene.when) next = applyWhen(next, scene.when)
      next = applyStateChanges(next, scene.on_enter?.state_changes ?? {})
      next = checkCurse(next)

      if (next.player.resources.health <= 0) {
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

  // ── Resume: Continue and refresh. Applies nothing. ───────────────────────────
  const resumeScene = useCallback(async (saved: GameState) => {
    try {
      const scene = await resolveScene(saved.current_scene)
      setGameState(saved)
      setCurrentScene(scene)
    } catch (err) {
      setError(`Failed to load scene "${saved.current_scene}": ${err}`)
      setPhase('error')
    }
  }, [])

  // ── Title actions ─────────────────────────────────────────────────────────────
  const handleNewGame = useCallback(() => { setPhase('creation') }, [])   // no delete here

  const handleContinue = useCallback(async () => {
    const saved = loadGame()
    if (!saved) { setPhase('creation'); return }
    if (saved.ended) {
      setGameState(saved)
      setLastOutcome(saved.journal[saved.journal.length - 1]?.outcomeText ?? '')
      setPhase('ended')
      return
    }
    setPhase('game')
    await resumeScene(saved)
  }, [resumeScene])

  const handleReturnToTitle = useCallback(() => {
    if (gameState) saveGame(gameState)
    setGameState(null)
    setCurrentScene(null)
    refreshSaveInfo()
    setPhase('title')
  }, [gameState, refreshSaveInfo])

  // ── Creation complete ─────────────────────────────────────────────────────────
  const handleCreationComplete = useCallback(async (result: CreationResult) => {
    deleteSave()                                       // the only place a run is replaced
    const state = createFreshState(
      result.playerName,
      result.gender,
      result.playerClass,
      result.missingPersonName,
      result.missingPersonRelationship,
    )

    setPhase('game')
    await enterScene('act1_ch1_barge_arrival', state)
  }, [enterScene])

  // ── Choice resolved ───────────────────────────────────────────────────────────
  const handleChoice = useCallback(async (outcome: Outcome, entry: JournalEntry, choiceId: string) => {
    if (!gameState || !currentScene) return
    let next = applyStateChanges(gameState, outcome.state_changes)
    next = { ...next, journal: [...(next.journal ?? []), entry], taken: { ...next.taken, [`${currentScene.id}:${choiceId}`]: true } }
    if (!outcome.next_scene) {
      next = { ...next, ended: currentScene.ending ?? { id: currentScene.id, title: currentScene.title } }
      saveGame(next)
      recordEnding(next)
      setGameState(next)
      setLastOutcome(entry.outcomeText)
      setPhase('ended')
      return
    }
    await enterScene(outcome.next_scene, next)
  }, [gameState, currentScene, enterScene])

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
        saveEnded={savedEnded}
        onNewGame={handleNewGame}
        onContinue={handleContinue}
      />
    )
  }

  if (phase === 'creation') {
    return <CharacterCreation onComplete={handleCreationComplete} onBack={handleReturnToTitle} />
  }

  if (phase === 'ended' && gameState) {
    return (
      <EndScreen
        state={gameState}
        closingText={lastOutcome}
        onPlayAgain={() => { setGameState(null); setCurrentScene(null); setPhase('creation') }}
        onTitle={handleReturnToTitle}
      />
    )
  }

  if (phase === 'gameover' && gameState) {
    return (
      <GameOver
        playerName={gameState.player.name}
        onRestart={handleReturnToTitle}
      />
    )
  }

  if (phase === 'game' && gameState && currentScene) {
    return (
      <>
        <StarField />
        <div className={styles.shell}>
          <SceneArt locationName={locationName(currentScene.location)} gameState={gameState} />
          <SceneView scene={currentScene} state={gameState} onChoice={handleChoice} />
          <Sidebar state={gameState} onJournal={() => setJournalOpen(true)} onItems={() => setItemsOpen(true)} onPeople={() => setPeopleOpen(true)} onMenu={() => setMenuOpen(true)} onMap={() => setMapOpen(true)} hideClock={currentScene.when?.hide_clock} />
          {journalOpen && (
            <Journal entries={gameState.journal ?? []} onClose={() => setJournalOpen(false)} />
          )}
          {itemsOpen && (
            <Items inventory={gameState.inventory} onClose={() => setItemsOpen(false)} />
          )}
          {peopleOpen && (
            <People state={gameState} onClose={() => setPeopleOpen(false)} />
          )}
          {mapOpen && (
            <Map state={gameState} onClose={() => setMapOpen(false)} />
          )}
          {menuOpen && (
            <Menu
              state={gameState}
              onClose={() => setMenuOpen(false)}
              onReturnToTitle={() => { setMenuOpen(false); handleReturnToTitle() }}
            />
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
