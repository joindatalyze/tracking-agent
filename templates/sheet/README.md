# The Datalyze tracking plan Sheet

The Sheet is a view of the registry in your repo (`analytics/registry/`), rebuilt by `datalyze sync-sheet` after every merge to your default branch. Nobody edits tracking in the Sheet; people read it, filter it and mark what they've verified.

| Tab | What's on it | Who edits it |
|---|---|---|
| Tracking Plan | Every live and planned event, one row per property | The sync, except `Verified in <tool>` and `Analyst Notes` |
| User Properties | Every live user property | The sync, except the same two columns |
| Super & Group Properties | Super properties and group properties | The sync |
| Deprecated | Deprecated events and user properties, and orphaned notes | The sync (the human columns stay) |
| Changelog | Every registry change, with the PR and the GitHub login of who approved it | The sync |

The Status columns are worked out on every sync from a scan of the default branch: `implemented`, `not implemented`, `external`, `planned`, `planned, already firing`. Nothing is written back to the registry. Audit findings are in the Datalyze review app, not the Sheet.

A Sheet made before October 2026 may still have Plan Health, Audit, Pending Changes or Requests tabs. The sync never deletes a tab: it puts a "no longer updated" note on the first row of each, and you can delete them.

The sync keeps the human columns on the same row, keyed by event and property (by property on User Properties), however the rows move. When a row goes away (a property removed, an event deprecated), its notes move to the Deprecated tab as an orphaned note, with the date, and stay there.

Two rows with the same key (a copied row) keep both notes, joined with " | ". The sync finds notes by column name, so the header rows are protected: if a tab's `Event Name`, `Property`, `Kind`, `Name`, `Verified in <tool>` or `Analyst Notes` header is renamed or deleted, the sync stops, writes nothing and says which column to put back. Moving columns is fine. A write puts the new rows in before it clears what's left below them, so a failure part-way never leaves a tab blank, and a failed sync is tried once more in the same run.

The sync reads the registry from your default branch's latest commit (origin/HEAD), never from uncommitted or unmerged files. On a laptop, `--ref <branch>` picks another commit and `--from-working-tree` builds from the files on disk.

## Make the Sheet (an Apps Script receiver, no Google Cloud project)

1. Create a Google Sheet (sheets.new), named for your product's tracking plan.
2. Extensions > Apps Script. Delete what's in `Code.gs` and paste this folder's `Code.gs`.
3. Project Settings (the gear) > tick "Show appsscript.json manifest file in editor". Open `appsscript.json` and replace it with this folder's `appsscript.json`. Save.
4. Reload the Sheet. A **Datalyze** menu appears. Datalyze > **Connect**. Google asks you to allow the script to edit this spreadsheet and show dialogs; allow it. Connect makes a token, creates the tabs and shows the steps below.
5. In the Apps Script editor: Deploy > New deployment > Select type: **Web app**. Execute as: **Me**. Who has access: **Anyone**. Deploy.
6. Copy the **Web app URL** (it ends in `/exec`) and the token from the Connect dialog. Paste both into Datalyze setup; they become the repo secrets `DATALYZE_SHEET_URL` and `DATALYZE_SHEET_TOKEN`. You can also add them yourself under the repo's Settings > Secrets and variables > Actions.

"Anyone" is needed because the sync runs on GitHub's runner, which can't sign in to Google. The script answers only requests that carry the token, and runs as you, so it can reach only this Sheet. Datalyze > Make a new token replaces the token (update the secret after).

If you change `Code.gs` later, deploy again: Deploy > Manage deployments > edit > Version: New version. The URL stays the same.

## Settings in `.datalyze/config.yaml`

```yaml
sheet:                              # optional: only to use other secret names
  url_env: DATALYZE_SHEET_URL
  token_env: DATALYZE_SHEET_TOKEN
analytics:
  tool: mixpanel                    # names the "Verified in Mixpanel" column
```

With both secrets set, the Sheet is connected; with neither, the sync job skips.

`datalyze sync-sheet --dry-run` shows what a sync would change without writing; `--json tabs.json` saves the tabs to a file.
