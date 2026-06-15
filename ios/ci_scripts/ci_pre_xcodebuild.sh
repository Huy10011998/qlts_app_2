#!/bin/zsh
set -e

BUILD_NUMBER="20"

SCRIPT_DIR="${0:A:h}"
IOS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$IOS_DIR"

xcrun agvtool new-version -all "$BUILD_NUMBER"
