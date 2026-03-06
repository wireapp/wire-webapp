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
- Configuration selection logic in `.copyconfigrc.js`:
  - `DISTRIBUTION` can select a custom distribution,
  - tagged production/staging builds select `master`,
  - otherwise defaults to `staging`,
  - `FORCED_CONFIG_URL` can override repo selection.

### What "override" means

- **Deployment Override** in tables means environment-specific intentional value changes on top of baseline defaults.
- Typical deployment overrides are done through process env (AWS) or `.env`.
- If no deployment-specific override is set, the effective value comes from `.env.defaults` and/or code fallback.

Notes:

- Defaults below are based on generator behavior in `src/client.config.ts` and `src/server.config.ts`.
- Where an environment variable is read directly without fallback logic, the value is expected to come from deployment env files (for example `.env.defaults`/`.env`).
- `From .env.defaults` means the value is expected from environment files and is present in repository defaults.
- `No default in .env.defaults` means the value must be provided per deployment/environment.
- `Deployment Override` values come from the historical list where available.

### Core / Server

| Environment Variable | Default / Source | Used for | Deployment Override |
| --- | --- | --- | --- |
| `PORT` | `21080` when empty/invalid/`0` | HTTP server port | No override |
| `ENFORCE_HTTPS` | `true` (unless explicitly `false`) | Enforce HTTPS redirects/behavior in server config | No override |
| `SSL_CERTIFICATE_KEY_PATH` | `certificate/development-key.pem` (workspace or `apps/server/dist`) | TLS private key path | No override |
| `SSL_CERTIFICATE_PATH` | `certificate/development-cert.pem` (workspace or `apps/server/dist`) | TLS certificate path | No override |
| `ENABLE_DYNAMIC_HOSTNAME` | `false` | Replace `{{hostname}}` placeholders in URLs with client hostname | No override |
| `APP_NAME` | `Wire` | App name shown in client config | No override |
| `ANALYTICS_API_KEY` | From `.env.defaults` | Tracking API key exposed to client config | No override |
| `BACKEND_NAME` | From `.env.defaults` | Backend display name in client config | No override |
| `BRAND_NAME` | From `.env.defaults` | Brand name in client config | No override |
| `WEBSITE_LABEL` | From `.env.defaults` | Label for website links in client config | No override |
| `ENABLE_DEV_BACKEND_API` | `false` | Allow development API usage in client | No override |
| `MAX_API_VERSION` | `13` | Max backend API version accepted by client | No override |
| `GOOGLE_WEBMASTER_ID` | From `.env.defaults` | Verification id in server-rendered metadata | No override |
| `MINIMUM_REQUIRED_CLIENT_BUILD_DATE` | `undefined` | Force minimum client build date check | No override |
| `OPEN_GRAPH_DESCRIPTION` | From `.env.defaults` | OpenGraph description meta tag | No override |
| `OPEN_GRAPH_IMAGE_URL` | From `.env.defaults` | OpenGraph image URL meta tag | No override |
| `OPEN_GRAPH_TITLE` | From `.env.defaults` | OpenGraph title meta tag | No override |

### Feature toggles

