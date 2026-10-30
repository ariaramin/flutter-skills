---
name: flutter-app-icon-engineering
description: Use when configuring, generating, replacing, auditing, validating, fixing, or troubleshooting application launcher icons in a Flutter project for any platform — Android (including adaptive, monochrome, themed), iOS, macOS, Web (favicon, PWA manifest), Windows (.ico), or Linux. Also use when integrating flutter_launcher_icons, preparing icon source assets, diagnosing missing or stale icons after builds, or resolving icon-related App Store and Play Store submission failures.
---

# Flutter App Icon Engineering

Configure application icons correctly across all Flutter deployment targets.
Each platform has distinct asset formats, directory structures, and build-system
references. Treat them as independent pipelines that share a single source image.

## Start with evidence

Before changing any icon asset or configuration:

1. Read `pubspec.yaml` — SDK constraints, existing `flutter_launcher_icons`
   config, and `dev_dependencies`.
2. List which platform directories exist (`android/`, `ios/`, `web/`, `windows/`,
   `macos/`, `linux/`). Only configure platforms that are present and intended.
3. Inspect existing icon assets in every present platform directory (paths in
   the Platform Requirements table below).
4. Check `AndroidManifest.xml` for `android:icon` and `android:roundIcon`.
5. Check `ios/Runner/Assets.xcassets/AppIcon.appiconset/Contents.json` format
   — is it modern single-icon or legacy multi-size?
6. Check `web/manifest.json` icon entries and `web/index.html` favicon link.
7. Check `windows/runner/Runner.rc` icon reference.
8. Check `macos/Runner/Assets.xcassets/AppIcon.appiconset/Contents.json`.
9. Look for any `flutter_launcher_icons.yaml` or per-flavor config files.
10. Determine the task: new icon, replacement, fix, audit, or automation.

Do not modify platforms that are absent from the project or that the user has
not asked about.

## Platform requirements

| Platform | Format | Location | Key sizes | Config reference |
|----------|--------|----------|-----------|-----------------|
| **Android** | PNG (mipmap dirs) + XML (adaptive) | `android/app/src/main/res/mipmap-*/` | 48–192 px legacy; 108–432 px adaptive layers | `AndroidManifest.xml` `android:icon` |
| **iOS** | PNG (asset catalog) | `ios/Runner/Assets.xcassets/AppIcon.appiconset/` | 1024×1024 single (Xcode 15+) or multiple legacy sizes | `Contents.json`, Xcode build setting `ASSETCATALOG_COMPILER_APPICON_NAME` |
| **macOS** | PNG (asset catalog) | `macos/Runner/Assets.xcassets/AppIcon.appiconset/` | 16–1024 px (multiple required) | `Contents.json` with `idiom: mac` |
| **Web** | PNG | `web/favicon.png`, `web/icons/` | 16 favicon; 192+512 PWA; 192+512 maskable | `web/manifest.json`, `web/index.html` |
| **Windows** | ICO | `windows/runner/resources/app_icon.ico` | 16–256 in single .ico container | `windows/runner/Runner.rc` |
| **Linux** | PNG or SVG | Project-specific; no default generated | 256 or 512 recommended | `.desktop` file `Icon` field |

See `references/platform-implementation.md` for exact file layouts, Contents.json
templates, XML examples, and per-platform step-by-step procedures.

## Decision framework

Choose the approach that matches the project's needs:

### Use `flutter_launcher_icons` when

- Multiple platforms need icons from a single source image.
- The project does not have heavily customized native icon resources.
- Adaptive Android icons (foreground + background + monochrome) are needed.
- The team wants reproducible, config-driven generation.

### Use native platform tooling when

- Only one platform needs an icon update.
- The project has custom native icon resources the generator would overwrite.
- iOS 18+ dark/tinted icon variants are required (the generator does not support
  them as of v0.14.3).
- macOS icons need the traditional rounded-rectangle shape with drop shadow (the
  generator does not add shape or shadow).
- Precise control over every generated asset is required.

### Use a custom pipeline when

- CI/CD must generate icons from SVG or vector sources.
- The project uses non-standard directory structures or icon names.
- Multiple brands or white-label builds need different icons.

## Source asset preparation

Start with a **1024×1024 px PNG** on a square canvas:

- **iOS:** No transparency. Opaque fill to the edges. No rounded corners — iOS
  masks them automatically (~17.5% radius).
- **Android adaptive:** Foreground on 108 dp canvas with content inside the 66 dp
  safe-zone circle. Background can be a color or image. Monochrome variant is
  single-color (grayscale) on transparent background.
- **macOS:** Can have transparency. Should include the rounded-rectangle shape and
  shadow in the image itself — macOS does not auto-mask.
