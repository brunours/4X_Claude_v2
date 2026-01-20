#!/bin/bash
# Extract Turn System (lines 2347-2837)
sed -n '2347,2837p' 4x-space-game.html > /tmp/turnSystem_raw.txt

# Extract AI System (lines 2838-3033)
sed -n '2838,3033p' 4x-space-game.html > /tmp/aiSystem_raw.txt

# Extract UI Functions (lines 1739-2280)
sed -n '1739,2280p' 4x-space-game.html > /tmp/uiManager_raw.txt

# Extract Event Handlers (lines 1383-1738)
sed -n '1383,1738p' 4x-space-game.html > /tmp/inputHandler_raw.txt

echo "Sections extracted"
