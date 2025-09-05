#!/bin/bash

# Exit on error
set -e

echo "🚀 Starting release process..."

# Step 1: Ask for version
read -p "Enter release version (e.g. v1.1.1): " VERSION

if [[ -z "$VERSION" ]]; then
  echo "❌ Version cannot be empty."
  exit 1
fi

# Strip leading "v" if present for pnpm version
VERSION_NUMBER=${VERSION#v}

# Step 2: Checkout develop and pull latest
echo "📥 Checking out develop branch..."
git checkout develop
git pull origin develop

# Step 3: Create release branch
RELEASE_BRANCH="release/$VERSION"
echo "🌱 Creating release branch $RELEASE_BRANCH..."
git checkout -b $RELEASE_BRANCH

# Step 4: Update version (pnpm project)
if [ -f "package.json" ]; then
  echo "📦 Updating package.json version to $VERSION_NUMBER using pnpm..."
  pnpm version $VERSION_NUMBER --no-git-tag-version
  git add package.json pnpm-lock.yaml 2>/dev/null || true
  git commit -m "release(root): prepare $VERSION"
else
  echo "⚠️ package.json not found, skipping pnpm version bump."
  git commit --allow-empty -m "release(root): prepare $VERSION"
fi

# Step 5: Push release branch
echo "⬆️ Pushing release branch..."
git push origin $RELEASE_BRANCH

# Step 6: Open GitHub PR
if command -v gh &> /dev/null; then
  echo "🔗 Creating pull request into main..."
  gh pr create --base main --head $RELEASE_BRANCH \
    --title "[Root] [Release]: $VERSION" \
    --body "## Summary
Release $VERSION prepared.

## Highlights
- Version bump
- Ready for production deploy

## Impact
- Affects release process only
- No breaking changes"
else
  echo "⚠️ GitHub CLI (gh) not installed. Please open PR manually."
  echo "   👉 PR from $RELEASE_BRANCH into main"
fi

echo "✅ Release branch created: $RELEASE_BRANCH"
echo "👉 Next steps:"
echo "   1. Review and merge PR into main."
echo "   2. After merge, tag release:"
echo "      git checkout main && git pull origin main"
echo "      git tag -a $VERSION -m \"Version $VERSION\""
echo "      git push origin $VERSION"
echo "   3. Sync develop with main:"
echo "      git checkout develop && git merge main && git push origin develop"
echo "   4. Delete release branch:"
echo "      git branch -d $RELEASE_BRANCH && git push origin --delete $RELEASE_BRANCH"
