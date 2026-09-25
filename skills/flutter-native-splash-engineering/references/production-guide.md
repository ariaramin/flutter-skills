# flutter_native_splash for Flutter

Validated against:

```text
flutter_native_splash 2.4.8
```

Validation date:

```text
2026-08-11
```

Current officially supported platforms:

```text
Android
iOS
Web
```

Not currently declared as supported by this package:

```text
macOS
Windows
Linux
```

Do not fabricate desktop support merely because Flutter itself supports those platforms.

---

# Purpose

This skill governs production implementation, migration, review, debugging, visual QA, build integration, and startup-performance decisions involving `flutter_native_splash`.

Use it to reason about:

- Android native launch screens
- Android 12+ SplashScreen behavior
- iOS launch storyboards
- Flutter Web pre-engine splash HTML/CSS
- light/dark splash resources
- branding
- flavor-specific splash generation
- preserving/removing the splash
- first-frame timing
- smooth native-to-Flutter transitions
- splash asset sizing
- startup architecture
- build/CI regeneration
- stale generated resources
- production startup validation

This package is primarily a **native/Web splash resource generator**.

It is not a general-purpose application loading-screen framework.

---

# Rule Language

- **MUST** — correctness or platform requirement.
- **SHOULD** — strong production recommendation.
- **MAY** — optional depending on product architecture.
- **Actual startup optimization** — can reduce time before Flutter becomes usable/visible.
- **Perceived-performance optimization** — makes waiting feel smoother but does not inherently shorten initialization.
- **Visual/branding improvement** — affects appearance only.

Always distinguish these categories.

---

# When to Use This Skill

Trigger this skill when asked to:

- install `flutter_native_splash`
- configure a native splash
- change launch colors
- change splash logo
- configure Android 12+
- fix a cropped Android 12 logo
- configure light/dark splash assets
- add splash branding
- configure iOS launch images
- fix iOS launch-screen scaling
- configure Web splash
- implement `preserve()` / `remove()`
- debug a stuck splash
- reduce splash duration
- improve startup performance
- remove a white/black flash
- configure flavors
- configure white-label branding
- regenerate native resources
- migrate an old splash configuration
- fix release-only splash differences

---

# Core Principles

1. **Native splash is not an application loading screen.**

2. **Do not preserve the splash merely to hide slow startup.**

3. **Minimize work before Flutter's first frame.**

4. **Treat Android 12+ as a separate splash implementation.**

5. **Do not assume one splash asset renders identically across Android pre-12, Android 12+, iOS, and Web.**

6. **Match the first Flutter frame visually to the native splash when practical.**

7. **Use `preserve()` only for a small amount of truly essential initialization.**

8. **Never add `Future.delayed` solely to keep branding visible.**

9. **Use a Flutter loading/startup screen for long, dynamic, network-dependent, retryable, or interactive startup work.**

10. **Regenerate platform resources after splash YAML or source-image changes.**

11. **Do not expect hot reload to regenerate native launch resources.**

12. **Do not run `flutter clean` after every splash edit; use it only when troubleshooting stale build artifacts.**

13. **Keep generated splash ownership centralized.**

14. **If you call `preserve()`, make sure one startup owner calls `remove()`.**

15. **Do not rely on application-internal theme settings to choose the native splash appearance.**

16. **Prefer lightweight, robust launch assets over huge full-screen rasters where the design permits it.**

17. **Measure startup in profile/release-like builds, not by visually timing the splash in debug mode.**

18. **Do not use unsupported GIF/Lottie/native animation hacks.**

19. **Treat generated native/Web files as generated state unless you deliberately own the merge strategy.**

20. **Revalidate configuration keys against the installed package version before changing production resources.**

---

# Startup Model

Understand this model before editing splash duration:

```text
Process / application launch
        ↓
OS-native launch screen
(Android / iOS)
or pre-Flutter Web HTML splash
        ↓
Flutter engine / bootstrap
        ↓
Dart entrypoint
        ↓
Essential startup initialization
        ↓
First Flutter frame
        ↓
Optional initialization / data loading
        ↓
Fully interactive application
```

`flutter_native_splash` directly participates in:

```text
native/Web launch presentation
+
optional deferral of Flutter's first frame
```

It does NOT inherently optimize:

```text
Flutter engine initialization
Dart VM startup
dependency injection
database opening
JSON decoding
network requests
remote config
home-feed loading
shader work
widget-tree construction
third-party SDK startup
```

---

# Actual vs Perceived Performance

## Actual startup optimization

Examples:

- remove unnecessary `await`s before first frame
- reduce synchronous CPU work in `main()`
- move nonessential disk/network work later
- render a lightweight application shell sooner
- reduce first-frame widget construction
- avoid initializing unused SDKs on startup

These can reduce actual startup time.

## Perceived-performance optimization

Examples:

- eliminate white/black flashes
- match native background to first Flutter screen
- maintain consistent logo positioning
- provide correct dark-mode launch assets

These make startup feel smoother.

## Visual/branding only

Examples:

- changing logo
- changing splash color
- adding branding
- changing logo position

These do not inherently make startup faster.

---

# Package Architecture

The generation flow is approximately:

```text
flutter_native_splash YAML
        +
source raster assets
        ↓
dart run flutter_native_splash:create
        ↓
generated Android resources/themes
generated iOS storyboard/assets
generated Web HTML/CSS/assets
        ↓
normal Flutter platform build
```

The generator runs during development/CI when explicitly invoked.

It is not continuously generating images at application runtime.

---

# Runtime Dependency Decision

If the application only uses generated splash files and does NOT import:

```dart
FlutterNativeSplash.preserve(...)
FlutterNativeSplash.remove()
```

the package may live under:

```yaml
dev_dependencies:
  flutter_native_splash: ^2.4.8
```

If runtime Dart APIs are imported, use a normal dependency:

```yaml
dependencies:
  flutter_native_splash: ^2.4.8
```

Always use the version selected by the project rather than blindly copying `2.4.8`.

---

# Files Modified / Generated

Current package behavior includes modification/generation of files such as:

## Android

```text
android/app/src/.../res/drawable*/launch_background.xml
android/app/src/.../res/values*/styles.xml
android/app/src/.../res/values*/colors.xml
generated splash drawable images
Android 12+ values-v31 resources
```

## iOS

```text
ios/Runner/Base.lproj/LaunchScreen.storyboard
ios/Runner/Assets.xcassets/LaunchImage.imageset/*
generated branding/background asset sets
ios/Runner/Info.plist
```

Flavor mode may create additional launch storyboards.

## Web

```text
web/index.html
web/splash/img/*
```

Current implementation injects the splash presentation into the Web entry page and generates multiple image-density variants.

Do not casually hand-edit generated sections and then expect regeneration to preserve those edits.

---

# Current Configuration

A conservative current configuration:

```yaml
flutter_native_splash:
  color: "#FFFFFF"
  color_dark: "#121212"

  image: assets/splash/logo.png
  image_dark: assets/splash/logo_dark.png

  android: true
  ios: true
  web: true

  android_12:
    color: "#FFFFFF"
    color_dark: "#121212"
    image: assets/splash/android12_logo.png
    image_dark: assets/splash/android12_logo_dark.png
```

Do not omit the separate `android_12` configuration merely because the pre-12 image looks correct.

---

