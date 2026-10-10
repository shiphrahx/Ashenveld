import React, { useEffect, useRef } from 'react'
import type { LocationDef } from '../types'
import styles from './Atmosphere.module.css'

type Kind = NonNullable<LocationDef['atmosphere']>

interface Props {
  kind: Kind
  /** The Dimming, 0–100. At 75 or more the fires are lower. */
  dimming: number
  /** Motion off: draw one frame and stop. */
  moving: boolean
  /** E9 'stopped': hold everything still. */
  frozen?: boolean
}

interface Mote { x: number; y: number; vx: number; vy: number; r: number; a: number; life: number; age: number; phase: number }

/** Particles at a 700×400 art panel. The count scales with area and never passes 40. */
const BASE: Record<Kind, number> = { mist: 5, embers: 14, ash: 30, motes: 20, none: 0 }
const FRAME_MS = 1000 / 30

const rand = (a: number, b: number) => a + Math.random() * (b - a)

function spawn(kind: Kind, w: number, h: number, fresh: boolean): Mote {
  switch (kind) {
    case 'mist': {
      const r = rand(0.25, 0.45) * w
      return { x: rand(-r, w + r), y: rand(h * 0.2, h * 0.95), vx: rand(4, 8) * (Math.random() < 0.5 ? -1 : 1), vy: 0, r, a: rand(0.04, 0.08), life: Infinity, age: 0, phase: 0 }
    }
    case 'embers':
      return { x: rand(w * 0.1, w * 0.9), y: fresh ? rand(h * 0.4, h) : rand(h * 0.67, h), vx: rand(-3, 3), vy: -rand(10, 25), r: rand(0.8, 1.8), a: rand(0.5, 0.9), life: rand(3, 7), age: fresh ? rand(0, 3) : 0, phase: rand(0, 6.28) }
    case 'ash':
      return { x: rand(0, w), y: fresh ? rand(0, h) : -4, vx: 0, vy: rand(6, 14), r: rand(0.7, 1.6), a: rand(0.25, 0.55), life: Infinity, age: 0, phase: rand(0, 6.28) }
    case 'motes':
      return { x: rand(0, w), y: rand(0, h), vx: rand(-4, 4), vy: rand(-4, 4), r: rand(0.6, 1.4), a: rand(0.25, 0.6), life: Infinity, age: 0, phase: rand(0, 6.28) }
    default:
      return { x: 0, y: 0, vx: 0, vy: 0, r: 0, a: 0, life: 0, age: 0, phase: 0 }
  }
}

function step(kind: Kind, m: Mote, dt: number, w: number, h: number): Mote {
  m.age += dt
  m.phase += dt
  if (kind === 'mist') {
    m.x += m.vx * dt
    if (m.x - m.r > w) m.x = -m.r
    if (m.x + m.r < 0) m.x = w + m.r
  } else if (kind === 'embers') {
    m.x += (m.vx + Math.sin(m.phase * 1.7) * 4) * dt
    m.y += m.vy * dt
    if (m.age > m.life || m.y < -4) return spawn(kind, w, h, false)
  } else if (kind === 'ash') {
    m.x += Math.sin(m.phase * 0.8) * 6 * dt
    m.y += m.vy * dt
    if (m.y > h + 4) return spawn(kind, w, h, false)
  } else if (kind === 'motes') {
    m.vx += rand(-1, 1) * dt * 2; m.vy += rand(-1, 1) * dt * 2
    m.vx = Math.max(-5, Math.min(5, m.vx)); m.vy = Math.max(-5, Math.min(5, m.vy))
    m.x = (m.x + m.vx * dt + w) % w
    m.y = (m.y + m.vy * dt + h) % h
  }
  return m
}

function draw(kind: Kind, g: CanvasRenderingContext2D, ms: Mote[], w: number, h: number) {
  g.clearRect(0, 0, w, h)
  for (const m of ms) {
    if (kind === 'mist') {
      const grad = g.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r)
      grad.addColorStop(0, `rgba(200, 212, 228, ${m.a})`)
      grad.addColorStop(1, 'rgba(200, 212, 228, 0)')
      g.fillStyle = grad
      g.fillRect(m.x - m.r, m.y - m.r, m.r * 2, m.r * 2)
      continue
    }
    let a = m.a
    let colour = '220, 230, 255'
    if (kind === 'embers') { colour = '255, 168, 92'; a *= Math.max(0, 1 - m.age / m.life) }
    if (kind === 'ash') colour = '176, 178, 184'
    if (kind === 'motes') a *= 0.7 + 0.3 * Math.sin(m.phase)
    g.fillStyle = `rgba(${colour}, ${a})`
    g.beginPath(); g.arc(m.x, m.y, m.r, 0, Math.PI * 2); g.fill()
  }
}

/** E5: one canvas over the art. Mist, embers, ash or motes, sparse and slow. */
export default function Atmosphere({ kind, dimming, moving, frozen = false }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)
  const frozenRef = useRef(frozen)
  frozenRef.current = frozen

  useEffect(() => {
    const canvas = ref.current
    const g = canvas?.getContext('2d')
    if (!canvas || !g || kind === 'none') return
    let w = 0, h = 0, motes: Mote[] = [], raf = 0, last = 0

    const size = () => {
      const box = canvas.getBoundingClientRect()
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      w = box.width; h = box.height
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr)
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      let n = Math.round(BASE[kind] * Math.min(1.4, Math.max(0.4, (w * h) / (400 * 700))))
      if (kind === 'embers' && dimming >= 75) n = Math.round(n / 2)
      n = Math.min(40, Math.max(kind === 'mist' ? 3 : 1, n))
      motes = Array.from({ length: n }, () => spawn(kind, w, h, true))
      draw(kind, g, motes, w, h)
    }
    size()
    const ro = new ResizeObserver(size)
    ro.observe(canvas)
    if (!moving) return () => ro.disconnect()

    const tick = (t: number) => {
      raf = requestAnimationFrame(tick)
      if (document.hidden || t - last < FRAME_MS) return
      const dt = Math.min(0.1, (t - (last || t)) / 1000)
      last = t
      if (frozenRef.current) return
      motes = motes.map(m => step(kind, m, dt, w, h))
      draw(kind, g, motes, w, h)
    }
    raf = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(raf); ro.disconnect() }
  }, [kind, moving, dimming >= 75])

  if (kind === 'none') return null
  return <canvas ref={ref} className={styles.canvas} aria-hidden="true" data-atmosphere={kind} />
}
