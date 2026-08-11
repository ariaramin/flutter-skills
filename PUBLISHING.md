# Publishing Flutter Skills on GitHub 🚀

This checklist prepares the repository for a clean, trustworthy public launch and keeps later releases consistent.

## Before the first push

### 1. Confirm the license

This repository uses the MIT License. Keep `LICENSE` at the repository root and update its copyright year only when appropriate.

If the licensing goals change, obtain legal guidance before replacing it; a public repository is not automatically open source without an explicit license.

### 2. Review the published files 🔍

Confirm that every archive contains only material intended for public distribution. In particular, remove or redact:

- API keys, tokens, passwords, certificates, and private URLs.
- Customer, employer, or personal data.
- Proprietary source code, screenshots, or internal documentation.

Validate all packages locally:

```sh
for skill in skills/*.skill; do
  unzip -t "$skill"
  unzip -Z1 "$skill" | rg '^[^/]+/SKILL\.md$'
done
```

### 3. Publish the repository

Push the prepared repository to its GitHub remote:

```sh
git push -u origin main
```

If the remote has not been configured yet, add it before pushing:

```sh
git remote add origin https://github.com/YOUR-ACCOUNT/flutter-ai-skills.git
```

### 4. Configure the GitHub repository ⚙️

- Add a concise description, for example: **“Production-focused AI skills for Flutter and Dart development.”**
- Add relevant topics: `flutter`, `dart`, `ai`, `skills`, and `developer-tools`.
- Verify that the README renders correctly and that every skill link opens its archive.
- Enable branch protection for `main` and require the **Validate skill archives** workflow before merging changes.

## Create the first release

Use a version tag such as `v1.0.0` for the first public release. Create the release from GitHub and include short notes covering:

- The initial set of available skills.
- The intended AI tools or environments, if known.
- Any important compatibility baselines or limitations.

Attach the `.skill` archives as release assets if you want users to download packages from one place. The files remain available from the repository either way.

## Release workflow

For every update:

1. Validate the archives locally and confirm the GitHub Action passes. ✅
2. Update `README.md` when the catalog, package names, or usage guidance changes.
3. Review every changed archive for private or sensitive information.
4. Tag the release and publish clear release notes.

Use semantic versioning for repository releases:

- **Major** — breaking instruction changes or compatibility shifts.
- **Minor** — new skills or substantial new guidance.
- **Patch** — corrections, clarifications, and non-breaking maintenance.

## Ready-to-publish summary

The repository documentation, community files, social preview, and archive-validation workflow are ready. Set the GitHub metadata, enable the recommended settings, then publish the first tagged release. 🎉
