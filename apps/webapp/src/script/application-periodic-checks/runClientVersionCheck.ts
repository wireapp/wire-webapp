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

import {KyInstance} from 'ky';
import {result} from 'true-myth';

import {upgradeRequiredHttpStatusCode, validateClientVersionCheckResponse} from './clientVersionCheckResponseSchema';

interface RunClientVersionCheckOptions {
  readonly ky: KyInstance;
  readonly clientVersion: string;
  readonly setDoesApplicationNeedForceReload: (doesApplicationNeedForceReload: boolean) => void;
}

export async function runClientVersionCheck(options: RunClientVersionCheckOptions): Promise<void> {
  const {ky, clientVersion, setDoesApplicationNeedForceReload} = options;

  const clientVersionCheckResponse = await ky.get('/client-version-check', {
    headers: {
      'Wire-Client-Version': clientVersion,
    },
    throwHttpErrors: false,
  });

  const httpStatusCode = clientVersionCheckResponse.status;
  let responseBody: unknown = undefined;

  if (httpStatusCode === upgradeRequiredHttpStatusCode) {
    responseBody = await clientVersionCheckResponse.json();
  }

  const clientVersionCheckValidationResult = validateClientVersionCheckResponse({httpStatusCode, responseBody});

  if (result.isErr(clientVersionCheckValidationResult)) {
    return;
  }

  const doesApplicationNeedForceReload =
    clientVersionCheckValidationResult.value.httpStatusCode === upgradeRequiredHttpStatusCode;

  setDoesApplicationNeedForceReload(doesApplicationNeedForceReload);
}