| Environment Variable | Default / Source | Used for | Deployment Override |
| --- | --- | --- | --- |
| `FEATURE_ENABLE_CELLS` | `false` | Enables Cells integration features | No override |
| `FEATURE_CELLS_INIT_WITH_ZAUTH_TOKEN` | `false` | Initialize Cells with ZAuth token | No override |
| `FEATURE_ALLOW_LINK_PREVIEWS` | `false` | Enables link preview rendering | No override |
| `FEATURE_CHECK_CONSENT` | `true` | User consent checks | `false` |
| `FEATURE_CONFERENCE_AUTO_MUTE` | `false` | Auto-mute when joining calls | `true` |
| `FEATURE_DEFAULT_LOGIN_TEMPORARY_CLIENT` | `false` | Preselect temporary client on login | No override |
| `FEATURE_ENABLE_ACCOUNT_REGISTRATION` | `true` | Account registration availability | `false` |
| `FEATURE_ENABLE_ACCOUNT_REGISTRATION_ACCEPT_TERMS_AND_PRIVACY_POLICY` | `false` | Require terms + privacy acceptance in registration flow | No override |
| `FEATURE_ENABLE_ADVANCED_FILTERS` | `false` | Advanced filters UI feature | No override |
| `FEATURE_ENABLE_AUTO_LOGIN` | `false` | Auto-login support | No override |
| `FEATURE_ENABLE_BLUR_BACKGROUND` | `false` | Background blur in video calls | No override |
| `FEATURE_ENABLE_CHANNELS` | `false` | Channels feature | `true` |
| `FEATURE_ENABLE_CHANNELS_HISTORY_SHARING` | `false` | Channels history sharing | No override |
| `FEATURE_ENABLE_CROSS_PLATFORM_BACKUP_EXPORT` | `false` | Cross-platform backup export | No override |
| `FEATURE_ENABLE_DEBUG` | `false` | Debug mode toggles in client/server (also relaxes CSP connect-src in server) | No override |
| `FEATURE_ENABLE_DETACHED_CALLING_WINDOW` | `false` | Pop-out calling window | `true` |
| `FEATURE_ENABLE_DOMAIN_DISCOVERY` | `true` | Domain discovery in login/auth flows | `false` |
| `FEATURE_ENABLE_ENCRYPTION_AT_REST` | `false` | Encryption-at-rest client behavior switch | No override (unless explicitly required) |
| `FEATURE_ENABLE_ENFORCE_DESKTOP_APPLICATION_ONLY` | `false` | Restrict web usage to desktop-app context | No override |
| `FEATURE_ENABLE_EXTRA_CLIENT_ENTROPY` | `false` | Extra entropy during client creation | No override |
| `FEATURE_ENABLE_IN_CALL_HAND_RAISE` | `false` | In-call hand raise feature | `true` |
| `FEATURE_ENABLE_IN_CALL_REACTIONS` | `false` | In-call reactions feature | `true` |
| `FEATURE_ENABLE_MEDIA_EMBEDS` | `true` | Media embeds (YouTube/Vimeo/Spotify/etc.) | No override |
| `FEATURE_ENABLE_MESSAGE_FORMAT_BUTTONS` | `false` | Rich text formatting controls | `true` |
| `FEATURE_ENABLE_PING_CONFIRMATION` | `false` | Confirm modal before pinging large groups | `true` |
| `FEATURE_ENABLE_PRESS_SPACE_TO_UNMUTE` | `false` | Press-space-to-unmute behavior | `true` |
| `FEATURE_ENABLE_PROTEUS_CORE_CRYPTO` | `false` | Enable Proteus core-crypto integration path | No override |
| `FEATURE_ENABLE_PUBLIC_CHANNELS` | `false` | Public channels feature | No override |
| `FEATURE_ENABLE_REMOVE_GROUP_CONVERSATION` | `false` | Remove conversation locally | No override |
| `FEATURE_ENABLE_SCREEN_SHARE_WITH_VIDEO` | `false` | Screen sharing with video overlay | No override |
| `FEATURE_ENABLE_SSO` | `false` | SSO login flow | No override |
| `FEATURE_ENABLE_TEAM_CREATION` | `false` | Team creation flow for individual users | No override |
| `FEATURE_ENABLE_VIRTUALIZED_MESSAGES_LIST` | `false` | Virtualized message list rendering | No override |
| `FEATURE_ENFORCE_CONSTANT_BITRATE` | `false` | Constant bitrate call encoding | No override |
| `FEATURE_FORCE_EXTRA_CLIENT_ENTROPY` | `false` | Additional entropy safeguards for client creation | No override |
| `FEATURE_SHOW_LOADING_INFORMATION` | `false` | Extra loading-state information in UI | `true` |
| `FEATURE_USE_CORE_CRYPTO` | `false` | Enable MLS/core-crypto protocol path | `true` |

### Numeric and limits

| Environment Variable | Default / Source | Used for | Deployment Override |
| --- | --- | --- | --- |
| `FEATURE_APPLOCK_SCHEDULED_TIMEOUT` | `null` | Scheduled app lock timeout (seconds) | No override |
| `FEATURE_MAX_USERS_TO_PING_WITHOUT_ALERT` | `4` | Ping confirmation threshold | No override |
| `FEATURE_MLS_CONFIG_KEYING_MATERIAL_UPDATE_THRESHOLD` | `undefined` | MLS keying material update threshold (numeric value) | `30 days` (legacy note) |
| `MAX_GROUP_PARTICIPANTS` | `500` | Group conversation participant cap | No override |
| `MAX_CHANNEL_PARTICIPANTS` | `2000` | Channel participant cap | No override |
| `MAX_VIDEO_PARTICIPANTS` | `4` | Legacy video call participant cap | No override |
| `NEW_PASSWORD_MINIMUM_LENGTH` | `8` | Minimum password length | No override |

### Cells

