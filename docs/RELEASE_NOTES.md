# Release Notes

## Version 2.0.9 - 04/02/2026

### New Features
- **Greek god planet names**: All planets are now named after Greek gods and mythological figures. The player's starting planet is always "Gaia". List includes 50 names covering all map sizes.

### Bug Fixes
- **Fix multiple battles in same turn**: When two or more battles occurred in the same turn, only the last battle was shown and earlier battles were silently lost (ships would disappear). Battles are now queued and resolved sequentially — each battle dialog appears one after the other.
  - Issue: Ships vanishing when multiple fleets arrived at hostile planets in the same turn
  - Root cause: `gameState.battlePending` was a single object that got overwritten by each subsequent battle detection
  - Solution: Added `gameState.battleQueue` array. Battles are pushed to the queue during turn processing, then shifted off one at a time for player resolution. After dismissing battle results, the next queued battle is shown automatically.
  - Files modified: `js/gameState.js`, `js/turnSystem.js`, `js/inputHandler.js`, `js/combatSystem.js`

### Technical Implementation
- Replaced `planetNames` array in `gameState.js` with 50 Greek god/goddess names (Gaia first for player start)
- Added `battleQueue: []` to gameState alongside existing `battlePending`
- `turnSystem.js`: `handleShipArrival()` and `processBuildQueues()` now push to `battleQueue` instead of overwriting `battlePending`
- `inputHandler.js`: Added `showNextBattle()` function that shifts battles from the queue into `battlePending` and shows the dialog
- `closeBattleResults()` now calls `showNextBattle()` to chain subsequent battles after each resolution

---

## Version 2.0.8 - 04/02/2026

### Bug Fixes

- **Handle authenticated users with missing profiles**: Users who are authenticated but have no profile in the database can now use the game without errors
  - Issue: If a user's profile was missing from the database (e.g., deleted or not yet created), sign-in and session restoration would silently fail, leaving the user in an unauthenticated state despite being logged in
  - Root cause: `signIn()` and `initAuth()` only called `setUserInfo()` when a profile was found, leaving `gameState.userId` as null
  - Solution: Added fallback logic that sets userId and derives a display name from the user's email when profile is missing. Added detailed error logging for profile fetch failures. Updated `showStartScreen()` to check `gameState.userId` instead of the profile object.
  - Files modified: `js/auth.js`, `js/main.js`

### Technical Implementation
- `signIn()` now falls back to email-derived display name when profile is missing
- `initAuth()` returns `{ authenticated: true, profile: null }` for authenticated users without profiles
- `getProfile()` logs detailed error information for debugging
- `showStartScreen()` uses `gameState.userId` to determine authentication state and `gameState.username` for display
- `applyProfileToUI()` is guarded behind a null check to prevent errors when profile is absent

---

## Version 2.0.7 - 04/02/2026

### New Features

- **Password Reset Functionality**: Users can now reset their password if they forget it
  - Added "Forgot password?" link on the login form
  - Password reset request form sends email via Supabase Auth
  - After clicking the email link, users can set a new password
  - Validates password match and minimum length (6 characters)
  - Automatic redirect to game after successful password update
  - Files modified: `js/auth.js`, `js/main.js`, `index.html`, `css/style.css`

### Technical Implementation
- Added `requestPasswordReset(email)` and `updatePassword(newPassword)` functions to `auth.js`
- Added `onAuthStateChange(callback)` to subscribe to Supabase auth events
- Detects `PASSWORD_RECOVERY` event when user clicks email reset link
- New HTML forms: forgot password form and update password form
- New CSS classes: `.forgot-password`, `.form-hint`, `.auth-success`

---

## Version 2.0.6 - 04/02/2026

### Bug Fixes

