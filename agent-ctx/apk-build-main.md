# APK Build Task - AttendanceKhata Android WebView APK

## Task ID: apk-build

## Summary
Successfully built a real Android APK (WebView wrapper) for the AttendanceKhata web app at `https://my-project-alpha-bice.vercel.app`.

## Output
- **APK Location**: `/home/z/my-project/download/AttendanceKhata.apk`
- **APK Size**: 85 KB
- **Build Script**: `/home/z/my-project/scripts/build-apk.py`

## APK Details
- **Package Name**: `com.attendancekhata.app`
- **App Name**: AttendanceKhata
- **Version**: 1.0 (versionCode=1)
- **Min SDK**: 21 (Android 5.0 Lollipop)
- **Target SDK**: 34 (Android 14)
- **Primary Color**: #2563eb
- **Signature**: V1 (JAR) + V2 + V3 verified

## Key Decisions & Workarounds

### 1. JDK Installation
- System had only JRE (no `javac`), couldn't use `sudo apt install`
- Downloaded and extracted JDK 21 to `/home/z/my-project/jdk/` (user-space install)

### 2. aapt2 `--dir` Bug
- `aapt2 compile --dir` produced empty ZIP files (known issue in build-tools 34.0.0)
- **Fix**: Compile each resource file individually and pass all compiled zips to `aapt2 link`

### 3. d8 Anonymous Inner Class Crash
- d8 (r8 8.2.2-dev) crashes with `NullPointerException` on anonymous inner classes
- This happens regardless of Java source/target version (tested 1.8, 11)
- **Fix**: Replaced anonymous inner classes (`new WebViewClient() {...}`) with named static inner classes (`static class MyWebViewClient extends WebViewClient`)

### 4. Target SDK
- Initially missing `targetSdkVersion`, which caused implied permissions (WRITE_EXTERNAL_STORAGE, READ_PHONE_STATE)
- Added `android:targetSdkVersion="34"` to eliminate unwanted implied permissions

## Build Process (13 Steps)
1. Create project directories
2. Generate signing keystore (RSA 2048, 10000 day validity)
3. Write AndroidManifest.xml
4. Write MainActivity.java (with named inner classes for WebViewClient/WebChromeClient)
5. Write resource files (strings, colors, styles, network_security_config)
6. Generate app icons from icon-1024.png (5 densities: mdpi through xxxhdpi)
7. Compile resources with aapt2 (file by file)
8. Link resources with aapt2
9. Compile Java source with javac (target 1.8)
10. Convert .class to DEX with d8 (min-api 21)
11. Build unsigned APK (ZIP with classes.dex + resources)
12. Align APK with zipalign
13. Sign APK with apksigner

## Permissions
- INTERNET
- ACCESS_NETWORK_STATE
- ACCESS_FINE_LOCATION
- ACCESS_COARSE_LOCATION
- CAMERA

## Features
- WebView-based wrapper loading `https://my-project-alpha-bice.vercel.app`
- JavaScript enabled, DOM storage enabled
- Progress bar at top during page loading
- Back button navigates WebView history
- URL whitelisting: vercel.app, openstreetmap.org, ip-api.com, ipapi.co stay in WebView
- External URLs open in system browser
- Geolocation auto-granted
- Camera permission requests auto-granted
- Network security config allows cleartext traffic for vercel.app
- WebView debugging enabled
