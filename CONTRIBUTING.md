# Contributing

Thanks for helping improve Flutter Skills. Contributions should make the guidance more accurate, practical, and safe for production Flutter and Dart work.

## Before you contribute

- Search existing issues and discussions before opening a new one.
- Keep each change focused on one skill or one documentation concern.
- Do not include secrets, private URLs, customer data, proprietary code, or unpublished source material.
- Verify package and API guidance against the relevant primary documentation when it is version-sensitive.

## Updating a skill

Each skill folder must retain this layout:

```text
skill-name/
  SKILL.md
  references/  # optional
```

`SKILL.md` is the skill manifest. Include only the files the skill needs, and keep references narrowly focused.

Before opening a pull request, confirm every skill folder has a manifest:

```sh
for manifest in skills/*/SKILL.md; do
  test -f "$manifest"
done
```

## Pull requests

Explain what changed, why it is needed, and which skill folders were updated. The **Validate skills** check must pass before merge.

By contributing, you agree that your contribution may be distributed under the [MIT License](LICENSE).