# Current Top-Level Configuration Surface

Current generator source recognizes options including:

```text
android
ios
web

color
color_android
color_ios
color_web

color_dark
color_dark_android
color_dark_ios
color_dark_web

background_image
background_image_android
background_image_ios
background_image_web

background_image_dark
background_image_dark_android
background_image_dark_ios
background_image_dark_web

image
image_android
image_ios
image_web

image_dark
image_dark_android
image_dark_ios
image_dark_web

branding
branding_android
branding_ios
branding_web

branding_dark
branding_dark_android
branding_dark_ios
branding_dark_web

branding_mode

branding_bottom_padding
branding_bottom_padding_android
branding_bottom_padding_ios

android_gravity
android_screen_orientation
android_min_sdk

ios_content_mode
info_plist_files

web_image_mode

fullscreen

android_12
```

There is currently no Web-specific branding-bottom-padding key.

---

# Required Background Configuration

For the ordinary non-Android-12 splash, choose either:

```yaml
color: "#FFFFFF"
```

or:

```yaml
background_image: assets/splash/background.png
```

Do not configure both as competing general backgrounds.

Prefer a flat color unless the product actually requires a full-screen raster background.

---

# Platform Overrides

General:

```yaml
color: "#FFFFFF"
image: assets/splash/logo.png
```

Platform override:

```yaml
color_android: "#FAFAFA"
image_android: assets/splash/logo_android.png

color_ios: "#FFFFFF"
image_ios: assets/splash/logo_ios.png

color_web: "#FFFFFF"
image_web: assets/splash/logo_web.png
```

Use platform-specific assets when one universal asset cannot satisfy:

- Android 12 masking
- differing aspect ratios
- different visual safe areas
- Web transfer-size goals
- platform-specific branding

---

# Dark Mode

Example:

```yaml
flutter_native_splash:
  color: "#FFFFFF"
  image: assets/splash/logo.png

  color_dark: "#101010"
  image_dark: assets/splash/logo_dark.png

  android_12:
    color: "#FFFFFF"
    image: assets/splash/android12_logo.png

    color_dark: "#101010"
    image_dark: assets/splash/android12_logo_dark.png
```

When no dark-specific value is configured, the corresponding light configuration acts as the fallback.

If supplying a dark image, provide a suitable dark background as well.

---

# Dark Mode Source

Native splash appearance is selected before Flutter's own persisted settings are available.

Therefore this is not possible:

```text
user chose "always light" inside Flutter
        ↓
native splash reads that app preference
```

before Flutter loads.

Native splash appearance follows generated platform/system appearance behavior.

If the app forces a different theme after launch, design the transition deliberately.

---

# Background Images

Example:

```yaml
flutter_native_splash:
  background_image: assets/splash/background.png
```

Supported for ordinary Android, iOS, and Web generation.

It does NOT provide a full-screen background image on Android 12+.

Full-screen images are generally stretched or fitted according to generated platform behavior and are more vulnerable to:

- aspect-ratio mismatch
- cropping
- distortion
- large asset size
- Web transfer cost

Use a flat color where visually acceptable.

---

# Image Position / Scaling

## Android pre-12

```yaml
android_gravity: center
```

Current supported values map to Android `Gravity`, including:

```text
bottom
center
center_horizontal
center_vertical
clip_horizontal
clip_vertical
end
fill
fill_horizontal
fill_vertical
left
right
start
top
```

Combinations can also be used where valid.

Be cautious with `fill`: stretching across differing phone/tablet aspect ratios can distort artwork.

---

# iOS

```yaml
ios_content_mode: scaleAspectFit
```

Current modes include:

```text
scaleToFill
scaleAspectFit
scaleAspectFill
center
top
bottom
left
right
topLeft
topRight
bottomLeft
bottomRight
```

Use:

```text
scaleAspectFit
```

when preserving the full logo matters.

Use:

```text
scaleAspectFill
```

only when cropping is acceptable.

Use:

```text
scaleToFill
```

only when distortion is acceptable.

---

# Web

```yaml
web_image_mode: contain
```

Current modes:

```text
center
contain
stretch
cover
```

Choose based on desired responsive behavior.

---

# Branding

Current general example:

```yaml
flutter_native_splash:
  color: "#FFFFFF"
  image: assets/splash/logo.png

  branding: assets/splash/branding.png
  branding_dark: assets/splash/branding_dark.png

  branding_mode: bottom
  branding_bottom_padding: 24
```

Current `branding_mode` choices:

```text
bottom
bottomRight
bottomLeft
```

Platform-specific branding is also available.

---

# Branding Guidance

Package support does not mean branding is always good launch-screen design.

Android's platform design guidance recommends against the optional Android 12 branding image.

Apple likewise recommends a launch screen that approximates the initial UI rather than serving as an advertisement.

Use branding when required by product design and validate each platform separately.

---

# Android 12+

This is a separate implementation and MUST be reviewed independently.

Example:

```yaml
flutter_native_splash:
  color: "#FFFFFF"
  image: assets/splash/pre12_logo.png

  android_12:
    color: "#FFFFFF"
    color_dark: "#121212"

    image: assets/splash/android12_logo.png
    image_dark: assets/splash/android12_logo_dark.png

    icon_background_color: "#FFFFFF"
    icon_background_color_dark: "#121212"
```

If `android_12.image` is not provided, Android uses the launcher icon.

---

# Android 12 Splash Model

The platform controls a splash built around:

```text
single opaque background color
        +
center icon
        +
optional icon background
        +
optional bottom branding image
```

Do not attempt to recreate a pre-12 full-screen composition there.

---

# Android 12 Asset Sizes

## Icon with icon background

Official Android size:

```text
240 × 240 dp
```

Safe circular area:

```text
160 dp diameter
```

Package 4× raster guidance:

```text
960 × 960 px
```

Keep important content inside:

```text
640 px diameter circle
```

---

## Icon without icon background

Official Android size:

```text
288 × 288 dp
```

Safe circular area:

```text
192 dp diameter
```

Package 4× raster guidance:

```text
1152 × 1152 px
```

Keep important content inside:

```text
768 px diameter circle
```

---

## Branding

Official Android:

```text
200 × 80 dp
```

Package 4× recommendation:

```text
800 × 320 px
```

---

# Android 12 Masking

One-third of adaptive icon foreground geometry can be masked by the platform.

Important artwork MUST stay inside the documented safe circle.

Bad asset:

```text
logo text reaches square image edge
```

Preferred:

```text
transparent padding
+
critical logo completely inside safe circle
```

Do not "fix" Android 12 cropping by making the logo larger.

Usually the correct fix is to respect the mask.

---

# Android 12 Background

The splash background must be a single opaque color.

This is unsupported:

```yaml
android_12:
  background_image: assets/full_gradient.png
```

Do not generate or document such configuration.

If a full artwork background is part of product design:

```text
Android 12 native splash
        ↓
first Flutter frame visually continues artwork
```

rather than fighting the system splash API.

---

# Android 12 Icon Background

Optional:

```yaml
android_12:
  icon_background_color: "#FFFFFF"
  icon_background_color_dark: "#111111"
```

Use it where contrast between icon and window background would otherwise be insufficient.

Remember that configuring icon background changes the recommended icon geometry from the no-background dimensions.

---

# Android 12 Branding

