# Datalyze Tracking Agent action

This GitHub Action runs the [Datalyze Tracking Agent](https://www.joindatalyze.com/tracking-agent) in your repository. It runs Claude Code with the `datalyze` plugin on your runner, with your own Anthropic key, through [`anthropics/claude-code-action`](https://github.com/anthropics/claude-code-action). It needs a Datalyze subscription.

Datalyze's setup writes the workflow for you. It is [`datalyze.yml`](datalyze.yml) in this repository, saved as `.github/workflows/datalyze.yml`.

## What it does

| When | What runs | Status `datalyze/tracking` |
|---|---|---|
| A pull request is opened or pushed | `review`: what tracking the change needs, written as a proposal on the branch and a comment | "No tracking change needed", or "Awaiting approval" |
| You approve in Datalyze, or comment `@datalyze apply` | `implement`: the approved changes, checked by the rules and an independent verifier, committed to the branch | "Implemented and verified", "Implemented, N held back", or "Needs a person" |
| Run from Datalyze | `audit` of the default branch, or the fixes and answers you pick on the audit screen (one pull request per audit) | |
| A push to the default branch | The Google Sheet is rebuilt from the tracking plan | |
| `@datalyze <anything>` on an issue or pull request | Claude answers, with the plugin | |

The `rules` job posts `datalyze/rules` on every push to a pull request: the plan's hard rules and plan-vs-code drift, scripts only, no model.

The agent never changes your rules files (`_conventions.yaml`, `_baseline.json`), `.datalyze/config.yaml`, `.datalyze/context.md`, `.claude/` or `.github/`. If the subscription lapses, both statuses pass as "Tracking Agent inactive, not checked", so a merge is never blocked.

## Each run's record

Every run records each step it went through and whether it worked: the licence and the plugin, the knowledge, every Datalyze tool call (each `scan`, the snapshot and what it couldn't measure, `match` per area, every follow-up query), each subagent and verifier round, the checks, and every push, status and comment. A run can finish and still have had a step fall back, so the record says which.

- **The run's summary** on GitHub shows the steps that need a look first, then every step.
- **The pull request's report** gets one line under it: whether every step went through, linking to the summary.
- **Datalyze** shows it under Steps in the runs list, and the latest run's on the audit and pull request screens.
- **Two artifacts:** `datalyze-run-record` (`run.json`, kept 90 days, which Datalyze reads through your sign-in) and `datalyze-run` (the step log, Claude's transcripts and the run's working files, kept 30 days, for debugging). Every secret the run held is removed from them first, and so are Datalyze's knowledge files. Both stay in your repository, visible to whoever can see its Actions runs; on a public repository only the record is kept.

Your code, data and keys stay on your runner. Datalyze receives only your workspace key, for the licence check, and the run's GitHub OIDC token, which proves which repository asks for the Datalyze App's token.

## Inputs

| Input | |
|---|---|
| `job` | `auto` (from the event) or `rules` |
| `anthropic_api_key` | Your Anthropic API key |
| `datalyze_key` | Your workspace's Datalyze key |
| `github_token` | Defaults to the workflow's own token |

The analytics keys (`MIXPANEL_SA_USERNAME` and `MIXPANEL_SA_SECRET`, or PostHog's or Amplitude's) go in the step's `env`, as the workflow shows.
