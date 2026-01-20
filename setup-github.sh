#!/bin/bash

# Setup script for creating GitHub repository and pushing code
# Replace YOUR_USERNAME with your actual GitHub username

GITHUB_USERNAME="YOUR_USERNAME"
REPO_NAME="4X-Space-Game"

echo "=================================="
echo "GitHub Repository Setup"
echo "=================================="
echo ""

# Check if username is set
if [ "$GITHUB_USERNAME" = "YOUR_USERNAME" ]; then
    echo "ERROR: Please edit this script and replace YOUR_USERNAME with your GitHub username"
    exit 1
fi

echo "Step 1: Creating GitHub repository..."
echo "Please go to: https://github.com/new"
echo ""
echo "Repository settings:"
echo "  - Name: $REPO_NAME"
echo "  - Description: A 4X space strategy game built with vanilla JavaScript"
echo "  - Public repository"
echo "  - Do NOT initialize with README, .gitignore, or license"
echo ""
read -p "Press ENTER after you've created the repository..."

echo ""
echo "Step 2: Adding remote repository..."
git remote add origin "https://github.com/$GITHUB_USERNAME/$REPO_NAME.git"

echo ""
echo "Step 3: Renaming branch to main..."
git branch -M main

echo ""
echo "Step 4: Pushing to GitHub..."
git push -u origin main

echo ""
echo "=================================="
echo "Setup Complete!"
echo "=================================="
echo ""
echo "Next steps:"
echo "1. Go to: https://github.com/$GITHUB_USERNAME/$REPO_NAME/settings/pages"
echo "2. Under 'Source', select 'Deploy from a branch'"
echo "3. Under 'Branch', select 'main' and '/ (root)'"
echo "4. Click 'Save'"
echo ""
echo "Your game will be available at:"
echo "https://$GITHUB_USERNAME.github.io/$REPO_NAME/"
echo ""
