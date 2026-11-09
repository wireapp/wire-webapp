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

import {
  dismissConversationViewerPermissionBanner,
  getSessionStorage,
  isConversationViewerPermissionBannerDismissed,
} from './conversationViewerPermissionBannerStorage';

const conversationId = 'conversation-1';
const dismissalKey = `conversation-viewer-permission-banner-dismissed:${conversationId}`;

describe('conversationViewerPermissionBannerStorage', () => {
  it('reads whether the banner was dismissed', () => {
    const storage: Pick<Storage, 'getItem' | 'setItem'> = {
      getItem: jest.fn().mockReturnValue('true'),
      setItem: jest.fn(),
    };

    expect(isConversationViewerPermissionBannerDismissed(storage, conversationId)).toBe(true);

    expect(storage.getItem).toHaveBeenCalledWith(dismissalKey);
  });

  it('keeps the banner visible when storage is unavailable or reading fails', () => {
    const unavailableStorage: Pick<Storage, 'getItem' | 'setItem'> = {
      getItem: jest.fn(() => {
        throw new Error('storage blocked');
      }),
      setItem: jest.fn(),
    };

    expect(isConversationViewerPermissionBannerDismissed(undefined, conversationId)).toBe(false);
    expect(isConversationViewerPermissionBannerDismissed(unavailableStorage, conversationId)).toBe(false);
  });

  it('safely returns no storage when accessing sessionStorage throws', () => {
    const sessionStorageGetter = jest.spyOn(window, 'sessionStorage', 'get').mockImplementation(() => {
      throw new Error('storage blocked');
    });

    expect(getSessionStorage()).toBeUndefined();

    sessionStorageGetter.mockRestore();
  });

  it('writes the dismissal and ignores storage write failures', () => {
    const storage: Pick<Storage, 'getItem' | 'setItem'> = {
      getItem: jest.fn(),
      setItem: jest.fn(),
    };

    dismissConversationViewerPermissionBanner(storage, conversationId);

    expect(storage.setItem).toHaveBeenCalledWith(dismissalKey, 'true');

    const unavailableStorage: Pick<Storage, 'getItem' | 'setItem'> = {
      getItem: jest.fn(),
      setItem: jest.fn(() => {
        throw new Error('storage blocked');
      }),
    };

    expect(() => {
      dismissConversationViewerPermissionBanner(undefined, conversationId);
    }).not.toThrow();
    expect(() => {
      dismissConversationViewerPermissionBanner(unavailableStorage, conversationId);
    }).not.toThrow();
  });
});
