/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {Maybe, Result} from 'true-myth';

export type CollaboraUrlError =
  | {readonly reason: 'empty'}
  | {readonly reason: 'insecure'; readonly url: string}
  | {readonly reason: 'untrusted'; readonly url: string; readonly trustedOrigin: string};

const HTTPS_URL_PATTERN = /^https:\/\/\S+$/;

/**
 * Validates a Collabora editor URL is safe to embed with clipboard permissions.
 */
export const validateCollaboraUrl = (url: Maybe<string>, trustedOrigin: string): Result<string, CollaboraUrlError> => {
  if (!url.isJust) {
    return Result.err({reason: 'empty'});
  }

  if (!HTTPS_URL_PATTERN.test(url.value)) {
    return Result.err({reason: 'insecure', url: url.value});
  }

  if (HTTPS_URL_PATTERN.test(trustedOrigin) && new URL(url.value).origin !== new URL(trustedOrigin).origin) {
    return Result.err({reason: 'untrusted', url: url.value, trustedOrigin});
  }

  return Result.ok(url.value);
};
