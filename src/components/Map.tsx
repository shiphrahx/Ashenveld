import React, { useEffect, useMemo, useRef, useState } from 'react'
import { getAllNpcs, getLocation, resolveScene } from '../loader'
import type { GameState } from '../types'
import Panel from './Panel'
import styles from './Map.module.css'

interface Props {
  state: GameState
  onClose: () => void
}

interface LocationNode {
  id: string
  name: string
  x: number
  y: number
  region: 'crestfall' | 'forest' | 'ruins'
  /** Put the label under the dot, so close neighbours never collide. */
  below?: boolean
}

const NODES: LocationNode[] = [
  // ── Crestfall ──────────────────────────────────────
  { id: 'west_road_leaving',      name: 'West Road',       x: 20,  y: 200, region: 'crestfall', below: true },
  { id: 'crestfall_docks',        name: 'Docks',           x: 80,  y: 200, region: 'crestfall' },
  { id: 'childhood_home_area',    name: 'Mill Lane',       x: 120, y: 60,  region: 'crestfall' },
  { id: 'crestfall_tallow_inn',   name: 'Tallow Inn',      x: 160, y: 120, region: 'crestfall', below: true },
  { id: 'crestfall_market',       name: 'Market Square',   x: 240, y: 180, region: 'crestfall', below: true },
  { id: 'crestfall_shrine',       name: 'Covenant Shrine', x: 240, y: 80,  region: 'crestfall' },
  { id: 'crestfall_compact_post', name: 'Compact Post',    x: 160, y: 260, region: 'crestfall', below: true },
  { id: 'crestfall_gate',         name: 'East Gate',       x: 340, y: 200, region: 'crestfall' },
  // ── Forest / East Road ─────────────────────────────
  { id: 'rootless_camp',          name: 'Rootless Camp',   x: 340, y: 310, region: 'forest', below: true },
  { id: 'east_road',              name: 'East Road',       x: 460, y: 200, region: 'forest' },
  { id: 'abandoned_village_harrow', name: 'Harrow',        x: 560, y: 140, region: 'forest' },
  { id: 'forest_edge',            name: 'Deep Forest Edge',x: 580, y: 240, region: 'forest', below: true },
  // ── Ruins ──────────────────────────────────────────
  { id: 'ruins_outskirts',        name: 'Ruins Outskirts', x: 700, y: 200, region: 'ruins' },
  { id: 'ruins_gate',             name: 'Gate Stones',     x: 760, y: 200, region: 'ruins', below: true },
  { id: 'ruins_hidden_passage',   name: 'Hidden Passage',  x: 780, y: 280, region: 'ruins', below: true },
  { id: 'ruins_inner_approach',   name: 'Inner Approach',  x: 850, y: 200, region: 'ruins' },
  { id: 'ruins_source_chamber',   name: 'Source Chamber',  x: 980, y: 200, region: 'ruins', below: true },
]

const CONNECTIONS: Array<[string, string]> = [
  // Crestfall
  ['crestfall_docks', 'west_road_leaving'],
  ['crestfall_docks', 'crestfall_tallow_inn'],
  ['crestfall_docks', 'crestfall_compact_post'],
  ['crestfall_tallow_inn', 'childhood_home_area'],
  ['crestfall_tallow_inn', 'crestfall_market'],
  ['crestfall_tallow_inn', 'crestfall_shrine'],
  ['crestfall_market', 'crestfall_gate'],
  ['crestfall_compact_post', 'crestfall_gate'],
  // Into the forest
  ['crestfall_gate', 'east_road'],
  ['crestfall_gate', 'rootless_camp'],
  ['east_road', 'abandoned_village_harrow'],
  ['east_road', 'forest_edge'],
  // Into the ruins
  ['forest_edge', 'ruins_outskirts'],
  ['ruins_outskirts', 'ruins_gate'],
  ['ruins_gate', 'ruins_inner_approach'],
  ['ruins_outskirts', 'ruins_hidden_passage'],
  ['ruins_hidden_passage', 'ruins_inner_approach'],
  ['ruins_inner_approach', 'ruins_source_chamber'],
]

const REGIONS: Array<[LocationNode['region'], string, number]> = [
  ['crestfall', 'Crestfall', 170], ['forest', 'The Forest', 500], ['ruins', 'The Ruins', 840],
]

/** Places that are drawn as another node. */
const SAME_PLACE: Record<string, string> = { east_road_return: 'east_road' }
const place = (id: string) => SAME_PLACE[id] ?? id

const NODE_R = 6
const byId = new globalThis.Map(NODES.map(n => [n.id, n] as const))

/** Where each scene happened. Scene files load on demand, so this resolves after the panel opens. */
function useSceneLocations(ids: string[]): Record<string, string> {
  const [locs, setLocs] = useState<Record<string, string>>({})
  const key = ids.join('|')
  useEffect(() => {
    let live = true
    Promise.all(ids.map(id => resolveScene(id).then(s => [id, s.location] as const).catch(() => null)))
      .then(rows => { if (live) setLocs(Object.fromEntries(rows.filter((r): r is readonly [string, string] => Boolean(r?.[1])))) })
    return () => { live = false }
  }, [key])
  return locs
}

