# @wireapp/config

Shared configuration library for Wire webapp and server.

## Overview

This library contains environment variable type definitions and configuration generators used by both the webapp and server applications. It provides:

- `Env` type - Type definition for all environment variables
- `ClientConfig` type - Configuration object passed to the webapp client
- `ServerConfig` type - Configuration object used by the Node.js server
- `generateClientConfig()` - Function to generate client config from environment variables
- `generateServerConfig()` - Function to generate server config from environment variables

## Installation

This package is part of the workspace and should be installed using workspace protocol:

```json
{
  "dependencies": {
    "@wireapp/config": "workspace:^"
  }
}
```

## Usage

### Importing Types

```typescript
import type {Env, ClientConfig, ServerConfig} from '@wireapp/config';
```

### Generating Configuration

```typescript
import {generateClientConfig, generateServerConfig} from '@wireapp/config';

// Generate client configuration
const clientConfig = generateClientConfig(
  {version: '1.0.0', env: 'production', urls: {...}},
  env
);

// Generate server configuration
const serverConfig = generateServerConfig(
  {version: '1.0.0', env: 'production', urls: {...}},
  env
);
```

## Environment Variables

The `Env` type defines all supported environment variables. This section documents environment variables **currently used by this library's config generators** (`src/client.config.ts` and `src/server.config.ts`), including effective default values and purpose.

### Configuration sources and priority

Configuration values are resolved from multiple sources. The effective value priority is:

1. **Process environment variables** (highest priority)
  - Example: AWS Elastic Beanstalk / container runtime environment variables.
  - `dotenv-extended` is loaded with `includeProcessEnv: true`, so process env wins.
2. **`.env` file**
  - Local or deployment-specific overrides checked into the deployment artifact/environment.
3. **`.env.defaults` file**
  - Baseline defaults copied from configuration repositories.
4. **Code-level fallback in generators** (lowest priority)
  - Example: `MAX_API_VERSION` fallback to `13`, `PORT` fallback to `21080`.

If `FEDERATION` is not set, `APP_BASE`, `BACKEND_REST`, and `BACKEND_WS` must resolve to non-empty values (otherwise config generation throws an error).

### How configuration repositories are used

- `apps/webapp/app-config/package.json` pins configuration repositories and versions.
- `webapp:configure` runs `copy-config` using `apps/webapp/.copyconfigrc.js`.
- That step copies repository content into `apps/webapp/resource/` and writes repo `.env.defaults` into workspace root `.env.defaults`.
- Configuration selection order in `.copyconfigrc.js`:
  1. If `FORCED_CONFIG_URL` is set, that URL is used directly.
  2. Otherwise, if `DISTRIBUTION` is set (and not `wire`), it selects dependency key `wire-web-config-default-${DISTRIBUTION}`.
  3. Otherwise, if the current commit tag contains `staging` or `production`, it selects `master`.
  4. Otherwise, it selects `staging`.
  5. The selected key is resolved via `apps/webapp/app-config/package.json` dependencies to get the final repository URL.

### What "additional conditions" means

- **Additional Conditions** indicates whether runtime/platform/backend constraints may still keep a feature effectively disabled even when the environment variable is enabled.
- This column is informational and separate from value priority.
- For non-feature rows, this is usually `N/A`.

### Where default values come from

- **Primary source:** configuration repositories (pinned in `apps/webapp/app-config/package.json`) provide baseline values via their `.env.defaults`.
- During `webapp:configure`, the selected config repository is copied and its `.env.defaults` is written to workspace root `.env.defaults`.
- At runtime/build time, values are loaded with this priority: **process env** > **`.env`** > **`.env.defaults`** > **code fallback**.
- **Code fallbacks** are defined in config generators for specific variables only (for example `MAX_API_VERSION = 13`, `PORT = 21080`).
- So, defaults are mostly from config repositories; webapp/server code provides fallback defaults only for a smaller subset.

Notes:

- Defaults below are based on generator behavior in `src/client.config.ts` and `src/server.config.ts`.
- Where an environment variable is read directly without fallback logic, the value is expected to come from deployment env files (for example `.env.defaults`/`.env`).
- `From .env.defaults` means the value is expected from environment files and is present in repository defaults.
- `No default in .env.defaults` means the value must be provided per deployment/environment.
- `Additional Conditions` is about runtime gating, not environment value precedence.

### Core / Server

