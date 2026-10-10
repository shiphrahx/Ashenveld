// ─── Master scene index ───────────────────────────────────────────────────────

export interface SceneRef {
  file: string
  act: number
  chapter: number
}

export interface ItemDef {
  name?: string
  description: string
  consumable: boolean
  consumed_on?: string
}

export interface MasterIndex {
  scene_index: Record<string, SceneRef>
  starting_scene: string
  inventory_items: Record<string, ItemDef>
  class_stat_blocks: Record<string, StatBlock>
  faction_reputation_thresholds: Record<string, Record<string, number>>
  act_summaries?: Record<string, { title: string; entry: string; exit_scenes: string[]; chapters: number; description: string }>
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

// ─── Conditions and text ──────────────────────────────────────────────────────

/** One shape for every "is this allowed / shown" test. */
export interface Condition {
  flags?: Record<string, boolean | string | number>
  inventory?: string[]                       // all must be held
  class?: string | string[]
  min_relationship?: Record<string, number>  // npc id → closeness
  max_relationship?: Record<string, number>
  min_faction?: Record<string, number>       // faction id → reputation
  max_faction?: Record<string, number>
  min_stat?: Record<string, number>
  relationship_type?: string[]               // player.missing_person.relationship, lower case
  visited?: string[]                         // scene ids already entered
  not_visited?: string[]
  taken?: string[]                           // "sceneId:choiceId"
  min_curse?: number
  max_curse?: number
  health_below?: number
  min_gold?: number
  any?: Condition[]                          // at least one matches
  not?: Condition
}
/** @deprecated use Condition */
export type ChoiceRequires = Condition

/** A string, or a list of paragraph blocks, each optionally guarded. */
export type TextPart = string | { when: Condition; text: string; else?: string }
export type RichText = string | TextPart[]

// ─── Scene data ───────────────────────────────────────────────────────────────

export type PlayerClass = 'commander' | 'arcane' | 'ranger' | 'cipher'
export type ClassKey = PlayerClass

export interface SceneText {
  default: RichText
  commander?: RichText
  arcane?: RichText
  ranger?: RichText
  cipher?: RichText
}

export interface StateChanges {
  flags?: Record<string, boolean | string | number>
  resources?: Record<string, number>
  relationships?: Record<string, { closeness: number }>
  factions?: Record<string, { reputation: number }>
  inventory?: string[]
  inventory_remove?: string[]
  /** world.curse_spread is a delta. day and skip_days move the clock forward. */
  world?: Partial<GameState['world']> & { skip_days?: number }
}

export interface Outcome {
  text: RichText
  next_scene: string | null
  state_changes: StateChanges
}

export interface Roll {
  stat: string
  dc: number
}

export interface Choice {
  id: string
  text: RichText
  requires: Condition
  roll: Roll | null
  once?: boolean          // hidden after it has been taken in this save
  locked_hint?: string    // shown when requires fails
  outcomes: {
    default?: Outcome
    success?: Outcome
    success_at_cost?: Outcome
    failure?: Outcome
  }
}

export interface OnEnter {
  state_changes: StateChanges
}

export type DayPart = 'dawn' | 'morning' | 'midday' | 'afternoon' | 'evening' | 'night'
export interface SceneWhen { part: DayPart; day?: number; skip_days?: number; hide_clock?: boolean }

export interface Scene {
  id: string
  act: number
  chapter: number
  location: string
  title: string
  on_enter: OnEnter
  requires: Condition
  text: SceneText
  choices: Choice[]
  when?: SceneWhen
  text_mode?: Partial<Record<PlayerClass, 'append' | 'replace'>>
  route?: Array<{ when?: Condition; next: string }>   // never rendered
  ending?: { id: string; title: string }
  rest?: boolean
  objective?: string
}

export interface ChapterFile {
  chapter: number
  title: string
  scenes: Scene[]
}

// ─── Game state ───────────────────────────────────────────────────────────────

export interface GameState {
  version: 2
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
    time_of_day: DayPart
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
  journal: JournalEntry[]
  visited: Record<string, number>        // scene id → times entered
  taken: Record<string, true>            // "sceneId:choiceId"
  ended?: { id: string; title: string }  // set when an ending is reached
}

// ─── Journal ──────────────────────────────────────────────────────────────────

export interface JournalEntry {
  sceneId: string
  sceneTitle: string
  location: string
  timeOfDay: string
  day: number
  text: string          // resolved scene text for the player's class
  choiceText: string    // the choice the player made
  outcomeText: string   // the outcome text shown
}

// ─── Meta store (survives new games) ──────────────────────────────────────────

export interface MetaStore {
  endings: string[]
  seenScenes: string[]
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
