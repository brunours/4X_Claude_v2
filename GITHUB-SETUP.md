# GitHub Repository Setup - Quick Start

Your local repository is ready to push! Follow these steps to create the GitHub repository and get your game URL.

## Prerequisites

You need a GitHub account. If you don't have one, create it at https://github.com/join

## Step-by-Step Instructions

### 1. Create the GitHub Repository

1. Go to https://github.com/new
2. Fill in the repository details:
   - **Repository name**: `4X-Space-Game` (or your preferred name)
   - **Description**: `A 4X space strategy game built with vanilla JavaScript`
   - **Visibility**: Select **Public** (required for free GitHub Pages)
   - **IMPORTANT**: Do NOT check any of these boxes:
     - ❌ Add a README file
     - ❌ Add .gitignore
     - ❌ Choose a license
3. Click **"Create repository"**

### 2. Push Your Code to GitHub

GitHub will show you a page with setup instructions. Since you already have a repository, use these commands:

```bash
# Replace YOUR_USERNAME with your GitHub username
git remote add origin https://github.com/YOUR_USERNAME/4X-Space-Game.git

# Rename branch to main (GitHub's default)
git branch -M main

# Push your code
git push -u origin main
```

**Example** (if your username is "johnsmith"):
```bash
git remote add origin https://github.com/johnsmith/4X-Space-Game.git
git branch -M main
git push -u origin main
```

You'll be prompted for your GitHub credentials:
- Username: Your GitHub username
- Password: Your GitHub Personal Access Token (not your account password)

> **Note**: GitHub requires a Personal Access Token instead of password.
> Create one at: https://github.com/settings/tokens/new
> - Give it a name like "4X Game Deploy"
> - Set expiration (or choose "No expiration" for convenience)
> - Check the "repo" scope
> - Click "Generate token"
> - Copy the token and use it as your password

### 3. Enable GitHub Pages

1. Go to your repository on GitHub
2. Click the **"Settings"** tab (top right)
3. In the left sidebar, click **"Pages"** (under "Code and automation")
4. Under **"Source"**, select **"Deploy from a branch"**
5. Under **"Branch"**:
   - Select **"main"** from the first dropdown
   - Select **"/ (root)"** from the second dropdown
6. Click **"Save"**

### 4. Get Your Game URL

After enabling Pages, GitHub will show a message like:
```
Your site is ready to be published at https://YOUR_USERNAME.github.io/4X-Space-Game/
```

The game will be live within 1-2 minutes!

## What's in Your Repository

Your local repository includes:
- ✅ All modularized game files (HTML, CSS, JS modules)
- ✅ README.md with project description
- ✅ DEPLOYMENT.md with detailed deployment guide
- ✅ Two commits with proper commit messages

## Verification

After pushing, verify your repository contains:
- `index.html`
- `css/style.css`
- `js/` folder with 11 JavaScript modules
- `README.md`
- `DEPLOYMENT.md`

## Troubleshooting

### Issue: "fatal: remote origin already exists"
```bash
# Remove the existing remote and add it again
git remote remove origin
git remote add origin https://github.com/YOUR_USERNAME/4X-Space-Game.git
```

### Issue: Authentication failed
- Make sure you're using a Personal Access Token, not your password
- Create a new token at https://github.com/settings/tokens/new
- Ensure the token has "repo" scope selected

### Issue: Repository already exists on GitHub
If you already created a repository with the same name:
```bash
# Option 1: Use a different repository name
git remote add origin https://github.com/YOUR_USERNAME/4X-Space-Game-v2.git

# Option 2: Delete the existing repository and create a new one
# Go to Settings → Danger Zone → Delete this repository
```

### Issue: Can't push to main branch
```bash
# Force push (only if you're sure)
git push -u origin main --force
```

## Quick Commands Reference

```bash
# Check remote URL
git remote -v

# Check current branch
git branch

# Check git status
git status

# View commit history
git log --oneline

# Update README and push changes
git add README.md
git commit -m "Update README"
git push
```

## Next Steps After Deployment

Once your game is live:

1. **Test the game** at your GitHub Pages URL
2. **Share the URL** with friends or on social media
3. **Make updates** by editing files locally, committing, and pushing:
   ```bash
   git add .
   git commit -m "Description of changes"
   git push
   ```
4. **Monitor deployments** in Settings → Pages

## Your Current Repository Status

```
Repository: Initialized ✅
Commits: 2 commits created ✅
Files staged: All modularized game files ✅
Ready to push: YES ✅
```

## Get Started Now!

Run these commands (replace YOUR_USERNAME):

```bash
git remote add origin https://github.com/YOUR_USERNAME/4X-Space-Game.git
git branch -M main
git push -u origin main
```

Then enable GitHub Pages in repository settings, and your game will be live!
