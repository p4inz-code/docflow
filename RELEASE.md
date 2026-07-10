# Release Process

## Version Bumping

1. Update version in `package.json` (root and `apps/renderer/package.json`)
2. Update `CHANGELOG.md` with release notes
3. Create a git tag: `git tag v<version>`
4. Push the tag: `git push origin v<version>`

## Pre-release Checklist

Before every release, run:

```bash
cd apps/renderer
pnpm typecheck   # Must pass with zero errors
pnpm build       # Must succeed
pnpm lint        # Must pass (warnings OK, errors not OK)
```

## Release Types

### Release Candidate (`rc`)
- Feature-complete, undergoing testing
- Published for community feedback

### Stable (`latest`)
- Fully tested and production-ready
- Published on the `latest` npm tag (future)

## Hotfix Process

1. Create a branch from the release tag
2. Apply the fix
3. Bump the patch version
4. Create a new tag and release