- **Fixed camera zoom constraints for multi-device support**: Users can now zoom out far enough to see all planets on any device (PC, iPad, etc.)
  - Issue: Unable to zoom out sufficiently to view entire galaxy map, especially on different screen sizes and orientations
  - Root cause: Camera had a hard-coded minimum zoom of 0.25 that prevented zooming out beyond a certain level, and the fit-to-screen zoom was enforced as an absolute minimum
  - Solution: 
    - Reduced absolute minimum zoom from 0.25 to 0.1 to allow more zoom-out capability
    - Changed camera initialization to use fit-to-screen zoom as starting point but not as enforced minimum
    - Enhanced `constrainCamera()` to center the world when zoomed out beyond fit-to-screen level
    - Updated `resizeCanvas()` to calculate and store fit-to-screen zoom without enforcing it
  - Technical improvements:
    - Made `camera.minZoom` truly dynamic (now 0.1 absolute minimum)
    - Added `camera.fitToScreenZoom` property to track ideal zoom level
    - World now centers in viewport when zoomed out far enough to see entire map
    - Works seamlessly on both landscape (PC) and portrait/landscape (tablet) orientations
  - Files modified: `js/gameState.js`

### Technical Implementation
- Updated camera object with new minZoom (0.1) and maxZoom (3)
- Modified `resizeCanvas()` to calculate but not enforce fit-to-screen zoom
- Enhanced `constrainCamera()` with conditional logic for centering vs. edge-clamping
- Modified `startGame()` to initialize zoom at fit-to-screen level while allowing further zoom-out
- Added comprehensive inline documentation for zoom behavior

---

## Version 2.0.5 - 28/01/2026

### UI Improvements

**Game Over Screen Fix**
- Battle dialogs (Under Attack, Battle Results) now automatically close when the game ends
- Only the game over screen (Victory/Defeat) is displayed when the game concludes
- Unified planet panel also closes to provide a clean end-game view
- Files modified: `js/uiManager.js`

**Shipyard Layout Improvement**
- Separated build options and build queue into distinct sections
- Build queue now displays as compact tags below the build options
- Queue items show ship icon and cumulative turns until completion
- Queue can scroll independently when many ships are queued
- Prevents build queue from pushing ship options to the right
- Files modified: `js/uiManager.js`, `css/style.css`

**Fleet Panel Redesign**
- Ships are now grouped by type instead of showing individual ships
- Each ship group shows: icon, name, available count, and selected count
- Click/tap on a ship group to select one ship of that type
- Click again to select another, or to deselect if all are selected
- Purple highlight indicates groups with selected ships
- Enemy ships displayed separately with red styling
- More compact and easier to manage large fleets
- Files modified: `js/uiManager.js`, `js/inputHandler.js`, `css/style.css`

### Technical Implementation
- Added `toggleShipTypeSelection(shipType)` function for group-based selection
- New CSS classes: `.ship-group`, `.ship-group-icon`, `.ship-group-info`, etc.
- Build queue uses flex-wrap layout with scrollable container
- Shipyard content uses flex column layout for proper section separation

---

## Version 2.0.4 - 28/01/2026

### Bug Fixes
- **Fixed colonizer destruction logic**: Colonizers are now properly destroyed when their army is defeated in battle
  - Issue: When an attacking or defending army was defeated, colonizers from the losing side would incorrectly survive the battle
  - Root cause: The `simulateCombat()` function unconditionally added colonizers back to the survivors list, regardless of whether their military escort had been eliminated
  - Solution: Colonizers are now only added to survivors if their side has surviving military ships; otherwise, they are added to the destroyed list
  - This ensures colonizers without friendly ships at a planet are automatically destroyed as intended
  - Files modified: `js/combatSystem.js`

### Technical Implementation
- Modified `simulateCombat()` function to check for surviving military ships before adding colonizers to survivors
- Colonizers from defeated armies are now properly tracked in the `destroyedAttackers` or `destroyedDefenders` arrays
- Updated combatSystem.js documentation comments to reflect this behavior

---

