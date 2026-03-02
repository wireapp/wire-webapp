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

import {upgradeRequiredHttpStatusCode, validateClientVersionCheckResponse} from './clientVersionCheckResponseSchema';

interface RunClientVersionCheckOptions {
  readonly ky: KyInstance;
  readonly clientVersion: string;
}

export function runClientVersionCheck(options: RunClientVersionCheckOptions): void {
  const {ky, clientVersion} = options;

  async function requestClientVersionCheck() {
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

    validateClientVersionCheckResponse({httpStatusCode, responseBody});
  }

  void requestClientVersionCheck();
}
