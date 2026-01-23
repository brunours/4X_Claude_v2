# Release Notes

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
