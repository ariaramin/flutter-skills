# Contributing

Thanks for helping improve Flutter Skills. Contributions should make the guidance more accurate, practical, and safe for production Flutter and Dart work.

## Before you contribute

- Search existing issues and discussions before opening a new one.
- Keep each change focused on one skill or one documentation concern.
- Do not include secrets, private URLs, customer data, proprietary code, or unpublished source material.
- Verify package and API guidance against the relevant primary documentation when it is version-sensitive.

## Updating a skill

Each `.skill` archive must retain this layout:

```text
skill-name/
  SKILL.md
  references/  # optional
```

`SKILL.md` must remain the only top-level manifest. Package only the files needed by the skill and keep references narrowly focused.

Before opening a pull request, validate every archive:

```sh
for skill in skills/*.skill; do
  unzip -t "$skill"
  unzip -Z1 "$skill" | rg '^[^/]+/SKILL\.md$'
done
```

## Pull requests

Explain what changed, why it is needed, and which skill archives were updated. The **Validate skill archives** check must pass before merge.

By contributing, you agree that your contribution may be distributed under the [MIT License](LICENSE).
