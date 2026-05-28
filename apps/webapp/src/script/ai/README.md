AI scanning analyses Wire conversations locally via Ollama and produces per-conversation reports with summaries, action items, and tickets. Nothing leaves the device.

Main entry points: `ScanRunner` in `pipeline/` orchestrates scans; `AiStorageRepository` in `storage/` persists all data to IndexedDB (Dexie v22). UI routes live under `ui/` — list at `#/reports`, detail at `#/reports/:id`, preferences at `#/preferences/ai`.

To trigger a scan: click the Reports tab in the Wire sidebar, then click the Scan button. Requires Ollama running locally (default `http://localhost:11434`) with a supported model (default `qwen3.6:35b`).

See `docs/tasks/01-basic-ai-scanning.task.md` for full specification.