| Environment Variable | Default / Source | Used for | Additional Conditions |
| --- | --- | --- | --- |
| `PORT` | `21080` when empty/invalid/`0` | HTTP server port | N/A |
| `ENFORCE_HTTPS` | `true` (unless explicitly `false`) | Enforce HTTPS redirects/behavior in server config | N/A |
| `SSL_CERTIFICATE_KEY_PATH` | `certificate/development-key.pem` (workspace or `apps/server/dist`) | TLS private key path | N/A |
| `SSL_CERTIFICATE_PATH` | `certificate/development-cert.pem` (workspace or `apps/server/dist`) | TLS certificate path | N/A |
| `ENABLE_DYNAMIC_HOSTNAME` | `false` | Replace `{{hostname}}` placeholders in URLs with client hostname | N/A |
| `ENABLE_CLIENT_VERSION_ENFORCEMENT` | `false` | Enforce exact deployed client version matching for incident-driven force reloads | N/A |
| `APP_NAME` | `Wire` | App name shown in client config | N/A |
| `ANALYTICS_API_KEY` | From `.env.defaults` | Tracking API key exposed to client config | N/A |
| `BACKEND_NAME` | From `.env.defaults` | Backend display name in client config | N/A |
| `BRAND_NAME` | From `.env.defaults` | Brand name in client config | N/A |
| `WEBSITE_LABEL` | From `.env.defaults` | Label for website links in client config | N/A |
| `ENABLE_DEV_BACKEND_API` | `false` | Allow development API usage in client | N/A |
| `MAX_API_VERSION` | `13` | Max backend API version accepted by client | N/A |
| `GOOGLE_WEBMASTER_ID` | From `.env.defaults` | Verification id in server-rendered metadata | N/A |
| `OPEN_GRAPH_DESCRIPTION` | From `.env.defaults` | OpenGraph description meta tag | N/A |
| `OPEN_GRAPH_IMAGE_URL` | From `.env.defaults` | OpenGraph image URL meta tag | N/A |
| `OPEN_GRAPH_TITLE` | From `.env.defaults` | OpenGraph title meta tag | N/A |

### Feature toggles