| Environment Variable | Default / Source | Used for | Deployment Override |
| --- | --- | --- | --- |
| `CELLS_TOKEN_SHARED_SECRET` | No default in `.env.defaults` | Shared secret for Cells token logic | No override |
| `CELLS_PYDIO_SEGMENT` | No default in `.env.defaults` | Cells/Pydio segment config | No override |
| `CELLS_PYDIO_URL` | No default in `.env.defaults` | Cells/Pydio base URL | No override |
| `CELLS_S3_BUCKET` | No default in `.env.defaults` | Cells S3 bucket | No override |
| `CELLS_S3_REGION` | No default in `.env.defaults` | Cells S3 region | No override |
| `CELLS_S3_ENDPOINT` | No default in `.env.defaults` | Cells S3 endpoint | No override |
| `CELLS_WIRE_DOMAIN` | No default in `.env.defaults` | Cells Wire domain mapping | No override |

### Telemetry

| Environment Variable | Default / Source | Used for | Deployment Override |
| --- | --- | --- | --- |
| `COUNTLY_API_KEY` | From `.env.defaults` | Countly API key | No override |
| `COUNTLY_ENABLE_LOGGING` | `false` | Enable Countly debug logging | No override |
| `COUNTLY_FORCE_REPORTING` | `false` | Force Countly reporting on internal environments | No override |
| `COUNTLY_ALLOWED_BACKEND` | empty string (`''`) | Backend allow-list for Countly tracking | No override |
| `DATADOG_APPLICATION_ID` | `undefined` | Datadog RUM application id | No override |
| `DATADOG_CLIENT_TOKEN` | `undefined` | Datadog RUM client token | No override |
| `FEATURE_DATADOG_ENVIRONMENT` | `undefined` | Datadog environment label in feature config | No override |

### Uploads and security policy

| Environment Variable | Default / Source | Used for | Deployment Override |
| --- | --- | --- | --- |
| `FEATURE_ALLOWED_FILE_UPLOAD_EXTENSIONS` | `*` | Allowed file upload extensions | Custom allow-list per agreement |
| `CSP_EXTRA_CONNECT_SRC` | empty list | Additional `connect-src` CSP entries | No override |
| `CSP_EXTRA_DEFAULT_SRC` | empty list | Additional `default-src` CSP entries | No override |
| `CSP_EXTRA_FONT_SRC` | empty list | Additional `font-src` CSP entries | No override |
| `CSP_EXTRA_FRAME_SRC` | empty list | Additional `frame-src` CSP entries | No override |
| `CSP_EXTRA_IMG_SRC` | empty list | Additional `img-src` CSP entries | No override |
| `CSP_EXTRA_MANIFEST_SRC` | empty list | Additional `manifest-src` CSP entries | No override |
| `CSP_EXTRA_MEDIA_SRC` | empty list | Additional `media-src` CSP entries | No override |
| `CSP_EXTRA_OBJECT_SRC` | empty list (server falls back to `object-src 'none'`) | Additional `object-src` CSP entries | No override |
| `CSP_EXTRA_SCRIPT_SRC` | empty list | Additional `script-src` CSP entries | No override |
| `CSP_EXTRA_STYLE_SRC` | empty list | Additional `style-src` CSP entries | No override |
| `CSP_EXTRA_WORKER_SRC` | empty list | Additional `worker-src` CSP entries | No override |

### URL configuration

