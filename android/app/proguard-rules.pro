# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# Native module của app (tên class được bridge/RN tra cứu).
-keep class com.qlts_app_2.** { *; }

# React Native / Hermes
-keep class com.facebook.hermes.unicode.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# WebView: method @JavascriptInterface gọi từ JS.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Vision Camera (quét QR)
-keep class com.mrousavy.camera.** { *; }
-dontwarn com.mrousavy.camera.**

# Video (ExoPlayer/Media3)
-keep class com.brentvatne.** { *; }
-dontwarn com.brentvatne.**

# Notifee + Firebase Messaging
-keep class io.invertase.notifee.** { *; }
-keep class app.notifee.** { *; }
-keep class io.invertase.firebase.** { *; }
-dontwarn io.invertase.**

# Keychain
-keep class com.oblador.keychain.** { *; }
-dontwarn com.oblador.keychain.**

# Play In-App Update
-keep class com.google.android.play.core.** { *; }
-dontwarn com.google.android.play.core.**

# Giữ số dòng trong stacktrace crash (Play tự deobfuscate bằng mapping trong AAB).
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