| Environment Variable | Default / Source | Used for | Additional Conditions |
| --- | --- | --- | --- |
| `FEATURE_ENABLE_CELLS` | `false` | Enables Cells integration features | May apply (requires conversation Cells state not disabled) |
| `FEATURE_CELLS_INIT_WITH_ZAUTH_TOKEN` | `false` | Initialize Cells with ZAuth token | N/A |
| `FEATURE_ALLOW_LINK_PREVIEWS` | `false` | Enables link preview rendering | May apply (also requires user preview preference enabled) |
| `FEATURE_CHECK_CONSENT` | `true` | User consent checks | N/A |
| `FEATURE_CONFERENCE_AUTO_MUTE` | `false` | Auto-mute when joining calls | May apply (conference calls only) |
| `FEATURE_DEFAULT_LOGIN_TEMPORARY_CLIENT` | `false` | Preselect temporary client on login | N/A |
| `FEATURE_ENABLE_ACCOUNT_REGISTRATION` | `true` | Account registration availability | N/A |
| `FEATURE_ENABLE_ADVANCED_FILTERS` | `false` | Advanced filters UI feature | N/A |
| `FEATURE_ENABLE_AUTO_LOGIN` | `false` | Auto-login support | N/A |
| `FEATURE_ENABLE_BLUR_BACKGROUND` | `false` | Background blur in video calls | May apply (requires MediaPipe/WebGL processing path) |
| `FEATURE_ENABLE_CHANNELS` | `false` | Channels feature | May apply (requires backend/team feature gating) |
| `FEATURE_ENABLE_CHANNELS_HISTORY_SHARING` | `false` | Channels history sharing | May apply (channel context + channels gating) |
| `FEATURE_ENABLE_CROSS_PLATFORM_BACKUP_EXPORT` | `false` | Cross-platform backup export | N/A |
| `FEATURE_ENABLE_DEBUG` | `false` | Debug mode toggles in client/server (also relaxes CSP connect-src in server) | N/A |
| `FEATURE_ENABLE_DETACHED_CALLING_WINDOW` | `false` | Pop-out calling window | May apply (desktop support flag required) |
| `FEATURE_ENABLE_DOMAIN_DISCOVERY` | `true` | Domain discovery in login/auth flows | N/A |
| `FEATURE_ENABLE_ENCRYPTION_AT_REST` | `false` | Encryption-at-rest client behavior switch | N/A |
| `FEATURE_ENABLE_ENFORCE_DESKTOP_APPLICATION_ONLY` | `false` | Restrict web usage to desktop-app context | May apply (applies on non-desktop runtime) |
| `FEATURE_ENABLE_EXTRA_CLIENT_ENTROPY` | `false` | Extra entropy during client creation | May apply (effective on Windows, or when FORCE_EXTRA_CLIENT_ENTROPY is enabled) |
| `FEATURE_ENABLE_IN_CALL_HAND_RAISE` | `false` | In-call hand raise feature | May apply (visible in calls, except 1:1 conversations) |
| `FEATURE_ENABLE_IN_CALL_REACTIONS` | `false` | In-call reactions feature | N/A |
| `FEATURE_ENABLE_MEDIA_EMBEDS` | `true` | Media embeds (YouTube/Vimeo/Spotify/etc.) | May apply (also requires user preview setting enabled) |
| `FEATURE_ENABLE_MESSAGE_FORMAT_BUTTONS` | `false` | Rich text formatting controls | May apply (format button also depends on markdown-preview preference) |
| `FEATURE_ENABLE_PING_CONFIRMATION` | `false` | Confirm modal before pinging large groups | May apply (confirmation shown only for non-1:1 conversations with participant count at/above threshold) |
| `FEATURE_ENABLE_PRESS_SPACE_TO_UNMUTE` | `false` | Press-space-to-unmute behavior | May apply (also requires user call preference enabled) |
| `FEATURE_ENABLE_PROTEUS_CORE_CRYPTO` | `false` | Enable Proteus core-crypto integration path | N/A |
| `FEATURE_ENABLE_PUBLIC_CHANNELS` | `false` | Public channels feature | May apply (requires public-channel permission/role gating) |
| `FEATURE_ENABLE_REMOVE_GROUP_CONVERSATION` | `false` | Remove conversation locally | May apply (only for group/channel conversations where self user is already removed) |
| `FEATURE_ENABLE_SCREEN_SHARE_WITH_VIDEO` | `false` | Screen sharing with video overlay | May apply (requires both screen-share and camera streams to be available) |
| `FEATURE_ENABLE_SSO` | `false` | SSO login flow | N/A |
| `FEATURE_ENABLE_TEAM_CREATION` | `false` | Team creation flow for individual users | May apply (requires backend API version support and user not already in a team) |
| `FEATURE_ENABLE_VIRTUALIZED_MESSAGES_LIST` | `false` | Virtualized message list rendering | N/A |
| `FEATURE_ENFORCE_CONSTANT_BITRATE` | `false` | Constant bitrate call encoding | May apply (enforced for all calls; practical impact is where VBR would otherwise be available, typically 1:1) |
| `FEATURE_FORCE_EXTRA_CLIENT_ENTROPY` | `false` | Additional entropy safeguards for client creation | May apply (only affects behavior when ENABLE_EXTRA_CLIENT_ENTROPY is enabled; otherwise has no effect) |
| `FEATURE_SHOW_LOADING_INFORMATION` | `false` | Extra loading-state information in UI | May apply (only visible while processing pending notifications during sync/loading) |
| `FEATURE_USE_CORE_CRYPTO` | `false` | Enable MLS/core-crypto protocol path | N/A |

### Numeric and limits

| Environment Variable | Default / Source | Used for | Additional Conditions |
| --- | --- | --- | --- |
| `FEATURE_APPLOCK_SCHEDULED_TIMEOUT` | `null` | Scheduled app lock timeout (seconds) | N/A |
| `FEATURE_MAX_USERS_TO_PING_WITHOUT_ALERT` | `4` | Ping confirmation threshold | N/A |
| `FEATURE_MLS_CONFIG_KEYING_MATERIAL_UPDATE_THRESHOLD` | `undefined` | MLS keying material update threshold (numeric value) | N/A |
| `MAX_GROUP_PARTICIPANTS` | `500` | Group conversation participant cap | N/A |
| `MAX_CHANNEL_PARTICIPANTS` | `2000` | Channel participant cap | N/A |
| `MAX_VIDEO_PARTICIPANTS` | `4` | Legacy video call participant cap | N/A |
| `NEW_PASSWORD_MINIMUM_LENGTH` | `8` | Minimum password length | N/A |

### Cells

