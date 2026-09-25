# Android Production Release

Source-preserving excerpt from the uploaded production release skill. Use when the core SKILL.md routes to this topic.

# Android

## Recommended Play artifact

For Google Play:

```bash
flutter build appbundle --release
```

Expected output:

```text
build/app/outputs/bundle/release/app.aab
```

Flutter documents the app bundle as the preferred Play distribution format. App Bundles let Google Play generate device-specific APK delivery instead of requiring every device to download all included architectures/resources.

---

## Direct APK distribution

For stores/channels requiring APKs:

```bash
flutter build apk --release --split-per-abi
```

Current Flutter release documentation uses **`--split-per-abi`**.

This produces architecture-specific APKs for Flutter's Android release targets rather than a single fat APK.

Do not mechanically distribute all split APKs to every user. Match the artifact to architecture or use an installer/store that handles this.

---

## ABI handling

Flutter's current Android release documentation lists:

- `armeabi-v7a`
- `arm64-v8a`
- `x86_64`

for release output.

Do not manually strip an ABI until you have verified:

- device audience
- store requirements
- native plugin binaries
- emulator/testing needs
- contractual/platform requirements

---

## SDK configuration

Current Flutter projects commonly inherit:

```kotlin
compileSdk = flutter.compileSdkVersion

defaultConfig {
    minSdk = flutter.minSdkVersion
    targetSdk = flutter.targetSdkVersion
}
```

Prefer Flutter-managed values unless the app/plugin/store has a concrete reason to raise or pin them.

Do not lower SDK levels below plugin or supported Flutter requirements.

### Current Play target API transition

Release policy changes independently of Flutter.

As of **August 9, 2026**, Google's next requirement takes effect on **August 31, 2026**: ordinary new apps and updates must target Android 16 / API 36 or higher from that date, with different thresholds for Wear OS, Automotive, TV, and XR.

Therefore:

```text
Never hardcode a Play targetSdk recommendation into a permanent skill.
Re-check the Google Play target API requirement for every release cycle.
```

---

## Signing

Protect separately:

- upload keystore
- keystore password
- key alias/password
- Play service credentials

Do not commit:

```text
upload-keystore.jks
key.properties containing secrets
service-account.json
```

Flutter's Android release guide explicitly instructs developers to keep the upload keystore and key properties private.

Prefer Play App Signing for Play releases.

The local upload key and Play's application signing key have different responsibilities.

---

## R8 and shrinking

Current Flutter Android documentation states that R8 is enabled for release builds and, despite legacy wording around `--no-shrink`, explicitly notes that `--[no-]shrink` has no effect and code shrinking is always enabled in release builds.

Therefore:

**Do not recommend `--no-shrink` as a modern Flutter release fix.**

If release-only R8 optimization breaks a plugin or reflective code:

1. reproduce with the release variant
2. identify the missing/reflected type
3. inspect plugin/vendor keep-rule guidance
4. add the narrowest required rule
5. rebuild
6. regression-test the affected feature

Do not use:

```proguard
-keep class ** { *; }
```

as a permanent blanket solution.

Android's optimization configuration now differs by Android Gradle Plugin version. AGP 9.3+ has a newer optimization DSL; earlier versions use the older `minify`/`shrinkResources` configuration. Do not copy AGP 9.3 configuration into a Flutter project that is using another compatible AGP version.

---

## Multidex

Do not proactively add multidex support to modern Flutter Android projects.

Flutter's currently supported Android baseline begins at API 24, while native multidex support exists from Android API 21. Flutter's own release page describes manual multidex complexity mainly for older minimum SDKs.

If an older project outside the current support baseline has a real dex-limit issue, handle it according to that project's SDK/toolchain.

---

## Manifest review

Before release inspect the merged/release manifest for:

- final application label
- package/application ID
- Internet permission if required
- camera/location/etc. permissions
- deep-link intent filters
- exported components
- SDK-induced permissions
- debug/test activities
- provider configuration

Do not assume `android/app/src/main/AndroidManifest.xml` is the whole result; plugins and flavors can contribute manifest entries.

---

## Versioning

Use:

```yaml
version: 2.4.0+123
```

or explicit CI overrides:

```bash
flutter build appbundle \
  --release \
  --build-name=2.4.0 \
  --build-number=123
```

Flutter maps build name/number to Android version name/code.

Build numbers must be managed monotonically according to the release channel/store.

---

## Android validation

Before production:

- install/test a release APK
- test every supported ABI family
- exercise native plugins
- test startup
- test release-only reflection/deserialization
- inspect app permissions
- upload AAB to Play internal testing
- test Play-generated delivery
- verify version code/name
- verify signing identity
- verify production API/environment
- retain crash symbols/mapping

---

