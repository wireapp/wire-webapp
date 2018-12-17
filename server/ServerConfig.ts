import {IHelmetContentSecurityPolicyDirectives} from 'helmet';

export interface ServerConfig {
  CLIENT: {
    ANALYTICS_API_KEY: string;
    RAYGUN_API_KEY: string;
    APP_NAME: string;
    BACKEND_REST: string;
    BACKEND_WS: string;
    ENVIRONMENT: string;
    URL: {
      ACCOUNT_BASE: string;
      MOBILE_BASE: string;
      PRIVACY_POLICY: string;
      SUPPORT_BASE: string;
      TEAMS_BASE: string;
      TERMS_OF_USE_PERSONAL: string;
      TERMS_OF_USE_TEAMS: string;
      WEBSITE_BASE: string;
    };
    FEATURE: {
      CHECK_CONSENT: boolean;
      ENABLE_ACCOUNT_REGISTRATION: boolean;
      ENABLE_DEBUG: boolean;
      ENABLE_PHONE_LOGIN: boolean;
      ENABLE_SSO: boolean;
      SHOW_LOADING_INFORMATION: boolean;
    };
    VERSION: string;
  };
  COMMIT: string;
  SERVER: {
    APP_BASE: string;
    CACHE_DURATION_SECONDS: number;
    CSP: IHelmetContentSecurityPolicyDirectives;
    DEVELOPMENT?: boolean;
    ENFORCE_HTTPS: boolean;
    ENVIRONMENT: string;
    GOOGLE_WEBMASTER_ID: string;
    PORT_HTTP: number;
    ROBOTS: {
      ALLOWED_HOSTS: string[];
      ALLOW: string;
      DISALLOW: string;
    };
  };
}