| Environment Variable | Default / Source | Used for | Additional Conditions |
| --- | --- | --- | --- |
| `CELLS_TOKEN_SHARED_SECRET` | No default in `.env.defaults` | Shared secret for Cells token logic | N/A |
| `CELLS_PYDIO_SEGMENT` | No default in `.env.defaults` | Cells/Pydio segment config | N/A |
| `CELLS_PYDIO_URL` | No default in `.env.defaults` | Cells/Pydio base URL | N/A |
| `CELLS_S3_BUCKET` | No default in `.env.defaults` | Cells S3 bucket | N/A |
| `CELLS_S3_REGION` | No default in `.env.defaults` | Cells S3 region | N/A |
| `CELLS_S3_ENDPOINT` | No default in `.env.defaults` | Cells S3 endpoint | N/A |
| `CELLS_WIRE_DOMAIN` | No default in `.env.defaults` | Cells Wire domain mapping | N/A |

### Telemetry

| Environment Variable | Default / Source | Used for | Additional Conditions |
| --- | --- | --- | --- |
| `COUNTLY_API_KEY` | From `.env.defaults` | Countly API key | N/A |
| `COUNTLY_ENABLE_LOGGING` | `false` | Enable Countly debug logging | N/A |
| `COUNTLY_FORCE_REPORTING` | `false` | Force Countly reporting on internal environments | N/A |
| `COUNTLY_ALLOWED_BACKEND` | empty string (`''`) | Backend allow-list for Countly tracking | N/A |
| `DATADOG_APPLICATION_ID` | `undefined` | Datadog RUM application id | N/A |
| `DATADOG_CLIENT_TOKEN` | `undefined` | Datadog RUM client token | N/A |
| `FEATURE_DATADOG_ENVIRONMENT` | `undefined` | Datadog environment label in feature config | N/A |

### Uploads and security policy

| Environment Variable | Default / Source | Used for | Additional Conditions |
| --- | --- | --- | --- |
| `FEATURE_ALLOWED_FILE_UPLOAD_EXTENSIONS` | `*` | Allowed file upload extensions | N/A |
| `CSP_EXTRA_CONNECT_SRC` | empty list | Additional `connect-src` CSP entries | N/A |
| `CSP_EXTRA_DEFAULT_SRC` | empty list | Additional `default-src` CSP entries | N/A |
| `CSP_EXTRA_FONT_SRC` | empty list | Additional `font-src` CSP entries | N/A |
| `CSP_EXTRA_FRAME_SRC` | empty list | Additional `frame-src` CSP entries | N/A |
| `CSP_EXTRA_IMG_SRC` | empty list | Additional `img-src` CSP entries | N/A |
| `CSP_EXTRA_MANIFEST_SRC` | empty list | Additional `manifest-src` CSP entries | N/A |
| `CSP_EXTRA_MEDIA_SRC` | empty list | Additional `media-src` CSP entries | N/A |
| `CSP_EXTRA_OBJECT_SRC` | empty list (server falls back to `object-src 'none'`) | Additional `object-src` CSP entries | N/A |
| `CSP_EXTRA_SCRIPT_SRC` | empty list | Additional `script-src` CSP entries | N/A |
| `CSP_EXTRA_STYLE_SRC` | empty list | Additional `style-src` CSP entries | N/A |
| `CSP_EXTRA_WORKER_SRC` | empty list | Additional `worker-src` CSP entries | N/A |

### URL configuration

