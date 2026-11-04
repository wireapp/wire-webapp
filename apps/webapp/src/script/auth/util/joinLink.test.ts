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

import {getJoinLink, clearMeetingJoinParameters} from './joinLink';
import {getSearchParams} from './urlUtil';

import {buildDomainRedirectUrl} from '../page/login/util';
import {ClientType} from '@wireapp/api-client/lib/client';

describe('meeting join context', () => {
  afterEach(() => {
    return window.history.replaceState({}, '', '/');
  });
  it('distinguishes a meeting from group links without inferring from domain', () => {
    expect(getJoinLink('?domain=example.com&join_key=key&join_code=code')).toEqual({
      kind: 'conversation',
      key: 'key',
      code: 'code',
    });
    expect(getJoinLink('?meeting_domain=example.com&meeting_key=key&meeting_code=code')).toEqual({
      kind: 'meeting',
      domain: 'example.com',
      key: 'key',
      code: 'code',
      password: undefined,
    });
  });
  it('retains meeting context through authentication and cross-backend SSO redirects', () => {
    window.history.replaceState(
      {},
      '',
      '/auth/?meeting_domain=example.com&meeting_key=key&meeting_code=code&meeting_password=secret',
    );
    const params = new URLSearchParams(getSearchParams());
    expect(params.get('meeting_domain')).toBe('example.com');
    expect(params.get('meeting_password')).toBe('secret');
    const sso = new URL(buildDomainRedirectUrl('https://sso.example.com/auth', '', ClientType.TEMPORARY));
    expect(sso.searchParams.get('meeting_key')).toBe('key');
    expect(sso.searchParams.get('meeting_password')).toBe('secret');
  });
  it('removes credentials after success while preserving unrelated URL state', () => {
    window.history.replaceState(
      {},
      '',
      '/auth/?hl=de&meeting_domain=example.com&meeting_key=key&meeting_code=code&meeting_password=secret#/login',
    );
    clearMeetingJoinParameters();
    expect(window.location.search).toBe('?hl=de');
    expect(window.location.hash).toBe('#/login');
  });
});
