# Publishing and maintenance

Versioning, release mechanics, scoring, deprecation, security, and long-term maintenance. Strength labels per SKILL.md §1. **All publish/retract/discontinue actions require an explicit user instruction** — automation and dry-runs are the agent's ceiling otherwise.

## Versioning rules

- Pub follows SemVer with one Dart-community extension: **pre-1.0.0 versions are treated semantically with positions shifted one slot** — `0.1.2 → 0.2.0` is breaking, `0.1.2 → 0.1.3` adds functionality, `0.1.2 → 0.1.2+1` is non-API. The major bump below 1.0.0 is therefore the **minor** position.
- Caret constraints encode this: `^0.1.2` = `>=0.1.2 <0.2.0`; `^2.3.5` = `>=2.3.5 <3.0.0`. A breaking change you ship without the bump breaks every consumer's resolution assumptions.
- Avoid `+build` suffixes once ≥1.0.0. Prerelease suffixes (`-beta.1`) don't participate in normal resolution — consumers must opt in explicitly.
- Publishing 1.0.0 is a stability commitment: API settled, docs complete, tests real. Stay pre-1.0 while the API is still moving.

Source: https://dart.dev/tools/pub/versioning

## Release mechanics

1. Update `version` and add a CHANGELOG section (heading per version, e.g. `## 1.2.0`; keep all headings the same level; users read this on pub.dev).
2. Validate: `dart pub publish --dry-run` — verifies pubspec/layout conformance and lists every file that would ship; anything unexpected in the list means fixing excludes (`.gitignore`/`.pubignore`), not publishing anyway.
3. Publish (user-authorized): `dart pub publish` — permanent. Old versions stay available forever; unpublishing is disallowed except rare cases. pub.dev's archive reader rejects a gzip archive over 100 MB, uncompressed contents over 256 MB, or more than 65536 files. The publishing guide states the same 100 MB / 256 MB ceilings. A clean `--dry-run` does not execute every server check (template description text and some plugin-folder rules are server-side). Report dry-run status separately from a completed upload.
4. Tag (`git tag v1.2.0 && git push origin v1.2.0`) when automated publishing is configured — the tag **must equal** the pubspec version and the configured tag pattern.
5. Post-release: verify the pub.dev page renders (README, changelog, screenshots) and pub points.

Files that publish: everything under the package root except dot-prefixed (hidden) entries and `.gitignore`/`.pubignore` matches. A dirty git tree warns on publish. LICENSE redistribution rights are the author's responsibility.

Source: https://dart.dev/tools/pub/publishing

## pub.dev scoring (SCORING)

Six pub-point categories, computed by **pana** on pub.dev (no fixed numeric weights are published — don't chase invented point math):

1. Dart file conventions — valid pubspec with https URLs, LICENSE (OSI-preferred), README, CHANGELOG.
2. Documentation — code example + docs on ≥20% of public API members.
3. Platform support — derived from the transitive import graph; overridable via `platforms:` or plugin declarations.
4. Modern toolchains — SwiftPM for iOS/macOS plugins; Wasm-readiness for web.
5. Static analysis — clean `dart analyze` against the core lint set.
6. Up-to-date dependencies — latest stable SDKs and dependency versions (`dart pub outdated`).

Preview locally: `dart pub global activate pana` then run it on the package copy. Likes/downloads are popularity signals, not quality gates.

Source: https://pub.dev/help/scoring

## Verified publishers

Creating a verified publisher requires being a public uploader of ≥1 package and verifying a **top-level domain** through Google Search Console (subdomains like `*.github.io` do not qualify). Publishers get the badge and hide personal emails. New packages publish to the account first, then transfer to the publisher — **the transfer is irreversible**.

Source: https://dart.dev/tools/pub/verified-publishers

## Deprecation and end-of-life

- Deprecating an API: `@Deprecated('Since 1.3. Use X instead.')` + `lib/fix_data.yaml` so `dart fix` migrates consumers mechanically; validate fixes with `test_fixes/` goldens (`dart fix --compare-to-golden`). Keep the deprecated path working until the next major.
- Marking a package **discontinued**: pub.dev → package → Admin tab → Mark "discontinued" (search/`dart pub upgrade` then surface it to consumers).
- **Retraction**: available only within 7 days of publishing (restorable for 7 more); shows a RETRACTED badge; for serious flaws — otherwise publish a fixed version, which preserves consumers who can't upgrade.

Source: https://dart.dev/tools/pub/publishing

## Security and dependency hygiene

- Advisories come from the GitHub Advisory Database: file a **draft security advisory** on your repository → GitHub reviews → ingestion. pub surfaces affected dependencies during `dart pub get`.
- When a dependency carries an advisory: "strongly consider upgrading to a non-affected version" — for a published package this is urgent because every consumer inherits the exposure.
- `ignored_advisories` suppresses warnings **for the root package only** — a library's suppressions never hide advisories from consuming apps. Use sparingly with written justification.
- Never ship secrets in packages; `false_secrets` lists files the leak-checker should allow. Treat consumer-facing permission requests as documented public behavior (README + platform manifests).
- Track ecosystem drift with `dart pub outdated`; apply `dart pub upgrade --major-versions` deliberately (it widens constraints — then re-run the downgrade test).

Source: https://dart.dev/tools/pub/security-advisories

## Maintenance cadence

- Automated publishing (setup in [Testing and CI](testing-and-ci.md)) turns releases into tag pushes; environment pinning (`pub.dev` GitHub environment) gates them behind protection rules.
- Keep an UNRELEASED changelog section during development; fold it into the release heading on publish.
- Periodic maintenance pass (RECOMMENDED): SDK lower bound still correct, advisories clear, pana score stable, example app still builds on supported platforms, deprecations progressing toward removal majors.
- Research-sensitive areas (plugin schema, SwiftPM, Pigeon majors, scoring rules) change — recheck current docs before relying on remembered guidance.
