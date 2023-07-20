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

  /** Allows a client to use a development version of the api (if present) */
  ENABLE_DEV_BACKEND_API?: string;

  SSL_CERTIFICATE_KEY_PATH?: string;
  SSL_CERTIFICATE_PATH?: string;

  /** Wether the server should enforce HTTPS.
   */
  ENFORCE_HTTPS: string;

  /** Accepted file extensions for asset upload (e.g. ".txt,.jpg" or "*") */
  FEATURE_ALLOWED_FILE_UPLOAD_EXTENSIONS: string;

  /** will enable the MLS protocol */
  FEATURE_ENABLE_MLS?: string;

  /** will enable the client to initialise the MLS migration flow of group conversations */
  FEATURE_ENABLE_MLS_MIGRATION?: string;

  /** will enable the user to periodically update the list of supported protocols */
  FEATURE_ENABLE_SELF_SUPPORTED_PROTOCOLS_UPDATES?: string;

  FEATURE_USE_CORE_CRYPTO?: string;

  FEATURE_MLS_CONFIG_KEYING_MATERIAL_UPDATE_THRESHOLD?: string;

  FEATURE_ENABLE_PROTEUS_CORE_CRYPTO?: string;

  FEATURE_FORCE_EXTRA_CLIENT_ENTROPY?: string;

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

  /** Feature toggle for debug utils. Can be set to true or false */
  FEATURE_ENABLE_DEBUG: string;

  /** Feature to open a confirm modal before pinging large groups */
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

  /** Feature toggle for the log in with phone number. Can be set to true or false */
  FEATURE_ENABLE_PHONE_LOGIN: string;

  /** Feature toggle for the log in via Single Sign On. Can be set to true or false */
  FEATURE_ENABLE_SSO: string;

  /** Feature toggle to enforce constant bitrate encoding for calls. Can be set to true or false */
  FEATURE_ENFORCE_CONSTANT_BITRATE: string;

  /** Set a default federation domain in case no domain can be found */
  FEATURE_FEDERATION_DOMAIN: string;

  /** Wether the temporary clients should use IndexedDB. If set to false, they will use an in-memory database */
  FEATURE_PERSIST_TEMPORARY_CLIENTS: string;

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

  URL_SUPPORT_INDEX: string;

  URL_SUPPORT_BUG_REPORT: string;

  URL_SUPPORT_CALLING: string;

  URL_SUPPORT_CAMERA_ACCESS_DENIED: string;

  URL_SUPPORT_CONTACT: string;

  URL_SUPPORT_DEVICE_ACCESS_DENIED: string;

  URL_SUPPORT_DEVICE_NOT_FOUND: string;

  URL_SUPPORT_EMAIL_EXISTS: string;

  URL_SUPPORT_HISTORY: string;

  URL_SUPPORT_LEGAL_HOLD_BLOCK: string;

  URL_SUPPORT_MICROPHONE_ACCESS_DENIED: string;

  URL_SUPPORT_PRIVACY_VERIFY_FINGERPRINT: string;

  URL_SUPPORT_SCREEN_ACCESS_DENIED: string;

  URL_SUPPORT_OFFLINE_BACKEND: string;

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
};
