---
name: 4X Game Workflow
description: Mandatory workflow for all code changes in the 4X Space Conquest Game project
---

# 4X Game Workflow Skill

This skill enforces the mandatory post-change checklist for the 4X Space Conquest Game project. Use this skill whenever making ANY code changes to ensure consistency and proper documentation.

## When to Use This Skill

Apply this skill **after making ANY code changes** to the game, including:
- Bug fixes
- New features
- Code refactoring
- Performance improvements
- UI/UX changes
- Configuration updates

## Mandatory Post-Change Checklist

Complete ALL of the following steps in order:

### Step 1: Update File Headers

For each modified file:
- Update the `// Version:` comment in the file's header to reflect the new version
- Update any relevant documentation comments in the file header describing the change

**Example:**
```javascript
// File: combatSystem.js
// Version: 2.3.1
// Description: Handles all combat calculations and ship battles
// Last Modified: 04/02/2026
```

### Step 2: Update Version Number

- Increment the version in `index.html` (search for `<div id="versionDisplay">`)
- Use semantic versioning format: `vX.Y.Z` where:
  - **X** = Major version (breaking changes, major features)
  - **Y** = Minor version (new features, significant changes)
  - **Z** = Patch version (bug fixes, small improvements)

**Location:** `index.html` - search for `versionDisplay`

### Step 3: Update Release Notes

- Add a new version section at the **TOP** of `docs/RELEASE_NOTES.md`
- Follow this format:

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

**Location:** `docs/RELEASE_NOTES.md`

### Step 4: Update Documentation

Update `docs/DOCUMENTATION.md` if the change affects:
- Game mechanics
- User-facing features
- API/function signatures
- File structure

Also update:
- "Last Updated" date at the bottom of the file
- "Version" at the bottom of the file
- "Recent Changes" section at the bottom with the new version info

**Location:** `docs/DOCUMENTATION.md`

### Step 5: Git Commit and Push

1. **Stage files carefully:**
   - Stage ONLY relevant files
   - **DO NOT stage:** `server.log`, `_ul`, `supabase/`, `.claude/settings.local.json`

2. **Commit with proper format:**
   ```
   vX.Y.Z: Brief description of the change

   Longer explanation of what was changed and why.

   Changes:
   - List of specific changes made
   - Another change

   Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
   ```

3. **Push to remote:**
   ```bash
   git push origin main
   ```

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

## Files to Ignore in Git

Never stage or commit these files/folders:
- `server.log`
- `_ul/`
- `supabase/`
- `.claude/settings.local.json`

## Version History Convention

- Current version: Found in `index.html`
- Past versions: Documented in `docs/RELEASE_NOTES.md`
- File-specific versions: Each JS file has its own version comment in the header

## Workflow Execution Tips

1. **Always read before acting:** Review the current version number before incrementing
2. **Be precise:** Only increment the appropriate version component (major/minor/patch)
3. **Document thoroughly:** Future maintainers rely on accurate release notes
4. **Test before commit:** Ensure changes work as expected before going through the workflow
5. **Verify remote push:** Confirm the push succeeded before marking task complete

## Critical Reminder

**These steps are MANDATORY.** Do not consider a code change task complete until ALL 5 steps above are finished. Always confirm with the user that the changes have been committed and pushed successfully.

## Example Usage

When asked to fix a bug or add a feature:

1. Make the code changes
2. Invoke this skill by viewing the SKILL.md file
3. Execute steps 1-5 in order
4. Confirm completion with the user

This ensures every change is properly versioned, documented, and tracked in the repository.
