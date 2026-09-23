# Ready to push

Branch `geo-bricks`, eight commits on top of `main` (`2329c73`), working tree
clean, clean `npm install && npm run build` verified from this directory.

It could not be pushed when it was written: the GitHub credential in this
machine's keychain belongs to **Rahul-Mirewa**, which has read but not write
access to `VegaMorningstar/Write-With-Nature`.

    remote: Permission to VegaMorningstar/Write-With-Nature.git denied to Rahul-Mirewa.

There is also no `~/.ssh` on this machine, so the `git@github.com:` form cannot
work here either. This clone uses HTTPS.

&nbsp;

## 1. Fix the commit author first

The eight commits were authored as `Rahul Kakarlapudi
<morningstar@Rahuls-MacBook-Air.local>`, because no `user.name` or
`user.email` is set globally or locally. That address is not a GitHub
identity, so the commits will not link to any account.

```bash
git config --global user.name  "Your Name"
git config --global user.email "you@example.com"   # verified on the account

# re-author all eight, keeping messages and dates
git rebase --exec 'git commit --amend --no-edit --reset-author' main
```

&nbsp;

## 2. Switch the account

Either the keychain on its own — this keeps the Rahul-Mirewa token, since the
helper keys on host *and* username:

```bash
git config --global credential.https://github.com.username VegaMorningstar
printf 'protocol=https\nhost=github.com\n\n' | git credential reject
```

The next push prompts. Username `VegaMorningstar`; the password is a
**Personal Access Token**, not the account password. A fine-grained token
scoped to this repo with *Contents: Read and write* is enough.

Or `gh`, which does the browser flow and can hold both accounts:

```bash
brew install gh
gh auth login          # GitHub.com → HTTPS → browser
gh auth setup-git
gh auth switch         # to move between accounts later
```

&nbsp;

## 3. Push

`main` has not moved, so this fast-forwards.

```bash
git checkout main
git merge --ff-only geo-bricks
git push origin main
```

That push is what deploys: `.github/workflows` builds and publishes to GitHub
Pages on every push to `main`. Nothing else has to be run.

&nbsp;

## What is in it

- Every letter rendered as a geological block — the Landsat scene displaced
  into relief over the stratigraphic section that place actually has, with the
  character cut into the face.
- Real geology behind it: bedrock from Macrostrat, local relief from SRTM,
  harvested once into `src/data/geology.js`.
- 122 blocks baked to `images/bricks/`, so a tile costs one `<img>` and the
  board paints with no delay.
- Flamingo skeins migrating across the collage panel.
- Board UI: bigger blocks, block/flat toggle, hover lights the engraved
  letter, Enter renders, RENDER glows while composing (dark theme).

Full documentation in `docs/geo-bricks.md`.

A bundle of the same commits is at `~/wwn-geo-bricks.bundle`, in case this
clone is lost:

```bash
git fetch ~/wwn-geo-bricks.bundle geo-bricks:geo-bricks
```
