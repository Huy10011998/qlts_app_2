#!/bin/sh

set -e

echo "=== Installing CocoaPods dependencies ==="

# Di chuyển vào thư mục ios
cd "$CI_PRIMARY_REPOSITORY_PATH/ios"

# Cài CocoaPods nếu chưa có
if ! command -v pod &> /dev/null; then
    echo "Installing CocoaPods..."
    sudo gem install cocoapods
fi

# Chạy pod install
pod install --repo-update

echo "=== pod install completed ==="