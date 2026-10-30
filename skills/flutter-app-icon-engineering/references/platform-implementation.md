# Platform Implementation Reference

Detailed file layouts, configuration templates, and step-by-step procedures
for each Flutter icon target. Read the section for the platform you are
configuring.

## Table of Contents

1. [Android](#android)
2. [iOS](#ios)
3. [macOS](#macos)
4. [Web](#web)
5. [Windows](#windows)
6. [Linux](#linux)

---

## Android

### Resource directory layout

```
android/app/src/main/res/
├── mipmap-mdpi/
│   └── ic_launcher.png              (48×48)
├── mipmap-hdpi/
│   └── ic_launcher.png              (72×72)
├── mipmap-xhdpi/
│   └── ic_launcher.png              (96×96)
├── mipmap-xxhdpi/
│   └── ic_launcher.png             (144×144)
├── mipmap-xxxhdpi/
│   └── ic_launcher.png             (192×192)
└── mipmap-anydpi-v26/
    ├── ic_launcher.xml
    └── ic_launcher_round.xml
```

For adaptive icons, foreground and background layers are placed alongside the
legacy icons in each mipmap directory, or as vector drawables in `drawable/`:

```
mipmap-xxxhdpi/
├── ic_launcher.png                  (192×192 legacy fallback)
├── ic_launcher_foreground.png       (432×432 adaptive foreground)
└── ic_launcher_background.png       (432×432 adaptive background)
```

### Adaptive icon dimensions per density

| Density   | Qualifier        | Legacy (px) | Adaptive layer (px) |
|-----------|------------------|-------------|---------------------|
| mdpi      | mipmap-mdpi      | 48×48       | 108×108             |
| hdpi      | mipmap-hdpi      | 72×72       | 162×162             |
| xhdpi     | mipmap-xhdpi     | 96×96       | 216×216             |
| xxhdpi    | mipmap-xxhdpi    | 144×144     | 324×324             |
| xxxhdpi   | mipmap-xxxhdpi   | 192×192     | 432×432             |

### Adaptive icon XML

`mipmap-anydpi-v26/ic_launcher.xml`:
```xml
<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/ic_launcher_background"/>
    <foreground android:drawable="@drawable/ic_launcher_foreground"/>
    <monochrome android:drawable="@drawable/ic_launcher_monochrome"/>
</adaptive-icon>
```

- `<background>` can reference a color: `@color/ic_launcher_background`.
- `<monochrome>` is optional; required only for themed icons on API 33+.
- `ic_launcher_round.xml` usually has the same content; the system applies a
  circular mask automatically.

### Safe zone

The adaptive icon canvas is 108×108 dp. The guaranteed-visible area is 72 dp
(the maximum mask extent). The recommended safe zone for critical content is a
66 dp diameter circle centered in the canvas. Keep the logo inside that circle.

### AndroidManifest.xml

```xml
<application
    android:icon="@mipmap/ic_launcher"
    android:roundIcon="@mipmap/ic_launcher_round"
    ...>
```

`android:roundIcon` was introduced in API 25. On API 26+ with adaptive icons,
both attributes resolve to the adaptive XML and the launcher applies its mask.

### Manual setup procedure (without generator)

1. Prepare foreground (432×432 px, transparent background, content in safe zone).
2. Prepare background (432×432 px, or use a solid color).
3. Prepare monochrome (432×432 px, single grayscale color, transparent background).
4. Prepare legacy fallback (192×192 px, opaque, visually complete icon).
5. Resize foreground and background for each density bucket (scale ratios above).
6. Resize legacy icon for each density bucket.
7. Place files in appropriate `mipmap-*` directories.
8. Create `mipmap-anydpi-v26/ic_launcher.xml` and `ic_launcher_round.xml`.
9. If using a color background, add the color to `values/ic_launcher_background.xml`:
   ```xml
   <?xml version="1.0" encoding="utf-8"?>
   <resources>
       <color name="ic_launcher_background">#FFFFFF</color>
   </resources>
   ```
10. Verify `AndroidManifest.xml` references `@mipmap/ic_launcher`.
11. Build: `flutter build apk --debug` and inspect output.

### Google Play Store icon

Upload a separate 512×512 px PNG (32-bit, with alpha) to the Play Console.
This is not packaged with the APK/AAB. Must be full-bleed, no rounded corners.

---

## iOS

### Modern single-icon approach (Xcode 15+ / iOS 17+)

Provide one 1024×1024 px PNG. Xcode generates all required sizes at build time.

**Directory:**
```
ios/Runner/Assets.xcassets/AppIcon.appiconset/
├── Contents.json
└── AppIcon-1024x1024.png
```

**Contents.json:**
```json
{
  "images": [
    {
      "filename": "AppIcon-1024x1024.png",
      "idiom": "universal",
      "platform": "ios",
      "size": "1024x1024"
    }
  ],
  "info": {
    "author": "xcode",
    "version": 1
  }
}
```

### iOS 18+ dark and tinted variants

Add entries for `dark` and `tinted` appearances:

```json
{
  "images": [
    {
      "filename": "AppIcon-1024x1024.png",
      "idiom": "universal",
      "platform": "ios",
      "size": "1024x1024"
    },
    {
      "appearances": [
        { "appearance": "luminosity", "value": "dark" }
      ],
      "filename": "AppIcon-Dark-1024x1024.png",
      "idiom": "universal",
      "platform": "ios",
      "size": "1024x1024"
    },
    {
      "appearances": [
        { "appearance": "luminosity", "value": "tinted" }
      ],
      "filename": "AppIcon-Tinted-1024x1024.png",
      "idiom": "universal",
      "platform": "ios",
      "size": "1024x1024"
    }
  ],
  "info": {
    "author": "xcode",
    "version": 1
  }
}
```

### Legacy multi-size approach (pre-Xcode 15)

Flutter's `flutter create` generates this format by default. Required sizes:

| Context         | Scale | Pixels    |
|-----------------|-------|-----------|
| Notification    | 2x    | 40×40     |
| Notification    | 3x    | 60×60     |
| Settings        | 2x    | 58×58     |
| Settings        | 3x    | 87×87     |
| Spotlight       | 2x    | 80×80     |
| Spotlight       | 3x    | 120×120   |
| iPhone App      | 2x    | 120×120   |
| iPhone App      | 3x    | 180×180   |
| iPad Notification | 1x  | 20×20     |
| iPad Notification | 2x  | 40×40     |
| iPad Settings   | 1x    | 29×29     |
| iPad Settings   | 2x    | 58×58     |
| iPad Spotlight  | 1x    | 40×40     |
| iPad Spotlight  | 2x    | 80×80     |
| iPad App        | 1x    | 76×76     |
| iPad App        | 2x    | 152×152   |
| iPad Pro App    | 2x    | 167×167   |
| App Store       | 1x    | 1024×1024 |

The default filenames follow `Icon-App-{size}x{size}@{scale}x.png`.

### iOS rules

- **No transparency.** Transparent pixels render as black. Use
  `remove_alpha_ios: true` in the generator, or strip alpha manually:
  `sips -s hasAlpha false image.png`
- **No pre-rounded corners.** iOS applies ~17.5% corner radius automatically.
- **Format:** PNG only.
- **Color space:** sRGB or Display P3.

### Xcode build setting

The Xcode project must have:
```
ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon
```
This value must match the `.appiconset` folder name (minus the extension).

### Manual setup procedure

1. Place a 1024×1024 opaque PNG in the appiconset directory.
2. Update `Contents.json` to the modern single-icon format (or generate legacy
   sizes if targeting Xcode < 15).
3. Verify alpha is stripped: `sips -g hasAlpha <file>`
4. Verify Xcode build setting references `AppIcon`.
5. Build: `flutter build ios --debug --no-codesign`

---

## macOS

### Asset catalog layout

```
macos/Runner/Assets.xcassets/AppIcon.appiconset/
├── Contents.json
├── app_icon_16.png       (16×16)
├── app_icon_32.png       (32×32)
├── app_icon_64.png       (64×64)
├── app_icon_128.png     (128×128)
├── app_icon_256.png     (256×256)
├── app_icon_512.png     (512×512)
└── app_icon_1024.png   (1024×1024)
```

### Contents.json

```json
{
  "images": [
    { "filename": "app_icon_16.png",   "idiom": "mac", "scale": "1x", "size": "16x16" },
    { "filename": "app_icon_32.png",   "idiom": "mac", "scale": "2x", "size": "16x16" },
    { "filename": "app_icon_32.png",   "idiom": "mac", "scale": "1x", "size": "32x32" },
    { "filename": "app_icon_64.png",   "idiom": "mac", "scale": "2x", "size": "32x32" },
    { "filename": "app_icon_128.png",  "idiom": "mac", "scale": "1x", "size": "128x128" },
    { "filename": "app_icon_256.png",  "idiom": "mac", "scale": "2x", "size": "128x128" },
    { "filename": "app_icon_256.png",  "idiom": "mac", "scale": "1x", "size": "256x256" },
    { "filename": "app_icon_512.png",  "idiom": "mac", "scale": "2x", "size": "256x256" },
    { "filename": "app_icon_512.png",  "idiom": "mac", "scale": "1x", "size": "512x512" },
    { "filename": "app_icon_1024.png", "idiom": "mac", "scale": "2x", "size": "512x512" }
  ],
  "info": { "author": "xcode", "version": 1 }
}
```

Note: the 32px image serves both `16x16@2x` and `32x32@1x`. Similarly for
256px and 512px. This is by design — the same file is referenced twice.

### macOS icon rules

- **Transparency is allowed** (unlike iOS).
- **The image must include its own rounded-rectangle shape with shadow.**
  macOS does not auto-mask icons. A flat square icon will look wrong in the
  Dock and Finder.
- **Multiple sizes are always required.** There is no single-icon shortcut.
- The traditional macOS icon shape has depth, a front-facing perspective, and
  a subtle drop shadow.

### Manual setup procedure

1. Design the macOS icon with a rounded-rectangle shape, shadow, and transparent
   background — or use a design tool that exports the macOS icon template.
2. Resize to all required dimensions (16, 32, 64, 128, 256, 512, 1024).
3. Place PNGs in the appiconset directory.
4. Update `Contents.json` to match filenames.
5. Build: `flutter build macos`

---

## Web

### File layout

```
web/
├── favicon.png                           (16×16)
├── index.html                            (references favicon + apple-touch-icon)
├── manifest.json                         (PWA icon entries)
└── icons/
    ├── Icon-192.png                      (192×192)
    ├── Icon-512.png                      (512×512)
    ├── Icon-maskable-192.png             (192×192 with safe-zone padding)
    └── Icon-maskable-512.png             (512×512 with safe-zone padding)
```

### index.html references

```html
<link rel="icon" type="image/png" href="favicon.png"/>
<link rel="apple-touch-icon" href="icons/Icon-192.png"/>
```

### manifest.json icon entries

```json
{
  "icons": [
    { "src": "icons/Icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icons/Icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "icons/Icon-maskable-192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable" },
    { "src": "icons/Icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

Maskable icons have `"purpose": "maskable"` and should have extra padding so
content survives circular or other adaptive masks when installed as a PWA.

### Manual setup procedure

1. Create 16×16 `favicon.png`.
2. Create 192×192 and 512×512 standard icons.
3. Create maskable variants (same sizes, with logo inside the center ~80% of
   the canvas for safe-zone compliance).
4. Place files in `web/` and `web/icons/`.
5. Update `manifest.json` if filenames differ from defaults.
6. Update `index.html` favicon and apple-touch-icon links if filenames changed.
7. Build: `flutter build web`
8. Test in a fresh browser profile to avoid cache issues.

---

## Windows

### File layout

```
windows/runner/resources/
└── app_icon.ico
```

### Runner.rc reference

```rc
IDI_APP_ICON            ICON            "resources\\app_icon.ico"
```

### ICO file requirements

A `.ico` file is a container holding multiple sizes. Include at minimum:

| Size (px) | Purpose |
|-----------|---------|
| 16×16     | Title bar, taskbar (small) |
| 32×32     | Alt+Tab, taskbar (medium) |
| 48×48     | Desktop shortcut |
| 256×256   | Explorer large icon view |

Including 24×24, 64×64, and 128×128 improves appearance at intermediate sizes.

### Creating .ico files

Using ImageMagick:
```bash
magick convert icon-1024.png \
  -define icon:auto-resize=256,128,64,48,32,16 \
  app_icon.ico
```

Using GIMP: File → Export As → `.ico` → select sizes.

The `flutter_launcher_icons` package generates this file automatically when
`windows.generate: true` is configured.

### Manual setup procedure

1. Create `.ico` file with multiple sizes from the source PNG.
2. Replace `windows/runner/resources/app_icon.ico`.
3. Verify `Runner.rc` references the correct filename.
4. Build: `flutter build windows`

---

## Linux

### No default icon from flutter create

`flutter create` does not generate a dedicated application icon for Linux.
The window icon is typically set programmatically by the Flutter engine.

### Desktop entry

For distribution, create or update the `.desktop` file:

```ini
[Desktop Entry]
Name=My App
Comment=A Flutter application
Exec=my_app
Icon=/usr/share/icons/hicolor/256x256/apps/my_app.png
Terminal=false
Type=Application
Categories=Utility;
```

The `Icon` field can be:
- An absolute path to a PNG or SVG.
- A theme icon name (e.g., `my_app`) following the FreeDesktop Icon Theme
  Specification, which searches standard directories.

### FreeDesktop icon theme directories

For system-level installation, place icons in:

```
/usr/share/icons/hicolor/
├── 16x16/apps/my_app.png
├── 32x32/apps/my_app.png
├── 48x48/apps/my_app.png
├── 64x64/apps/my_app.png
├── 128x128/apps/my_app.png
├── 256x256/apps/my_app.png
└── 512x512/apps/my_app.png
```

### Snap packaging

Place the icon at `snap/gui/my_app.png` (256×256 or 512×512) and reference it
in `snapcraft.yaml`:

```yaml
icon: snap/gui/my_app.png
```

### Manual setup procedure

1. Create PNG icon(s) at 256×256 minimum (512×512 recommended).
2. Place in the project (e.g., `linux/app_icon.png` or packaging-specific
   location).
3. Create or update the `.desktop` file with the correct `Icon` path.
4. For Snap/Flatpak/Deb packaging, place icons in the format-specific locations.
5. Build and package: `flutter build linux`
