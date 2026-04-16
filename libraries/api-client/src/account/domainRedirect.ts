/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

// All the domain_redirect values are explained in the following confluence page:
// https://wearezeta.atlassian.net/wiki/spaces/ENGINEERIN/pages/1570832467/Email+domain+registration+and+configuration
export enum DomainRedirect {
  NONE = 'none',
  LOCKED = 'locked',
  SSO = 'sso',
  BACKEND = 'backend',
  NO_REGISTRATION = 'no-registration',
  PRE_AUTHORIZED = 'pre-authorized',
}

export type DomainRedirectPayload =
  | {
      domain_redirect: DomainRedirect.NONE;
    }
  | {
      domain_redirect: DomainRedirect.LOCKED;
    }
  | {
      domain_redirect: DomainRedirect.NO_REGISTRATION;
      due_to_existing_account?: boolean;
    }
  | {
      domain_redirect: DomainRedirect.PRE_AUTHORIZED;
    }
  | {
      domain_redirect: DomainRedirect.SSO;
      sso_code: string;
    }
  | {
      domain_redirect: DomainRedirect.BACKEND;
      backend: {
        config_url: string;
        webapp_url: string;
      };
    };
