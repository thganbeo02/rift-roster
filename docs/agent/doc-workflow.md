# Doc & wrap-up workflow

Task module for editing the spec docs, maintaining the changelogs, and closing out a session. AGENTS.md routes here; read it when you enter this mode. AGENTS.md's constraints (§2) still apply.

---

## 1. Doc set & versioning

Versioned spec docs: `docs/01-PRD.md`, `docs/02-TDD.md`, `docs/03-Roadmap.md`. Each carries a `Doc version` in its header and a `## Changelog` at its foot. `AGENTS.md`, `README.md`, this module, and `docs/CHANGELOG.md` are **unversioned** working/summary docs.

Version bump rule (independent of git tags — a doc's version is about the doc, not the release):

- **MAJOR** — a change that invalidates other docs or reverses a decision. In practice only the PRD and TDD reach this. When the PRD or TDD takes a MAJOR bump, review every doc that cites the changed section.
- **MINOR** — a new feature, entity, or section.
- **PATCH** — wording, clarification, or formatting that changes nothing binding.

Docs read as **current-state truth** — present tense, no inline "what changed on date X" narration. All history lives in the changelogs (per-doc foot + project summary). If you catch yourself writing "this used to be…" in a spec body, move it to a changelog.

## 2. Per-doc changelog

At the foot of each versioned doc:

```markdown
## Changelog

- **2.0.0** (2026-07-15) — One-line summary of what changed in THIS doc.
- **1.0.0** (2026-07-15) — Initial version.
```

Newest first. Keep entries doc-specific — what changed *in this doc*, not the whole project.

## 3. Project changelog format (`docs/CHANGELOG.md`)

Newest first. One entry per meaningful change-set, headed:

```markdown
## [YYYY-MM-DD] — Short imperative title — vX.Y.Z
```

`vX.Y.Z` is the rolling **project** version (distinct from per-doc versions). Under the header:

1. A short **prose summary** — what the change accomplishes and why, in a sentence or three.
2. Categorized lists, only the categories that apply, in this order: **Added, Changed, Deprecated, Removed, Fixed, Security, Notes**. (`Notes` is for caveats, deferred items, and decisions worth recording; the other six are Keep-a-Changelog standard.)
3. A **doc-version table** when any spec doc's version changed:

   ```markdown
   | Doc | Version |
   |---|---|
   | 01-PRD | 2.0.0 |
   ```

Write for humans, not git-log noise. No `[Unreleased]` section — planned work lives in the Roadmap, not here; the changelog records what is *done*.

## 4. Wrap-up ritual

Triggered when the organizer says **"wrap up"**, **"commit"**, **"done"**, or an equivalent close-out. Follow this **exactly and in order** — do not loosely summarize it:

1. **Inspect** — `git status` / `git diff` and list what changed since the last commit, with the intent behind each group.
2. **Update the changelogs** — add/curate the project `docs/CHANGELOG.md` entry (§3) and bump any affected doc's version + foot changelog (§1, §2). Only touch changelogs during a wrap-up/commit/done request or when explicitly asked — never preemptively mid-work.
3. **Sync docs** — if the work changed a decision recorded in a spec, update it now (present tense).
4. **Verify** — run the tests (and the build, if shippable output was touched). Report pass/fail. Do not proceed over red tests or a broken build without flagging it loudly.
5. **Stage deliberately** — `git add` the intended files; never blanket-add secrets, `dist/`, or `node_modules/`.
6. **Present the commit plan** — show the proposed message (AGENTS.md §5 template) and the staged file list, then hand over the exact `git commit` command for the organizer to run, and **stop**. The agent never runs `git commit` or `git push` — both are human-only, always.
7. Remind the organizer that after they commit, they run `git push` themselves.

**Cutting a version:** only when explicitly asked (e.g. "wrap up and release 0.3.0"). Then set the project version on the new changelog entry accordingly and, optionally, create the matching `git tag`.