```yaml
android_12:
  branding: assets/splash/branding.png
  branding_dark: assets/splash/branding_dark.png
```

Positioning is controlled by the Android platform.

Do not assume ordinary `branding_mode` gives arbitrary Android 12 positioning.

---

# Android 12 Animation

Android itself supports animated splash icons.

Current `flutter_native_splash` does not provide a general custom animated Android 12 asset workflow through GIF/Lottie/video configuration.

Do not invent:

```yaml
android_12:
  lottie: ...
```

or similar options.

`windowSplashScreenAnimationDuration` also does not determine the actual time the Android splash remains onscreen.

---

# Android 12 Testing Caveats

Test Android 12+ by launching from the actual launcher icon.

Package documentation notes that API 31 launches directly from Android Studio have historically failed to display the launch image normally.

Also test more than one launcher/OEM where Android launch behavior matters commercially.

---

# Android Pre-12

Current generated flow roughly consists of:

```text
LaunchTheme
    ↓
launch_background.xml
    ↓
background color/image
+
density-specific splash drawable
```

Images are generated for densities such as:

```text
mdpi
hdpi
xhdpi
xxhdpi
xxxhdpi
```

Dark variants are generated in night-resource folders.

---

# `android_min_sdk`

Current 2.4.8 configuration can specify:

```yaml
android_min_sdk: 24
```

Default:

```text
16
```

The generator can use this information to merge/remove unnecessary legacy styles/resources.

Keep it aligned with the application's actual Android minimum SDK.

Do not set it higher than the real application requirement merely to reduce generated files.

---

# Android Orientation

The package can configure:

```yaml
android_screen_orientation: sensorLandscape
```

using Android activity orientation values.

Do not set an orientation purely to make one splash image look correct if the application itself should support rotation.

Design splash assets for actual application form factors.

---

# Fullscreen and Android Edge-to-Edge

Current configuration:

```yaml
fullscreen: true
```

changes generated native launch/fullscreen behavior.

Do NOT interpret it as a complete modern system-bar strategy.

Android 15+ makes edge-to-edge increasingly system-controlled, and Android 16 removes the general application opt-out.

After Flutter begins rendering, system-bar behavior should be handled using current Flutter/Android APIs.

Review:

```text
LaunchTheme
NormalTheme
Flutter SystemChrome
target SDK
Android edge-to-edge requirements
```

together when debugging a transition.

---

# iOS

iOS launch screens are static.

The package generates launch storyboard/assets rather than executing Dart logic in the launch screen.

Do not attempt:

```text
network request
username
progress percentage
remote image
conditional message
runtime countdown
```

inside the native iOS launch screen.

Move dynamic startup content into Flutter.

---

# iOS Asset Scaling

Current generator creates density-scaled native assets and updates:

```text
LaunchScreen.storyboard
```

Use a source image with enough resolution for Retina output.

Avoid enormous files "just in case"; generated resources still contribute to application bundle size.

---

# iPhone / iPad

Test both.

One centered logo that appears perfect on a tall iPhone may feel incorrectly scaled on:

- iPad
- landscape
- split-screen layouts
- unusual device proportions

Favor:

- centered safe content
- generous transparent padding
- flat background
- `scaleAspectFit`

when the logo must remain intact.

---

# iOS Dark Mode

Dark appearance is generated through native asset appearance variants.

Example:

```yaml
color: "#FFFFFF"
color_dark: "#000000"

image_ios: assets/splash/logo_ios.png
image_dark_ios: assets/splash/logo_ios_dark.png
```

Always test on an actual light/dark device setting.

---

# iOS Status Bar / Fullscreen

`fullscreen` modifies generated launch configuration.

After Flutter starts, system overlays belong to the application's Flutter system-UI setup.

Do not expect splash YAML to permanently control the status bar for every application screen.

---

# iOS Launch Screen Restrictions

Treat iOS launch UI as static launch presentation.

It is not the right location for:

- loading indicators that imply real progress
- advertisements
- changing copy
- user-specific content
- runtime interaction

If users need progress/error/retry, render a Flutter screen.

---

# Web

The Web implementation is different from Android/iOS.

Conceptually:

```text
browser loads index.html
       ↓
generated splash HTML/CSS becomes visible
       ↓
Flutter Web engine/application loads
       ↓
Flutter produces frame
       ↓
generated Web splash elements removed
```

This is browser markup, not an operating-system launch window.

---

# Web Generated Assets

Current implementation generates density variants under:

```text
web/splash/img
```

for light/dark splash assets.

Current Web generation also injects splash HTML/CSS/JS into:

```text
web/index.html
```

Treat those files as generated integration points.

---

# Web Dark Mode

Web splash appearance uses browser/system dark appearance through:

```text
prefers-color-scheme
```

It cannot consult your loaded Flutter application's theme preference before Flutter exists.

---

# Web Performance

Web splash assets can affect actual page-loading cost because browsers may need to download them before/during Flutter bootstrap.

Therefore:

**Actual startup/network optimization:**

- keep Web images reasonably small
- avoid giant photographic splash backgrounds
- avoid unnecessary branding variants
- use appropriately sized/compressed raster input

**Perceived-performance optimization:**

- provide immediate lightweight page color/logo
- match Flutter first frame
- prevent white flash

A huge Web splash asset can make startup slower even if it looks polished.

---

# Web GIF

Current package documentation explicitly supports GIF splash imagery on Web.

Example:

```yaml
image_web: assets/splash/loading.gif
```

Do not infer native Android/iOS GIF animation support.

---

# Lottie

Current package documentation says Lottie is unsupported.

If custom animation is required:

```text
native splash
      ↓
first Flutter frame
      ↓
Flutter animation
```

Do not hack an interactive/animated native splash into generated platform files unless the team intentionally abandons package-managed generation.

---

# Input Asset Formats

Current generator source accepts raster formats including:

```text
PNG / APNG
JPEG variants
GIF
BMP / DIB
ICO
TGA-family formats
```

The README still recommends PNG for ordinary splash imagery.

For predictable Android/iOS generation:

```text
PNG
```

remains the conservative default.

SVG is not a current accepted source format.

Rasterize SVG artwork to an appropriate raster source before generation.

---

# Asset Resolution

Ordinary splash image documentation assumes a high-density source, approximately 4× density, which the package scales into native variants.

Do not take a tiny 1× logo and expect sharp xxxhdpi/Retina output.

Conversely, do not use unnecessarily gigantic imagery when a smaller clean 4× source is enough.

---

# Asset File Size

Large splash assets affect different platforms differently.

## Android/iOS

Primarily:

```text
application bundle/install size
native resource decode
```

## Web

Also:

```text
network transfer
browser decode
first paint
cache
```

Optimize the Web asset most aggressively when deployment size matters.

---

# Flat Color vs Full Background Image

Prefer:

```yaml
color: "#FFFFFF"
```

when design allows it.

Advantages:

```text
minimal asset complexity
no aspect-ratio distortion
minimal Web transfer
easy dark-mode matching
Android 12-compatible visual concept
```

Use a full-screen raster only when the design genuinely requires it.

---

# Orientation / Tablets / Foldables

Splash artwork SHOULD be safe across:

```text
portrait phones
landscape phones
tablets
iPads
foldables
unusual aspect ratios
```

Keep critical content away from image edges.

For Android 12, obey icon masking instead of designing for one device aspect ratio.

