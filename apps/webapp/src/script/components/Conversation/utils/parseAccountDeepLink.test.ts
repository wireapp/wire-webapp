/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {parseAccountDeepLink} from 'Components/Conversation/utils/parseAccountDeepLink';

describe('parseAccountDeepLink', () => {
  const accountBase = 'https://account.wire.com';

  it('parses a user-profile link with raw id and explicit domain', () => {
    expect(
      parseAccountDeepLink('https://account.wire.com/user-profile/?id=user-123&domain=wire.com', accountBase),
    ).toEqual({
      type: 'user-profile',
      id: 'user-123',
      domain: 'wire.com',
    });
  });

  it('prefers explicit domain over domain embedded in id', () => {
    expect(
      parseAccountDeepLink(
        'https://account.wire.com/user-profile/?id=user-123@old.example&domain=new.example',
        accountBase,
      ),
    ).toEqual({
      type: 'user-profile',
      id: 'user-123',
      domain: 'new.example',
    });
  });

  it('parses a conversation-join link', () => {
    expect(
      parseAccountDeepLink(
        'https://account.wire.com/conversation-join/?key=test-key&code=test-code&domain=wire.com',
        accountBase,
      ),
    ).toEqual({
      type: 'conversation-join',
      key: 'test-key',
      code: 'test-code',
      domain: 'wire.com',
    });
  });

  it('returns null for a different origin', () => {
    expect(parseAccountDeepLink('https://google.com/user-profile/?id=user-123', accountBase)).toBeNull();
  });

  it('returns null when user-profile is missing id', () => {
    expect(parseAccountDeepLink('https://account.wire.com/user-profile/', accountBase)).toBeNull();
  });

  it('returns null when conversation-join is missing key or code', () => {
    expect(parseAccountDeepLink('https://account.wire.com/conversation-join/?key=test-key', accountBase)).toBeNull();
  });

  it('returns null for unsupported account paths', () => {
    expect(parseAccountDeepLink('https://account.wire.com/something-else/?id=user=123', accountBase)).toBeNull();
  });

  it('returns null for invalid urls', () => {
    expect(parseAccountDeepLink('not-a-url', accountBase)).toBeNull();
  });

  it('returns null when accountBase is missing', () => {
    expect(parseAccountDeepLink('https://account.wire.com/user-profile/?id=user-123', undefined)).toBeNull();
  });
});
