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

import {isNonEmptyString} from '@sindresorhus/is';
import {Maybe} from 'true-myth';

export interface NativeMeetingLink {
  domain: string;
  key: string;
  code: string;
}

export function meetingJoinPath(link: NativeMeetingLink): Maybe<string> {
  if (!isNonEmptyString(link.domain) || !isNonEmptyString(link.key) || !isNonEmptyString(link.code)) {
    return Maybe.nothing();
  }
  const params = new URLSearchParams({domain: link.domain, key: link.key, code: link.code});
  return Maybe.just(`/meeting-join?${params.toString()}`);
}
