#!/bin/bash

# Pre-deployment Verification Script
# This script verifies all items on the pre-deployment checklist

echo "=========================================="
echo "  Pre-Deployment Verification Checklist"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track overall status
ALL_CHECKS_PASSED=true

# Function to check if we're in a git repository
check_git_repo() {
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        echo -e "${RED}✗ Error: Not in a git repository${NC}"
        exit 1
    fi
}

# Function to check if we're on main branch
check_branch() {
    current_branch=$(git branch --show-current)
    if [ "$current_branch" != "main" ]; then
        echo -e "${YELLOW}⚠ Warning: Currently on branch '$current_branch', not 'main'${NC}"
        echo ""
    fi
}

# Check 1: Verify latest code is pushed
echo "[ ] Check 1: Verify latest code is pushed"
echo "----------------------------------------"
check_git_repo
check_branch

unpushed_commits=$(git log origin/main..HEAD --oneline 2>/dev/null)
if [ -z "$unpushed_commits" ]; then
    echo -e "${GREEN}✓ All local commits are pushed to origin/main${NC}"
else
    echo -e "${RED}✗ There are unpushed commits:${NC}"
    echo "$unpushed_commits"
    ALL_CHECKS_PASSED=false
fi
echo ""

# Check 2: Run git status to check for uncommitted changes
echo "[ ] Check 2: Check for uncommitted changes"
echo "----------------------------------------"
git_status=$(git status --porcelain)
if [ -z "$git_status" ]; then
    echo -e "${GREEN}✓ Working tree is clean (no uncommitted changes)${NC}"
else
    echo -e "${RED}✗ There are uncommitted changes:${NC}"
    git status
    ALL_CHECKS_PASSED=false
fi
echo ""

# Check 3: Commit any pending changes (informational)
echo "[ ] Check 3: Commit any pending changes"
echo "----------------------------------------"
if [ -z "$git_status" ]; then
    echo -e "${GREEN}✓ No pending changes to commit${NC}"
else
    echo -e "${YELLOW}⚠ Action needed: Commit pending changes with:${NC}"
    echo "   git add . && git commit -m \"your message\""
fi
echo ""

# Check 4: Push to main (informational)
echo "[ ] Check 4: Push to main"
echo "----------------------------------------"
if [ -z "$unpushed_commits" ]; then
    echo -e "${GREEN}✓ All commits are pushed to origin/main${NC}"
else
    echo -e "${YELLOW}⚠ Action needed: Push to main with:${NC}"
    echo "   git push origin main"
fi
echo ""

# Check 5: Confirm the latest commit hash matches what Vercel is building
echo "[ ] Check 5: Latest commit hash (compare with Vercel)"
echo "----------------------------------------"
latest_commit_hash=$(git rev-parse HEAD)
latest_commit_short=$(git rev-parse --short HEAD)
latest_commit_message=$(git log -1 --pretty=format:"%s")

echo -e "Latest local commit hash: ${GREEN}$latest_commit_hash${NC}"
echo -e "Short hash: ${GREEN}$latest_commit_short${NC}"
echo -e "Commit message: ${GREEN}$latest_commit_message${NC}"
echo ""
echo -e "${YELLOW}⚠ Manual step: Compare this hash with Vercel dashboard${NC}"
echo "   1. Go to Vercel Dashboard → Your Project → Deployments"
echo "   2. Check the commit hash of the latest deployment"
echo "   3. Verify it matches: $latest_commit_short"
echo ""

# Show remote commit for comparison
remote_commit_hash=$(git rev-parse origin/main 2>/dev/null)
if [ -n "$remote_commit_hash" ]; then
    remote_commit_short=$(git rev-parse --short origin/main)
    echo -e "Latest remote (origin/main) hash: ${GREEN}$remote_commit_hash${NC}"
    echo -e "Short hash: ${GREEN}$remote_commit_short${NC}"
    
    if [ "$latest_commit_hash" = "$remote_commit_hash" ]; then
        echo -e "${GREEN}✓ Local and remote are in sync${NC}"
    else
        echo -e "${YELLOW}⚠ Local and remote commit hashes differ${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Could not fetch remote commit hash${NC}"
    echo "   Run: git fetch origin"
fi
echo ""

# Summary
echo "=========================================="
echo "  Summary"
echo "=========================================="
if [ "$ALL_CHECKS_PASSED" = true ] && [ -z "$git_status" ]; then
    echo -e "${GREEN}✓ All automated checks passed!${NC}"
    echo -e "${YELLOW}⚠ Remember to manually verify the commit hash in Vercel${NC}"
    exit 0
else
    echo -e "${RED}✗ Some checks failed. Please address the issues above.${NC}"
    exit 1
fi























