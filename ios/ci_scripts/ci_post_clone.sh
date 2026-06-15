#!/bin/zsh
set -e

export HOMEBREW_NO_INSTALL_CLEANUP=TRUE

brew install node@22
brew link node@22 --force
brew install yarn
brew install cocoapods

cd "$CI_WORKSPACE"
yarn install --frozen-lockfile

cd ios
pod install
