#!/bin/zsh
set -e

BUILD_NUMBER="20"

cd "$CI_WORKSPACE/ios"

xcrun agvtool new-version -all "$BUILD_NUMBER"
