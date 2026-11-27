# webapp 1.4.0

The next release after 1.3.0. The Helm chart is now also published on `quay.io/wire/charts/stable` with the application version; see the chart notes before upgrading.

- Shared Drive bulk actions with progress, restore and permanent delete that survive leaving the Bin.
- PDF previews in an overlay, with thumbnails and a card action menu.
- Meeting preparation modal and reminder diagnostics.
- Desktop log downloads and structured logging.
- Fixes around login, notifications, conversation creation and media.

---

## Details

Changes since 1.3.0: https://github.com/wireapp/wire-webapp/compare/v1.3.0...v1.4.0

### Features

- Shared Drive: bulk action progress, restore and permanent delete continue after leaving the Bin, one bulk action at a time until the outcome settles, Bin selection preserved across moves (WPB-29990, WPB-30228, WPB-30322).
- PDF files: overlay preview with the shared viewer, thumbnails, card action menu, compact quoted attachments (WPB-29908).
- Meetings: preparation modal mounted across views, meeting type in the creation payload, reminder notification diagnostics.
- Desktop: log downloads from the settings, structured logging when supported.
- Existing Shared Drives stay available during team offboarding; pending onboarding status.

### Fixes

- Retryable login error when local storage fails.
- Duplicate conversation creation blocked while a creation is submitting.
- In-app notification stays visible after setting the status to away.
- Video player crash in folders (WPB-30038); asset download of multipart message replies (WPB-30056); call timer reset.
- File size metadata normalized; double scrollbar on settings pages; message details and collapsed sidebar folders empty states.
- MLS: recovery of missing message references (WPB-23357); upgrade prompt when the browser lacks JSPI (WPB-30036).

### Internal

- core-crypto 11, native TypeScript 7 builds, camelCase file names, legacy WebSocket lifecycle removed, gzip and deflate response compression.
- CI: public production package verification in parallel, E2E bound to the application artifact commit, Git LFS required for .bin files.

### Chart

The chart is published as `webapp` version 1.4.0 on `quay.io/wire/charts/stable`, with `appVersion` 1.4.0; pre-releases are on `quay.io/wire/charts/dev`. The image `quay.io/wire/webapp:1.4.0` is built from the same application build as the Wire cloud deployment package and promoted by digest from the image verified during the release. The S3 chart repository keeps its own numbering for `wire-builds`. Set `image.repository` to pull from another source, for example a mirror.

### Compatibility

Client API versions 1 to 17 (meetings need 17 on the backend). coturn 5.6.0 or later, sftd and Wire Drive 5.0.3 or later when their features are enabled. See `publication/compatibility.yaml`.