| Environment Variable | Default / Source | Used for | Additional Conditions |
| --- | --- | --- | --- |
| `URL_ACCOUNT_BASE` | From `.env.defaults` | Account service base URL | N/A |
| `URL_MOBILE_BASE` | No default in `.env.defaults` | Mobile client base URL | N/A |
| `URL_PRIVACY_POLICY` | From `.env.defaults` | Privacy policy URL | N/A |
| `URL_TEAMS_BASE` | From `.env.defaults` | Teams settings base URL | N/A |
| `URL_TEAMS_BILLING` | From `.env.defaults` | Teams billing URL | N/A |
| `URL_PRICING` | From `.env.defaults` | Pricing page URL | N/A |
| `URL_TEAMS_CREATE` | From `.env.defaults` | Team creation URL | N/A |
| `URL_TERMS_OF_USE_PERSONAL` | From `.env.defaults` | Personal terms URL | N/A |
| `URL_TERMS_OF_USE_TEAMS` | From `.env.defaults` | Teams terms URL | N/A |
| `URL_WEBSITE_BASE` | From `.env.defaults` | Website base URL | N/A |
| `URL_WHATS_NEW` | From `.env.defaults` | What's new page URL | N/A |
| `URL_PATH_CREATE_TEAM` | From `.env.defaults` | Path segment to create team | N/A |
| `URL_PATH_MANAGE_SERVICES` | From `.env.defaults` | Path segment to manage services | N/A |
| `URL_PATH_MANAGE_TEAM` | From `.env.defaults` | Path segment to manage team | N/A |
| `URL_PATH_PASSWORD_RESET` | From `.env.defaults` | Path segment for password reset | N/A |
| `URL_SUPPORT_INDEX` | From `.env.defaults` | Support index page URL | N/A |
| `URL_SUPPORT_FOLDERS` | From `.env.defaults` | Support folders/help URL | N/A |
| `URL_SUPPORT_BUG_REPORT` | From `.env.defaults` | Bug report help URL | N/A |
| `URL_SUPPORT_CALLING` | From `.env.defaults` | Calling support URL | N/A |
| `URL_SUPPORT_CAMERA_ACCESS_DENIED` | From `.env.defaults` | Camera permission denied help URL | N/A |
| `URL_SUPPORT_CONTACT` | From `.env.defaults` | Contact support URL | N/A |
| `URL_SUPPORT_DEVICE_ACCESS_DENIED` | From `.env.defaults` | Device access denied help URL | N/A |
| `URL_SUPPORT_DEVICE_NOT_FOUND` | From `.env.defaults` | Device not found help URL | N/A |
| `URL_SUPPORT_EMAIL_EXISTS` | From `.env.defaults` | Email exists help URL | N/A |
| `URL_SUPPORT_HISTORY` | From `.env.defaults` | Conversation history help URL | N/A |
| `URL_SUPPORT_LEGAL_HOLD_BLOCK` | From `.env.defaults` | Legal hold block help URL | N/A |
| `URL_SUPPORT_MLS_LEARN_MORE` | From `.env.defaults` | MLS learn more URL | N/A |
| `URL_SUPPORT_MLS_MIGRATION_FROM_PROTEUS` | From `.env.defaults` | MLS migration support URL | N/A |
| `URL_SUPPORT_MICROPHONE_ACCESS_DENIED` | From `.env.defaults` | Microphone permission denied help URL | N/A |
| `URL_SUPPORT_PRIVACY_VERIFY_FINGERPRINT` | From `.env.defaults` | Privacy/fingerprint verification help URL | N/A |
| `URL_SUPPORT_SCREEN_ACCESS_DENIED` | From `.env.defaults` | Screen access denied help URL | N/A |
| `URL_SUPPORT_SYSTEM_KEYCHAIN_ACCESS` | No default in `.env.defaults` | System keychain access help URL | N/A |
| `URL_SUPPORT_E2E_ENCRYPTION` | From `.env.defaults` | End-to-end encryption help URL | N/A |
| `URL_SUPPORT_FAVORITES` | From `.env.defaults` | Favorites help URL | N/A |
| `URL_LEARN_MORE_ABOUT_GUEST_LINKS` | No default in `.env.defaults` | Guest links learn-more URL | N/A |
| `URL_SUPPORT_NON_FEDERATING_INFO` | From `.env.defaults` | Non-federating info URL | N/A |
| `URL_SUPPORT_OAUTH_LEARN_MORE` | From `.env.defaults` | OAuth learn-more URL | N/A |
| `URL_SUPPORT_OFFLINE_BACKEND` | From `.env.defaults` | Offline backend support URL | N/A |
| `URL_SUPPORT_FEDERATION_STOP` | No default in `.env.defaults` | Federation stop support URL | N/A |
| `URL_SUPPORT_E2EI_VERIFICATION` | From `.env.defaults` | E2EI verification support URL | N/A |
| `URL_SUPPORT_E2EI_VERIFICATION_CERTIFICATE` | From `.env.defaults` | E2EI verification certificate support URL | N/A |
| `URL_SUPPORT_DECRYPT_ERROR` | From `.env.defaults` | Decryption error support URL | N/A |
| `URL_SUPPORT_PRIVACY_UNVERIFIED_USERS` | From `.env.defaults` | Privacy unverified users support URL | N/A |
| `URL_SUPPORT_PRIVACY_WHY` | From `.env.defaults` | Privacy explanation support URL | N/A |
| `URL_SUPPORT_CHANGE_EMAIL_ADDRESS` | From `.env.defaults` | Change email support URL | N/A |
| `URL_SUPPORT_DELETE_PERSONAL_ACCOUNT` | From `.env.defaults` | Delete personal account support URL | N/A |
| `URL_SUPPORT_REMOVE_TEAM_MEMBER` | From `.env.defaults` | Remove team member support URL | N/A |

## Development

### Build

```bash
nx run config-lib:build
```

### Type Check

```bash
nx run config-lib:type-check
```

### Lint

```bash
nx run config-lib:lint
```

## License

GPL-3.0
