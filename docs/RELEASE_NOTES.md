# Release Notes

## Version 1.0.4 - 24/01/2026 02:30

### New Feature: Empire Color Customization
- **Empire color selection**: Choose your empire's visual identity from 5 color options
  - Color palette: Blue (default), Red, Green, White, Orange
  - Visual color tiles in start menu for easy selection
  - Selected colors apply to planets, ships, UI elements, and influence zones
  - Mutual exclusion: Player and AI cannot share the same color

- **AI empire color selection**: Customize the AI opponent's colors
  - Same 5-color palette available
  - Default color: Red
  - Visual feedback: Color chosen by one empire shows as crossed/disabled for the other

- **Influence zone transparency control**: Adjust visibility of territorial zones
  - Slider control ranging from 10% (subtle) to 50% (strong)
  - Real-time value display showing current transparency percentage
  - Fine-tuned control with 5% increments

- **Settings persistence**: Preferences saved automatically using localStorage
  - Color choices and transparency settings remembered between sessions
  - Settings restored automatically when returning to the game
  - Consistent experience across play sessions

### Visual Enhancements
- Color tiles with hover effects and selection states
- Crossed-out diagonal lines for disabled color options
- Custom slider styling with player color theme
- Planet glow effects now use custom empire colors
- Influence zones render with selected colors and transparency

### Technical Implementation
- Added COLOR_OPTIONS configuration with hex and rgba values for each color
- Implemented getPlayerColor(), getAIColor(), getOwnerColor() helper functions
- Created saveSettings() and loadSettings() for localStorage persistence
- Updated renderer.js to use dynamic colors for planet glows
- Updated influenceZones.js to use custom colors and transparency
- Added updateColorPickers() for mutual exclusion logic
- Files modified: `js/gameState.js`, `js/renderer.js`, `js/influenceZones.js`, `index.html`, `css/style.css`

---

## Version 1.0.3 - 24/01/2026 00:15

### New Feature: Influence Zones
- **Added Voronoi diagram visualization**: Display territorial influence zones across the galaxy
  - Transparent blue zones for player-controlled territory
  - Transparent red zones for AI-controlled territory
  - Neutral planets don't create zones (absorbed by nearest owner)
  - Influence zones weighted by planet strength (population + ships + production)
  - Moderate opacity (25%) for clear visibility without obscuring the map

- **Toggle controls**: Show/hide influence zones on demand
  - Added 🗺️ button in top UI bar next to "End Turn"
  - Keyboard shortcut: Press 'I' to toggle zones on/off
  - Visual feedback when toggling (notification + button highlight)
  - Zones update automatically each turn

### Technical Implementation
- Created new `influenceZones.js` module for zone calculations
- Custom Voronoi diagram algorithm using weighted site distribution
- Influence strength calculation: population + (ships × 5) + (production × 2)
- Zone cache invalidation system for performance optimization
- Files modified: `js/influenceZones.js` (new), `js/renderer.js`, `js/inputHandler.js`, `index.html`, `css/style.css`

---

## Version 1.0.2 - 23/01/2026 23:45

### Combat System Overhaul
- **Rewrote combat calculation system**: Combat now uses realistic HP-based round-by-round calculations instead of abstract strength values
  - Ships now have specific attack power and hit points as per user requirements:
    - Colonizer: 0 attack, 1 HP
    - Scout: 2 attack, 2 HP
    - Frigate: 7 attack, 5 HP
    - Battleship: 15 attack, 10 HP
  - Removed defense stat (all ships have 0 defense)
  - Combat resolves in rounds where each fleet fires at the other until one side is eliminated
  - Added ±15% randomness per round for unpredictability
  - Damage is distributed across fleet weighted by HP (bigger ships are bigger targets)
  - Equal strength battles now result in significant damage to the winner
  - Defender advantage changed from strength multiplier to 10% HP bonus

- **Enhanced withdrawal mechanics**: Ships can now retreat to friendly planets during battle
  - Withdrawing forces take 30-40% of defender firepower as damage before retreating
  - Players can choose which friendly planet to retreat to (if multiple options available)
  - Auto-retreat if only one friendly planet available
  - Ships destroyed if no friendly planets available for retreat
  - Retreat options include origin planet and all other friendly planets
  - Files modified: `js/combatSystem.js`, `js/inputHandler.js`, `js/turnSystem.js`

### Features
- New retreat destination selection dialog for tactical withdrawals
- Casualty tracking during retreat operations
- Improved combat balance with realistic damage calculations

### Files Modified
- `js/config.js`: Updated ship stats (attack, HP) to match requirements
- `js/combatSystem.js`: Complete combat algorithm rewrite, added retreat mechanics
- `js/inputHandler.js`: Added completeRetreat window function
- `js/turnSystem.js`: Added retreat options to battle pending data
- `index.html`: Version updated to v1.0.2

---

## Version 1.0.1 - 23/01/2026 22:30

### Bug Fixes
- **Fixed colonization bug**: Colonizers now properly colonize neutral planets when arriving alone
  - Issue: Colonizers would arrive at neutral planets, set ownership and population, but then `processEmptyPlanets()` would immediately revert the planet to neutral
  - Root cause: `processEmptyPlanets()` was checking for planets with owners but no ships, and newly colonized planets (where the colonizer is consumed) matched this pattern
  - Solution: Added check to skip planets with population > 0 in `processEmptyPlanets()`, protecting newly colonized planets from being incorrectly neutralized
  - Files modified: `js/turnSystem.js`

### Features
- **Added version display**: Game version now shown in bottom right corner with semi-transparent small text
  - Files modified: `index.html`, `css/style.css`

### Documentation
- Created `docs/` folder for all documentation files
- Moved `README.md` and `DOCUMENTATION.md` to `docs/` folder
- Created `RELEASE_NOTES.md` to track version changes
- Updated DOCUMENTATION.md with latest file structure and bug fixes

---

## Version 1.0.0 - 21/01/2026 18:00

### Initial Release
- Complete 4X space strategy game with turn-based mechanics
- Ship construction system (Scout, Colonizer, Frigate, Battleship)
- Combat system with battle dialogs and damage calculations
- Planet colonization mechanics
- AI opponent with difficulty levels (Easy, Medium, Hard)
- Resource management (Energy, Minerals, Food)
- Population growth system
- Victory/defeat conditions
- Three galaxy sizes (Compact, Standard, Vast)
- Camera controls (pan, zoom)
- Touch support for mobile devices
- Modular architecture with 11 JavaScript modules
- Complete documentation and deployment guides