export default function Map({ state, onClose }: Props) {
  const current = place(state.world.current_location)
  const sceneIds = useMemo(() => Object.keys(state.visited ?? {}), [state.visited])
  const locs = useSceneLocations(sceneIds)

  // U10.1: visited comes from the scenes you entered, not the journal.
  const visited = useMemo(() => {
    const s = new Set<string>([current])
    for (const id of sceneIds) if (locs[id]) s.add(place(locs[id]))
    return s
  }, [sceneIds, locs, current])

  // U10.3: visited in full, their neighbours as unnamed rings, the rest hidden.
  const ring = useMemo(() => {
    const s = new Set<string>()
    for (const [a, b] of CONNECTIONS) {
      if (visited.has(a) && !visited.has(b)) s.add(b)
      if (visited.has(b) && !visited.has(a)) s.add(a)
    }
    return s
  }, [visited])
  const shown = (id: string) => visited.has(id) || ring.has(id)

  // U10.5: your route, in the order the journal has it.
  const route = useMemo(() => {
    const out: LocationNode[] = []
    for (const e of state.journal ?? []) {
      const loc = locs[e.sceneId] ?? e.location
      const n = loc ? byId.get(place(loc)) : undefined
      if (n && out[out.length - 1] !== n) out.push(n)
    }
    return out
  }, [state.journal, locs])

  const [selected, setSelected] = useState<string | null>(null)
  const sel = selected ? byId.get(selected) : undefined
  const selDef = selected ? getLocation(selected) : undefined
  const night = state.world.time_of_day === 'evening' || state.world.time_of_day === 'night'
  const people = selected
    ? Object.entries(getAllNpcs())
        .filter(([id, n]) => state.relationships[id] && place(n.location ?? '') === selected)
        .map(([id, n]) => id === 'the_missing_person' ? (state.player.missing_person.name || n.name) : n.name)
    : []

  // U10.7: on a narrow screen the map pans; open it centred on where you are.
  const scroller = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = scroller.current, here = byId.get(current)
    if (!el || !here || el.scrollWidth <= el.clientWidth) return
    el.scrollLeft = (here.x + 30) / 1060 * el.scrollWidth - el.clientWidth / 2
  }, [current])

  const pick = (id: string) => setSelected(s => s === id ? null : id)

  return (
    <Panel title="Map" onClose={onClose} wide>
      <div className={styles.body}>
        <div className={styles.scroller} ref={scroller}>
          <svg viewBox="-30 0 1060 400" className={styles.svg} preserveAspectRatio="xMidYMid meet" role="group" aria-label="Places you know">
            {REGIONS.filter(([r]) => NODES.some(n => n.region === r && shown(n.id))).map(([r, label, x]) => (
              <text key={r} x={x} y={28} className={styles.regionLabel} textAnchor="middle">{label}</text>
            ))}

            {CONNECTIONS.filter(([a, b]) => shown(a) && shown(b) && (visited.has(a) || visited.has(b))).map(([a, b]) => {
              const p = byId.get(a)!, q = byId.get(b)!
              return <line key={`${a}-${b}`} x1={p.x} y1={p.y} x2={q.x} y2={q.y}
                className={visited.has(a) && visited.has(b) ? styles.edgeVisited : styles.edgeUnvisited} />
            })}

            {route.length > 1 && (
              <polyline points={route.map(n => `${n.x},${n.y}`).join(' ')} className={styles.route} data-route />
            )}

            {NODES.filter(n => shown(n.id)).map(n => {
              const isCurrent = n.id === current
              const isVisited = visited.has(n.id)
              const label = getLocation(n.id)?.name ?? n.name
              return (
                <g key={n.id} className={styles.nodeHit} tabIndex={isVisited ? 0 : -1}
                  role={isVisited ? 'button' : undefined} aria-label={isVisited ? label : undefined}
                  aria-pressed={isVisited ? selected === n.id : undefined}
                  data-node={n.id} data-state={isCurrent ? 'current' : isVisited ? 'visited' : 'ring'}
                  onClick={isVisited ? () => pick(n.id) : undefined}
                  onKeyDown={isVisited ? e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(n.id) } } : undefined}>
                  <circle cx={n.x} cy={n.y} r={18} className={styles.hitArea} />
                  {isCurrent && <circle cx={n.x} cy={n.y} r={NODE_R + 5} className={styles.nodeCurrentPulse} />}
                  <circle cx={n.x} cy={n.y} r={NODE_R}
                    className={isCurrent ? styles.nodeCurrent : isVisited ? `${styles.node} ${styles[`node_${n.region}`]}` : styles.nodeUnvisited} />
                  {isVisited && (
                    <text x={n.x} y={n.below ? n.y + NODE_R + 16 : n.y - NODE_R - 7} textAnchor="middle"
                      className={isCurrent ? styles.labelCurrent : styles.label}>{n.name}</text>
                  )}
                </g>
              )
            })}
          </svg>
        </div>

        {sel && (
          <div className={styles.card} aria-live="polite" data-map-card>
            <div className={styles.cardName}>{selDef?.name ?? sel.name}</div>
            {selDef?.description && <p>{selDef.description}</p>}
            {(night ? selDef?.ambient_night : selDef?.ambient_day) && (
              <p className={styles.cardAmbient}>{night ? selDef?.ambient_night : selDef?.ambient_day}</p>
            )}
            {people.length > 0 && <p className={styles.cardPeople}>{people.join(', ')}</p>}
          </div>
        )}

        <div className={styles.legend}>
          <span className={styles.legendItem}>
            <svg width="10" height="10"><circle cx="5" cy="5" r="4" className={styles.nodeCurrent} /></svg>
            You are here
          </span>
          <span className={styles.legendItem}>
            <svg width="10" height="10"><circle cx="5" cy="5" r="4" className={`${styles.node} ${styles.node_crestfall}`} /></svg>
            Been there
          </span>
          <span className={styles.legendItem}>
            <svg width="10" height="10"><circle cx="5" cy="5" r="4" className={styles.nodeUnvisited} /></svg>
            Not yet
          </span>
          <span className={styles.legendHint}>Choose a place to read about it.</span>
        </div>
      </div>
    </Panel>
  )
}
