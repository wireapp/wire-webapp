/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

export type Env = {
  /** Sets the environment operation mode. Possible values are production & development.
   * This setting affects the server behaviour and the web client bundling. If set to development,
   * all custom environment variables will be deactivated.
   * http://expressjs.com/en/advanced/best-practice-performance.html#set-node_env-to-production
   */
  NODE_ENV: string;

  /** * Sets the port the server is running on  */
  PORT: string;

  /**
   * Used to decide which module will print debug information, e.g. @wireapp/*.
   * https://nodejs.org/docs/latest/api/util.html#util_util_debuglog_section
   */
  NODE_DEBUG: string;

  /** will set the local dev environment to point to a federated backend (anta/bella/chala) */
  FEDERATION: string;

  /** Sets the tracking API key */
  ANALYTICS_API_KEY: string;

  /** Specifies the user facing domain of the app, e.g. https://app.wire.com */
  APP_BASE: string;

  /** Specifies the name of the application, e.g. Webapp */
  APP_NAME: string;

  /** Specifies configuration for Cells */
  FEATURE_ENABLE_CELLS: string;
  FEATURE_CELLS_INIT_WITH_ZAUTH_TOKEN: string;
  CELLS_TOKEN_SHARED_SECRET: string;
  CELLS_PYDIO_SEGMENT: string;
  CELLS_PYDIO_URL: string;
  CELLS_S3_BUCKET: string;
  CELLS_S3_REGION: string;
  CELLS_S3_ENDPOINT: string;
  CELLS_WIRE_DOMAIN: string;

  /** Specifies the name of the backend, e.g. Wire */
  BACKEND_NAME: string;

  /** Specifies the label of website links, e.g. wire.com */
  WEBSITE_LABEL: string;

  /** Sets the endpoint for backend REST calls, e.g. https://staging-nginz-https.zinfra.io */
  BACKEND_REST: string;

  /** Sets the endpoint for the WebSocket connection, e.g. wss://staging-nginz-ssl.zinfra.io */
  BACKEND_WS: string;

  /** Specifies the name of the brand, e.g. Wire */
  BRAND_NAME: string;

  /** enables replacing all occurences of {{hostname}} in the urls given to the frontend by the hostname of the client*/
  ENABLE_DYNAMIC_HOSTNAME?: string;

  /** Allows a client to use a development version of the api (if present) */
  ENABLE_DEV_BACKEND_API?: string;

  SSL_CERTIFICATE_KEY_PATH?: string;
  SSL_CERTIFICATE_PATH?: string;

  /** Wether the server should enforce HTTPS.
   */
  ENFORCE_HTTPS: string;

  /** Accepted file extensions for asset upload (e.g. ".txt,.jpg" or "*") */
  FEATURE_ALLOWED_FILE_UPLOAD_EXTENSIONS: string;

  FEATURE_ALLOW_LINK_PREVIEWS: string;

  /** will enable the MLS protocol */
  FEATURE_USE_CORE_CRYPTO?: string;

  FEATURE_MLS_CONFIG_KEYING_MATERIAL_UPDATE_THRESHOLD?: string;

  FEATURE_ENABLE_PROTEUS_CORE_CRYPTO?: string;

  FEATURE_FORCE_EXTRA_CLIENT_ENTROPY?: string;

  /** Feature toggle for the user consent check. Can be set to true or false */
  FEATURE_USE_ASYNC_NOTIFICATIONS: string;

  /** Feature toggle for the user consent check. Can be set to true or false */
  FEATURE_CHECK_CONSENT: string;

  /** Wether the pre-select a temporary client on login page */
  FEATURE_DEFAULT_LOGIN_TEMPORARY_CLIENT: string;

  /** Feature toggle for account registration. Can be set to true or false */
  FEATURE_ENABLE_ACCOUNT_REGISTRATION: string;

  /** Feature toggle for account registration whether the user is promped to accept terms of use only
   * or terms of use *and* privacy policy at once. Can be set to true or false. Defaults to false.
   */
  FEATURE_ENABLE_ACCOUNT_REGISTRATION_ACCEPT_TERMS_AND_PRIVACY_POLICY: string;

  /** Feature toggle for advanced filters */
  FEATURE_ENABLE_ADVANCED_FILTERS: string;

  /** Feature toggle to blur the background during video call */
  FEATURE_ENABLE_BLUR_BACKGROUND: string;

  /** Feature toggle for debug utils. Can be set to true or false */
  FEATURE_ENABLE_DEBUG: string;

  /** Feature to open a confirmation modal before pinging large groups */
  FEATURE_ENABLE_PING_CONFIRMATION: string;

  /**
   * Minimum amount of users required in a conversation to open confirm modal for ping
   * Must be used with FEATURE_ENABLE_PING_CONFIRMATION
   */
  FEATURE_MAX_USERS_TO_PING_WITHOUT_ALERT: string;

  /** Feature toggle for domain discovery. Can be set to true or false */
  FEATURE_ENABLE_DOMAIN_DISCOVERY: string;

  /** Feature toggle for disabling browser access for the application.
   * When set to true the webapp can only be used with the desktop application. Can be set to true or false.
   */
  FEATURE_ENABLE_ENFORCE_DESKTOP_APPLICATION_ONLY: string;

  /** Feature toggle for adding additional entropy during client creation. Can be set to true or false */
  FEATURE_ENABLE_EXTRA_CLIENT_ENTROPY: string;

  /** Feature toggle to make the webapp aware of federated backends */
  FEATURE_ENABLE_FEDERATION: string;

  /** Feature toggle for rendering youtube, vimeo, soundcloud and spotify embeds in the client */
  FEATURE_ENABLE_MEDIA_EMBEDS: string;

  /** Feature toggle for the log in via Single Sign On. Can be set to true or false */
  FEATURE_ENABLE_SSO: string;

  /** Feature toggle to enforce constant bitrate encoding for calls. Can be set to true or false */
  FEATURE_ENFORCE_CONSTANT_BITRATE: string;

  /** will make sure the clear text content of messages are encrypted before being written in the DB (enabling this will also disable full text search on messages) */
  FEATURE_ENABLE_ENCRYPTION_AT_REST: string;

  /** Set a default federation domain in case no domain can be found */
  FEATURE_FEDERATION_DOMAIN: string;

  /** Feature toggle for the log in with a username. Can be set to true or false */
  FEATURE_ENABLE_USERNAME_LOGIN: string;

  /** Feature toggle for additional application loading information. Can be set to true or false */
  FEATURE_SHOW_LOADING_INFORMATION: string;

  /** Time in seconds after which the unfocused app locks and asks for the passphrase. Setting this also enables this feature for the app */
  FEATURE_APPLOCK_UNFOCUS_TIMEOUT: string;

  /** Time in seconds after the last unlock which forces the app to lock */
  FEATURE_APPLOCK_SCHEDULED_TIMEOUT: string;

  /** Feature toggle to automatically mute when accepting incoming conference calls */
  FEATURE_CONFERENCE_AUTO_MUTE: string;

  /** Feature to enable in call reactions */
  FEATURE_ENABLE_IN_CALL_REACTIONS: string;

  /** Feature to enable in call hand raise */
  FEATURE_ENABLE_IN_CALL_HAND_RAISE: string;

  /** Feature to enable remove conversation locally */
  FEATURE_ENABLE_REMOVE_GROUP_CONVERSATION: string;

  /** Feature to enable calling popout window */
  FEATURE_ENABLE_DETACHED_CALLING_WINDOW: string;

  /** Feature to enable channels */
  FEATURE_ENABLE_CHANNELS: string;

  /** Feature to enable channels history sharing */
  FEATURE_ENABLE_CHANNELS_HISTORY_SHARING: string;

  /** Feature to enable channels public channels */
  FEATURE_ENABLE_PUBLIC_CHANNELS: string;

  /** Feature to enable team creation flow for individual users */
  FEATURE_ENABLE_TEAM_CREATION: string;

  /** Feature to enable auto login */
  FEATURE_ENABLE_AUTO_LOGIN: string;

  /** Feature to enable rich text editor */
  FEATURE_ENABLE_MESSAGE_FORMAT_BUTTONS: string;

  /** Feature to enable virtualized messages list */
  FEATURE_ENABLE_VIRTUALIZED_MESSAGES_LIST: string;

  /** Feature to enable Cross Platform Backup export */
  FEATURE_ENABLE_CROSS_PLATFORM_BACKUP_EXPORT: string;

  /** Feature to enable the press space to unmute feature */
  FEATURE_ENABLE_PRESS_SPACE_TO_UNMUTE: string;

  /** Sets the verification ID for Google webmasters */
  GOOGLE_WEBMASTER_ID: string;

  /** Limits the number of participants in a group conversation */
  MAX_GROUP_PARTICIPANTS: string;

  /** Limits the number of participants in a legacy video call */
  MAX_VIDEO_PARTICIPANTS: string;

  /** Minimum number of characters when setting a password */
  NEW_PASSWORD_MINIMUM_LENGTH: string;

  /** Sets the Countly product reporting API key */
  COUNTLY_API_KEY: string;

  /** Enables logging for Countly */
  COUNTLY_ENABLE_LOGGING: string;

  /** Force Countly reporting (only to be used on internal environments) */
  COUNTLY_FORCE_REPORTING: string;

  /** Countly allow list for backend urls
   * Multiple entries separated by comma, e.g. "https://nginz-https.anta.wire.link, https://nginz-https.diya.wire.link, https://prod-nginz-https.wire.com"
   * Used to disable countly tracking on on-prem instances
   */
  COUNTLY_ALLOWED_BACKEND: string;

  /** Open graph header description */
  OPEN_GRAPH_DESCRIPTION: string;

  /** Open graph header image URL */
  OPEN_GRAPH_IMAGE_URL: string;

  /** Open graph header title */
  OPEN_GRAPH_TITLE: string;

  /** Sets the host URL for the account service (password reset, account deletion, etc.), e.g. https://account.wire.com */
  URL_ACCOUNT_BASE: string;

  /** Sets the host URL for the mobile client */
  URL_MOBILE_BASE: string;

  /** Sets the URL for the privacy policy */
  URL_PRIVACY_POLICY: string;

  /** Sets the host URL for the team settings service, e.g. https://teams.wire.com */
  URL_TEAMS_BASE: string;

  /** Sets the billing URL for the team settings service */
  URL_TEAMS_BILLING: string;

  /** Sets the URL for pricing information, e.g. https://wire.com/pricing */
  URL_PRICING: string;

  /** Sets the URL for the team creation */
  URL_TEAMS_CREATE: string;

  /** Sets the URL for the personal terms of use */
  URL_TERMS_OF_USE_PERSONAL: string;

  /** Sets the URL for the teams terms of use */
  URL_TERMS_OF_USE_TEAMS: string;

  /** Sets the host URL for the website, e.g. https://wire.com */
  URL_WEBSITE_BASE: string;

  /** Sets paths to append to a base URL */
  URL_PATH_CREATE_TEAM: string;

  URL_PATH_MANAGE_SERVICES: string;

  URL_PATH_MANAGE_TEAM: string;

  URL_PATH_PASSWORD_RESET: string;

  /** Sets Support URLs to specific pages */
  URL_SUPPORT_INDEX: string;

  URL_SUPPORT_FOLDERS: string;

  URL_SUPPORT_BUG_REPORT: string;

  URL_SUPPORT_CALLING: string;

  URL_SUPPORT_CAMERA_ACCESS_DENIED: string;

  URL_SUPPORT_CONTACT: string;

  URL_SUPPORT_DEVICE_ACCESS_DENIED: string;

  URL_SUPPORT_DEVICE_NOT_FOUND: string;

  URL_SUPPORT_EMAIL_EXISTS: string;

  URL_SUPPORT_HISTORY: string;

  URL_SUPPORT_LEGAL_HOLD_BLOCK: string;

  URL_SUPPORT_MLS_LEARN_MORE: string;

  URL_SUPPORT_MLS_MIGRATION_FROM_PROTEUS: string;

  URL_SUPPORT_MICROPHONE_ACCESS_DENIED: string;

  URL_SUPPORT_PRIVACY_VERIFY_FINGERPRINT: string;

  URL_SUPPORT_SCREEN_ACCESS_DENIED: string;

  URL_SUPPORT_SYSTEM_KEYCHAIN_ACCESS: string;

  URL_SUPPORT_E2E_ENCRYPTION: string;

  URL_SUPPORT_FAVORITES: string;

  URL_LEARN_MORE_ABOUT_GUEST_LINKS: string;

  URL_SUPPORT_NON_FEDERATING_INFO: string;

  URL_SUPPORT_OAUTH_LEARN_MORE: string;

  URL_SUPPORT_OFFLINE_BACKEND: string;

  URL_SUPPORT_FEDERATION_STOP: string;

  URL_SUPPORT_E2EI_VERIFICATION: string;

  URL_SUPPORT_E2EI_VERIFICATION_CERTIFICATE: string;

  URL_SUPPORT_DECRYPT_ERROR: string;

  URL_SUPPORT_PRIVACY_UNVERIFIED_USERS: string;

  URL_SUPPORT_PRIVACY_WHY: string;

  URL_SUPPORT_CHANGE_EMAIL_ADDRESS: string;

  URL_SUPPORT_DELETE_PERSONAL_ACCOUNT: string;

  URL_SUPPORT_REMOVE_TEAM_MEMBER: string;

  URL_WHATS_NEW: string;

  /** Content Security Policy
   * Multiple entries separated by comma, e.g. "https://*.wire.com, https://*.zinfra.io, 'self'"
   * Adds additional CSP connect-src entries. The default already includes BACKEND_REST & BACKEND_WS.
   */
  CSP_EXTRA_CONNECT_SRC: string;

  /** Adds additional CSP default-src entries */
  CSP_EXTRA_DEFAULT_SRC: string;

  /** Adds additional CSP font-src entries */
  CSP_EXTRA_FONT_SRC: string;

  /** Adds additional CSP frame-src entries */
  CSP_EXTRA_FRAME_SRC: string;

  /** Adds additional CSP img-src entries */
  CSP_EXTRA_IMG_SRC: string;

  /** Adds additional CSP manifest-src entries */
  CSP_EXTRA_MANIFEST_SRC: string;

  /** Adds additional CSP media-src entries */
  CSP_EXTRA_MEDIA_SRC: string;

  /** Adds additional CSP object-src entries */
  CSP_EXTRA_OBJECT_SRC: string;

  /** Adds additional CSP script-src entries */
  CSP_EXTRA_SCRIPT_SRC: string;

  /** Adds additional CSP style-src entries */
  CSP_EXTRA_STYLE_SRC: string;

  /** Adds additional CSP worker-src entries */
  CSP_EXTRA_WORKER_SRC: string;

  DATADOG_APPLICATION_ID?: string;
  DATADOG_CLIENT_TOKEN?: string;
  FEATURE_DATADOG_ENVIRONMENT?: string;

  /** Feature to enable screen sharing with video overlay */
  FEATURE_ENABLE_SCREEN_SHARE_WITH_VIDEO: string;
};
