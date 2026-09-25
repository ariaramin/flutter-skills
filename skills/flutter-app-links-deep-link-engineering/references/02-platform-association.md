# Android, iOS, macOS, Windows, Linux, and Web association/activation behavior

## Contents

- [Android Custom Schemes](#android-custom-schemes)
- [Android App Links](#android-app-links)
  - [Manifest](#manifest)
- [Android App Link Verification](#android-app-link-verification)
- [Android Signing Certificates](#android-signing-certificates)
- [Android Verification Troubleshooting](#android-verification-troubleshooting)
- [Android Association Caching](#android-association-caching)
- [iOS Custom Schemes](#ios-custom-schemes)
- [iOS Universal Links](#ios-universal-links)
  - [Associated Domains](#associated-domains)
- [Apple App Site Association File](#apple-app-site-association-file)
- [iOS Link Opening Behavior](#ios-link-opening-behavior)
- [iOS 7.x Lifecycle Behavior](#ios-7x-lifecycle-behavior)
- [iOS Testing](#ios-testing)
- [macOS / Other Platforms](#macos-other-platforms)
  - [macOS](#macos)
  - [Windows](#windows)
  - [Linux](#linux)
  - [Web](#web)

---

# Android Custom Schemes

Current package Android setup requires disabling Flutter's default deep-link handler when `app_links` owns the platform link path.

Package documentation states that from Flutter 3.24 this must be explicitly disabled.

Inside the Flutter Activity declaration:

```xml
<meta-data
    android:name="flutter_deeplinking_enabled"
    android:value="false" />
```

Register a custom scheme:

```xml
<intent-filter>
    <action android:name="android.intent.action.VIEW" />

    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />

    <data
        android:scheme="myapp"
        android:host="open" />
</intent-filter>
```

Then:

```text
myapp://open/products/42
```

can be eligible for the Activity.

Custom schemes are **not verified domain associations**.

Another application may register the same scheme depending on platform behavior.

Do not treat:

```text
myapp://...
```

as equivalent in security to a verified HTTPS App Link.

---

# Android App Links

Android App Links are verified HTTP/HTTPS deep links tied to website ownership.

Android recommends App Links for links to domains you control because they add domain verification.

## Manifest

Use an intent filter similar to:

```xml
<intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />

    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />

    <data
        android:scheme="https"
        android:host="example.com"
        android:pathPrefix="/products" />
</intent-filter>
```

The package's own current setup demonstrates `VIEW`, `DEFAULT`, `BROWSABLE`, `https`, a host, a path prefix, and `android:autoVerify="true"`.

Keep filters broad enough to match the stable public URI contract but narrow enough not to claim unrelated website routes.

Do not rely only on Dart validation to compensate for an unnecessarily broad manifest.

---

# Android App Link Verification

An intent filter does not automatically mean the URL is a verified App Link.

Verification requires:

```text
Android manifest
+
android:autoVerify="true"
+
HTTPS host
+
hosted Digital Asset Links file
+
matching application ID
+
matching signing certificate
```

Android automatically requests:

```text
https://<host>/.well-known/assetlinks.json
```

for hosts participating in verification.

Typical association:

```json
[
  {
    "relation": [
      "delegate_permission/common.handle_all_urls"
    ],
    "target": {
      "namespace": "android_app",
      "package_name": "com.example.app",
      "sha256_cert_fingerprints": [
        "AA:BB:CC:DD:..."
      ]
    }
  }
]
```

The file identifies the Android package and SHA-256 signing-certificate fingerprints.

---

# Android Signing Certificates

Do not guess the signing fingerprint.

Possible certificates include:

- local debug certificate;
- local release certificate;
- upload certificate;
- Google Play App Signing certificate.

If Play App Signing is enabled, Android's official documentation notes that a locally generated release fingerprint commonly differs from the certificate installed on users' devices. Use the App Signing certificate information from Play Console for the production association.

Support multiple fingerprints when intentionally supporting multiple signed variants.

Do not accidentally authorize an unnecessary development signing key on a highly sensitive production domain.

---

# Android Verification Troubleshooting

For Android 12+ inspect domain state:

```bash
adb shell pm get-app-links com.example.app
```

A successful host should report a verified state. Android documents this command for reviewing domain verification results.

Invoke a URI:

```bash
adb shell am start \
  -a android.intent.action.VIEW \
  -c android.intent.category.BROWSABLE \
  -d "https://example.com/products/42"
```

For a custom scheme, the package documents:

```bash
adb shell am start \
  -a android.intent.action.VIEW \
  -d "myapp://open/products/42"
```



When HTTPS opens the browser unexpectedly, inspect:

1. exact manifest host;
2. `https` scheme;
3. `VIEW`, `DEFAULT`, `BROWSABLE`;
4. `android:autoVerify`;
5. deployed `assetlinks.json`;
6. application ID;
7. SHA-256 fingerprint;
8. Play App Signing;
9. device domain state;
10. user "Open by default" settings;
11. whether the tested URL matches path constraints.

Android 12+ generally opens unverified generic web links in the browser rather than assuming an unverified application handler.

---

# Android Association Caching

Do not expect a changed `assetlinks.json` to propagate instantly.

Current Android documentation notes OS-version-dependent re-verification/caching behavior; on newer Android versions association updates can take time to propagate.

When debugging:

- confirm the server response first;
- check device verification state;
- reinstall/reverify where appropriate;
- distinguish stale platform verification from application routing bugs.

---

# iOS Custom Schemes

Disable Flutter's default deep-link handler when third-party `app_links` is intended to own delivery:

```xml
<key>FlutterDeepLinkingEnabled</key>
<false/>
```

The `app_links` docs and Flutter's own Universal Links setup both warn that Flutter's default handler can conflict with third-party plugins.

Register the scheme under URL types:

```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLName</key>
        <string>com.example.app</string>

        <key>CFBundleURLSchemes</key>
        <array>
            <string>myapp</string>
        </array>
    </dict>
</array>
```

Apple defines `CFBundleURLTypes` and `CFBundleURLSchemes` as the app's URL-scheme declarations.

Do not use custom schemes as proof of website ownership.

---

# iOS Universal Links

Universal Links use HTTPS and a verified app↔website association.

They require two sides:

```text
application
→ Associated Domains entitlement

website
→ apple-app-site-association
```

Apple explicitly describes associated domains as a secure association between an app and website.

## Associated Domains

Configure:

```text
applinks:example.com
```

in the Associated Domains entitlement:

```text
com.apple.developer.associated-domains
```

Apple defines values in:

```text
<service>:<fully qualified domain>
```

form.

Each required subdomain must be considered separately.

Do not assume:

```text
applinks:example.com
```

automatically configures:

```text
www.example.com
support.example.com
```

Apple's current guidance states that separate subdomains require their own associated-domain entries and corresponding AASA availability.

---

# Apple App Site Association File

Host a file named exactly:

```text
apple-app-site-association
```

without `.json`.

Use the current `applinks` structure and `components` rules where appropriate.

Conceptual example:

```json
{
  "applinks": {
    "details": [
      {
        "appIDs": [
          "TEAMID.com.example.app"
        ],
        "components": [
          {
            "/": "/products/*"
          },
          {
            "/": "/invite/*"
          }
        ]
      }
    ]
  }
}
```

Apple's current `applinks.Details` documentation supports `appID`/`appIDs` and `components`. Application identifiers use the Application Identifier Prefix followed by the bundle identifier.

Do not copy legacy `paths`-only examples blindly when designing new association files.

---

# iOS Link Opening Behavior

Do not promise:

```text
matching Universal Link → app always opens
```

User choice, browser context, installed state, and platform behavior influence opening.

Apple specifically documents Safari behavior where a same-domain link from an already-open webpage may continue in Safari because the user is considered to be browsing the website; different-domain/subdomain behavior can differ.

Therefore troubleshoot:

```text
Universal Link opens Safari
```

as a platform association/context issue before assuming `app_links` is broken.

---

# iOS 7.x Lifecycle Behavior

Current `app_links` 7.x added support for Flutter's modern iOS Scene lifecycle and also retains application-based support. The package's current iOS 7 documentation requires Flutter 3.38.1+ for that branch of behavior and describes UIScene handling.

The plugin exposes native customization such as:

- `enabled`;
- `defaultUrlHandling`;
- `urlHandledCallBack`;

for advanced iOS plugin event-propagation scenarios.

Do not customize these unless another native plugin is competing for the same application/scene URL callbacks.

Default application code should remain on the Dart `AppLinks` API.

---

# iOS Testing

The package documents simulator testing via:

```bash
/usr/bin/xcrun simctl openurl booted \
  "myapp://open/products/42"
```



Use real devices for final Universal Link verification, especially where:

- production entitlement signing;
- CDN association caching;
- browser/user preference;
- installed production bundle

matter.

---

# macOS / Other Platforms

## macOS

Current package docs support:

- custom schemes through `CFBundleURLTypes`;
- HTTPS Universal Link handling;
- explicit AppDelegate forwarding for Universal Links because the Flutter macOS plugin embedder does not currently expose the needed interception directly.

Do not assume iOS setup can be copied unchanged to macOS.

## Windows

Current docs support:

- custom protocol activation;
- web-to-app activation for packaged apps;
- forwarding a newly launched instance's link to an existing instance through `SendAppLinkToInstance`;
- registration using packaged manifest/MSIX configuration.

The docs explicitly state that manual custom-scheme registration uses the Windows registry and that the package does not automatically perform that registration for unpackaged apps.

## Linux

Current package documentation focuses on custom URL activation and integration with the Linux desktop/application registration model. It documents `G_APPLICATION_HANDLES_COMMAND_LINE | G_APPLICATION_HANDLES_OPEN` and MIME registration such as `x-scheme-handler/...`.

Do not claim verified HTTPS association semantics on Linux where the package's feature matrix marks that capability as uncertain.

## Web

Do not build a mobile-style runtime listener architecture for Flutter web.

The package implementation exposes the browser's current `window.location.href`; the README describes web support as only the first call/current startup URL.

Use `go_router` or Flutter Router for normal web URL changes.

---

