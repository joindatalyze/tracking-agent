# Datalyze Tracking Agent

The GitHub Action behind the [Datalyze Tracking Agent](https://www.joindatalyze.com/tracking-agent). It checks every pull request for what it does to your tracking, on your own runner with your own model, and posts `datalyze/tracking` and `datalyze/rules`.

You don't add this action by hand. Setup at [joindatalyze.com/tracking-agent](https://www.joindatalyze.com/tracking-agent) opens a pull request with the workflow and its config. The docs are at [joindatalyze.com/tracking-agent/docs](https://www.joindatalyze.com/tracking-agent/docs).

Use requires a Datalyze Tracking Agent subscription; see [LICENSE](LICENSE). This repository holds only the built action. Each release is tagged with its exact version (`v1.2.3`), and `v1` always points at the newest 1.x release.