---

# Accessibility

Native launch screens are brief, noninteractive transition UI.

Do not place critical information there because:

- users cannot interact with it
- it may disappear quickly
- Web generated splash images are presentation rather than application semantics
- accessibility timing is not under Flutter widget control

Ensure basic visual contrast in both light/dark variants.

If important information must be read or acted upon, put it in the first Flutter screen.

---

# Generation Workflow

## Default configuration

If config lives in:

```text
pubspec.yaml
```

or:

```text
flutter_native_splash.yaml
```

run:

```shell
dart run flutter_native_splash:create
```

---

# Custom Configuration Path

Current command:

```shell
dart run flutter_native_splash:create \
  --path=path/to/my/file.yaml
```

Short form:

```shell
dart run flutter_native_splash:create \
  -p path/to/my/file.yaml
```

Current README command-table wording around `--path` is slightly inconsistent, but the documented examples and generator behavior use it for the chosen configuration path.

---

# Restore Default Splash

```shell
dart run flutter_native_splash:remove
```

With a custom configuration path:

```shell
dart run flutter_native_splash:remove \
  --path=path/to/my/file.yaml
```

This restores the default splash customization.

It does not eliminate the operating system's launch phase.

---

# When to Regenerate

Run `create` after changing:

- splash YAML
- source image
- dark image
- branding
- background
- Android 12 values
- platform enable/disable flag
- flavor splash config
- relevant package version where generation behavior changed

Then perform a full native/Web restart/build.

---

# Hot Reload / Hot Restart

Hot reload does not rerun the generator.

Hot restart does not rewrite Android/iOS resource files.

For splash-resource changes:

```text
edit YAML/assets
    ↓
run create
    ↓
rebuild/relaunch
```

Use a clean build only when stale build artifacts remain.

---

# Do Not Ritualistically `flutter clean`

Bad workflow:

```shell
flutter clean
flutter pub get
dart run flutter_native_splash:create
```

after every one-pixel asset change.

Preferred:

```shell
dart run flutter_native_splash:create
flutter run
```

or rebuild the appropriate target.

Use:

```shell
flutter clean
```

when troubleshooting known stale artifacts, especially some iOS caching/build cases.

---

# Preserve and Remove

Default behavior:

```text
native splash
   ↓
Flutter draws first frame
   ↓
native splash disappears
```

No runtime API is needed.

This is the preferred default.

---

# `preserve()`

Current API:

```dart
final WidgetsBinding widgetsBinding =
    WidgetsFlutterBinding.ensureInitialized();

FlutterNativeSplash.preserve(
  widgetsBinding: widgetsBinding,
);
```

Internally this defers Flutter's first frame.

That is the key fact.

It does not speed up startup.

---

# `remove()`

Current API:

```dart
FlutterNativeSplash.remove();
```

This allows the first Flutter frame after preservation.

On Web, the package also coordinates removal of generated HTML splash elements.

---

# Deprecated Runtime API

Do not generate new code using:

```dart
FlutterNativeSplash.removeAfter(...)
```

It is deprecated.

Use explicit:

```text
preserve()
...
remove()
```

only when preservation is justified.

---

# When to Preserve

Preservation MAY be appropriate for a small amount of essential startup state such as:

```text
small local configuration required to construct the app
critical local dependency whose absence makes every Flutter screen invalid
very short local session/bootstrap state that truly determines the initial shell
```

Each dependency must still be reviewed individually.

---

# When NOT to Preserve

Normally do not hold native splash for:

```text
analytics startup
marketing API
entire home feed
optional remote config refresh
ad preload
push registration
noncritical cache warmup
image prefetch
background synchronization
telemetry upload
artificial logo duration
```

Move those after first frame when their SDK contracts allow it.

---

# Why Long Preservation Hurts

`preserve()` calls Flutter first-frame deferral.

Therefore:

```text
work takes 3 seconds
+
preserve until work completes
```

means the user cannot see the Flutter UI during those 3 seconds.

The splash did not remove the 3-second cost.

It hid the UI behind a static screen.

---

# Stuck Splash Prevention

If `preserve()` is used, one centralized startup owner MUST eventually call:

```dart
FlutterNativeSplash.remove();
```

Common stuck-splash causes:

```text
exception before remove
conditional branch skips remove
network Future never completes
startup service hangs
multiple components disagree about ownership
```

---

# Startup Ownership

Good:

```text
main/startup coordinator
      |
      +-- preserve once
      |
      +-- resolve essential bootstrap
      |
      +-- expose success or Flutter error UI
      |
      +-- remove once
```

Bad:

```text
AuthService.remove()
AnalyticsService.remove()
HomePage.remove()
Router.remove()
```

Do not distribute splash ownership.

The package does not require multiple calls.

Do not rely on undocumented repeated-removal semantics as architecture.

---

# Startup Failure Architecture

Never leave a user permanently behind native splash after a recoverable failure.

Preferred conceptual flow:

```text
preserve
   ↓
essential initialization
   |
   +-- success
   |      ↓
   |   run/render app
   |
   +-- failure
          ↓
      render Flutter error/recovery screen
   ↓
remove native splash
```

A Flutter error screen can provide:

- explanation
- retry
- diagnostics
- account action
- offline state

A native splash cannot.

---

# Startup I/O Timeouts

If essential startup genuinely requires I/O, use bounded behavior suitable for that dependency.

Do not leave:

```text
native splash
+
unbounded network Future
```

forever.

There is no universal timeout value; choose one according to the operation and product reliability requirements.

---

# Native Splash vs Flutter Loading Screen

## Native splash only

Use when:

- startup is short
- first UI can render quickly
- no dynamic information is needed

Preferred for most apps.

---

## Preserve native splash briefly

Use when:

- very small essential initialization must finish
- no meaningful Flutter shell can exist before it

Keep the preserved period minimal.

---

## Flutter startup/loading screen

Use when:

- initialization can take noticeable time
- network is required
- status must update
- progress is useful
- retry is required
- errors need explanation
- authentication is uncertain
- dynamic content is needed

This gives the application proper lifecycle/error/UX control.

---

# Authentication Startup

Do not make `flutter_native_splash` responsible for Auth architecture.

Preferred when feasible:

```text
native splash
     ↓
Flutter auth/bootstrap shell
     ↓
local session state resolves quickly
     ↓
authenticated / unauthenticated route
     ↓
remote validation refreshes asynchronously
```

If a particular Auth SDK requires setup before widgets, follow that SDK's documented lifecycle requirements.

Do not wait behind native splash for arbitrary remote Auth requests merely to avoid rendering a loading shell.

---

# Remote Config

Remote configuration is usually better structured as:

```text
cached/default config
       ↓
first Flutter frame
       ↓
remote refresh
```

when product semantics allow it.

If the application cannot safely construct UI without a server-supplied configuration, that is an architecture requirement—not a `flutter_native_splash` requirement.

---

# Third-Party SDK Initialization

For every SDK ask:

```text
Must this finish before runApp?
Must this finish before first usable frame?
Can it initialize after runApp?
Can it initialize lazily when its feature is first used?
```

Do not move a dependency after first frame if its own official documentation explicitly requires early setup.

Do not keep one early just because an old tutorial does so.

---

# Example Startup Anti-Pattern

Bad:

