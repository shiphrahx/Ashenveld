import React, { useEffect, useState, useCallback, useRef } from 'react'
import type { GameState, Scene, Outcome, JournalEntry } from './types'
import { initLoader, resolveScene, locationName, peekScene } from './loader'
import { DIMMING, REST, restOption, type RestOption } from './rules'
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
  diffState,
} from './gameState'
import { meets } from './conditions'
import { resolveRich } from './text'
import TitleScreen from './components/TitleScreen'
import StarField from './components/StarField'
import RestConfirm from './components/RestConfirm'
import EndScreen from './components/EndScreen'
import Journal, { journalKeys } from './components/Journal'
import Items from './components/Items'
import People from './components/People'
import Menu from './components/Menu'
import Map from './components/Map'
import CharacterCreation, { type CreationResult } from './components/CharacterCreation'
import SceneView from './components/SceneView'
import SceneArt from './components/SceneArt'
import Sidebar from './components/Sidebar'
import StatusStrip from './components/StatusStrip'
import TabBar, { type PanelId } from './components/TabBar'
import Panel from './components/Panel'
import Settings from './components/Settings'
import KeysHelp from './components/KeysHelp'
import { useHotkeys } from './hooks/useHotkeys'
import Toasts, { type Toast } from './components/Toasts'
import { useSettings } from './settings'
import styles from './App.module.css'

type AppPhase = 'loading' | 'title' | 'creation' | 'game' | 'ended' | 'error'

