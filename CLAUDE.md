# Claude Code Project Instructions

## Project: 4X Space Conquest Game

This file contains instructions that Claude Code must follow for every code change in this project.

---

## Mandatory Post-Change Checklist

After making ANY code changes to the game, you MUST complete ALL of the following steps:

### 1. Update File Headers
- Update the `// Version:` comment in the modified file's header to reflect the new version
- Update any relevant documentation comments in the file header describing the change

### 2. Update Version Number
- Increment the version in `index.html` (look for `<div id="versionDisplay">`)
- Version format: `vX.Y.Z` where:
  - X = Major version (breaking changes, major features)
  - Y = Minor version (new features, significant changes)
  - Z = Patch version (bug fixes, small improvements)

### 3. Update Release Notes
- Add a new version section at the TOP of `docs/RELEASE_NOTES.md`
- Format:
  ```markdown
  ## Version X.Y.Z - DD/MM/YYYY

  ### Bug Fixes / New Features / Improvements
  - **Brief title**: Description of the change
    - Issue: What was the problem (if bug fix)
    - Root cause: Why it happened (if bug fix)
    - Solution: How it was fixed
    - Files modified: `path/to/file.js`

  ### Technical Implementation
  - Technical details about the changes made

  ---
  ```

### 4. Update Documentation
- Update `docs/DOCUMENTATION.md` if the change affects:
  - Game mechanics
  - User-facing features
  - API/function signatures
  - File structure
- Update the "Last Updated" date and "Version" at the bottom of the file
- Update the "Recent Changes" section at the bottom with the new version info

### 5. Git Commit and Push
- Stage only the relevant files (avoid staging unrelated files like `server.log`, `_ul`, `supabase/`)
- Commit with a descriptive message following this format:
  ```
  vX.Y.Z: Brief description of the change

  Longer explanation of what was changed and why.

  Changes:
  - List of specific changes made
  - Another change

  Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
  ```
- Push to the remote repository

---

## File Locations Reference

| Purpose | File Path |
|---------|-----------|
| Version display | `index.html` (search for `versionDisplay`) |
| Release notes | `docs/RELEASE_NOTES.md` |
| Full documentation | `docs/DOCUMENTATION.md` |
| Combat system | `js/combatSystem.js` |
| Turn processing | `js/turnSystem.js` |
| Game state | `js/gameState.js` |
| Configuration | `js/config.js` |
| AI logic | `js/aiSystem.js` |
| Rendering | `js/renderer.js` |
| UI management | `js/uiManager.js` |
| Input handling | `js/inputHandler.js` |
| Ship management | `js/shipSystem.js` |
| Influence zones | `js/influenceZones.js` |
| Camera controls | `js/camera.js` |
| Main entry point | `js/main.js` |

---

## Version History Convention

- Current version can be found in `index.html`
- All past versions are documented in `docs/RELEASE_NOTES.md`
- Each JS file has its own version comment in the header

---

## Files to Ignore in Git

Do not stage these files/folders:
- `server.log`
- `_ul/`
- `supabase/`
- `.claude/settings.local.json`

---

## Reminder

These steps are MANDATORY. Do not consider a task complete until all 5 steps above are finished. Always confirm with the user that the changes have been committed and pushed successfully.
