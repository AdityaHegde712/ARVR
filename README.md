# ARVR — Android AR Furniture Visualizer

An offline-first Android augmented reality (AR) application built with Kotlin, Jetpack Compose, ARCore, SceneView 4.30 (Filament 3D rendering), and on-device ML depth estimation.

---

## Features
- **Surface Plane Detection & Tracking**: Real-time horizontal and vertical plane tracking via Google ARCore.
- **3D Asset Placement & Manipulation**: Interactive furniture placement (`.glb` models) with support for surface dragging, pinch-to-scale, and yaw rotation.
- **Dual Depth Pipeline**:
  - **ARCore Depth API**: Hardware depth map generation for real-world geometry occlusion.
  - **ML Depth Fallback**: On-device monocular depth estimation powered by Depth Anything V2 Small Float TFLite model (~94.3 MB).
- **Extensible Model Provider**: Clean `ModelProvider` layer supporting bundled local assets today, with architectural stubs prepared for remote marketplace integrations.
- **Declarative Compose UI**: Reactive Material 3 interface overlays for model browsing, live status diagnostics, crosshair alignment, and depth mode switching.

---

## Project Structure
```
├── app/
│   ├── src/
│   │   ├── main/
│   │   │   ├── assets/
│   │   │   │   ├── ml/          # Depth Anything V2 TFLite model
│   │   │   │   └── models/      # Bundled 3D GLB furniture assets
│   │   │   └── java/com/arvr/app/
│   │   │       ├── ar/          # ARSceneHost, DepthManager, PlacementController, MLDepthSource
│   │   │       ├── model/       # FurnitureModel, ModelRepository, ModelProvider
│   │   │       ├── ui/          # ModelPickerSheet, TopBar, DepthToggle, Overlays
│   │   │       └── MainActivity.kt
│   │   ├── test/                # Local JVM unit tests (JUnit 5 + Mockk)
│   │   └── androidTest/         # Instrumented AndroidX / Compose UI tests
├── gradle/                      # Gradle wrapper configuration
├── build.gradle.kts             # Top-level build configuration
├── settings.gradle.kts          # Module settings
└── legacy-web-app/              # Archived web version
```

---

## Prerequisites
- **JDK**: OpenJDK 17 or newer (JDK 25 supported).
- **Android SDK**: Min SDK 29 (Android 10), Target SDK 34 (Android 14).
- **Target Device**: Physical Android device with Google Play Services for AR (ARCore) installed.

---

## Build & Test Commands

### Run JVM Unit Tests
```powershell
.\gradlew.bat :app:testDebugUnitTest --no-daemon
```

### Build Debug APK
```powershell
.\gradlew.bat :app:assembleDebug --no-daemon
```
The resulting APK is written to:
`app/build/outputs/apk/debug/app-debug.apk`

### Install on Connected Device
```powershell
adb install -r app\build\outputs\apk\debug\app-debug.apk
```

### Run Instrumented Tests (on attached device)
```powershell
.\gradlew.bat :app:connectedDebugAndroidTest
```
