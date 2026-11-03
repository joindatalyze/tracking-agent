# .datalyze

This folder belongs to the [Datalyze Tracking Agent](https://www.joindatalyze.com/tracking-agent), which checks every pull request for what it does to this product's tracking. Setup wrote it on __SETUP_DATE__.

The tracking plan itself is in `__REGISTRY__/`: one YAML file per area, plus the shared rules in `_conventions.yaml`. That folder is the source of truth; the Google Sheet, if you use one, is a view of it on `__DEFAULT_BRANCH__`.

## What's in here

| Path | What it is | Who edits it |
|---|---|---|
| `config.yaml` | How the check runs here: model, reviewers, your own checks, the Sheet | You |
| `context.md` | What your team told the agent about the product: where tracking is sent, what matters, what to leave out. Every model call reads it | You (or Setup in Datalyze) |
| `conventions.md` | Rules reviewers made with "Make this a rule"; the agent treats them as binding | The agent, from reviews |
| `decisions.yaml` | Rejected and dropped proposals, with reasons, so they aren't proposed again | The agent, from reviews |
| `proposals/pr-<n>.yaml` | The tracking proposal for one pull request | The agent writes it; reviewers edit `final` and `note` |
| `cache/` | The verified method bundle, so a run works if Datalyze can't be reached | The agent (ignored by git) |

## How a pull request is checked

1. `datalyze/rules` runs scripts only (no model): the plan's rules and the code against the plan.
2. `datalyze/tracking` runs the agent. Most pull requests need no tracking change and pass with a one-line reason.
3. When one does, the agent commits a proposal to the PR. A reviewer approves it in Datalyze ([review inbox](__REVIEW_URL__)) or with GitHub's own **Approve** review.
4. The agent implements the approved items, verifies them and pushes one commit. Someone approves that commit, and the check turns green.

Reviewers: __REVIEWERS__.

## Approving

| On GitHub | What it does |
|---|---|
| **Approve** on the proposal commit | Approves every item the proposal file doesn't mark `rejected` or `dropped`, and starts the implementation |
| **Approve** on the verified commit | Signs off: `datalyze/tracking` turns green |
| The label `datalyze:approve` | The same, for the PR's author (GitHub doesn't let authors approve their own PR), unless `allow_author_approval: false` |
| Edit `.datalyze/proposals/pr-<n>.yaml`, then Approve | Change an item (`final`, `note`), leave one out (`decision: rejected` with a `reason`), or answer a question (`choice: B`) |
| **Retry** in Datalyze, or Re-run jobs on GitHub | Runs the last step again after an error or an environment problem |

Each approval counts for the commit it was given on: a later push needs a new one. To merge without the check, use the ruleset's bypass list.

## Your data and keys

The agent runs on your GitHub runner with your own model key and analytics access, saved as secrets in this repo. The only call to Datalyze sends the workspace key in `DATALYZE_KEY` and gets back whether the licence is active and the signed method. No code, repo name or data is sent.

Docs: [__DOCS_URL__](__DOCS_URL__)
