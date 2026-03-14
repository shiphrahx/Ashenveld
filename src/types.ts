// ─── Master scene index ───────────────────────────────────────────────────────

export interface SceneRef {
  file: string
  act: number
  chapter: number
}

export interface MasterIndex {
  scene_index: Record<string, SceneRef>
  starting_scene: string
  inventory_items: Record<string, { description: string; consumable: boolean; consumed_on?: string }>
  class_stat_blocks: Record<string, StatBlock>
  faction_reputation_thresholds: Record<string, Record<string, number>>
}

export interface StatBlock {
  strength: number
  dexterity: number
  stamina: number
  intelligence: number
  mana: number
  charisma: number
  perception: number
  unique_mechanic: string
}

// ─── Meta (act-level) ─────────────────────────────────────────────────────────

export interface ActMeta {
  game_state_schema: GameState
  dice_rules: DiceRules
  npcs: Record<string, NpcDef>
  locations: Record<string, LocationDef>
}

export interface DiceRules {
  modifier_formula: string
  outcomes: {
    success: string
    success_at_cost: string
    failure: string
  }
  difficulty_classes: Record<string, number>
}

export interface NpcDef {
  id: string
  name: string
  role: string
  initial_closeness: number
}

export interface LocationDef {
  id: string
  name: string
  description: string
}

// ─── Scene data ───────────────────────────────────────────────────────────────

export type PlayerClass = 'commander' | 'arcane' | 'ranger' | 'cipher' | 'default'

export interface SceneText {
  default: string
  commander?: string
  arcane?: string
  ranger?: string
  cipher?: string
}

export interface StateChanges {
  flags?: Record<string, boolean | string | number>
  resources?: Record<string, number>
  relationships?: Record<string, { closeness: number }>
  factions?: Record<string, { reputation: number }>
  inventory?: string[]
  inventory_remove?: string[]
  world?: Partial<GameState['world']>
}

export interface Outcome {
  text: string
  next_scene: string
  state_changes: StateChanges
}

export interface Roll {
  stat: string
  dc: number
}

export interface ChoiceRequires {
  flags?: Record<string, boolean>
  inventory?: string[]
  class?: string
}

export interface Choice {
  id: string
  text: string
  requires: ChoiceRequires
  roll: Roll | null
  outcomes: {
    default?: Outcome
    success?: Outcome
    success_at_cost?: Outcome
    failure?: Outcome
  }
}

export interface OnEnter {
  state_changes: StateChanges
  time_advance: number
}

export interface Scene {
  id: string
  act: number
  chapter: number
  location: string
  title: string
  on_enter: OnEnter
  requires: ChoiceRequires
  text: SceneText
  choices: Choice[]
}

export interface ChapterFile {
  chapter: number
  title: string
  scenes: Scene[]
}

// ─── Game state ───────────────────────────────────────────────────────────────

export interface GameState {
  player: {
    name: string
    gender: string
    class: string
    missing_person: { name: string; relationship: string }
    stats: {
      strength: number
      dexterity: number
      stamina: number
      intelligence: number
      mana: number
      charisma: number
      perception: number
    }
    resources: { gold: number; health: number; max_health: number }
  }
  world: {
    act: number
    chapter: number
    day: number
    time_of_day: string
    current_location: string
    curse_spread: number
  }
  factions: {
    iron_compact: { reputation: number }
    ashen_covenant: { reputation: number }
    rootless: { reputation: number }
  }
  relationships: Record<string, { closeness: number }>
  flags: Record<string, boolean | string | number>
  inventory: string[]
  current_scene: string
}

// ─── Dice roll result ─────────────────────────────────────────────────────────

export type DiceOutcome = 'success' | 'success_at_cost' | 'failure'

export interface RollResult {
  d20: number
  modifier: number
  total: number
  dc: number
  outcome: DiceOutcome
  statName: string
}
