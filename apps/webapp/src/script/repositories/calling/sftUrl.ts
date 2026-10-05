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

import {isString} from '@sindresorhus/is';
import {Maybe} from 'true-myth';

import {sftConfigurationListsSchema, sftServerUrlsSchema} from './sftConfig.schema';

function getHttpsSftOrigin(sftUrl: unknown): Maybe<string> {
  if (!isString(sftUrl)) {
    return Maybe.nothing();
  }

  try {
    const parsedUrl = new URL(sftUrl);

    if (parsedUrl.protocol !== 'https:') {
      return Maybe.nothing();
    }

    return Maybe.just(parsedUrl.origin);
  } catch {
    return Maybe.nothing();
  }
}

export function getAllowedSftOrigins(callingConfig: unknown): ReadonlySet<string> {
  const validatedCallingConfig = sftConfigurationListsSchema.safeParse(callingConfig);

  if (!validatedCallingConfig.success) {
    return new Set();
  }

  const {sft_servers, sft_servers_all} = validatedCallingConfig.data;
  const allowedSftOrigins = [sft_servers, sft_servers_all]
    .flatMap(sftServers => {
      return sftServers ?? [];
    })
    .flatMap(sftServer => {
      const validatedSftServer = sftServerUrlsSchema.safeParse(sftServer);

      if (!validatedSftServer.success) {
        return [];
      }

      return validatedSftServer.data.urls;
    })
    .flatMap(sftUrl => {
      return getHttpsSftOrigin(sftUrl).mapOr<string[]>([], origin => {
        return [origin];
      });
    });

  return new Set(allowedSftOrigins);
}

export function isAllowedSftUrl(requestedUrl: string, allowedSftOrigins: ReadonlySet<string>): boolean {
  return getHttpsSftOrigin(requestedUrl).mapOr(false, origin => {
    return allowedSftOrigins.has(origin);
  });
}
