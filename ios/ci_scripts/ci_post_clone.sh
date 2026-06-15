#!/bin/zsh
set -e

export HOMEBREW_NO_INSTALL_CLEANUP=TRUE
export HOMEBREW_NO_AUTO_UPDATE=1

SCRIPT_DIR="${0:A:h}"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
IOS_DIR="$REPO_ROOT/ios"

brew list node@22 >/dev/null 2>&1 || brew install node@22
brew link node@22 --force >/dev/null 2>&1 || true
brew list yarn >/dev/null 2>&1 || brew install yarn
brew list cocoapods >/dev/null 2>&1 || brew install cocoapods
brew list cmake >/dev/null 2>&1 || brew install cmake

cd "$REPO_ROOT"
yarn install --frozen-lockfile

cd "$IOS_DIR"
pod install