/** Where you wake if you collapse before you have rested anywhere. */
function defaultRestLocation(act: number): string {
  return act === 2 ? 'ruins_outskirts' : 'crestfall_tallow_inn'
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
  const [panel, setPanel] = useState<PanelId | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [flash, setFlash] = useState<string[]>([])
  const toastId = useRef(0)
  const { settings } = useSettings()
  const toastsOn = useRef(settings.toasts)
  toastsOn.current = settings.toasts
  const dropToast = useCallback((id: number) => setToasts(t => t.filter(x => x.id !== id)), [])

  // U7: the bar that moved gets a short highlight.
  const prevState = useRef<GameState | null>(null)
  useEffect(() => {
    const a = prevState.current, b = gameState
    prevState.current = gameState
    if (!a || !b) return
    const keys: string[] = []
    if (a.player.resources.health !== b.player.resources.health) keys.push('health')
    if (a.player.resources.gold !== b.player.resources.gold) keys.push('gold')
    if (a.world.curse_spread !== b.world.curse_spread) keys.push('dimming')
    for (const f of Object.keys(b.factions) as Array<keyof GameState['factions']>)
      if (a.factions[f].reputation !== b.factions[f].reputation) keys.push(f)
    if (!keys.length) return
    setFlash(keys)
    const t = setTimeout(() => setFlash([]), 700)
    return () => clearTimeout(t)
  }, [gameState])
  const [lastOutcome, setLastOutcome] = useState<string>('')

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
      // G6: requires is checked but never blocks. A failure here is a routing mistake, and the e2e test fails on it.
      if (!meets(scene.requires, state))
        console.error(`Scene "${scene.id}" entered without meeting its requires: ${JSON.stringify(scene.requires)}`)
      let next: GameState = structuredClone(state)
      next.current_scene = scene.id
      next.visited[scene.id] = (next.visited[scene.id] ?? 0) + 1
      // A collapse is outside the story's chapters; it keeps the act and chapter you were in.
      if (!scene.id.endsWith('_collapse')) {
        next.world.act = scene.act
        next.world.chapter = scene.chapter
      }
      next.world.current_location = scene.location
      if (scene.when) next = applyWhen(next, scene.when)
      const beforeEntry = next
      next = applyStateChanges(next, scene.on_enter?.state_changes ?? {})
      // After a partial seal the Dimming creeps back, one step a scene (G8).
      if (scene.act === 3 && next.flags.ritual_partial) next = applyStateChanges(next, { world: { curse_spread: DIMMING.partialCreep } })
      // A collapse wakes you where you last rested, with some Resolve back (G9).
      if (scene.id.endsWith('_collapse')) {
        const rested = next.last_rest_scene ? peekScene(next.last_rest_scene) : undefined
        next.world.current_location = rested?.location ?? defaultRestLocation(scene.act)
        next.player.resources.health = REST.collapseResolve
      }
      // Entering a scene never knocks you down on its own. Outcomes can.
      next.player.resources.health = Math.max(1, next.player.resources.health)
      next = checkCurse(next)
      // U7: entry changes have no outcome to sit under, so they show as toasts.
      if (toastsOn.current) {
        const lines = diffState(beforeEntry, next, journalKeys).map(c => c.text)
        if (lines.length) setToasts(t => [...t, ...lines.map(text => ({ id: ++toastId.current, text }))].slice(-3))
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
      setLastOutcome(saved.ended.text ?? '')
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
    let target = outcome.next_scene
    if (target === '@return') target = next.collapse_return ?? null
    // Resolve at zero: no game over. You collapse, and wake where you last rested (G9).
    if (next.player.resources.health <= 0 && target) {
      next = { ...next, collapse_return: target }
      await enterScene(`act${currentScene.act}_collapse`, next)
      return
    }
    if (!target) {
      const ending = currentScene.ending ?? { id: currentScene.id, title: currentScene.title }
      next = { ...next, ended: { ...ending, text: resolveRich(outcome.text, next) } }
      saveGame(next)
      recordEnding(next)
      setGameState(next)
      setLastOutcome(resolveRich(outcome.text, next))
      setPhase('ended')
      return
    }
    await enterScene(target, next)
  }, [gameState, currentScene, enterScene])

  const closePanel = useCallback(() => setPanel(null), [])

  // Opening the journal marks everything in it as seen.
  const openPanel = useCallback((id: PanelId) => {
    if (id === 'journal' && gameState) {
      const next = { ...gameState, journal_seen: journalKeys(gameState) }
      setGameState(next)
      saveGame(next)
    }
    setPanel(id)
  }, [gameState])
  useHotkeys({ enabled: phase === 'game' && Boolean(currentScene), panelOpen: panel !== null, openPanel })
  // ── Rest (G9) ─────────────────────────────────────────────────────────────────
  const rest: RestOption = gameState && currentScene ? restOption(currentScene, gameState) : { mode: null }
  const handleRest = useCallback(() => {
    if (!gameState || !currentScene) return
    const opt = restOption(currentScene, gameState)
    if (opt.mode === 'eat') {
      const next = applyStateChanges(gameState, { resources: { health: REST.provisions }, inventory_remove: ['rootless_provisions'] })
      setGameState(next); saveGame(next)
      return
    }
    if (opt.mode !== 'rest') return
    let next = applyStateChanges(gameState, { resources: { health: REST.resolve, gold: -(opt.cost ?? 0) } })
    const day = next.world.day + (next.world.time_of_day === 'dawn' ? 0 : 1)
    next = applyWhen(next, { part: 'morning', day })
    if (next.world.act <= 2) next = applyStateChanges(next, { world: { curse_spread: REST.dimming } })
    next = { ...next, last_rest_scene: currentScene.id, flags: { ...next.flags, last_rest_place: opt.place! } }
    next = checkCurse(next)
    setGameState(next); saveGame(next); setPanel(null)
  }, [gameState, currentScene])
  const onRestPressed = useCallback(() => {
    if (rest.mode === 'eat') handleRest()
    else if (rest.mode === 'rest') setPanel('rest')
  }, [rest.mode, handleRest])

  // The Dimming's last move, for the Arcane's exact reading.
  const [dimmingDelta, setDimmingDelta] = useState(0)
  const prevCurse = useRef<number | null>(null)
  useEffect(() => {
    const c = gameState?.world.curse_spread
    if (c === undefined) return
    if (prevCurse.current !== null && c !== prevCurse.current) setDimmingDelta(c - prevCurse.current)
    prevCurse.current = c
  }, [gameState?.world.curse_spread])

  const journalDot = gameState ? journalKeys(gameState).some(k => !(gameState.journal_seen ?? []).includes(k)) : false

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

  if (phase === 'game' && gameState && currentScene) {
    const hideClock = currentScene.when?.hide_clock ?? false
    return (
      <>
        <StarField />
        <div className={styles.shell}>
          <div className={styles.areaArt}>
            <SceneArt locationName={locationName(gameState.world.current_location)} gameState={gameState} />
          </div>
          <header className={styles.areaStatus}>
            <StatusStrip state={gameState} hideClock={hideClock} onOpen={() => openPanel('status')} />
          </header>
          <main className={styles.areaStory}>
            <SceneView scene={currentScene} state={gameState} onChoice={handleChoice} />
          </main>
          <div className={styles.areaSide}>
            <Sidebar state={gameState} onOpen={openPanel} hideClock={hideClock} journalDot={journalDot} flash={flash} rest={rest} onRest={onRestPressed} dimmingDelta={dimmingDelta} />
          </div>
          <div className={styles.areaTabs}>
            <TabBar onOpen={openPanel} journalDot={journalDot} />
          </div>
          {panel === 'journal' && <Journal state={gameState} scene={currentScene} onClose={closePanel} />}
          {panel === 'items' && <Items inventory={gameState.inventory} onClose={closePanel} />}
          {panel === 'people' && <People state={gameState} onClose={closePanel} />}
          {panel === 'map' && <Map state={gameState} onClose={closePanel} />}
          {panel === 'status' && (
            <Panel title="Status" onClose={closePanel}>
              <Sidebar state={gameState} onOpen={openPanel} hideClock={hideClock} variant="sheet" rest={rest} onRest={onRestPressed} dimmingDelta={dimmingDelta} />
            </Panel>
          )}
          {panel === 'menu' && (
            <Menu
              state={gameState}
              onClose={closePanel}
              onReturnToTitle={() => { closePanel(); handleReturnToTitle() }}
              onSettings={() => setPanel('settings')}
            />
          )}
          {panel === 'settings' && <Settings onClose={closePanel} />}
          {panel === 'keys' && <KeysHelp onClose={closePanel} />}
          {panel === 'rest' && <RestConfirm cost={rest.cost} onRest={handleRest} onClose={closePanel} />}
          <Toasts toasts={toasts} onDone={dropToast} />
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