```dart
Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await analyticsInitialization();
  await remoteConfigurationFetch();
  await homeFeedFetch();
  await Future<void>.delayed(
    const Duration(seconds: 2),
  );

  runApp(const App());
}
```

Why it is bad:

```text
analytics wait
+
network wait
+
home data wait
+
artificial delay
```

all postpone first Flutter UI.

The splash only conceals that time.

Preferred architecture:

```text
initialize only hard prerequisites
       ↓
runApp
       ↓
show shell/loading state
       ↓
start optional work concurrently/lazily
```

---

# Smooth Native-to-Flutter Transition

A good transition often matters more than keeping the logo onscreen longer.

Match:

```text
native splash background
≈
first Flutter frame background
```

If the native splash uses:

```text
#FFFFFF
```

and Flutter's first frame starts as:

```text
#000000
```

before immediately switching to white, users perceive a flash even if startup is fast.

---

# First-Frame Matching

Consider matching:

- background color
- light/dark appearance
- system-bar treatment
- approximate logo geometry
- orientation
- first-screen primary background

You do not need to recreate the full splash image in Flutter.

The goal is visual continuity.

---

# Logo Jump

A logo can appear to jump if:

```text
native logo center
        ↓
first Flutter frame logo 40 px higher
```

If the first screen also contains the logo, align the two compositions where practical.

Otherwise transition immediately to the true UI rather than displaying a second pseudo-splash for branding.

---

# System Bars

A transition flash may come from system UI rather than the splash bitmap.

On Android inspect:

```text
LaunchTheme
NormalTheme
edge-to-edge behavior
status/navigation bar
Flutter SystemChrome configuration
```

On iOS inspect:

```text
launch status-bar configuration
first Flutter controller/UI
```

Do not attempt to solve all system-bar problems through splash YAML.

---

# Flavor Support

Config naming:

```text
flutter_native_splash-development.yaml
flutter_native_splash-staging.yaml
flutter_native_splash-production.yaml
```

Generate one:

```shell
dart run flutter_native_splash:create \
  --flavor production
```

Several:

```shell
dart run flutter_native_splash:create \
  --flavors development,staging,production
```

All discovered flavors:

```shell
dart run flutter_native_splash:create \
  --all-flavors
```

Short form:

```shell
dart run flutter_native_splash:create -A
```

---

# Flavor Safety

CI should make the selected splash config and binary flavor explicit.

Bad:

```text
generate development
build production
```

Preferred:

```text
select production flavor
       ↓
generate production splash
       ↓
build production binary
       ↓
visually verify production branding
```

Add a production visual/snapshot check for heavily white-labeled products.

---

# Android Flavor Setup

Current package documentation says Android flavor generation requires no additional manual splash setup when flavor names/config filenames match.

Generated resources are placed into the appropriate Android flavor resource structure.

Do not hand-copy development splash files into production `res` directories.

---

# iOS Flavor Setup

iOS multi-flavor generation requires additional Xcode configuration.

Current package workflow includes:

1. Generate flavor splash configs.
2. Add generated `LaunchScreen<Flavor>.storyboard` files to Xcode.
3. Create a user-defined build setting such as:

```text
LAUNCH_SCREEN_STORYBOARD
```

4. Assign the correct storyboard name per configuration/scheme.
5. Set the Info.plist launch-screen interface base name to:

```text
$(LAUNCH_SCREEN_STORYBOARD)
```

Test every production scheme.

---

# White-Label Applications

Use per-brand generation-time resources.

Recommended structure:

```text
assets/splash/brand_a/*
assets/splash/brand_b/*

flutter_native_splash-brand_a.yaml
flutter_native_splash-brand_b.yaml
```

Then generate the corresponding resources before building each branded binary.

Do not attempt to download a runtime brand logo for the native launch screen.

Native splash resources are compile/build-time assets.

---

# CI/CD

The package does not require that generation happen during every build.

Choose one deterministic model.

---

# CI Strategy A — Commit Generated Files

Commit:

```text
splash YAML
source images
generated Android files
generated iOS files
generated Web files
```

Benefits:

- build does not depend on regeneration
- native diffs are reviewable
- local and CI outputs match

When config changes:

```text
run generator
commit generated diff
```

---

# CI Strategy B — Generate Deterministically

Commit:

```text
splash YAML
source images
pubspec.lock
```

Then CI:

```text
flutter pub get
dart run flutter_native_splash:create <correct flavor>
build
```

Benefits:

- generated files can be treated as ephemeral

Requirements:

- exact dependency lock
- correct flavor selection
- deterministic source assets
- generation failure must fail the build

---

# Do Not Mix Uncontrolled Strategies

Avoid:

```text
developer commits stale native output
+
CI sometimes regenerates
+
release script sometimes does not
```

That makes the final binary dependent on whichever machine last touched generated resources.

---

# Upgrades

After upgrading:

```text
flutter_native_splash
Flutter
target SDK
Android build tooling
Xcode/iOS project template
```

inspect the splash changelog and regenerate when generated resource structure may have changed.

Do not manually preserve old `styles.xml` snippets solely because they worked with an older package.

---

# Obsolete Android Flutter Splash Metadata

Old Flutter projects can contain:

```xml
<meta-data
    android:name="io.flutter.embedding.android.SplashScreenDrawable"
    android:resource="@drawable/launch_background" />
```

Current package documentation identifies this older embedding metadata as obsolete in modern Flutter splash handling.

Do not reintroduce it from old tutorials.

---

# Remove Command Semantics

`dart run flutter_native_splash:remove` restores Flutter's default launch-screen customization.

It does NOT mean:

```text
Android/iOS now display no launch window at all
```

The operating system still has a launch period before Flutter renders.

---

# Dynamic Splash Content

Do not try to place these in native splash:

```text
remote username
API message
server maintenance text
real progress %
loading spinner tied to work
countdown
network logo
personalized offer
interactive retry button
```

Render them in Flutter.

---

# Animation Decision

## Native package splash

Use static content on Android/iOS.

## Web

GIF is currently supported.

## Rich/custom animation

Render it as the first Flutter screen after native launch.

Do not extend the native splash just so a Flutter animation can be delayed.

---

# Splash Duration

Without preservation:

```text
OS launch
→ Flutter first frame
```

determines the practical native splash duration.

With preservation:

```text
OS launch
→ defer first Flutter frame
→ explicit remove
```

extends it.

Never add:

```dart
await Future<void>.delayed(
  const Duration(seconds: 2),
);
```

solely for branding.

This increases user-visible startup time by two seconds.

---

# Startup Performance — HIGH PRIORITY

Before touching splash duration, audit `main()`.

Ask:

```text
What is awaited?
What performs disk I/O?
What performs network I/O?
What performs synchronous CPU work?
What SDK initialization happens?
What is actually essential?
What could render after first frame?
```

---

# Startup Work Classification

## MUST complete before `runApp`

Only genuine hard prerequisites.

Possible examples:

```text
WidgetsFlutterBinding.ensureInitialized()
configuration without which the root application cannot be constructed
plugin initialization explicitly documented as requiring pre-runApp setup
```

Do not grow this bucket casually.

---

## Can happen immediately after `runApp`

Often:

```text
remote refresh
cache refresh
telemetry not requiring pre-runApp setup
data prefetch
noncritical service setup
```

provided the dependency's own documentation permits it.

