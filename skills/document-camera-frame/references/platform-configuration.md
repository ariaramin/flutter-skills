# Platform Configuration & Build Hardening

Configuration rules for building `document_camera_frame` on Android and iOS.

---

## 1. Android Configuration

### 1.1 CameraX 1.6 & compileSdk 36
The underlying `camera` plugin (`camera_android_camerax`) depends on CameraX 1.6+, which enforces `compileSdk 36`.
In `android/app/build.gradle`:
```groovy
android {
    compileSdkVersion 36

    defaultConfig {
        minSdkVersion 24
        targetSdkVersion 36
    }
}
```

### 1.2 Android Permissions & Hardware
In `android/app/src/main/AndroidManifest.xml`:
```xml
<manifest ...>
    <uses-feature android:name="android.hardware.camera" android:required="true" />
    <uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />

    <uses-permission android:name="android.permission.CAMERA" />

    <application ...>
        <!-- Pre-download ML Kit models upon app install -->
        <meta-data
            android:name="com.google.mlkit.vision.DEPENDENCIES"
            android:value="ocr,document_scanner" />
    </application>
</manifest>
```

---

## 2. iOS Configuration

### 2.1 Info.plist Permissions
Declare camera and microphone permissions in `ios/Runner/Info.plist`:
```xml
<key>NSCameraUsageDescription</key>
<string>Camera access is required to frame and capture documents.</string>
<key>NSMicrophoneUsageDescription</key>
<string>Microphone access is validated by the camera subsystem.</string>
```

### 2.2 Podfile Minimum Deployment Target
Google ML Kit pods require iOS 15.5+.
In `ios/Podfile`:
```ruby
platform :ios, '15.5'
```