- **Web:** Can have transparency. Maskable variants need extra safe-zone padding.
- **Windows:** Can have transparency. The ICO container holds multiple sizes.

When one source image serves all platforms, use an opaque 1024×1024 PNG with
the logo centered in the inner 66% (safe zone for adaptive masking). Provide
separate platform-specific source images when visual requirements differ.

Use sRGB or Display P3 color profiles. Avoid CMYK. Use lossless PNG — not JPEG.
Keep the source image under version control; generated assets are derived output.

## flutter_launcher_icons workflow

### 1. Add the dependency

```yaml
dev_dependencies:
  flutter_launcher_icons: ^0.14.3
```

Always `dev_dependencies` — it is a build-time tool with zero runtime footprint.

### 2. Configure

In `pubspec.yaml` or a separate `flutter_launcher_icons.yaml`:

```yaml
flutter_launcher_icons:
  image_path: "assets/icon/icon.png"

  android: true
  min_sdk_android: 21
  adaptive_icon_foreground: "assets/icon/foreground.png"
  adaptive_icon_background: "#FFFFFF"
  adaptive_icon_monochrome: "assets/icon/monochrome.png"

  ios: true
  remove_alpha_ios: true

  web:
    generate: true
    image_path: "assets/icon/icon.png"
    background_color: "#FFFFFF"
    theme_color: "#000000"

  windows:
    generate: true
    image_path: "assets/icon/icon.png"

  macos:
    generate: true
    image_path: "assets/icon/icon.png"
```

Only include platforms that exist in the project. Set `remove_alpha_ios: true`
unless the source image is already opaque.

### 3. Generate

```bash
dart run flutter_launcher_icons
```

For a specific flavor:
```bash
dart run flutter_launcher_icons --flavor dev
```

### 4. Verify generated output

After generation, inspect the generated files for each platform. See the
Validation section below.

## What the generator does NOT do

- Does not modify `AndroidManifest.xml` (assumes `@mipmap/ic_launcher` is set).
- Does not modify the Xcode project file (`.pbxproj`) or `Info.plist`.
- Does not add macOS icon shape or shadow to generated PNGs.
- Does not generate iOS 18+ dark/tinted icon variants.
- Does not validate adaptive-icon safe-zone compliance.
- Does not set up Linux `.desktop` files or FreeDesktop icon theme directories.
- Overwrites existing icon files without backup.

## Validation

### Static checks (always possible)

1. Verify generated files exist at the expected paths for each platform.
2. Check image dimensions match platform requirements (use `file` or
   `identify` / `sips` commands).
3. Validate `Contents.json` is well-formed JSON with correct `filename`,
   `idiom`, `size`, and `scale` entries.
4. Validate `ic_launcher.xml` references valid drawables.
5. Confirm `AndroidManifest.xml` `android:icon="@mipmap/ic_launcher"`.
6. Confirm `web/manifest.json` icon entries reference existing files.
7. Confirm `windows/runner/Runner.rc` references `app_icon.ico`.
8. Confirm iOS icon PNGs have no alpha channel:
   `sips -g hasAlpha ios/Runner/Assets.xcassets/AppIcon.appiconset/*.png`

### Platform builds (when toolchain is available)

```bash
# Android — requires Android SDK
flutter build apk --debug

# iOS — requires macOS + Xcode
flutter build ios --debug --no-codesign

# Web
flutter build web

# Windows — requires Windows + Visual Studio
flutter build windows

# macOS — requires macOS + Xcode
flutter build macos

# Linux — requires Linux + build tools
flutter build linux
```

Do not claim a platform is verified unless its build actually succeeded.
When the toolchain is unavailable, state which platforms remain unverified.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| Default Flutter icon still showing | Generated assets not in correct mipmap dirs, or build cache stale | Verify files exist at correct paths. Run `flutter clean && flutter pub get`, then rebuild. |
| Only some platforms show new icon | Generator skipped platforms with `generate: false` or missing config | Check config — web, windows, macos need explicit `generate: true`. |
| Android icon cropped or zoomed | Foreground content outside 66dp safe zone | Redesign foreground: keep critical content inside inner 61% of canvas. |
| Android themed icon not working | Missing `adaptive_icon_monochrome` config, or device < API 33 | Add monochrome layer. Verify device runs Android 13+. |
| iOS build fails with alpha error | Icon PNG has transparency | Set `remove_alpha_ios: true` in config, or provide opaque source. |
| Xcode "unassigned children" error | `Contents.json` references files that don't exist in appiconset | Regenerate icons or fix filenames in Contents.json to match actual files. |
| Web favicon unchanged in browser | Browser cache | Hard refresh (Ctrl+Shift+R). Clear site data. Rename favicon with cache-busting query. |
| macOS icon has no rounded shape | Generator outputs raw PNG without macOS shape | Provide a pre-shaped macOS source image with rounded rect + shadow. |
| Windows icon appears pixelated | .ico contains only one size | Ensure .ico includes 16, 32, 48, 128, 256 px layers. |
| Generator overwrote custom icons | Package replaces files without backup | Back up custom icons before running. Use native tooling for customized setups. |
| Icon correct in debug but wrong in release | Separate debug/release resource sets in Android | Check `src/debug/res/` for overrides. Remove or update them. |