---

## Should happen lazily

Examples:

```text
feature-specific database queries
large export generation
rare SDK initialization
full home-feed fetch
background synchronization
heavy asset processing
```

Lazy initialization reduces startup CPU/I/O contention.

---

# Parallel Initialization

Independent noncritical work MAY run concurrently after first frame.

Do not create a giant sequential chain:

```text
A await
B await
C await
D await
```

when only A is needed for the first UI.

But do not parallelize merely for style; concurrent disk/network work can also compete for startup resources.

Measure.

---

# Startup CPU

Heavy synchronous work in `main()` or root widget construction blocks first frame.

Examples:

```text
large JSON parsing
large cryptographic computation
large object graph construction
bulk database migration
image manipulation
```

If measured as significant:

- defer it
- reduce it
- move suitable CPU work off the main isolate
- change data architecture

The splash itself cannot fix the CPU cost.

---

# Startup Network

A network request before first frame makes startup dependent on:

```text
DNS
radio/network state
TLS
server latency
retry
timeout
```

Use a Flutter loading/error shell instead unless the network result is a truly unavoidable prerequisite.

---

# Startup Disk I/O

Opening large databases, scanning caches, or reading large files before first frame can delay startup.

Ask whether the initial Flutter shell genuinely needs that data.

---

# Measuring Startup

Do not use:

```text
"I watched the logo for about two seconds"
```

as a benchmark.

Flutter exposes startup-to-first-frame measurement through first-frame rasterization.

Use:

```text
profile mode
real device
DevTools / startup CPU profile
platform tooling
```

when optimizing actual startup.

---

# Profile Mode

Run:

```shell
flutter run --profile
```

on a representative physical mobile device.

Debug mode intentionally includes development overhead and is not representative of release performance.

For Flutter Web, use browser/Chrome performance tooling as appropriate.

---

# Cold vs Warm Start

Test separately.

Cold start:

```text
process not resident
engine/application initialization required
```

Warm/hot starts can reuse more state.

Android 12's system SplashScreen behavior can also differ across cold/warm launch paths.

Do not optimize from only one launch mode.

---

# Performance Budget Review

For every pre-first-frame task record:

```text
task
required? yes/no
synchronous CPU?
disk I/O?
network I/O?
can move after frame?
measured duration
failure behavior
```

Focus engineering effort on the largest measured blockers.

Do not start by tweaking logo size or splash duration unless the problem is visual.

---

# Asset Performance Rules

1. Use a correctly sized high-density source.
2. Do not use a 10,000×10,000 raster when 4× target resolution is sufficient.
3. Prefer flat background color where possible.
4. Keep Web assets especially small.
5. Keep Android 12 icon inside the safe mask.
6. Use platform-specific assets when the safe geometry differs.
7. Remove unused splash variants from production configs.
8. Do not compress so aggressively that logos visibly artifact.

---

# Build Size

Generated raster variants contribute to build output.

Normally this is modest.

It becomes relevant when the project adds:

```text
large full-screen light background
large full-screen dark background
several branding assets
several flavor variants
huge Web GIF
```

Do not exaggerate splash asset size as a major binary problem unless measurements show it is.

---

# Reliability Rules

1. One component owns preserve/remove.
2. Never preserve without a guaranteed removal path.
3. Do not depend on network indefinitely behind native splash.
4. Render Flutter error UI after startup failure.
5. Regenerate after config changes.
6. Do not expect hot reload to update native resources.
7. Validate the correct flavor before release.
8. Keep Android 12 config independent.
9. Test light and dark device modes.
10. Test full rebuild/reinstall if iOS appears to cache an old launch screen.
11. Do not manually edit generated files without documenting how regeneration will preserve the changes.
12. Revalidate after package/Flutter/platform upgrades.

---

# Debugging Guide

| Symptom | Likely Cause | How to Verify | Fix |
|---|---|---|---|
| Splash unchanged after YAML edit | Generator not rerun | Inspect generated native files/timestamps | Run `dart run flutter_native_splash:create`, rebuild |
| Hot reload shows old splash | Native resources are unchanged | Full relaunch | Regenerate and rebuild |
| Android <12 works, Android 12 wrong | Missing/wrong `android_12` config | Inspect YAML and values-v31 output | Configure dedicated Android 12 section |
| Android 12 logo cropped | Artwork outside mask | Overlay safe circle | Add transparent padding / resize critical artwork |
| Android 12 uses launcher icon | `android_12.image` omitted | Inspect YAML | Add dedicated `android_12.image` |
| Android 12 background image missing | System does not support splash background image | Inspect config | Use opaque `color` and continue artwork in Flutter |
| Android 12 branding missing/wrong | Platform/package constraints or asset sizing | Check 800×320 4× input and device | Correct asset; test device/launcher |
| Android splash image wrong on API 31 from IDE | Known launch-path caveat | Launch from device launcher | Validate actual launcher behavior |
| iOS logo distorted | `scaleToFill` / wrong ratio | Inspect `ios_content_mode` | Use `scaleAspectFit`/proper asset |
| iOS logo clipped | `scaleAspectFill` | Test different ratios | Use fit/center or adjust artwork |
| iOS still shows old splash | iOS/build launch-screen cache | Verify generated storyboard/assets | Rebuild; then clean/reinstall only if needed |
| Dark splash not shown | Dark variants missing or OS appearance different | Inspect generated night/appearance assets | Add dark config and test system dark mode |
| App internal dark preference ignored at launch | Flutter preferences unavailable before load | Compare system vs app mode | Accept native system appearance or redesign transition |
| Web splash missing | Web disabled/generated `index.html` missing/stale deploy | Inspect `web/index.html`, `web/splash` | Regenerate/redeploy |
| Web splash loads slowly | Oversized raster/GIF | Network panel | Reduce asset dimensions/bytes |
| Web shows wrong theme | Browser `prefers-color-scheme` differs | DevTools emulation/system setting | Fix dark assets; do not use app preference |
| Splash never disappears | `preserve()` without successful `remove()` | Search startup paths | Centralize removal, handle failure |
| Splash disappears too early | No preserve although essential blocking state requires it | Inspect startup architecture | Briefly preserve or show Flutter loading shell |
| Splash held during long API call | Native splash abused as loading UI | Profile startup/main | Render Flutter loading state and move network work |
| White/black flash before first Flutter frame | Background/system UI mismatch | Record startup video frame-by-frame | Match first Flutter frame/background/system UI |
| Logo jumps during transition | Native and Flutter geometry differ | Record startup | Align first-frame composition |
| Production flavor shows dev branding | Wrong generation command/stale generated resources | Inspect CI command/artifacts | Generate exact flavor before build |
| `windowSplashScreenBackground` AAPT error | Android build setup too old for Android 12 attributes | Inspect compile/target tooling | Update current Android build configuration |
| Fullscreen differs on Android 15/16 | Edge-to-edge platform behavior | Inspect target SDK/SystemUiMode | Handle modern edge-to-edge separately |
| Old generated files after upgrade | Generator not rerun / manual conflicts | Compare package changelog/generated files | Regenerate and review diff |
| Remove command still shows splash | OS default launch view remains | Compare to default Flutter project | Understand `remove` restores default, not zero launch window |

---

# Anti-Patterns

## Anti-pattern: Treat splash as loading screen

### Bad

