# Cells bulk-download API demo

This developer-only script calls the real Cells API client. It creates a v2 selection, downloads the corresponding ZIP with one header-signed S3 GET using the normal user's Cells token, streams it to a temporary file, checks ZIP integrity, then renames it to the final `.zip` path. It does not add production UI or selection-operation state.

## Prerequisites

- Node.js version required by the repository and `unzip` on `PATH`.
- A Cells environment reachable through its Wire gateway, a normal Wire user access token with download permission, and the Cells S3 endpoint settings for that environment.
- Known, non-empty fixture files/folders accessible to that user. Use workspace-qualified paths, for example `team-slug/Drive/example.txt`.
- The archive parent path in the `io` bucket, including its workspace slug, e.g. `team-slug/Drive`.

Do not use an admin token as permission evidence. Do not paste tokens or signed URLs into shell history, logs, or issue comments. The script does not print either credential.

## Run

```bash
export CELLS_URL='https://drive.example.test'
read -rsp 'Normal Wire bearer token: ' CELLS_ACCESS_TOKEN; printf '\n'
export CELLS_ACCESS_TOKEN
export CELLS_ARCHIVE_PARENT_PATH='team-slug/Drive'
export CELLS_S3_ENDPOINT="$CELLS_URL"
export CELLS_S3_BUCKET='io'
export CELLS_S3_REGION='us-east-1'

npx just build-libraries
npx ts-node --project tsconfig.tools.json tools/development/cellsBulkDownloadDemo.ts \
  'team-slug/Drive/fixture one.txt' \
  'team-slug/Drive/fixture-folder'
```

The request uses `POST /v2/n/selection` through the existing SDK, then sends one SigV4 header-signed S3 `GetObject` for `<archive-parent-path>/<Uuid>-selection.zip` to the configured endpoint. The SDK signs with the normal user's Cells token and the gateway secret; the GET has one attempt and uses a streaming Fetch handler. The demo caps the archive at 512 MiB. On a detectable request/stream/size/ZIP-integrity failure the temporary `.part` file is removed; only a checked ZIP is renamed to `.zip`.

The command prints the final archive path. Inspect it with the printed `unzip -l` and `unzip -p` examples, and verify each expected fixture's relative path and contents/checksum. Recreate the selection before another download attempt because Cells consumes the selection during retrieval.

## Limits

- This proves only the paths exercised against the chosen environment. It does not prove authorization failures, interrupted connections, or that the backend included every selected descendant.
- Cells currently can omit denied descendants or zero-byte files without a failing HTTP response; ZIP integrity cannot prove completeness. Do not report full selection success based on HTTP 200 or `unzip -t` alone.
- The demo rejects archives larger than 512 MiB. Split larger selections into smaller runs. The client transfer is streamed, but the backend's lazy archive writer does not expose per-item completion or a completeness manifest.