| Environment Variable | Default / Source | Used for | Deployment Override |
| --- | --- | --- | --- |
| `URL_ACCOUNT_BASE` | From `.env.defaults` | Account service base URL | No override |
| `URL_MOBILE_BASE` | No default in `.env.defaults` | Mobile client base URL | No override |
| `URL_PRIVACY_POLICY` | From `.env.defaults` | Privacy policy URL | No override |
| `URL_TEAMS_BASE` | From `.env.defaults` | Teams settings base URL | No override |
| `URL_TEAMS_BILLING` | From `.env.defaults` | Teams billing URL | No override |
| `URL_PRICING` | From `.env.defaults` | Pricing page URL | No override |
| `URL_TEAMS_CREATE` | From `.env.defaults` | Team creation URL | No override |
| `URL_TERMS_OF_USE_PERSONAL` | From `.env.defaults` | Personal terms URL | No override |
| `URL_TERMS_OF_USE_TEAMS` | From `.env.defaults` | Teams terms URL | No override |
| `URL_WEBSITE_BASE` | From `.env.defaults` | Website base URL | No override |
| `URL_WHATS_NEW` | From `.env.defaults` | What's new page URL | No override |
| `URL_PATH_CREATE_TEAM` | From `.env.defaults` | Path segment to create team | No override |
| `URL_PATH_MANAGE_SERVICES` | From `.env.defaults` | Path segment to manage services | No override |
| `URL_PATH_MANAGE_TEAM` | From `.env.defaults` | Path segment to manage team | No override |
| `URL_PATH_PASSWORD_RESET` | From `.env.defaults` | Path segment for password reset | No override |
| `URL_SUPPORT_INDEX` | From `.env.defaults` | Support index page URL | No override |
| `URL_SUPPORT_FOLDERS` | From `.env.defaults` | Support folders/help URL | No override |
| `URL_SUPPORT_BUG_REPORT` | From `.env.defaults` | Bug report help URL | No override |
| `URL_SUPPORT_CALLING` | From `.env.defaults` | Calling support URL | No override |
| `URL_SUPPORT_CAMERA_ACCESS_DENIED` | From `.env.defaults` | Camera permission denied help URL | No override |
| `URL_SUPPORT_CONTACT` | From `.env.defaults` | Contact support URL | No override |
| `URL_SUPPORT_DEVICE_ACCESS_DENIED` | From `.env.defaults` | Device access denied help URL | No override |
| `URL_SUPPORT_DEVICE_NOT_FOUND` | From `.env.defaults` | Device not found help URL | No override |
| `URL_SUPPORT_EMAIL_EXISTS` | From `.env.defaults` | Email exists help URL | No override |
| `URL_SUPPORT_HISTORY` | From `.env.defaults` | Conversation history help URL | No override |
| `URL_SUPPORT_LEGAL_HOLD_BLOCK` | From `.env.defaults` | Legal hold block help URL | No override |
| `URL_SUPPORT_MLS_LEARN_MORE` | From `.env.defaults` | MLS learn more URL | No override |
| `URL_SUPPORT_MLS_MIGRATION_FROM_PROTEUS` | From `.env.defaults` | MLS migration support URL | No override |
| `URL_SUPPORT_MICROPHONE_ACCESS_DENIED` | From `.env.defaults` | Microphone permission denied help URL | No override |
| `URL_SUPPORT_PRIVACY_VERIFY_FINGERPRINT` | From `.env.defaults` | Privacy/fingerprint verification help URL | No override |
| `URL_SUPPORT_SCREEN_ACCESS_DENIED` | From `.env.defaults` | Screen access denied help URL | No override |
| `URL_SUPPORT_SYSTEM_KEYCHAIN_ACCESS` | No default in `.env.defaults` | System keychain access help URL | No override |
| `URL_SUPPORT_E2E_ENCRYPTION` | From `.env.defaults` | End-to-end encryption help URL | No override |
| `URL_SUPPORT_FAVORITES` | From `.env.defaults` | Favorites help URL | No override |
| `URL_LEARN_MORE_ABOUT_GUEST_LINKS` | No default in `.env.defaults` | Guest links learn-more URL | No override |
| `URL_SUPPORT_NON_FEDERATING_INFO` | From `.env.defaults` | Non-federating info URL | No override |
| `URL_SUPPORT_OAUTH_LEARN_MORE` | From `.env.defaults` | OAuth learn-more URL | No override |
| `URL_SUPPORT_OFFLINE_BACKEND` | From `.env.defaults` | Offline backend support URL | No override |
| `URL_SUPPORT_FEDERATION_STOP` | No default in `.env.defaults` | Federation stop support URL | No override |
| `URL_SUPPORT_E2EI_VERIFICATION` | From `.env.defaults` | E2EI verification support URL | No override |
| `URL_SUPPORT_E2EI_VERIFICATION_CERTIFICATE` | From `.env.defaults` | E2EI verification certificate support URL | No override |
| `URL_SUPPORT_DECRYPT_ERROR` | From `.env.defaults` | Decryption error support URL | No override |
| `URL_SUPPORT_PRIVACY_UNVERIFIED_USERS` | From `.env.defaults` | Privacy unverified users support URL | No override |
| `URL_SUPPORT_PRIVACY_WHY` | From `.env.defaults` | Privacy explanation support URL | No override |
| `URL_SUPPORT_CHANGE_EMAIL_ADDRESS` | From `.env.defaults` | Change email support URL | No override |
| `URL_SUPPORT_DELETE_PERSONAL_ACCOUNT` | From `.env.defaults` | Delete personal account support URL | No override |
| `URL_SUPPORT_REMOVE_TEAM_MEMBER` | From `.env.defaults` | Remove team member support URL | No override |

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
