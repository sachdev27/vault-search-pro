#!/bin/bash

# GitHub Pages Quick Setup Script
# This script helps you deploy the Vault Search Pro marketing site to GitHub Pages

set -e

echo "🚀 GitHub Pages Deployment Helper"
echo "=================================="
echo ""

# Check if we're in the right directory
if [ ! -d "docs" ]; then
    echo "❌ Error: docs/ folder not found"
    echo "Please run this script from the repository root"
    exit 1
fi

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "❌ Error: Not a git repository"
    echo "Please initialize git first: git init"
    exit 1
fi

echo "✅ Found docs/ folder"
echo "✅ Git repository detected"
echo ""

# Check for uncommitted changes
if [[ -n $(git status -s) ]]; then
    echo "📝 Uncommitted changes detected"
    echo ""
    git status -s
    echo ""
    read -p "Do you want to commit these changes? (y/n) " -n 1 -r
    echo ""

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "Enter commit message: " commit_msg
        git add docs/
        git commit -m "$commit_msg"
        echo "✅ Changes committed"
    else
        echo "⚠️  Skipping commit"
    fi
fi

# Push to GitHub
echo ""
echo "📤 Pushing to GitHub..."
current_branch=$(git branch --show-current)

if git push origin "$current_branch"; then
    echo "✅ Successfully pushed to GitHub"
else
    echo "❌ Failed to push to GitHub"
    echo "Please check your git remote and credentials"
    exit 1
fi

# Get repository info
repo_url=$(git config --get remote.origin.url)
if [[ $repo_url == git@github.com:* ]]; then
    # SSH format: git@github.com:user/repo.git
    repo_path=${repo_url#git@github.com:}
    repo_path=${repo_path%.git}
elif [[ $repo_url == https://github.com/* ]]; then
    # HTTPS format: https://github.com/user/repo.git
    repo_path=${repo_url#https://github.com/}
    repo_path=${repo_path%.git}
else
    echo "⚠️  Could not parse repository URL"
    repo_path="your-username/your-repo"
fi

echo ""
echo "🎉 Deployment initiated!"
echo ""
echo "📋 Next Steps:"
echo "1. Go to: https://github.com/$repo_path/settings/pages"
echo "2. Under 'Build and deployment':"
echo "   - Source: Deploy from a branch"
echo "   - Branch: $current_branch"
echo "   - Folder: /docs"
echo "3. Click 'Save'"
echo ""
echo "⏱️  GitHub Pages will deploy in 1-2 minutes"
echo "🌐 Your site will be live at:"
echo "   https://$(echo $repo_path | cut -d'/' -f1).github.io/$(echo $repo_path | cut -d'/' -f2)/"
echo ""
echo "💡 To update the site in the future:"
echo "   1. Edit files in docs/"
echo "   2. Run this script again"
echo ""
