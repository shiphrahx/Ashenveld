import React, { useEffect, useState, useCallback, useRef } from 'react'
import type { GameState, Scene, Outcome, JournalEntry } from './types'
import { initLoader, resolveScene, locationName, peekScene, getMasterIndex, getLocation, getChapterOf } from './loader'
import ActCard from './components/ActCard'
import { imageFor, srcSetFor, IMG_SIZES } from './hooks/useLocationImage'
import LoadingScreen from './components/LoadingScreen'
import ErrorScreen from './components/ErrorScreen'
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
  recordCheckpoint,
  chapterCheckpoint,
  clearCheckpoints,
  loadMeta,
  markSeen,
} from './gameState'
import { meets } from './conditions'
import { resolveRich, CLASS_LABELS } from './text'
import TitleScreen from './components/TitleScreen'
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
import Credits from './components/Credits'
import { useHotkeys } from './hooks/useHotkeys'
import Toasts, { type Toast } from './components/Toasts'
import { useSettings, motionAllowed } from './settings'
import { unlock, replay, setScene, setVolume, setMuted, setAmbience, duck, hold, release, fadeOut, resetMix } from './audio/engine'
import { playCue } from './audio/cues'
import styles from './App.module.css'

type AppPhase = 'loading' | 'title' | 'creation' | 'game' | 'ended' | 'error'