## Version 1.0.6 - 24/01/2026 05:00

### New Features: Continuous Territories and Improved Settings

**Default Settings Changes**
- Influence zones now visible by default on game start
- Default transparency reduced to 4% (down from 15%) for more subtle appearance
- More natural starting experience with territorial visualization

**Settings Menu Reorganization**
- Settings button moved to left of turn counter for better UI flow
- Removed standalone influence toggle button (🗺️) from top UI bar
- Added influence zones ON/OFF toggle switch inside settings menu
- Removed 'I' keyboard shortcut (zones controlled via settings only)
- Settings menu now centralized control point for all visual options

**Improved Voronoi Territory Visualization**
- Complete rewrite of Voronoi algorithm for continuous territories
- Territories now display as unified regions per empire (like countries)
- Changed from weighted zones to standard equal-sized Voronoi regions
- Removed planet strength weighting system
- Each planet contributes equally to territorial influence
- Player and enemy territories form single continuous colored areas
- More strategic and visually clear territorial representation

**Territory Algorithm**
- One site per owned planet (no artificial weighting)
- Nearest-neighbor algorithm determines territory boundaries
- Pixel-based rendering creates smooth continuous regions
- Territories automatically merge all planets of same owner
- Resolution: 10 pixels per sample for detailed boundaries

### Visual Enhancements
- Toggle switch styling with smooth animations
- Cleaner top UI with fewer buttons
- Settings panel shows both transparency slider and visibility toggle
- More intuitive control scheme for visual preferences

### Technical Implementation
- Rewrote influenceZones.js Voronoi generation algorithm
- Changed from circular metaballs to grid-based nearest-neighbor
- Simplified zone calculation (removed strength weighting code)
- Updated inputHandler.js event handlers for toggle switch
- Added toggle switch CSS with checked/unchecked states
- Updated default visibility state in influenceZones.js
- Files modified: `js/influenceZones.js`, `js/inputHandler.js`, `js/gameState.js`, `index.html`, `css/style.css`

---

## Version 1.0.5 - 24/01/2026 03:15

### New Features: Enhanced Color Options and In-Game Settings

**Purple Empire Color**
- Added purple as a sixth color option for both player and AI empires
- Purple positioned after red in the color spectrum for intuitive selection
- Full integration with planets, ships, UI elements, and influence zones

**Refined Transparency Range**
- Influence zone transparency range changed from 10-50% to 2-25%
- More subtle default transparency (15% instead of 25%)
- Finer control with 1% increments for precise visual tuning
- Better visibility while maintaining territorial awareness

**In-Game Settings Menu**
- New settings button (⚙️) in top UI bar next to influence toggle
- Access settings during gameplay without restarting
- Keyboard shortcut: Press 'S' to open settings, 'ESC' to close
- Modal overlay with backdrop blur for focused adjustment

**Real-Time Transparency Control**
- Adjust influence zone transparency while playing
- Mini slider (2-25%) with live percentage display
- Changes apply immediately to the game view
- Settings automatically saved to localStorage
- No need to restart game or return to start screen

### Visual Enhancements
- Settings panel with sci-fi themed styling matching game aesthetic
- Smooth backdrop blur effect on settings overlay
- Color tile count increased from 5 to 6 options
- Updated slider labels to show exact min/max values (2% / 25%)

### Technical Implementation
- Added purple color to COLOR_OPTIONS (#a855f7)
- Updated transparency range in gameState (0.02 to 0.25, default 0.15)
- Created settings overlay HTML structure with modal design
- Added CSS styling for settings panel, button, and overlay
- Implemented openSettings() and closeSettings() functions
- Added keyboard shortcuts for settings access (S key, ESC key)
- Integrated saveSettings() call on transparency slider change
- Connected invalidateZoneCache() to force zone re-rendering
- Files modified: `js/gameState.js`, `js/inputHandler.js`, `index.html`, `css/style.css`

---

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