```text
preserve
wait for remote feed
wait for recommendations
wait for marketing API
remove
```

### Why

The user sees static UI while network latency blocks first frame.

### Preferred

Render Flutter quickly and display proper loading/content state.

---

## Anti-pattern: Artificial delay

### Bad

```dart
await Future<void>.delayed(
  const Duration(seconds: 3),
);
```

### Why

Adds three seconds of real startup delay.

### Preferred

Remove splash as soon as real essential initialization is complete.

---

## Anti-pattern: Initialize every SDK before `runApp`

### Why

Unrelated SDK initialization serializes startup work.

### Preferred

Verify each SDK's actual ordering requirements and defer/lazy-load optional systems.

---

## Anti-pattern: Entire home feed before first frame

### Why

Network and database work become startup blockers.

### Preferred

Render shell/skeleton and fetch asynchronously.

---

## Anti-pattern: `preserve()` without one removal owner

### Why

An exception/branch can leave first frame deferred indefinitely.

### Preferred

One startup coordinator owns lifecycle.

---

## Anti-pattern: Several services call `remove()`

### Why

Ownership becomes race-prone and relies on behavior that should not be architectural.

### Preferred

Centralized removal.

---

## Anti-pattern: Same Android asset blindly reused for Android 12

### Why

Android 12 adaptively masks the icon and forbids full background image behavior.

### Preferred

Create Android-12-specific safe-zone artwork.

---

## Anti-pattern: Ignore Android 12 section

### Why

Top-level pre-12 splash configuration is not sufficient.

### Preferred

Explicit `android_12`.

---

## Anti-pattern: Full-screen Android 12 image

### Why

The system splash background is a single opaque color.

### Preferred

Color + center icon; continue full artwork in first Flutter frame.

---

## Anti-pattern: Oversized raster

### Why

Adds asset storage/decode cost and Web download cost without visual benefit.

### Preferred

Provide sufficient but bounded 4× source resolution.

---

## Anti-pattern: Tiny raster

### Why

Density upscaling causes blur/pixelation.

### Preferred

Provide correct high-density source.

---

## Anti-pattern: Use SVG directly

### Why

Current generator input set does not include SVG.

### Preferred

Rasterize to an appropriate image asset.

---

## Anti-pattern: Lottie native splash

### Why

Current package does not support it.

### Preferred

Animate in Flutter after native launch.

---

## Anti-pattern: Full-screen background raster when flat color works

### Why

Aspect-ratio fragility and unnecessary Web/bundle weight.

### Preferred

Flat color + centered logo.

---

## Anti-pattern: App preference chooses native dark mode

### Why

Flutter state is unavailable before Flutter loads.

### Preferred

Use OS appearance and make transition safe.

---

## Anti-pattern: Rely on hot reload

### Why

Generator/native resources did not change.

### Preferred

Regenerate + rebuild.

---

## Anti-pattern: `flutter clean` after every edit

### Why

Adds unnecessary rebuild time and is not part of normal generator workflow.

### Preferred

Use only for stale-artifact troubleshooting.

---

## Anti-pattern: Manual edits to generated files without ownership strategy

### Why

Next generation can overwrite them.

### Preferred

Express changes in supported YAML or deliberately stop treating the file as generator-owned.

---

## Anti-pattern: Old Flutter splash metadata

### Why

Copied old embedding configuration can conflict with modern Flutter splash behavior.

### Preferred

Use current Flutter/package-generated themes.

---

## Anti-pattern: Splash duration as performance metric

### Why

Duration mixes OS presentation, engine startup, Dart work, and optional first-frame deferral.

### Preferred

Measure first-frame/startup performance in profile/release-like builds.

---

## Anti-pattern: Test only debug

### Why

Debug startup includes development overhead.

### Preferred

Profile for measurement and release for production verification.

---

## Anti-pattern: Test one Android version

### Why

Pre-12 and 12+ use fundamentally different splash systems.

### Preferred

Test both families.

---

## Anti-pattern: Ignore iPad/tablets/foldables

### Why

Artwork can scale/crop differently across form factors.

### Preferred

Use safe centered assets and visual QA.

---

## Anti-pattern: Use native splash for error retry

### Why

It is static and noninteractive.

### Preferred

Flutter startup/error screen.

---

# Implementation Checklist

1. [ ] Inspect installed `flutter_native_splash` version.
2. [ ] Confirm supported targets are Android/iOS/Web.
3. [ ] Decide whether a simple flat background is sufficient.
4. [ ] Prepare high-density main image.
5. [ ] Prepare Android 12 mask-safe image separately.
6. [ ] Prepare dark assets if system dark mode should differ.
7. [ ] Decide whether branding is genuinely needed.
8. [ ] Configure ordinary splash.
9. [ ] Configure `android_12`.
10. [ ] Configure platform overrides only where needed.
11. [ ] Configure image position/content mode.
12. [ ] Set actual `android_min_sdk` if using the new option.
13. [ ] Run `dart run flutter_native_splash:create`.
14. [ ] Review generated Android/iOS/Web diffs.
15. [ ] Decide generated-file source-control policy.
16. [ ] Avoid `preserve()` unless essential initialization exists.
17. [ ] If preserving, assign exactly one removal owner.
18. [ ] Match first Flutter frame background.
19. [ ] Test light mode.
20. [ ] Test dark mode.
21. [ ] Test Android pre-12.
22. [ ] Test Android 12+.
23. [ ] Test iPhone.
24. [ ] Test iPad.
25. [ ] Test Web.
26. [ ] Test production flavor.
27. [ ] Test cold start.
28. [ ] Test profile/release build.
29. [ ] Test startup failure path.
30. [ ] Profile actual startup if duration is a concern.

---

# Startup Audit Checklist

When asked to "make the splash faster", audit this before touching splash YAML:

- [ ] Inspect `main()`.
- [ ] List every `await` before `runApp`.
- [ ] Identify every network operation.
- [ ] Identify every disk operation.
- [ ] Identify synchronous CPU work.
- [ ] Identify dependency injection construction.
- [ ] Identify database startup/migrations.
- [ ] Identify Auth restoration.
- [ ] Identify remote config.
- [ ] Identify analytics/crash SDK setup.
- [ ] Identify push setup.
- [ ] Identify ad/purchase SDK startup.
- [ ] Search `FlutterNativeSplash.preserve`.
- [ ] Search `FlutterNativeSplash.remove`.
- [ ] Measure first frame in profile mode.
- [ ] Compare cold and warm starts.
- [ ] Inspect first Flutter frame complexity.
- [ ] Inspect splash asset size.
- [ ] Inspect Web network waterfall.
- [ ] Record transition for visual flashes.

For every startup task classify:

```text
must block
can run after first frame
can be lazy
```

Then optimize the measured blockers.

---

# Code Review Checklist

## Package/config

- [ ] Current package version?
- [ ] No obsolete YAML?
- [ ] `color` vs `background_image` valid?
- [ ] Platform flags correct?
- [ ] `android_min_sdk` matches app if configured?

## Android

- [ ] Pre-12 config?
- [ ] Dedicated `android_12` config?
- [ ] Android 12 safe circle respected?
- [ ] Correct background model?
- [ ] Icon-background sizing correct?
- [ ] Branding dimensions correct?
- [ ] Edge-to-edge not incorrectly delegated to splash YAML?