/** E9 'touch': grey over 600ms, hold 3s, back over 1s. */
const TOUCH_MS = 4600
/** E9 'ritual': the warm glow at the art's focal point grows with each scene, and goes after the seal. */
const RITUAL_GLOW: Record<string, number> = { act2_ch6_ritual_approach: 1, act2_ch6_ritual_engagement: 2, act2_ch6_ritual_sealing: 3 }

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
  const [saveSummary, setSaveSummary] = useState<string | undefined>()
  const [panel, setPanel] = useState<PanelId | null>(null)
  const [seenBefore, setSeenBefore] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [flash, setFlash] = useState<string[]>([])
  const toastId = useRef(0)
  const { settings } = useSettings()
  const toastsOn = useRef(settings.toasts)
  const motionOn = useRef(motionAllowed(settings))
  motionOn.current = motionAllowed(settings)

  // ── E6: act cards, chapter titles, the story fading round a change of place ──
  const [actCard, setActCard] = useState<{ act: number; title: string } | null>(null)
  const [chapterNote, setChapterNote] = useState<{ title: string; key: number } | null>(null)
  const [storyFade, setStoryFade] = useState<'out' | 'in' | null>(null)

  // ── E9: staged scenes ────────────────────────────────────────────────────────
  const [engaged, setEngaged] = useState(false)          // a choice has been made in this scene
  const [hoverStat, setHoverStat] = useState<string | null>(null)
  const [frozenArt, setFrozenArt] = useState(false)      // 'stopped': everything that moves holds still
  const [touching, setTouching] = useState(false)        // 'touch': the shell greys and comes back
  const [closing, setClosing] = useState(false)          // the last fade before the end screen
  const effectsOn = useRef(settings.screenEffects && motionAllowed(settings))
  effectsOn.current = settings.screenEffects && motionAllowed(settings)
  const stage = currentScene?.stage
  const stageScene = currentScene ? `${currentScene.id}:${gameState?.visited[currentScene.id] ?? 0}` : ''
  useEffect(() => {
    if (!stageScene) return
    setEngaged(false)
    setHoverStat(null)
    if (stage === 'stopped') {
      setFrozenArt(true)
      const t = setTimeout(() => setFrozenArt(false), 2000)
      return () => clearTimeout(t)
    }
    if (stage === 'touch' && effectsOn.current) {
      setTouching(true)
      const t = setTimeout(() => setTouching(false), TOUCH_MS)
      return () => clearTimeout(t)
    }
    if (stage === 'ending') fadeOut(5)
    if (stageScene.startsWith('act2_ch1_missing_person_approach:')) duck(0, 3000, 1)
  }, [stageScene])
  // Quiet scenes: the bed sits at half until you choose.
  useEffect(() => {
    if (stage === 'quiet' && !engaged) hold(0.5)
    else release()
  }, [stage, engaged, stageScene])
  useEffect(() => {
    if (!chapterNote) return
    const t = setTimeout(() => setChapterNote(null), 3000)
    return () => clearTimeout(t)
  }, [chapterNote])
  useEffect(() => {
    if (storyFade !== 'in') return
    const t = setTimeout(() => setStoryFade(null), 300)
    return () => clearTimeout(t)
  }, [storyFade])

  // ── B22: warm the cache for wherever the visible choices lead ─────────────────
  useEffect(() => {
    if (!currentScene || !gameState || phase !== 'game') return
    const targets = new Set<string>()
    for (const c of currentScene.choices ?? []) {
      if (!meets(c.requires, gameState)) continue
      for (const o of Object.values(c.outcomes ?? {})) if (o?.next_scene && o.next_scene !== '@return') targets.add(o.next_scene)
    }
    const seen = new Set<string>()
    for (const id of targets) {
      resolveScene(id).then(s => {
        const base = imageFor(s.location, gameState)
        if (!base || seen.has(base)) return
        seen.add(base)
        const img = new Image()
        img.sizes = IMG_SIZES
        img.srcset = srcSetFor(base)
      }).catch(() => { /* a missing scene shows up when it's entered */ })
    }
  // Once per scene entry.
  }, [currentScene?.id, phase])

  // ── Sound (E3) ────────────────────────────────────────────────────────────────
  useEffect(() => { setVolume(settings.volume) }, [settings.volume])
  useEffect(() => { setMuted(settings.muted) }, [settings.muted])
  useEffect(() => { setAmbience(settings.ambience) }, [settings.ambience])
  const soundKey = gameState && phase === 'game'
    ? [gameState.world.current_location, gameState.world.curse_spread, gameState.flags.ritual_complete, gameState.flags.ritual_partial, gameState.player.class].join('|')
    : ''
  useEffect(() => {
    if (!gameState || phase !== 'game') return
    const loc = gameState.world.current_location
    const bed = getLocation(loc)?.ambience ?? 'town'
    const seal = gameState.flags.ritual_complete ? 'full' : gameState.flags.ritual_partial ? 'partial' : null
    const homeward = loc === 'east_road_return' || loc === 'west_road_leaving'
    const birds = homeward || ((bed === 'road' || bed === 'town') && seal) ? (seal === 'partial' ? 0.5 : 1) : 0
    setScene({ bed, dimming: gameState.world.curse_spread, arcane: gameState.player.class === 'arcane', seal, birds })
  }, [soundKey])
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
    const saved = loadGame()
    setSavedEnded(Boolean(saved?.ended))
    setSaveSummary(saved ? `${saved.player.name} · ${CLASS_LABELS[saved.player.class] ?? ''} · ${saved.ended ? saved.ended.title : `Act ${['', 'I', 'II', 'III'][saved.world.act] ?? saved.world.act}, Day ${saved.world.day}`}` : undefined)
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

      const story = !scene.id.endsWith('_collapse')
      const newAct = story && (scene.act > state.world.act || Object.keys(state.visited).length === 0)
      const newChapter = story && (scene.chapter !== state.world.chapter || scene.act !== state.world.act)
      const moved = scene.location !== state.world.current_location && Object.keys(state.visited).length > 0
      if (moved && !newAct && motionOn.current) {
        setStoryFade('out')
        await new Promise(r => setTimeout(r, 200))
      }

      recordCheckpoint(state, next)
      if (newAct) setActCard({ act: scene.act, title: getMasterIndex().act_summaries?.[String(scene.act)]?.title ?? '' })
      if (newChapter) {
        const title = getChapterOf(scene.id)?.title
        if (title) setChapterNote({ title, key: Date.now() })
      }
      if (moved) setStoryFade(motionOn.current ? 'in' : null)
      setSeenBefore(loadMeta().seenScenes.includes(scene.id))
      markSeen(scene.id)
      setGameState(next)
      setCurrentScene(scene)
      saveGame(next)
      playCue(scene.cue)
    } catch (err) {
      setError(`Failed to load scene "${sceneId}": ${err}`)
      setPhase('error')
    }
  }, [])

  // ── Resume: Continue and refresh. Applies nothing. ───────────────────────────
  const resumeScene = useCallback(async (saved: GameState) => {
    try {
      const scene = await resolveScene(saved.current_scene)
      setSeenBefore(false)
      setGameState(saved)
      setCurrentScene(scene)
    } catch (err) {
      setError(`Failed to load scene "${saved.current_scene}": ${err}`)
      setPhase('error')
    }
  }, [])

  // ── Title actions ─────────────────────────────────────────────────────────────
  // The first click on Begin or Continue is what lets sound start (E3).
  const handleNewGame = useCallback(() => { unlock(); resetMix(); replay(); setPhase('creation') }, [])   // no delete here

  const handleContinue = useCallback(async () => {
    unlock(); resetMix(); replay()
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
    clearCheckpoints()
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
      // E9: the story fades to the end screen over two seconds, with one soft tone.
      playCue('end')
      if (motionOn.current) {
        setClosing(true)
        await new Promise(r => setTimeout(r, 2000))
        setClosing(false)
      }
      setPhase('ended')
      return
    }
    await enterScene(target, next)
  }, [gameState, currentScene, enterScene])

  const closePanel = useCallback(() => setPanel(null), [])

  // G13: back to the state saved when this chapter began.
  const restartChapter = useCallback(async () => {
    if (!gameState) return
    const cp = chapterCheckpoint(gameState)
    if (!cp) return
    setPanel(null)
    saveGame(cp)
    await resumeScene(cp)
  }, [gameState, resumeScene])

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

  if (phase === 'loading') return <LoadingScreen />

  if (phase === 'error') {
    return <ErrorScreen error={error ?? 'Unknown error'} onRetry={() => location.reload()}
      onTitle={() => { try { getMasterIndex(); setError(null); handleReturnToTitle() } catch { location.reload() } }} />
  }

  if (phase === 'title') {
    return (
      <TitleScreen
        hasSave={saveExists}
        saveEnded={savedEnded}
        saveSummary={saveSummary}
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

  if (phase === 'game' && gameState && currentScene && actCard) {
    return (
      <>
        <div className={styles.backdrop} aria-hidden="true" />
        <ActCard act={actCard.act} title={actCard.title} onContinue={() => setActCard(null)} />
      </>
    )
  }

  if (phase === 'game' && gameState && currentScene) {
    const hideClock = (currentScene.when?.hide_clock ?? false) || stage === 'ending'
    // E4: the curse greys the art and closes in from the edges. Story text never changes.
    const dimRaw = Math.min(1, gameState.world.curse_spread / 100)
    const dim = !settings.screenEffects ? 0 : gameState.flags.ritual_partial ? Math.max(0.3, dimRaw) : dimRaw
    const deep = settings.screenEffects && getLocation(gameState.world.current_location)?.region === 'deep_forest' ? 1 : 0
    const shellVars = {
      '--dim': String(dim),
      '--deep': String(deep),
      // After the seal, colour comes back slowly.
      '--dim-time': currentScene.id === 'act2_ch6_aftermath' ? '4s' : '2s',
    } as React.CSSProperties
    return (
      <>
        <div className={styles.backdrop} aria-hidden="true" />
        <div className={[
            styles.shell,
            (stage === 'quiet' || stage === 'reunion') && !engaged ? styles.stageQuiet : '',
            stage === 'ritual' ? styles.stageRitual : '',
            touching ? styles.touching : '',
            closing ? styles.closing : '',
          ].join(' ')} style={shellVars} data-dim={dim.toFixed(2)} data-stage={stage}
          inert={closing} data-leaving={closing ? '' : undefined}>
          <div className={styles.areaArt}>
            <SceneArt locationName={locationName(gameState.world.current_location)} gameState={gameState}
              alt={getLocation(gameState.world.current_location)?.description ?? locationName(gameState.world.current_location)}
              frozen={frozenArt} glow={settings.screenEffects && motionAllowed(settings) ? RITUAL_GLOW[currentScene.id] ?? 0 : 0} />
          </div>
          <header className={styles.areaStatus}>
            <StatusStrip state={gameState} hideClock={hideClock} onOpen={() => openPanel('status')} />
          </header>
          <main className={`${styles.areaStory} ${storyFade === 'out' ? styles.storyOut : storyFade === 'in' ? styles.storyIn : ''}`}
            inert={storyFade === 'out'} data-leaving={storyFade === 'out' ? '' : undefined}>
            <SceneView scene={currentScene} state={gameState} onChoice={handleChoice} seenBefore={seenBefore} chapterNote={chapterNote}
              onEngage={() => setEngaged(true)} holdChoicesMs={touching ? TOUCH_MS : 0} onHoverStat={setHoverStat} />
          </main>
          <div className={styles.areaSide}>
            <Sidebar state={gameState} onOpen={openPanel} hideClock={hideClock} journalDot={journalDot} flash={flash} highlightStat={hoverStat} rest={rest} onRest={onRestPressed} dimmingDelta={dimmingDelta} />
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
              onCredits={() => setPanel('credits')}
              onImport={imported => { saveGame(imported); clearCheckpoints(); closePanel(); void handleContinue() }}
              onRestartChapter={chapterCheckpoint(gameState) ? restartChapter : undefined}
            />
          )}
          {panel === 'settings' && <Settings onClose={closePanel} />}
          {panel === 'keys' && <KeysHelp onClose={closePanel} />}
          {panel === 'credits' && <Credits onClose={closePanel} />}
          {panel === 'rest' && <RestConfirm cost={rest.cost} onRest={handleRest} onClose={closePanel} />}
          <Toasts toasts={toasts} onDone={dropToast} />
        </div>
      </>
    )
  }

  // Phase is 'game' but scene not yet loaded
  return <LoadingScreen />
}
