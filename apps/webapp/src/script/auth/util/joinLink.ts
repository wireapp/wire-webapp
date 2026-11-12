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

import {BackendErrorLabel} from '../../apiClient/http';
import {QUERY_KEY} from '../route';

export const JOIN_LINK_KIND = {CONVERSATION: 'conversation', MEETING: 'meeting'} as const;

export type MeetingLink = {
  kind: typeof JOIN_LINK_KIND.MEETING;
  domain: string;
  key: string;
  code: string;
};

export type JoinLink = {kind: typeof JOIN_LINK_KIND.CONVERSATION; key: string; code: string} | MeetingLink;

export function getJoinLink(search = window.location.search): JoinLink {
  const params = new URLSearchParams(search);
  const domain = params.get(QUERY_KEY.MEETING_DOMAIN);
  const key = params.get(QUERY_KEY.MEETING_KEY);
  const code = params.get(QUERY_KEY.MEETING_CODE);
  if (domain !== null || key !== null || code !== null) {
    return {
      kind: JOIN_LINK_KIND.MEETING,
      domain: domain ?? '',
      key: key ?? '',
      code: code ?? '',
    };
  }
  return {
    kind: JOIN_LINK_KIND.CONVERSATION,
    key: params.get(QUERY_KEY.CONVERSATION_KEY) ?? '',
    code: params.get(QUERY_KEY.CONVERSATION_CODE) ?? '',
  };
}

export function isJoinLinkPasswordError(error: unknown): boolean {
  return (
    error instanceof Object &&
    'label' in error &&
    (error.label === BackendErrorLabel.INVALID_CONVERSATION_PASSWORD || error.label === 'invalid-meeting-password')
  );
}

export function clearMeetingJoinParameters(): void {
  if (getJoinLink().kind !== JOIN_LINK_KIND.MEETING) {
    return;
  }
  const url = new URL(window.location.href);
  [QUERY_KEY.MEETING_DOMAIN, QUERY_KEY.MEETING_KEY, QUERY_KEY.MEETING_CODE, QUERY_KEY.MEETING_PASSWORD].forEach(key => {
    url.searchParams.delete(key);
  });
  window.history.replaceState(window.history.state, '', url.toString());
}