## iOS

- [ ] Launch-screen image sufficiently sharp?
- [ ] `ios_content_mode` sensible?
- [ ] iPad tested?
- [ ] No dynamic launch-screen assumptions?
- [ ] Custom Info.plist paths listed when required?

## Web

- [ ] Generated `web/splash` exists?
- [ ] `index.html` generation reviewed?
- [ ] Images appropriately small?
- [ ] Dark mode works?
- [ ] GIF only when worth transfer/decode cost?

## Dark mode

- [ ] Light and dark backgrounds?
- [ ] Light and dark images?
- [ ] Android 12 dark values?
- [ ] Transition to Flutter theme reviewed?

## Runtime

- [ ] Is `preserve()` actually required?
- [ ] One removal owner?
- [ ] No deprecated `removeAfter`?
- [ ] No artificial delay?
- [ ] No indefinite network wait?
- [ ] Failure path reaches Flutter UI?

## Startup

- [ ] No unnecessary pre-runApp work?
- [ ] Optional SDKs reviewed individually?
- [ ] Full home/API payload not blocking first frame?
- [ ] Profile measurement performed where needed?

## Build

- [ ] Generator rerun?
- [ ] Generated diff committed or deterministically produced?
- [ ] Flavor command matches build flavor?
- [ ] No unexplained hand edits in generated files?

---

# Production Readiness Checklist

- [ ] Android pre-12 cold start tested.
- [ ] Android 12+ cold start tested.
- [ ] Android launcher-icon launch tested.
- [ ] Android light mode tested.
- [ ] Android dark mode tested.
- [ ] Android tablet/foldable layout checked where supported.
- [ ] Android 15/16 system-bar transition checked.
- [ ] iPhone cold start tested.
- [ ] iPad cold start tested.
- [ ] iOS light/dark appearance tested.
- [ ] iOS release build tested.
- [ ] Web production build tested.
- [ ] Web light/dark appearance tested.
- [ ] Web asset sizes reviewed.
- [ ] Portrait checked.
- [ ] Landscape checked if product supports it.
- [ ] First-frame transition screen-recorded.
- [ ] No white/black flash.
- [ ] No logo jump that harms UX.
- [ ] Production flavor branding verified.
- [ ] Staging branding cannot leak into production.
- [ ] Startup failure cannot leave splash indefinitely.
- [ ] No arbitrary delays.
- [ ] Essential startup blocking reviewed.
- [ ] First-frame performance profiled when required.
- [ ] Release startup compared with debug assumptions.

---

# Version-Sensitive Areas

Always revalidate these after upgrading.

## Package version

Current validation:

```text
flutter_native_splash 2.4.8
```

---

## Configuration keys

Especially:

```text
android_min_sdk
branding_bottom_padding
flavor options
android_12
```

---

## Android 12+

Revalidate:

- SplashScreen API behavior
- mask geometry
- branding
- system splash constraints
- package-generated v31 resources

---

## Android 15/16+

Revalidate:

- edge-to-edge
- launch/system-bar appearance
- target SDK behavior

Do not preserve old Android workaround XML indefinitely.

---

## Flutter embedding

Old Flutter splash metadata and launch-theme templates have changed historically.

Follow current Flutter-generated project structure.

---

## iOS

Revalidate after:

- Xcode upgrades
- deployment target changes
- launch-screen template changes
- flavor/scheme changes

---

## Web

Revalidate:

- `web/index.html` generated structure
- generated splash asset paths
- dark-mode CSS
- splash-removal mechanism

The README description can lag implementation details.

---

## Image formats

Current generator source accepts several raster formats even though README prose emphasizes PNG.

Use current source if this matters operationally.

SVG currently remains unsupported as direct generator input.

---

## Animation

Current state:

```text
Web GIF: supported
Lottie: unsupported
general native custom animation: not a package feature
```

Revalidate before adding animation.

---

## Preserve/remove

Current:

```text
FlutterNativeSplash.preserve(...)
FlutterNativeSplash.remove()
```

Current deprecated:

```text
removeAfter(...)
```

---

## Flavor support

Revalidate:

```text
--flavor
--flavors
--all-flavors
-A
```

and iOS Xcode workflow.

---

# Decision Framework

## Startup is already short?

Use:

```text
native splash
→ first Flutter frame
```

No preserve.

---

## Small local prerequisite must complete first?

Use:

```text
preserve briefly
→ essential local initialization
→ render app
→ remove
```

---

## Startup includes network/progress/retry?

Use:

```text
native splash
→ Flutter loading/startup screen
→ dynamic work
```

Do not hold native splash.

---

## Need dynamic logo/message?

Use Flutter.

---

## Need animation?

Use Flutter after native launch, except Web GIF where intentionally used.

---

## Need Android full-screen artwork?

Pre-12 can use ordinary background image behavior.

Android 12+ cannot reproduce it as the system splash; continue the design in Flutter.

---

## Need multiple brands?

Generate compile-time resources per flavor/brand.

Do not runtime-switch native splash.

---

## Need faster startup?

Do not start by changing splash.

Start with:

```text
profile main()
remove blocking awaits
reduce first-frame work
defer optional initialization
```

---

# Official References

## Package

https://pub.dev/packages/flutter_native_splash

https://pub.dev/packages/flutter_native_splash/changelog

https://pub.dev/documentation/flutter_native_splash/latest/

## Official repository

https://github.com/jonbhanson/flutter_native_splash

## Android SplashScreen

https://developer.android.com/develop/ui/views/launch/splash-screen

https://developer.android.com/develop/ui/views/launch/splash-screen/migrate

## Flutter Android edge-to-edge

https://docs.flutter.dev/release/breaking-changes/default-systemuimode-edge-to-edge

## Apple launch screen

https://developer.apple.com/documentation/xcode/specifying-your-apps-launch-screen

https://developer.apple.com/design/human-interface-guidelines/launching/

## Flutter startup/performance

https://docs.flutter.dev/perf/metrics

https://docs.flutter.dev/tools/devtools/performance

https://docs.flutter.dev/tools/devtools/cpu-profiler

https://docs.flutter.dev/testing/build-modes

---

# Final Rules for AI Coding Agents

When asked to modify `flutter_native_splash`, do this in order:

```text
1. Inspect installed package version
2. Identify target platforms
3. Inspect current splash YAML
4. Inspect source asset dimensions/bytes
5. Separate Android 12 requirements
6. Inspect dark-mode configuration
7. Inspect flavor requirements
8. Inspect preserve/remove usage
9. Audit startup work before first frame
10. Change the smallest correct configuration
11. Run the generator
12. Review generated native/Web diff
13. Full rebuild
14. Test real platform versions
15. Profile actual startup if performance is the problem
```

The preferred production architecture is:

```text
OS native splash / generated Web splash
               ↓
        Flutter starts quickly
               ↓
       first stable Flutter frame
               ↓
 optional / dynamic initialization
```

not:

```text
OS native splash
       ↓
preserve for branding
       ↓
analytics
       ↓
remote config
       ↓
network auth
       ↓
home feed
       ↓
artificial delay
       ↓
first Flutter frame
```

A splash screen can make startup look coherent.

It cannot make slow startup fast.

Optimize the startup path first, and use `flutter_native_splash` to make the unavoidable OS-to-Flutter transition visually correct.