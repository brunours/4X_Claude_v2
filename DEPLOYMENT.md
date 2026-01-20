# Deploying 4X Space Game to GitHub Pages

This guide will help you host the game online using GitHub Pages.

## Prerequisites

- GitHub account
- Git configured on your machine

## Step 1: Configure Git (One-time setup)

If you haven't configured git yet, run these commands:

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

## Step 2: Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `4X-Space-Game` (or your preferred name)
3. Description: "A 4X space strategy game built with vanilla JavaScript"
4. Choose "Public" (required for free GitHub Pages)
5. **Do NOT initialize with README, .gitignore, or license** (we already have files)
6. Click "Create repository"

## Step 3: Commit and Push Code

The repository has already been initialized. Now commit and push:

```bash
# Commit the modularized game files
git commit -m "Modularize 4X Space Game into maintainable components

Split monolithic 3,370-line HTML file into 13 focused modules:
- Separated CSS, HTML, and JavaScript
- Implemented ES6 module system with proper imports/exports
- Organized by functionality (game state, rendering, combat, AI, etc.)
- Maintained full game functionality while improving maintainability

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# Add the GitHub remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/4X-Space-Game.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## Step 4: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click "Settings" tab
3. Scroll down to "Pages" in the left sidebar
4. Under "Source", select "Deploy from a branch"
5. Under "Branch", select "main" and "/ (root)"
6. Click "Save"

## Step 5: Access Your Game

After a few minutes, your game will be available at:

```
https://YOUR_USERNAME.github.io/4X-Space-Game/
```

GitHub will show you the exact URL in the Pages settings.

## Alternative: Quick Local Testing

If you just want to test locally without deploying, you can:

### Option 1: Simple HTTP Server (Python)
```bash
# Python 3
python -m http.server 8000

# Then visit: http://localhost:8000
```

### Option 2: Simple HTTP Server (Node.js)
```bash
# Install http-server globally
npm install -g http-server

# Run in project directory
http-server

# Then visit: http://localhost:8080
```

### Option 3: VS Code Live Server
1. Install "Live Server" extension in VS Code
2. Right-click `index.html`
3. Select "Open with Live Server"

## Troubleshooting

### CORS Errors
If you see CORS errors in the browser console, you must use a local web server (not just opening the file directly). ES6 modules require HTTP/HTTPS protocols.

### Game Not Loading
1. Check browser console (F12) for errors
2. Ensure all files are committed and pushed
3. Wait a few minutes after enabling GitHub Pages
4. Hard refresh the page (Ctrl+F5 or Cmd+Shift+R)

### Module Import Errors
Ensure your browser supports ES6 modules (all modern browsers do):
- Chrome 61+
- Firefox 60+
- Safari 11+
- Edge 16+

## Repository Structure

```
4X_Claude/
├── index.html              # Main entry point
├── css/
│   └── style.css          # Game styles
├── js/
│   ├── config.js          # Game constants
│   ├── gameState.js       # State management
│   ├── renderer.js        # Canvas rendering
│   ├── inputHandler.js    # Event handlers
│   ├── camera.js          # Camera utilities
│   ├── uiManager.js       # UI panels
│   ├── shipSystem.js      # Ship mechanics
│   ├── turnSystem.js      # Turn processing
│   ├── combatSystem.js    # Battle resolution
│   ├── aiSystem.js        # AI logic
│   └── main.js            # Initialization
├── README.md              # Project description
└── DEPLOYMENT.md          # This file
```

## What's Next?

Once deployed, you can share your game URL with anyone! The game runs entirely in the browser with no backend required.

For development:
- Make changes to the code
- Test locally with a web server
- Commit and push to update the live version
- Changes appear on GitHub Pages within 1-2 minutes
