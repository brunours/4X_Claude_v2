# 4X Space Conquest - Complete Documentation

## Table of Contents
1. [Game Overview](#game-overview)
2. [File Structure](#file-structure)
3. [Game Mechanics](#game-mechanics)
4. [Code Architecture](#code-architecture)
5. [Key Functions Reference](#key-functions-reference)
6. [Game State Structure](#game-state-structure)
7. [UI Components](#ui-components)
8. [AI System](#ai-system)
9. [Development Guide](#development-guide)

---

## Game Overview

**4X Space Conquest** is a browser-based turn-based strategy game where players explore, expand, exploit, and exterminate across a procedurally generated galaxy. Compete against AI opponents to conquer all planets and achieve galactic domination.

### Core Features
- **Turn-based strategy gameplay** with resource management
- **Multiple ship types** with unique capabilities (Scout, Colonizer, Frigate, Battleship)
- **Combat system** with tactical decisions (fight or withdraw)
- **AI opponents** with three difficulty levels
- **Three map sizes** (Compact: 12 planets, Standard: 20, Vast: 30)
- **Responsive controls** with mouse and touch support
- **Resource management** (Energy, Minerals, Food)
- **Population growth** and planet development

### Victory Conditions
- **Victory**: Conquer all enemy planets
- **Defeat**: Lose all your planets

---

## File Structure

### Main Game Files

The game uses a modular architecture with separated HTML, CSS, and JavaScript files (~3,760 lines total).

#### `index.html` (132 lines)
Main HTML structure containing:
- Canvas element for game rendering
- UI overlay panels (start screen, unified panel, battle dialogs)
- Game over screen
- Resource and turn display
- Links to external CSS and JavaScript modules

#### `css/style.css` (1,201 lines)
Complete styling for the game:
- Panel layouts and responsive design
- Button styles and animations
- Canvas and UI overlays
- Battle dialog styling
- Font imports (Orbitron, Exo 2 from Google Fonts)

#### JavaScript Modules (`js/` directory)

**`js/main.js`** (42 lines)
- Entry point for the game
- Initializes all game systems
- Starts the game loop

**`js/config.js`** (51 lines)
- Game configuration constants
- Ship type definitions (Scout, Colonizer, Frigate, Battleship)
- Map sizes and AI difficulty settings

**`js/gameState.js`** (250 lines)
- Central game state management
- Player data, planets, ships
- Selected entities and camera state
- State initialization functions

**`js/camera.js`** (58 lines)
- Camera control system
- Zoom and pan functionality
- Coordinate transformations

**`js/inputHandler.js`** (290 lines)
- Mouse and touch event handling
- Click detection for planet selection
- Drag-to-pan and pinch-to-zoom
- End turn button handling

**`js/uiManager.js`** (352 lines)
- UI panel management (planet, fleet, shipyard)
- Notification system
- Battle dialog display
- Resource and turn counter updates

**`js/shipSystem.js`** (161 lines)
- Ship movement and travel groups
- Ship selection logic
- Fleet management utilities

**`js/combatSystem.js`** (421 lines)
- Combat resolution logic
- Battle damage calculations
- Ship arrival and colonization handling
- Withdraw mechanics

**`js/turnSystem.js`** (293 lines)
- Turn processing pipeline
- Build queue management
- Resource collection
- Population growth
- Victory/defeat condition checking

**`js/aiSystem.js`** (214 lines)
- AI decision making
- Ship building strategy
- Movement and targeting logic
- Difficulty-based behavior

**`js/renderer.js`** (296 lines)
- Canvas rendering pipeline
- Planet and ship drawing
- Travel route visualization
- Background stars and effects

#### Documentation Files

**`README.md`**
- Brief project description and overview
- Project title and feature summary

**`DOCUMENTATION.md`** (this file)
- Complete game documentation
- Code architecture and mechanics
- Developer guide

**`DEPLOYMENT.md`**
- GitHub Pages deployment instructions
- Hosting configuration

**`GITHUB-SETUP.md`**
- Git repository setup guide

---

## Game Mechanics

### 1. Resource System

Three resource types affect gameplay:

| Resource | Use | Generation |
|----------|-----|------------|
| **Energy** | Ship construction, general operations | 5-15 per planet per turn |
| **Minerals** | Ship construction (especially military) | 5-15 per planet per turn |
| **Food** | Advanced ships, population support | 5-15 per planet per turn |

- Players start with 100 of each resource
- Each planet generates resources every turn
- Generation amount is random (5-15) per resource per planet
- Resources are shared across your entire empire

### 2. Ship Types

Four distinct ship classes with different roles:

#### Scout
- **Cost**: 10 Energy, 5 Minerals
- **Speed**: 1.5 (fastest)
- **Combat**: Attack 2, Defense 1, HP 3
- **Role**: Fast exploration, early harassment
- **Build Time**: 1-2 turns (population-dependent)

#### Colonizer
- **Cost**: 30 Energy, 20 Minerals, 20 Food
- **Speed**: 1.0 (slow)
- **Combat**: Cannot fight (instantly destroyed in combat)
- **Role**: Colonize neutral planets
- **Build Time**: 2-4 turns
- **Special**: Can claim unoccupied planets

#### Frigate
- **Cost**: 25 Energy, 30 Minerals, 5 Food
- **Speed**: 1.2 (medium)
- **Combat**: Attack 4, Defense 3, HP 8
- **Role**: Main military workhorse
- **Build Time**: 2-3 turns

#### Battleship
- **Cost**: 50 Energy, 60 Minerals, 10 Food
- **Speed**: 0.9 (slowest)
- **Combat**: Attack 8, Defense 6, HP 15
- **Role**: Heavy assault, planet conquest
- **Build Time**: 3-5 turns

### 3. Combat System

**Combat Resolution:**
1. Player chooses "Fight" or "Withdraw"
2. If fighting:
   - Each ship deals damage = Attack × (0.5 + random 0.5)
   - Damage reduced by target's Defense stat
   - Combat continues until one side has no military ships
   - Colonizers do not participate in combat (0 attack power)
   - Colonizers without military escort are destroyed automatically
   - When an army is defeated, all colonizers from that army are destroyed
3. If withdrawing:
   - Ships return to origin planet (no losses)

**Planet Conquest:**
- Winner occupies the planet
- Loser's ships are destroyed
- Planet changes ownership immediately

### 4. Movement System

**Travel Time Calculation:**
```javascript
travelTime = Math.ceil(distance / (150 * shipSpeed))
```

- Ships travel in groups to same destination
- Visual routes show paths on the map
- Ships arrive after calculated turns
- Arrival triggers automatic combat if enemies present

### 5. Building System

**Construction Queue:**
- Each planet has an independent build queue
- Ships built one at a time (queue system)
- Build time formula: `Math.ceil(baseBuildTime / (population / 100))`
- Resources deducted when construction starts
- Canceling returns 50% of resources
- Ships appear immediately after completion

### 6. Colonization

**Requirements:**
- Must send Colonizer ship to neutral planet
- Planet must have no owner
- Takes 1 turn to complete

**Process:**
1. Colonizer arrives at neutral planet
2. Planet enters "pending conquest" state
3. Next turn, planet becomes yours
4. Colonizer ship is consumed in the process

**Interruption:**
- If combat occurs during pending state, colonization fails
- Enemy can steal colonization by attacking

### 7. Population Growth

**Growth Formula:**
```javascript
newPopulation = Math.min(
  population * 1.10,  // 10% growth per turn
  planetSize * 4      // Maximum capacity
)
```

**Effects:**
- Higher population = faster ship construction
- Affects resource generation efficiency
- Maxes out at 4× planet size

### 8. Difficulty Levels

AI behavior parameters vary significantly across difficulty levels:

#### Core Decision Parameters

| Parameter | Easy | Medium | Hard | Description |
|-----------|------|--------|------|-------------|
| `expansionPriority` | 0.3 | 0.5 | 0.8 | Likelihood of building colonizers |
| `militaryPriority` | 0.2 | 0.5 | 0.8 | Focus on combat ship construction |
| `aggressiveness` | 0.2 | 0.5 | 0.8 | Frequency of attacks and movements |
| `buildEfficiency` | 0.6 | 0.8 | 1.0 | Chance to attempt building each turn |

#### Strategic Intelligence (v2.1.0)

| Parameter | Easy | Medium | Hard | Description |
|-----------|------|--------|------|-------------|
| `targetingStrategy` | random | nearest | optimal | How AI selects targets |
| `fleetCoordination` | false | true | true | Multi-planet attack coordination |

- **random**: AI picks any valid target randomly
- **nearest**: AI colonizes nearest neutral, attacks weakest enemy
- **optimal**: AI evaluates value/defense ratio for best targets

#### Fleet Composition (v2.1.0)

| Parameter | Easy | Medium | Hard | Description |
|-----------|------|--------|------|-------------|
| `attackForceRatio` | 0.4 | 0.6 | 0.8 | Percentage of ships sent on attacks |
| `escortSize` | 1 | 2 | 4 | Military ships protecting colonizers |
| `overkillFactor` | 0.5 | 1.0 | 1.5 | Required strength advantage to attack |

- **Easy**: Sends weak forces, minimal colonizer protection, attacks even when weaker
- **Medium**: Balanced approach, waits for equal strength
- **Hard**: Commits majority of fleet, heavy escorts, only attacks with significant advantage

#### Defensive Behavior (v2.1.0)

| Parameter | Easy | Medium | Hard | Description |
|-----------|------|--------|------|-------------|
| `homeDefenseRatio` | 0.0 | 0.2 | 0.3 | Ships kept back for defense |
| `defenseThreshold` | 0.0 | 0.3 | 0.5 | When to prioritize defense |
| `counterAttackEnabled` | false | false | true | Retaliates after being attacked |

- **Easy**: Never defends, commits all ships to offense
- **Medium**: Keeps 20% reserve, defends when player is 30% stronger
- **Hard**: Keeps 30% reserve, actively counter-attacks player aggression

---

## Code Architecture

### Overall Structure

The game follows a modular architecture within a single file:

```
┌─────────────────────────────────────┐
│        HTML Structure               │
│  - Canvas element                   │
│  - UI overlay panels                │
│  - Dialogs and notifications        │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│        CSS Styling                  │
│  - Panel layouts                    │
│  - Button styles                    │
│  - Responsive design                │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│     JavaScript Game Logic           │
│                                     │
│  ┌─────────────────────────────┐   │
│  │   Game Configuration        │   │
│  │  - SHIP_TYPES constants     │   │
│  │  - MAP_SIZES                │   │
│  │  - AI_CONFIG                │   │
│  └─────────────────────────────┘   │
│              │                      │
│              ▼                      │
│  ┌─────────────────────────────┐   │
│  │      Game State             │   │
│  │  - players array            │   │
│  │  - planets array            │   │
│  │  - travelingShips array     │   │
│  │  - selectedPlanet           │   │
│  │  - currentTurn              │   │
│  └─────────────────────────────┘   │
│              │                      │
│              ▼                      │
│  ┌─────────────────────────────┐   │
│  │    Event Handlers           │   │
│  │  - Mouse events             │   │
│  │  - Touch events             │   │
│  │  - Keyboard events          │   │
│  └─────────────────────────────┘   │
│              │                      │
│              ▼                      │
│  ┌─────────────────────────────┐   │
│  │    Game Loop (60 FPS)       │   │
│  │  - Continuous rendering     │   │
│  │  - Camera updates           │   │
│  └─────────────────────────────┘   │
│              │                      │
│              ▼                      │
│  ┌─────────────────────────────┐   │
│  │    Turn Processing          │   │
│  │  - Ship movement            │   │
│  │  - Combat resolution        │   │
│  │  - Resource collection      │   │
│  │  - Build queues             │   │
│  │  - Population growth        │   │
│  │  - AI decision making       │   │
│  │  - Victory checking         │   │
│  └─────────────────────────────┘   │
│              │                      │
│              ▼                      │
│  ┌─────────────────────────────┐   │
│  │    Rendering Pipeline       │   │
│  │  - Clear canvas             │   │
│  │  - Draw background stars    │   │
│  │  - Draw planets             │   │
│  │  - Draw ships               │   │
│  │  - Draw travel routes       │   │
│  │  - Draw UI overlays         │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

### Design Patterns

1. **Single State Object Pattern**
   - All game data stored in `gameState` object
   - Centralized state management
   - Easy to serialize for save/load (if implemented)

2. **Event-Driven Architecture**
   - User input triggers events
   - Events update game state
   - State changes trigger re-renders

3. **Component-Based UI**
   - Each panel (Planet, Fleet, Shipyard) is independent
   - Toggle functions show/hide panels
   - Update functions refresh panel content

4. **Immediate Mode Rendering**
   - Canvas cleared and redrawn each frame
   - No retained mode graphics
   - Simple but performance-intensive

5. **Turn-Based Update Pattern**
   - Continuous rendering for smooth animations
   - Game logic updates only on turn end
   - Separates visual updates from game logic

---

## Key Functions Reference

### Initialization Functions

#### `init()`
**File**: `js/main.js`
**Purpose**: Main entry point, called when page loads
**Actions**:
- Gets canvas context
- Adds event listeners
- Starts game loop
- Shows start screen

#### `startGame()`
**File**: `js/gameState.js`
**Purpose**: Initializes a new game
**Parameters**: Uses selected difficulty and map size from UI
**Actions**:
- Generates planets
- Initializes players
- Assigns starting planets
- Creates background stars
- Hides start screen

#### `generatePlanets(count)`
**File**: `js/gameState.js`
**Purpose**: Creates random planets on the map
**Algorithm**:
1. Loop until `count` planets created
2. Generate random x, y coordinates
3. Check minimum distance from existing planets (120 units)
4. Assign random color, size, resources
5. Name planets using Greek letters

### Event Handling Functions

#### `handleMouseDown(e)`, `handleMouseMove(e)`, `handleMouseUp(e)`
**File**: `js/inputHandler.js`
**Purpose**: Camera panning with mouse drag
**Mechanism**:
- Track mouse down state and position
- Calculate delta on move
- Update camera offset
- Clamp to map boundaries

#### `handleWheel(e)`
**File**: `js/inputHandler.js`
**Purpose**: Zoom control with mouse wheel
**Range**: 0.5× to 3.0×
**Increments**: 0.1 per scroll tick

#### `handleTouchStart/Move/End(e)`
**File**: `js/inputHandler.js`
**Purpose**: Touch support (pan and pinch-zoom)
**Features**:
- Single finger: pan camera
- Two fingers: pinch to zoom
- Prevents default browser gestures

#### `handleClick(e)`
**File**: `js/inputHandler.js`
**Purpose**: Planet selection and ship destination
**Logic**:
1. Convert click coordinates to world space
2. Find planet at click position
3. If planet found and owned by player: select it
4. If planet found and ships selected: set as destination

### UI Management Functions

#### `selectPlanet(planet)`
**File**: `js/uiManager.js`
**Purpose**: Sets selected planet and updates UI
**Actions**:
- Updates `gameState.selectedPlanet`
- Shows action buttons
- Updates planet panel
- Highlights planet on canvas

#### `closePlanetPanel()`
**File**: `js/uiManager.js`
**Purpose**: Closes the unified panel

#### `updatePlanetPanel(planet)`
**File**: `js/uiManager.js`
**Purpose**: Refreshes planet panel with current data
**Displays**:
- Planet name and owner
- Population
- Resources generated per turn
- Ships present
- Build queue status

#### `switchFleetTab(tab)`
**File**: `js/uiManager.js`
**Purpose**: Switches between stationed and transit fleet views

#### `updateFleetPanel()`
**File**: `js/uiManager.js`
**Purpose**: Lists all player's planets and ships
**Features**:
- Shows ships at each planet
- Displays traveling ship groups
- Allows planet selection from list

#### `updateShipyardPanel()`
**File**: `js/uiManager.js`
**Purpose**: Updates shipyard with available ships to build
**Displays**:
- Ship types with stats
- Resource costs
- Build time estimates
- Whether player can afford each ship

### Ship Management Functions

#### `sendShips(fromPlanet, toPlanet, ships)`
**File**: `js/shipSystem.js`
**Purpose**: Initiates ship movement
**Actions**:
1. Validates ship ownership
2. Calculates travel time
3. Creates traveling ship group
4. Removes ships from origin planet
5. Adds visual travel route

#### `toggleShipSelection(shipId)`
**File**: `js/shipSystem.js`
**Purpose**: Toggles individual ship selection
**Mechanism**: Adds/removes ship ID from selected ships array

#### `selectAllShips(planetId)`
**File**: `js/shipSystem.js`
**Purpose**: Selects all military ships at a planet
**Exclusion**: Does not select ships in build queue

#### `getSelectedShipsAtPlanet(planet)`
**File**: `js/shipSystem.js`
**Purpose**: Returns array of selected ships at planet
**Filter**: Only returns ships belonging to current player

### Building Functions

#### `buildShip(type)`
**File**: `js/turnSystem.js`
**Purpose**: Queues ship construction
**Process**:
1. Check if player can afford ship
2. Deduct resources from player
3. Calculate build time based on population
4. Add ship to planet's build queue
5. Show notification

#### `calculateBuildTime(type, population)`
**File**: `js/turnSystem.js`
**Purpose**: Determines turns needed to build ship
**Formula**: `Math.ceil(baseBuildTime / (population / 100))`
**Result**: Higher population = faster builds

#### `canAffordShip(type)`
**File**: `js/turnSystem.js`
**Purpose**: Checks if player has enough resources
**Returns**: Boolean (true if affordable)

#### `processBuildQueues()`
**File**: `js/turnSystem.js`
**Purpose**: Advances construction each turn
**Actions**:
- Decrements turns remaining on each queued ship
- When turns reach 0, adds completed ship to planet
- Shows completion notification

### Turn Processing Functions

#### `endTurn()`
**File**: `js/turnSystem.js`
**Purpose**: Main turn advancement function
**Sequence**:
1. Process traveling ships
2. Process build queues
3. Collect resources
4. Process population growth
5. Run AI turns
6. Increment turn counter
7. Check victory conditions
8. Update all UI panels

#### `processTravelingShips()`
**File**: `js/turnSystem.js`
**Purpose**: Moves ships and handles arrivals
**Logic**:
- Decrements turns remaining for each group
- When turns reach 0, calls `handleShipArrival()`
- Removes arrived groups from traveling list

#### `handleShipArrival(group, planet)`
**File**: `js/combatSystem.js`
**Purpose**: Processes ships arriving at destination
**Cases**:
1. **Friendly planet**: Ships join planet's fleet
2. **Neutral planet with colonizer**: Initiates colonization
3. **Enemy planet**: Triggers combat
4. **Pending conquest planet**: Triggers combat

#### `resolveCombat(attackingGroup, planet, isWithdraw)`
**File**: `js/combatSystem.js`
**Purpose**: Calculates combat outcome
**Algorithm**:
1. If withdraw: return ships to origin
2. Kill all colonizers immediately
3. While both sides have military ships:
   - Calculate damage: `attack * (0.5 + random * 0.5)`
   - Apply damage to target's HP
   - Remove destroyed ships
4. Winner takes planet if attacker wins

#### `collectResources()`
**File**: `js/turnSystem.js`
**Purpose**: Generates resources each turn
**Process**:
- For each player-owned planet
- Generate 5-15 of each resource
- Add to player's resource pool

#### `processPopulationGrowth()`
**File**: `js/turnSystem.js`
**Purpose**: Grows planet populations
**Formula**: `population * 1.10` (10% growth)
**Cap**: `planetSize * 4`

### AI Functions

#### `processAITurn()`
**File**: `js/aiSystem.js`
**Purpose**: Executes AI player's turn
**Actions**:
1. For each AI-owned planet:
   - Decide whether to build ships
   - Decide ship movements
2. Calls `aiDecideBuild()` and `aiDecideShipMovement()`

#### `aiDecideBuild(planet, config, player)`
**File**: `js/aiSystem.js`
**Purpose**: AI ship construction logic
**Strategy**:
- Uses difficulty config (military vs. expansion preference)
- Builds military ships if military < threshold
- Builds colonizers if expansion < threshold
- Random chance based on config values

#### `aiDecideShipMovement(planet, config)`
**File**: `js/aiSystem.js`
**Purpose**: AI ship movement strategy
**Targets**:
1. **Aggressive**: Attack player planets (weakest first)
2. **Expansionist**: Colonize neutral planets (nearest first)
3. **Defensive**: Reinforce weak AI planets

**Selection**: Based on config aggression value

#### `findNearestPlanet(from, candidatePlanets)`
**File**: `js/aiSystem.js`
**Purpose**: Returns closest planet from list
**Algorithm**: Linear search with distance calculation

#### `findWeakestPlanet(candidatePlanets)`
**File**: `js/aiSystem.js`
**Purpose**: Returns planet with fewest military ships
**Use**: AI targeting priority

### Victory Functions

#### `checkGameEnd()`
**File**: `js/turnSystem.js`
**Purpose**: Detects win/loss conditions
**Checks**:
- If player has 0 planets AND no colonizers: Defeat
- If AI has 0 planets AND no colonizers: Victory
- Otherwise: Continue game

#### `showGameOver(victory)`
**File**: `js/uiManager.js`
**Purpose**: Displays end game screen
**Actions**:
- Shows victory or defeat message
- Displays final turn count
- Offers restart button

### Rendering Functions

#### `render()`
**File**: `js/renderer.js`
**Purpose**: Main rendering loop (called 60 times/second)
**Steps**:
1. Clear canvas
2. Apply camera transform (zoom and pan)
3. Draw background stars
4. Draw planets
5. Draw travel routes
6. Draw UI overlays
7. Request next frame

#### `drawPlanet(planet)`
**File**: `js/renderer.js`
**Purpose**: Renders a single planet
**Features**:
- Colored circle with gradient
- Owner-colored border
- Glow effect for selection
- Planet name label
- Ship count indicators

#### `drawShipDots(planet)`
**File**: `js/renderer.js`
**Purpose**: Shows ship presence indicators
**Display**: Small colored dots around planet

#### `drawTravelRoute(group)`
**File**: `js/renderer.js`
**Purpose**: Shows moving ship paths
**Rendering**:
- Dashed line from origin to destination
- Arrow pointing to destination
- Ship count label
- Progress indicator (fading)

#### `drawDestinationIndicator(planet)`
**File**: `js/renderer.js`
**Purpose**: Highlights valid destinations
**Effect**: Pulsing circle around selectable planets

---

## Game State Structure

The `gameState` object contains all game data:

```javascript
const gameState = {
    // Game settings
    mapSize: 20,              // Number of planets
    difficulty: 'medium',      // AI difficulty

    // Players
    players: [
        {
            id: 0,
            name: 'Player',
            color: '#00ff00',
            isAI: false,
            resources: {
                energy: 100,
                minerals: 100,
                food: 100
            }
        },
        {
            id: 1,
            name: 'AI',
            color: '#ff0000',
            isAI: true,
            resources: { energy: 100, minerals: 100, food: 100 }
        }
    ],

    // Planets
    planets: [
        {
            id: 0,
            name: 'Alpha',
            x: 500,
            y: 300,
            size: 25,
            color: '#4488ff',
            owner: 0,           // Player ID or null
            population: 100,
            resources: {
                energy: 10,      // Per turn generation
                minerals: 8,
                food: 12
            },
            ships: [
                {
                    id: 'ship_0_0',
                    type: 'scout',
                    hp: 3,
                    maxHp: 3
                }
            ],
            buildQueue: [
                {
                    type: 'frigate',
                    turnsRemaining: 2
                }
            ],
            pendingConquest: null   // Player ID if being colonized
        }
    ],

    // Traveling ships
    travelingShips: [
        {
            ships: [...],        // Array of ship objects
            from: planetId,
            to: planetId,
            owner: playerId,
            turnsRemaining: 3
        }
    ],

    // UI state
    selectedPlanet: null,        // Planet object or null
    selectedShips: [],           // Array of ship IDs
    destinationPlanet: null,     // Planet object or null

    // Turn tracking
    currentTurn: 1,

    // Camera
    camera: {
        x: 0,
        y: 0,
        zoom: 1.0
    },

    // Background decoration
    backgroundStars: [
        { x: 100, y: 200, size: 1.5, brightness: 0.8 }
    ]
};
```

---

## UI Components

### Canvas Layout

```
┌─────────────────────────────────────────────┐
│  Game Canvas (1400×800)                     │
│                                             │
│  ┌─────────────────┐    ┌──────────────┐   │
│  │ Planet Panel    │    │ Zoom: 1.0×   │   │
│  │  - Name         │    └──────────────┘   │
│  │  - Owner        │                        │
│  │  - Population   │    [Planets rendered  │
│  │  - Resources    │     with camera       │
│  │  - Ships        │     transform]        │
│  │  - Build Queue  │                        │
│  └─────────────────┘                        │
│                                             │
│  ┌─────────────────┐                        │
│  │ Fleet Panel     │    [Travel routes]    │
│  │  - All planets  │    [Ship indicators]  │
│  │  - Ship lists   │                        │
│  └─────────────────┘                        │
│                                             │
│  ┌─────────────────┐                        │
│  │ Shipyard Panel  │                        │
│  │  - Ship types   │                        │
│  │  - Stats        │                        │
│  │  - Build buttons│                        │
│  └─────────────────┘                        │
│                                             │
│  [Turn: 15]  [Resources: E:250 M:180 F:90] │
│  [End Turn Button]                          │
└─────────────────────────────────────────────┘
```

### Panel Descriptions

#### Planet Panel
- **Trigger**: Click on owned planet
- **Content**:
  - Planet information (name, owner, population)
  - Resource generation rates
  - Ships present with selection checkboxes
  - Build queue status
  - Action buttons (Send Ships, Build Ships)
- **Location**: Left side overlay

#### Fleet Panel
- **Trigger**: Click "Fleet" button
- **Content**:
  - List of all player-owned planets
  - Ships at each location
  - Traveling ship groups
  - Quick planet selection
- **Location**: Left side overlay

#### Shipyard Panel
- **Trigger**: Click "Build Ships" from Planet Panel
- **Content**:
  - All ship types with icons
  - Stats (Speed, Attack, Defense, HP)
  - Resource costs
  - Build time estimates
  - Build buttons (disabled if can't afford)
- **Location**: Left side overlay

#### Battle Dialog
- **Trigger**: Ships arrive at enemy planet
- **Content**:
  - "Battle at [planet name]"
  - Attacker's force composition
  - Defender's force composition
  - Combat predictions
  - "Fight" and "Withdraw" buttons
- **Location**: Center overlay (modal)

#### Notification System
- **Trigger**: Various game events
- **Types**:
  - Ship completed
  - Planet conquered
  - Combat results
  - Colonization events
- **Location**: Bottom-right, auto-dismiss after 3 seconds

---

## AI System

### AI Decision Tree (v2.1.0)

```
AI Turn Start
│
├─ For each AI planet:
│   │
│   └─ Building Decision (based on buildEfficiency chance)
│       │
│       ├─ Check resource availability
│       │
│       ├─ Evaluate threat level (player vs AI military)
│       │   └─ If player > AI * 0.7:
│       │       └─ Build military (based on militaryPriority)
│       │           └─ Priority: Battleship > Frigate > Scout
│       │
│       └─ Otherwise: Build colonizer (based on expansionPriority)
│           └─ Fallback: Build scouts if nothing else affordable
│
├─ Movement Decision (varies by difficulty)
│   │
│   ├─ [Easy Mode] Individual planet decisions:
│   │   │
│   │   ├─ Random targeting (any valid target)
│   │   ├─ 40% attack force ratio
│   │   ├─ No home defense reserve
│   │   └─ Attacks even when weaker (overkillFactor: 0.5)
│   │
│   ├─ [Medium Mode] Coordinated fleet movement:
│   │   │
│   │   ├─ Nearest/weakest targeting strategy
│   │   ├─ Coordinates attacks from multiple planets
│   │   ├─ 60% attack force ratio
│   │   ├─ 20% home defense reserve
│   │   └─ Attacks when equal or stronger (overkillFactor: 1.0)
│   │
│   └─ [Hard Mode] Optimal coordinated attacks:
│       │
│       ├─ Counter-attack logic (retaliates against attackers)
│       ├─ Optimal targeting (value/defense ratio analysis)
│       ├─ Coordinates attacks from multiple planets
│       ├─ 80% attack force ratio
│       ├─ 30% home defense reserve
│       └─ Only attacks with 1.5x advantage (overkillFactor: 1.5)
│
└─ End AI Turn
```

### AI Behavior by Difficulty

#### Easy Difficulty
```javascript
{
    expansionPriority: 0.3, militaryPriority: 0.2, aggressiveness: 0.2,
    buildEfficiency: 0.6, targetingStrategy: 'random',
    fleetCoordination: false, attackForceRatio: 0.4, escortSize: 1,
    overkillFactor: 0.5, homeDefenseRatio: 0.0, counterAttackEnabled: false
}
```
**Playstyle**: Passive, random decisions, weak forces, no coordination

#### Medium Difficulty
```javascript
{
    expansionPriority: 0.5, militaryPriority: 0.5, aggressiveness: 0.5,
    buildEfficiency: 0.8, targetingStrategy: 'nearest',
    fleetCoordination: true, attackForceRatio: 0.6, escortSize: 2,
    overkillFactor: 1.0, homeDefenseRatio: 0.2, counterAttackEnabled: false
}
```
**Playstyle**: Balanced, smart targeting, coordinated attacks, maintains reserves

#### Hard Difficulty
```javascript
{
    expansionPriority: 0.8, militaryPriority: 0.8, aggressiveness: 0.8,
    buildEfficiency: 1.0, targetingStrategy: 'optimal',
    fleetCoordination: true, attackForceRatio: 0.8, escortSize: 4,
    overkillFactor: 1.5, homeDefenseRatio: 0.3, counterAttackEnabled: true
}
```
**Playstyle**: Aggressive, optimal targeting, coordinated overwhelming force, retaliates

### AI Targeting Logic

**Random Strategy (Easy):**
- Picks any valid target at random
- No strategic evaluation
- May send weak forces against strong defenses

**Nearest/Weakest Strategy (Medium):**
- **Colonization**: Nearest neutral planet
- **Attack**: Weakest player planet (lowest military strength)

**Optimal Strategy (Hard):**
- **Colonization**: Best value target considering:
  - Resource generation potential
  - Distance from AI planets
  - Strategic position
- **Attack**: Optimal target considering:
  - Planet population (high = valuable)
  - Defense strength (low = easier)
  - Value/defense ratio analysis

### Fleet Coordination (Medium/Hard)

When `fleetCoordination` is enabled:
1. AI calculates total available force across all planets
2. Selects high-value target based on targeting strategy
3. Evaluates if combined force exceeds `overkillFactor` × target defense
4. If sufficient: coordinates attack from multiple planets simultaneously
5. If insufficient: waits and builds up force

### Counter-Attack System (Hard Only)

When `counterAttackEnabled` is true:
1. AI tracks planets that were recently attacked by player
2. On next turn, prioritizes retaliating against attack source
3. Finds nearest player planet to the attacked AI planet
4. Coordinates overwhelming counter-attack if force is sufficient

---

## Development Guide

### Adding a New Ship Type

1. **Update SHIP_TYPES constant** in `js/config.js`:
```javascript
destroyer: {
    name: 'Destroyer',
    speed: 1.1,
    attack: 6,
    defense: 4,
    hp: 10,
    cost: { energy: 35, minerals: 40, food: 7 },
    buildTime: 3
}
```

2. **Update shipyard UI** in `js/uiManager.js` (`updateShipyardPanel()` function):
- Add HTML for new ship card
- Include stats and build button

3. **Update AI logic** in `js/aiSystem.js` (`aiDecideBuild()` function):
- Add destroyer to military ship pool
- Adjust building probabilities

### Adding a New Resource

1. **Update player initialization** in `js/gameState.js`:
```javascript
resources: {
    energy: 100,
    minerals: 100,
    food: 100,
    crystals: 50  // New resource
}
```

2. **Update resource generation** in `js/turnSystem.js` (`collectResources()` function):
```javascript
planet.resources.crystals = Math.floor(Math.random() * 11) + 5;
```

3. **Update UI displays**:
- Resource counter in `index.html`
- Planet panel in `js/uiManager.js`
- Shipyard cost displays in `js/uiManager.js`

4. **Update ship costs** in `js/config.js`

### Modifying Combat

**Damage Formula Location**: `js/combatSystem.js` in `resolveCombat()` function

Current formula:
```javascript
let damage = attacker.attack * (0.5 + Math.random() * 0.5);
damage = Math.max(1, damage - defender.defense);
```

Modifications could include:
- Critical hits
- Terrain bonuses
- Fleet composition bonuses
- Morale system

### Adding Save/Load

**State Serialization** - Add to `js/gameState.js`:
```javascript
export function saveGame() {
    const saveData = JSON.stringify(gameState);
    localStorage.setItem('4x_save', saveData);
}

export function loadGame() {
    const saveData = localStorage.getItem('4x_save');
    if (saveData) {
        Object.assign(gameState, JSON.parse(saveData));
        // Reinitialize UI
    }
}
```

**Recommended implementation**:
1. Add save button to `index.html`
2. Auto-save every turn in `js/turnSystem.js`
3. Load on game start in `js/main.js` if save exists
4. Handle version compatibility

### Performance Optimization

**Current bottlenecks**:
1. **Rendering**: Full canvas redraw every frame
   - **Solution**: Only redraw changed regions
   - **Implementation**: Track dirty rectangles

2. **Planet collision checks**: O(n²) for planet generation
   - **Solution**: Spatial hashing
   - **Implementation**: Grid-based lookup

3. **AI calculations**: Runs sequentially
   - **Solution**: Web Workers for AI
   - **Implementation**: Offload AI to separate thread

**Optimization priorities**:
1. Reduce unnecessary `render()` calls
2. Implement object pooling for ships
3. Cache calculated distances
4. Use requestAnimationFrame more efficiently

### Browser Compatibility

**Tested on**:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Known issues**:
- Touch events may behave differently on some Android devices
- Canvas performance varies on older hardware
- Font loading may delay initial render

**Polyfills needed** (for older browsers):
- `requestAnimationFrame`
- `Math.sign()`
- `Array.find()`

---

## Appendix: Quick Reference

### Keyboard Shortcuts
- **Space**: End turn
- **Escape**: Close panels/dialogs
- **Mouse Wheel**: Zoom in/out
- **Click + Drag**: Pan camera

### Touch Gestures
- **Tap**: Select planet
- **Drag**: Pan camera
- **Pinch**: Zoom in/out
- **Two-finger drag**: Pan with inertia

### Common Task Flows

**Colonizing a Planet**:
1. Select planet with Colonizer
2. Click on neutral planet
3. Click "Send Ships"
4. Select Colonizer ship
5. Click "Send Selected Ships"
6. Wait for arrival
7. Wait 1 turn for colonization to complete

**Attacking an Enemy**:
1. Select planet with military ships
2. Click on enemy planet
3. Click "Send Ships"
4. Select attack force
5. Click "Send Selected Ships"
6. Choose "Fight" in battle dialog
7. View combat results

**Building Ships**:
1. Select owned planet
2. Click "Build Ships"
3. Choose ship type
4. Click "Build [Ship]"
5. Wait for construction (shown in build queue)

### File Modification Checklist

When modifying the game:
- [ ] Test on multiple browsers
- [ ] Test touch controls on mobile
- [ ] Verify AI still functions
- [ ] Check for console errors
- [ ] Test victory/defeat conditions
- [ ] Verify save/load (if implemented)
- [ ] Update this documentation

---

## Credits

**Game Design & Development**: Created with Claude AI
**Architecture**: Single-file HTML5 canvas game
**Fonts**: Orbitron, Exo 2 (Google Fonts)
**Inspired By**: Civilization, Master of Orion, Stellaris

---

**Last Updated**: 2026-02-05
**Version**: 2.1.0
**Documentation**: Complete

---

## Recent Changes (v2.1.0)

### New Features
- **Enhanced AI difficulty system**: Complete overhaul with distinct strategic differences between levels
  - **Strategic Intelligence**: Easy=random, Medium=nearest/weakest, Hard=optimal (value/defense analysis)
  - **Fleet Coordination**: Medium and Hard AI coordinate attacks from multiple planets
  - **Fleet Composition**: Variable attack ratios (40%/60%/80%), escort sizes (1/2/4), overkill factors (0.5/1.0/1.5)
  - **Defensive Behaviors**: Home defense reserves (0%/20%/30%), counter-attack logic for Hard AI

### Technical Details
- New AI config parameters: `targetingStrategy`, `fleetCoordination`, `attackForceRatio`, `escortSize`, `overkillFactor`, `defenseThreshold`, `homeDefenseRatio`, `counterAttackEnabled`
- New AI functions: `aiCoordinatedMovement()`, `coordinateAttackOnTarget()`, `selectTarget()`, `findBestColonizationTarget()`, `findOptimalAttackTarget()`, `getAvailableMilitary()`, `calculatePlanetStrength()`, `sendFleet()`, `recordPlayerAttack()`
- Counter-attack tracking with `recentlyAttackedPlanets` array

---

## Previous Changes (v2.0.12)

### Improvements
- **Wider launch menu columns**: Both columns now 480px wide to fit 3 planet name buttons per row
- **Leaderboard by difficulty**: Restructured to show Easy/Medium/Hard sections with personal best and global top 5 for each

### Bug Fixes
- **Battle consolidation**: Multiple ship groups arriving at same planet now trigger single combined battle
- **Colonizer protection**: Colonizers with military escorts are now protected (die last in combat)
