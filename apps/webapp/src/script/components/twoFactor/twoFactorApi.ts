/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {isNullOrUndefined} from '@sindresorhus/is';

import type {Clock} from '@enormora/clock/clock';
import type {HttpClient} from '@wireapp/api-client/lib/http/httpClient';
import {createTotpApi, type TotpReauthentication, type TotpCredential} from '@wireapp/api-client/lib/self/totp';
import {task} from 'true-myth';

import type {Translate} from 'Util/localizerUtil';
import {isBackendError} from 'Util/typePredicateUtil';

const errorLabel = (error: unknown): string => {
  return isBackendError(error) ? error.label : 'unknown';
};

export const createTwoFactorApi = (client: Pick<HttpClient, 'sendJSON'>, clock: Clock) => {
  const api = createTotpApi(client);
  return {
    list: () => {
      return task.tryOrElse(errorLabel, () => {
        return api.list();
      });
    },
    enrol: (name: string, authentication: TotpReauthentication) => {
      return task.tryOrElse(errorLabel, () => {
        return api.enrol({
          ...authentication,
          name,
          client_time: clock.currentDate.toISOString(),
        });
      });
    },
    activate: (id: string, code: string) => {
      return task.tryOrElse(errorLabel, () => {
        return api.activate(id, {
          code,
          client_time: clock.currentDate.toISOString(),
        });
      });
    },
    rename: (id: string, name: string) => {
      return task.tryOrElse(errorLabel, () => {
        return api.rename(id, name);
      });
    },
    remove: (id: string, authentication: TotpReauthentication) => {
      return task.tryOrElse(errorLabel, () => {
        return api.remove(id, authentication);
      });
    },
  };
};
export type TwoFactorApi = ReturnType<typeof createTwoFactorApi>;

export const activeCredentials = (credentials: TotpCredential[]) => {
  return credentials.filter(credential => {
    return !isNullOrUndefined(credential.activated_at);
  });
};

export const twoFactorError = (label: string, translate: Translate): string => {
  switch (label) {
    case 'totp-invalid-code':
      return translate('preferencesSecurityInvalidCode');
    case 'totp-code-reused':
      return translate('preferencesSecurityCodeReused');
    case 'invalid-credentials':
      return translate('preferencesSecurityInvalidPassword');
    case 'totp-client-clock-skew':
      return translate('preferencesSecurityClockSkew');
    case 'totp-enrolment-expired':
      return translate('preferencesSecuritySetupExpired');
    case 'totp-already-activated':
      return translate('preferencesSecurityAlreadyActivated');
    case 'totp-not-found':
      return translate('preferencesSecurityCredentialNotFound');
    case 'totp-too-many-credentials':
      return translate('preferencesSecurityTooManyApps');
    case 'totp-required':
      return translate('preferencesSecurityCodeRequired');
    case 'totp-disabled':
      return translate('preferencesSecurityUnavailable');
    case 'too-many-requests':
      return translate('preferencesSecurityRateLimited');
    default:
      return translate('preferencesSecurityGeneralError');
  }
};