When a fix does not resolve the issue, verify the asset pipeline end-to-end:
source image → generator output → native project reference → build output.
Cache clearing is a last resort, not a first step.

## Common mistakes

- **Running the generator on every build.** Icon generation is a one-time step
  when the source image changes. Do not add it to build hooks or CI pipelines
  that run on every commit.
- **Putting `flutter_launcher_icons` in `dependencies`.** It belongs in
  `dev_dependencies`. It adds zero runtime code.
- **Ignoring platform differences.** iOS forbids transparency. macOS needs
  the shape in the image. Android uses layers. Treating all platforms identically
  produces broken icons.
- **Not inspecting existing icons before replacing.** The project may have custom
  native icons, adaptive XML, or flavor-specific overrides. Overwriting blindly
  destroys intentional customizations.
- **Using a low-resolution source image.** Start with 1024×1024 minimum.
  Upscaling a 256 px image produces blurry icons across high-density devices.
- **Assuming generation configures everything.** The generator creates image
  files but does not set up `AndroidManifest.xml`, `.desktop` files, or Xcode
  build settings. These must already be correct.
- **Not validating after generation.** Files existing is not proof of correctness.
  Check dimensions, formats, references, and platform builds.

## Completion checklist

Before reporting success:

- [ ] Source image is ≥1024×1024, PNG, sRGB or P3, square canvas
- [ ] Only platforms present in the project were configured
- [ ] Existing native customizations were preserved or intentionally replaced
- [ ] `flutter_launcher_icons` is in `dev_dependencies` (if used)
- [ ] Generator was run and completed without errors (if used)
- [ ] Android: mipmap directories populated, adaptive XML valid, manifest references correct
- [ ] iOS: AppIcon.appiconset populated, Contents.json valid, no alpha channel
- [ ] macOS: AppIcon.appiconset populated with all sizes, Contents.json valid
- [ ] Web: favicon.png + manifest icons exist, manifest.json references correct
- [ ] Windows: app_icon.ico exists with multiple sizes, Runner.rc references it
- [ ] Linux: icon file exists, .desktop file references it (if packaging configured)
- [ ] Each platform build succeeds (or state which platforms lack toolchain)
- [ ] Git diff reviewed — only expected files changed

## Official references

| Source | URL | Covers |
|--------|-----|--------|
| Android adaptive icons | https://developer.android.com/develop/ui/views/launch/icon_design_adaptive | Layers, safe zone, monochrome, masking |
| Android create app icons | https://developer.android.com/studio/write/create-app-icons | Image Asset Studio, density buckets |
| Apple HIG app icons | https://developer.apple.com/design/human-interface-guidelines/app-icons | iOS/macOS design, dark/tinted variants |
| Apple configuring icons | https://developer.apple.com/documentation/xcode/configuring-your-app-icon | Asset catalogs, Xcode 15+ single icon |
| App Store icon specs | https://developer.apple.com/help/app-store-connect/reference/app-icon-specifications/ | Submission sizes, format requirements |
| Flutter web building | https://docs.flutter.dev/platform-integration/web/building | Web asset structure |
| Flutter desktop | https://docs.flutter.dev/platform-integration/desktop | Windows, macOS, Linux integration |
| flutter_launcher_icons | https://pub.dev/packages/flutter_launcher_icons | Generator config, platforms, limitations |
| FreeDesktop icon spec | https://specifications.freedesktop.org/icon-theme-spec/latest/ | Linux icon themes, naming |

## Version sensitivity

- **flutter_launcher_icons:** Verify the current version on pub.dev before
  relying on specific config keys. The schema evolves between minor releases.
- **Android adaptive icons:** API 26+ (Android 8.0). Monochrome: API 33+
  (Android 13).
- **iOS single-icon approach:** Xcode 15+ / iOS 17+. Older Xcode versions
  require legacy multi-size icons.
- **iOS dark/tinted variants:** iOS 18+ / Xcode 16+. Not supported by the
  generator as of v0.14.3.
- **macOS icon requirements:** Multiple sizes always required — no single-icon
  shortcut exists.

When a task depends on a recent platform change, verify the relevant official
documentation before proceeding.
