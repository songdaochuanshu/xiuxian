#!/bin/bash
# 自动递增版本号：主版本.次版本.Git提交数
cd "$(dirname "$0")/.."
MAJOR=1
MINOR=0
PATCH=$(git rev-list --count HEAD)
VERSION="v${MAJOR}.${MINOR}.${PATCH}"
echo "export const APP_VERSION = '${VERSION}'" > src/version.ts
echo "Version bumped to ${VERSION}"
