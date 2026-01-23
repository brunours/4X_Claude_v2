# Release Notes

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
