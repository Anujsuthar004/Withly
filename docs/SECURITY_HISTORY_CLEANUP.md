# Security History Cleanup

If a secret or user data was ever committed:

1. Rotate the exposed credential first.
2. Remove the file from the current tree.
3. Rewrite git history to purge the file completely.
4. Force-push only after coordinating with any collaborators.
5. Invalidate old deploy previews or environments that may still reference the leaked secret.

Typical cleanup flow:

```bash
git filter-repo --path .env.production --path backend/data/store.json --invert-paths
git push --force --all
git push --force --tags
```

After the rewrite:

- ask collaborators to reclone
- confirm the removed paths no longer appear in `git log --all -- <path>`
- rotate any tokens that might still have been copied elsewhere
