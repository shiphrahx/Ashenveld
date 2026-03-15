import React from 'react'
import type { GameState, JournalEntry } from '../types'
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
}

interface Connection {
  from: string
  to: string
}

const NODES: LocationNode[] = [
  // ── Crestfall ──────────────────────────────────────
  { id: 'crestfall_docks',        name: 'Docks',           x: 80,  y: 200, region: 'crestfall' },
  { id: 'crestfall_tallow_inn',   name: 'Tallow Inn',      x: 160, y: 120, region: 'crestfall' },
  { id: 'crestfall_market',       name: 'Market Square',   x: 240, y: 180, region: 'crestfall' },
  { id: 'crestfall_shrine',       name: 'Covenant Shrine', x: 240, y: 80,  region: 'crestfall' },
  { id: 'crestfall_compact_post', name: 'Compact Post',    x: 160, y: 260, region: 'crestfall' },
  { id: 'crestfall_gate',         name: 'East Gate',       x: 340, y: 200, region: 'crestfall' },
  // ── Forest / East Road ─────────────────────────────
  { id: 'rootless_camp',          name: 'Rootless Camp',   x: 340, y: 310, region: 'forest' },
  { id: 'east_road',              name: 'East Road',       x: 460, y: 200, region: 'forest' },
  { id: 'abandoned_village_harrow', name: 'Harrow',        x: 560, y: 140, region: 'forest' },
  { id: 'forest_edge',            name: 'Deep Forest Edge',x: 580, y: 240, region: 'forest' },
  // ── Ruins ──────────────────────────────────────────
  { id: 'ruins_outskirts',        name: 'Ruins Outskirts', x: 700, y: 200, region: 'ruins' },
  { id: 'ruins_marker_line',      name: 'Marker Line',     x: 780, y: 150, region: 'ruins' },
  { id: 'ruins_hidden_passage',   name: 'Hidden Passage',  x: 780, y: 260, region: 'ruins' },
  { id: 'ruins_inner_approach',   name: 'Inner Approach',  x: 880, y: 200, region: 'ruins' },
  { id: 'ruins_source_chamber',   name: 'Source Chamber',  x: 960, y: 200, region: 'ruins' },
]

const CONNECTIONS: Connection[] = [
  // Crestfall internal
  { from: 'crestfall_docks',        to: 'crestfall_tallow_inn' },
  { from: 'crestfall_docks',        to: 'crestfall_compact_post' },
  { from: 'crestfall_tallow_inn',   to: 'crestfall_market' },
  { from: 'crestfall_tallow_inn',   to: 'crestfall_shrine' },
  { from: 'crestfall_market',       to: 'crestfall_gate' },
  { from: 'crestfall_compact_post', to: 'crestfall_gate' },
  // Into forest
  { from: 'crestfall_gate',         to: 'east_road' },
  { from: 'crestfall_gate',         to: 'rootless_camp' },
  { from: 'east_road',              to: 'abandoned_village_harrow' },
  { from: 'east_road',              to: 'forest_edge' },
  // Into ruins
  { from: 'forest_edge',            to: 'ruins_outskirts' },
  { from: 'ruins_outskirts',        to: 'ruins_marker_line' },
  { from: 'ruins_outskirts',        to: 'ruins_hidden_passage' },
  { from: 'ruins_marker_line',      to: 'ruins_inner_approach' },
  { from: 'ruins_hidden_passage',   to: 'ruins_inner_approach' },
  { from: 'ruins_inner_approach',   to: 'ruins_source_chamber' },
]

const NODE_R = 6
const SVG_W = 1060
const SVG_H = 400

function getVisited(journal: JournalEntry[]): Set<string> {
  const s = new Set<string>()
  for (const e of journal ?? []) {
    if (e.location) s.add(e.location)
  }
  return s
}

function nodeById(id: string): LocationNode | undefined {
  return NODES.find(n => n.id === id)
}

export default function Map({ state, onClose }: Props) {
  const visited = getVisited(state.journal ?? [])
  const current = state.world.current_location

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.title}>Map</span>
          <button className={styles.close} onClick={onClose}>✕</button>
        </div>

        <div className={styles.body}>
          {/* Region labels */}
          <div className={styles.regionLabels}>
            <span className={styles.regionLabel} style={{ left: '7%' }}>Crestfall</span>
            <span className={styles.regionLabel} style={{ left: '41%' }}>The Forest</span>
            <span className={styles.regionLabel} style={{ left: '68%' }}>The Ruins</span>
          </div>

          <svg
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            className={styles.svg}
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Region dividers */}
            <line x1="390" y1="20" x2="390" y2={SVG_H - 20} className={styles.divider} />
            <line x1="655" y1="20" x2="655" y2={SVG_H - 20} className={styles.divider} />

            {/* Connections */}
            {CONNECTIONS.map(c => {
              const a = nodeById(c.from)
              const b = nodeById(c.to)
              if (!a || !b) return null
              const active = visited.has(c.from) && visited.has(c.to)
              return (
                <line
                  key={`${c.from}-${c.to}`}
                  x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                  className={active ? styles.edgeVisited : styles.edgeUnvisited}
                />
              )
            })}

            {/* Nodes */}
            {NODES.map(n => {
              const isCurrent = n.id === current
              const isVisited = visited.has(n.id)
              const nodeClass = isCurrent
                ? styles.nodeCurrent
                : isVisited
                ? `${styles.node} ${styles[`node_${n.region}`]}`
                : styles.nodeUnvisited

              return (
                <g key={n.id}>
                  {isCurrent && (
                    <circle cx={n.x} cy={n.y} r={NODE_R + 5} className={styles.nodeCurrentPulse} />
                  )}
                  <circle cx={n.x} cy={n.y} r={NODE_R} className={nodeClass} />
                  <text
                    x={n.x}
                    y={n.y - NODE_R - 5}
                    className={isCurrent ? styles.labelCurrent : isVisited ? styles.label : styles.labelUnvisited}
                    textAnchor="middle"
                  >
                    {n.name}
                  </text>
                </g>
              )
            })}
          </svg>

          {/* Legend */}
          <div className={styles.legend}>
            <span className={styles.legendItem}>
              <svg width="10" height="10"><circle cx="5" cy="5" r="4" className={styles.node} /></svg>
              Visited
            </span>
            <span className={styles.legendItem}>
              <svg width="10" height="10"><circle cx="5" cy="5" r="4" className={styles.nodeUnvisited} /></svg>
              Unvisited
            </span>
            <span className={styles.legendItem}>
              <svg width="10" height="10"><circle cx="5" cy="5" r="4" className={styles.nodeCurrent} /></svg>
              Current location
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
