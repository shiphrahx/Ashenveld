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
  endings?: Array<{ id: string; title: string }>
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
  location?: string
  personality?: string
  faction_alignment?: string
  read?: string            // the Cipher's private assessment, shown once
}

export interface LocationDef {
  id: string
  name: string
  description: string
  region?: string
  ambient_day?: string
  ambient_night?: string
  /** E3: the sound bed. */
  ambience?: BedId
  /** E5: the moving layer over the art. */
  atmosphere?: 'mist' | 'embers' | 'ash' | 'motes' | 'none'
}

export type BedId = 'river' | 'hearth' | 'town' | 'road' | 'deep' | 'chamber'
export type CueId = 'silence_falls' | 'touch' | 'stopped' | 'resolve' | 'resolve_partial' | 'end'
export type StageId = 'quiet' | 'reunion' | 'ritual' | 'touch' | 'stopped' | 'ending'

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
  min_counter?: Record<string, number>
  max_counter?: Record<string, number>
  lowest_faction?: string                    // this faction has the lowest reputation (ties: first listed)
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
  counters?: Record<string, number>        // deltas
  /** world.curse_spread is a delta. day and skip_days move the clock forward. */
  world?: Partial<GameState['world']> & { skip_days?: number }
}

export interface Outcome {
  text: RichText
  next_scene: string | null
  state_changes: StateChanges
  /** E3: a sound played when this outcome is shown. */
  cue?: CueId
}

export interface RollBonus { when: Condition; value: number; label: string }

export interface Roll {
  stat: string | string[]          // an array means: use the player's best of these
  dc: number
  bonus?: RollBonus[]
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
/**
 * When a scene happens. `part` may list several day parts: if the clock is
 * already in one of them it stays, otherwise it moves to the first.
 */
export interface SceneWhen { part: DayPart | DayPart[]; day?: number; skip_days?: number; hide_clock?: boolean }

export interface Scene {
  id: string
  /** E3: a sound played on entry. */
  cue?: CueId
  /** E9: how the shell stages this scene. */
  stage?: StageId
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
  objective?: string
  scenes: Scene[]
}

// ─── Journal notes and leads (resources/notes.json) ──────────────────────────

export interface NotesFile {
  leads: Array<{ when: Condition; text: string }>
  notes: Array<{ flag: string; group: string; text: string }>
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
  /** seen: where and when closeness last changed, for the People panel (U11). Older saves lack it. */
  relationships: Record<string, { closeness: number; seen?: { day: number; location: string; at: number } }>
  flags: Record<string, boolean | string | number>
  inventory: string[]
  current_scene: string
  journal: JournalEntry[]
  counters: Record<string, number>
  visited: Record<string, number>        // scene id → times entered
  taken: Record<string, true>            // "sceneId:choiceId"
  ended?: { id: string; title: string; text?: string }  // set when an ending is reached; text is the closing outcome
  journal_seen?: string[]                // note and lead keys the player has seen in the journal
  last_rest_scene?: string               // where a collapse wakes you (G9)
  collapse_return?: string               // the scene to go on to after a collapse
}

// ─── Journal ──────────────────────────────────────────────────────────────────

/**
 * One choice made. Only ids are stored; the journal rebuilds the text from the
 * scene data so the save stays small. Saves from before U5 also carry the
 * resolved text in the optional fields.
 */
export interface JournalEntry {
  sceneId: string
  choiceId?: string
  outcomeKey?: OutcomeKey
  day: number
  part?: DayPart
  // legacy
  sceneTitle?: string
  location?: string
  timeOfDay?: string
  text?: string
  choiceText?: string
  outcomeText?: string
}

export type OutcomeKey = 'default' | 'success' | 'success_at_cost' | 'failure'

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
  bonus: number                    // sum of the bonuses that applied, capped
  bonuses: RollBonus[]
  total: number
  dc: number
  outcome: DiceOutcome
  statName: string
  commanded?: boolean              // the Commander turned a failure into a success at a cost
}
