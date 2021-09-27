export interface ServerConfig {
  CLIENT: {
    ANALYTICS_API_KEY: string;
    APP_NAME: string;
    BACKEND_NAME: string;
    BACKEND_REST: string;
    BACKEND_WS: string;
    BRAND_NAME: string;
    CHROME_ORIGIN_TRIAL_TOKEN: string;
    COUNTLY_API_KEY: string;
    ENVIRONMENT: string;
    FEATURE: {
      ALLOWED_FILE_UPLOAD_EXTENSIONS: string[];
      APPLOCK_SCHEDULED_TIMEOUT: number;
      CHECK_CONSENT: boolean;
      CONFERENCE_AUTO_MUTE: boolean;
      DEFAULT_LOGIN_TEMPORARY_CLIENT: boolean;
      ENABLE_ACCOUNT_REGISTRATION: boolean;
      ENABLE_ACCOUNT_REGISTRATION_ACCEPT_TERMS_AND_PRIVACY_POLICY: boolean;
      ENABLE_DEBUG: boolean;
      ENABLE_DOMAIN_DISCOVERY: boolean;
      ENABLE_FEDERATION: boolean;
      ENABLE_MEDIA_EMBEDS: boolean;
      ENABLE_PHONE_LOGIN: boolean;
      ENABLE_SSO: boolean;
      ENFORCE_CONSTANT_BITRATE: boolean;
      FEDERATION_DOMAIN: string;
      PERSIST_TEMPORARY_CLIENTS: boolean;
      SHOW_LOADING_INFORMATION: boolean;
    };
    MAX_GROUP_PARTICIPANTS: number;
    MAX_VIDEO_PARTICIPANTS: number;
    NEW_PASSWORD_MINIMUM_LENGTH: number;
    URL: {
      ACCOUNT_BASE: string;
      MOBILE_BASE: string;
      PRICING: string;
      PRIVACY_POLICY: string;
      SUPPORT: {
        BUG_REPORT: string;
        CALLING: string;
        CAMERA_ACCESS_DENIED: string;
        CONTACT: string;
        DEVICE_ACCESS_DENIED: string;
        DEVICE_NOT_FOUND: string;
        EMAIL_EXISTS: string;
        HISTORY: string;
        INDEX: string;
        LEGAL_HOLD_BLOCK: string;
        MICROPHONE_ACCESS_DENIED: string;
        SCREEN_ACCESS_DENIED: string;
      };
      TEAMS_BASE: string;
      TEAMS_CREATE: string;
      TERMS_BILLING: string;
      TERMS_OF_USE_PERSONAL: string;
      TERMS_OF_USE_TEAMS: string;
      WEBSITE_BASE: string;
      WHATS_NEW: string;
    };
    VERSION: string;
    WEBSITE_LABEL: string;
  };
  COMMIT: string;
  SERVER: {
    APP_BASE: string;
    CACHE_DURATION_SECONDS: number;
    CSP: Record<string, Iterable<string>>;
    DEVELOPMENT?: boolean;
    ENFORCE_HTTPS: boolean;
    ENVIRONMENT: string;
    GOOGLE_WEBMASTER_ID: string;
    OPEN_GRAPH: {
      DESCRIPTION: string;
      IMAGE_URL: string;
      TITLE: string;
    };
    PORT_HTTP: number;
    ROBOTS: {
      ALLOW: string;
      ALLOWED_HOSTS: string[];
      DISALLOW: string;
    };
    SSL_CERTIFICATE_KEY_PATH?: string;
    SSL_CERTIFICATE_PATH?: string;
  };
}
