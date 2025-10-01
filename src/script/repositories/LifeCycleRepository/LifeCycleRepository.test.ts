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

jest.mock('Util/StorageUtil', () => ({
  storeValue: jest.fn(),
  resetStoreValue: jest.fn(),
}));

import {amplify} from 'amplify';

import {WebAppEvents} from '@wireapp/webapp-events';

import {useTypingIndicatorState} from 'Components/InputBar/TypingIndicator';
import {CacheRepository} from 'Repositories/cache/CacheRepository';
import type {ClientRepository} from 'Repositories/client/ClientRepository';
import type {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import type {Conversation} from 'Repositories/entity/Conversation';
import type {EventRepository} from 'Repositories/event/EventRepository';
import {StorageKey} from 'Repositories/storage/StorageKey';
import type {StorageRepository} from 'Repositories/storage/StorageRepository';
import type {UserRepository} from 'Repositories/user/UserRepository';
import {storeValue, resetStoreValue} from 'Util/StorageUtil';

import {LifeCycleRepository, doSimpleRedirect, type LifeCycleDependencies} from './LifeCycleRepository';

import {SIGN_OUT_REASON} from '../../auth/SignOutReason';
import {URLParameter} from '../../auth/URLParameter';
import {BaseError} from '../../error/BaseError';
import {ClientError} from '../../error/ClientError';
import {externalUrl} from '../../externalRoute';

const createMockDependencies = (): LifeCycleDependencies => ({
  clientRepository: {
    isCurrentClientPermanent: jest.fn(),
    constructCookieLabelKey: jest.fn(),
  } as unknown as ClientRepository,
  conversationRepository: {
    getActiveConversation: jest.fn(),
    sendTypingStop: jest.fn(),
  } as unknown as ConversationRepository,
  eventRepository: {
    disconnectWebSocket: jest.fn(),
  } as unknown as EventRepository,
  storageRepository: {
    deleteDatabase: jest.fn(),
  } as unknown as StorageRepository,
  userRepository: {
    userState: {
      self: jest.fn(),
    },
  } as unknown as UserRepository,
  core: {
    logout: jest.fn(),
  } as any,
});

describe('LifeCycleRepository', () => {
  let lifeCycleRepository: LifeCycleRepository;
  let mockDependencies: LifeCycleDependencies;
  let mockUser: any;
  let mockConversation: Partial<Conversation>;

  const originalLocation = window.location;
  const originalNavigator = window.navigator;
  const originalLocalStorage = window.localStorage;
  const originalAmplifyStore = amplify.store;

  beforeEach(() => {
    mockDependencies = createMockDependencies();
    lifeCycleRepository = new LifeCycleRepository(mockDependencies);

    mockUser = {
      email: jest.fn().mockReturnValue('test@example.com'),
      isTemporaryGuest: jest.fn().mockReturnValue(false),
    };

    mockConversation = {
      id: 'conversation-id',
    };

    delete (window as any).location;
    window.location = {
      ...originalLocation,
      search: '?param=value',
      hash: '#/test',
      replace: jest.fn(),
    } as any;

    Object.defineProperty(window, 'navigator', {
      writable: true,
      value: {
        ...originalNavigator,
        onLine: true,
      },
    });

    Storage.prototype.setItem = jest.fn();
    Storage.prototype.getItem = jest.fn();
    Storage.prototype.clear = jest.fn();

    (amplify as any).store = jest.fn().mockReturnValue({});
    (amplify as any).publish = jest.fn();

    jest.clearAllMocks();
  });

  afterEach(() => {
    window.location = originalLocation;
    Object.defineProperty(window, 'navigator', {
      writable: true,
      value: originalNavigator,
    });
    Object.defineProperty(window, 'localStorage', {
      writable: true,
      value: originalLocalStorage,
    });
    (amplify as any).store = originalAmplifyStore;

    lifeCycleRepository.resetLogoutState();
  });

  describe('redirectToLogin', () => {
    it('should call doSimpleRedirect for regular users', () => {
      const mockReplace = jest.fn();
      window.location.replace = mockReplace;
      (mockDependencies.userRepository as any).userState.self.mockReturnValue(mockUser);

      lifeCycleRepository.redirectToLogin(SIGN_OUT_REASON.USER_REQUESTED);

      expect(mockReplace).toHaveBeenCalledWith('/auth/?param=value');
    });

    it('should save redirect hash for user profiles when not signed in', () => {
      const mockReplace = jest.fn();
      window.location.replace = mockReplace;
      window.location.hash = '#/user/123';
      (mockDependencies.userRepository as any).userState.self.mockReturnValue(mockUser);

      lifeCycleRepository.redirectToLogin(SIGN_OUT_REASON.NOT_SIGNED_IN);

      expect(localStorage.setItem).toHaveBeenCalledWith('LOGIN_REDIRECT_KEY', '#/user/123');
    });

    it('should add reason parameter for immediate sign out reasons', () => {
      const mockReplace = jest.fn();
      window.location.replace = mockReplace;
      (mockDependencies.userRepository as any).userState.self.mockReturnValue(mockUser);

      lifeCycleRepository.redirectToLogin(SIGN_OUT_REASON.SESSION_EXPIRED);

      expect(mockReplace).toHaveBeenCalledWith(
        `/auth/?param=value&${URLParameter.REASON}=${SIGN_OUT_REASON.SESSION_EXPIRED}`,
      );
    });

    it('should not add reason parameter for non-immediate sign out reasons', () => {
      const mockReplace = jest.fn();
      window.location.replace = mockReplace;
      (mockDependencies.userRepository as any).userState.self.mockReturnValue(mockUser);

      lifeCycleRepository.redirectToLogin(SIGN_OUT_REASON.USER_REQUESTED);

      expect(mockReplace).toHaveBeenCalledWith('/auth/?param=value');
    });
  });

  describe('redirectToLogin additional tests', () => {
    it('should redirect to website for temporary guest leaving', () => {
      const websiteUrl = 'https://wire.com';
      (externalUrl as any).website = websiteUrl;
      const mockReplace = jest.fn();
      window.location.replace = mockReplace;

      const guestUser = {
        ...mockUser,
        isTemporaryGuest: jest.fn().mockReturnValue(true),
      };
      (mockDependencies.userRepository as any).userState.self.mockReturnValue(guestUser);

      lifeCycleRepository.redirectToLogin(SIGN_OUT_REASON.SESSION_EXPIRED);

      expect(mockReplace).toHaveBeenCalledWith(websiteUrl);
    });

    it('should use doSimpleRedirect if no website URL for guest', () => {
      (externalUrl as any).website = undefined;
      const mockReplace = jest.fn();
      window.location.replace = mockReplace;

      const guestUser = {
        ...mockUser,
        isTemporaryGuest: jest.fn().mockReturnValue(true),
      };
      (mockDependencies.userRepository as any).userState.self.mockReturnValue(guestUser);

      lifeCycleRepository.redirectToLogin(SIGN_OUT_REASON.SESSION_EXPIRED);

      expect(mockReplace).toHaveBeenCalledWith(
        `/auth/?param=value&${URLParameter.REASON}=${SIGN_OUT_REASON.SESSION_EXPIRED}`,
      );
    });

    it('should use doSimpleRedirect for non-guest users', () => {
      const mockReplace = jest.fn();
      window.location.replace = mockReplace;
      (mockDependencies.userRepository as any).userState.self.mockReturnValue(mockUser);

      lifeCycleRepository.redirectToLogin(SIGN_OUT_REASON.USER_REQUESTED);

      expect(mockReplace).toHaveBeenCalledWith('/auth/?param=value');
    });

    it('should use doSimpleRedirect for non-temporary guest reasons', () => {
      const mockReplace = jest.fn();
      window.location.replace = mockReplace;
      const guestUser = {
        ...mockUser,
        isTemporaryGuest: jest.fn().mockReturnValue(true),
      };
      (mockDependencies.userRepository as any).userState.self.mockReturnValue(guestUser);

      lifeCycleRepository.redirectToLogin(SIGN_OUT_REASON.CLIENT_REMOVED);

      expect(mockReplace).toHaveBeenCalledWith(
        `/auth/?param=value&${URLParameter.REASON}=${SIGN_OUT_REASON.CLIENT_REMOVED}`,
      );
    });
  });

  describe('logout', () => {
    beforeEach(() => {
      jest.spyOn(lifeCycleRepository, 'redirectToLogin').mockImplementation();
      jest.spyOn(CacheRepository, 'clearLocalStorage').mockReturnValue(['key1', 'key2']);
      jest.spyOn(CacheRepository, 'clearCacheStorage').mockImplementation();

      (useTypingIndicatorState as any).getState = jest.fn().mockReturnValue({
        clearTypingUsers: jest.fn(),
      });

      (mockDependencies.userRepository as any).userState.self.mockReturnValue(mockUser);
      (mockDependencies.clientRepository.constructCookieLabelKey as jest.Mock).mockReturnValue('cookie-key');
    });

    it('should prevent multiple simultaneous logout calls', async () => {
      lifeCycleRepository['isCurrentlyLoggingOut'] = true;

      await lifeCycleRepository.logout(SIGN_OUT_REASON.USER_REQUESTED, false);

      expect((amplify as any).publish).not.toHaveBeenCalled();
    });

    it('should send typing stop for active conversation', async () => {
      (mockDependencies.conversationRepository.getActiveConversation as jest.Mock).mockReturnValue(mockConversation);

      await lifeCycleRepository.logout(SIGN_OUT_REASON.USER_REQUESTED, false);

      expect(mockDependencies.conversationRepository.sendTypingStop).toHaveBeenCalledWith(mockConversation);
    });

    it('should handle typing stop failure gracefully', async () => {
      (mockDependencies.conversationRepository.getActiveConversation as jest.Mock).mockReturnValue(mockConversation);
      (mockDependencies.conversationRepository.sendTypingStop as jest.Mock).mockRejectedValue(
        new Error('Network error'),
      );

      await lifeCycleRepository.logout(SIGN_OUT_REASON.USER_REQUESTED, false);

      expect(mockDependencies.eventRepository.disconnectWebSocket).toHaveBeenCalled();
    });

    describe('data deletion scenarios', () => {
      describe('localStorage handling', () => {
        it('should preserve SHOW_LOGIN key when not clearing data', async () => {
          (mockDependencies.clientRepository.isCurrentClientPermanent as jest.Mock).mockReturnValue(true);

          await lifeCycleRepository.logout(SIGN_OUT_REASON.USER_REQUESTED, false);

          expect(CacheRepository.clearLocalStorage).toHaveBeenCalledWith(
            false,
            expect.arrayContaining([StorageKey.AUTH.SHOW_LOGIN, StorageKey.AUTH.PERSIST]),
          );
        });

        it('should preserve SHOW_LOGIN but not PERSIST for temporary clients', async () => {
          (mockDependencies.clientRepository.isCurrentClientPermanent as jest.Mock).mockReturnValue(false);

          await lifeCycleRepository.logout(SIGN_OUT_REASON.USER_REQUESTED, false);

          expect(CacheRepository.clearLocalStorage).toHaveBeenCalledWith(
            false,
            expect.arrayContaining([StorageKey.AUTH.SHOW_LOGIN]),
          );
          expect(CacheRepository.clearLocalStorage).toHaveBeenCalledWith(
            false,
            expect.not.arrayContaining([StorageKey.AUTH.PERSIST]),
          );
        });

        it('should handle CLIENT_NOT_SET error when checking permanent client', async () => {
          const clientError = new ClientError(ClientError.TYPE.CLIENT_NOT_SET, 'No client set');
          (mockDependencies.clientRepository.isCurrentClientPermanent as jest.Mock).mockImplementation(() => {
            throw clientError;
          });

          await lifeCycleRepository.logout(SIGN_OUT_REASON.USER_REQUESTED, false);

          expect(CacheRepository.clearLocalStorage).toHaveBeenCalledWith(
            false,
            expect.arrayContaining([StorageKey.AUTH.SHOW_LOGIN]),
          );
          expect(CacheRepository.clearLocalStorage).toHaveBeenCalledWith(
            false,
            expect.not.arrayContaining([StorageKey.AUTH.PERSIST]),
          );
        });

        it('should preserve conversation input for session expired', async () => {
          await lifeCycleRepository.logout(SIGN_OUT_REASON.SESSION_EXPIRED, false);

          expect(CacheRepository.clearLocalStorage).toHaveBeenCalledWith(
            true,
            expect.arrayContaining([StorageKey.AUTH.SHOW_LOGIN]),
          );
        });

        it('should preserve cookie labels when not clearing data', async () => {
          const amplifyStoreData = {
            'some-key': 'value',
            'z.storage.StorageKey.AUTH.COOKIE_LABEL.cookie-key': 'user-cookie',
            'z.storage.StorageKey.AUTH.COOKIE_LABEL.other': 'other-cookie',
            'unrelated-key': 'unrelated',
          };
          (amplify as any).store = jest.fn().mockReturnValue(amplifyStoreData);
          (mockDependencies.clientRepository.constructCookieLabelKey as jest.Mock).mockReturnValue(
            'z.storage.StorageKey.AUTH.COOKIE_LABEL.cookie-key',
          );

          await lifeCycleRepository.logout(SIGN_OUT_REASON.USER_REQUESTED, false);

          expect(CacheRepository.clearLocalStorage).toHaveBeenCalledWith(
            false,
            expect.arrayContaining([
              StorageKey.AUTH.SHOW_LOGIN,
              'z.storage.StorageKey.AUTH.COOKIE_LABEL.cookie-key',
              'z.storage.StorageKey.AUTH.COOKIE_LABEL.other',
            ]),
          );
        });

        it('should delete cookie labels when clearing data', async () => {
          const amplifyStoreData = {
            'z.storage.StorageKey.AUTH.COOKIE_LABEL.cookie-key': 'user-cookie',
            'z.storage.StorageKey.AUTH.COOKIE_LABEL.other': 'other-cookie',
          };
          (amplify as any).store = jest.fn().mockReturnValue(amplifyStoreData);
          (mockDependencies.clientRepository.constructCookieLabelKey as jest.Mock).mockReturnValue(
            'z.storage.StorageKey.AUTH.COOKIE_LABEL.cookie-key',
          );

          await lifeCycleRepository.logout(SIGN_OUT_REASON.USER_REQUESTED, true);

          expect(CacheRepository.clearLocalStorage).toHaveBeenCalledWith(
            false,
            expect.arrayContaining([StorageKey.AUTH.SHOW_LOGIN, 'z.storage.StorageKey.AUTH.COOKIE_LABEL.other']),
          );
          expect(CacheRepository.clearLocalStorage).toHaveBeenCalledWith(
            false,
            expect.not.arrayContaining(['z.storage.StorageKey.AUTH.COOKIE_LABEL.cookie-key']),
          );
        });
      });

      describe('core.logout parameter scenarios', () => {
        it('should NOT call clearAllData or clearCryptoData for normal logout', async () => {
          await lifeCycleRepository.logout(SIGN_OUT_REASON.USER_REQUESTED, false);

          expect(localStorage.clear).not.toHaveBeenCalled();
          expect(mockDependencies.core.logout).toHaveBeenCalledWith({
            clearAllData: false,
            clearCryptoData: false,
          });
        });

        it('should NOT call clearAllData or clearCryptoData for session expired', async () => {
          await lifeCycleRepository.logout(SIGN_OUT_REASON.SESSION_EXPIRED, false);

          expect(localStorage.clear).not.toHaveBeenCalled();
          expect(mockDependencies.core.logout).toHaveBeenCalledWith({
            clearAllData: false,
            clearCryptoData: false,
          });
        });

        it('should call clearAllData when user requests data wipe', async () => {
          await lifeCycleRepository.logout(SIGN_OUT_REASON.USER_REQUESTED, true);

          expect(localStorage.clear).toHaveBeenCalled();
          expect(mockDependencies.core.logout).toHaveBeenCalledWith({
            clearAllData: true,
            clearCryptoData: false,
          });
        });

        it('should call clearAllData for CLIENT_REMOVED (without clearData)', async () => {
          await lifeCycleRepository.logout(SIGN_OUT_REASON.CLIENT_REMOVED, false);

          expect(localStorage.clear).toHaveBeenCalled();
          expect(mockDependencies.core.logout).toHaveBeenCalledWith({
            clearAllData: true,
            clearCryptoData: false,
          });
        });

        it('should call clearAllData for CLIENT_REMOVED (with clearData)', async () => {
          await lifeCycleRepository.logout(SIGN_OUT_REASON.CLIENT_REMOVED, true);

          expect(localStorage.clear).toHaveBeenCalled();
          expect(mockDependencies.core.logout).toHaveBeenCalledWith({
            clearAllData: true,
            clearCryptoData: false,
          });
        });

        it('should call clearCryptoData for MLS_CLIENT_MISMATCH (without clearData)', async () => {
          await lifeCycleRepository.logout(SIGN_OUT_REASON.MLS_CLIENT_MISMATCH, false);

          expect(localStorage.clear).toHaveBeenCalled();
          expect(mockDependencies.core.logout).toHaveBeenCalledWith({
            clearAllData: false,
            clearCryptoData: true,
          });
        });

        it('should prioritize clearCryptoData for MLS_CLIENT_MISMATCH even with clearData', async () => {
          await lifeCycleRepository.logout(SIGN_OUT_REASON.MLS_CLIENT_MISMATCH, true);

          expect(localStorage.clear).toHaveBeenCalled();
          expect(mockDependencies.core.logout).toHaveBeenCalledWith({
            clearAllData: false,
            clearCryptoData: true,
          });
        });

        it('should call clearAllData for ACCOUNT_DELETED', async () => {
          await lifeCycleRepository.logout(SIGN_OUT_REASON.ACCOUNT_DELETED, false);

          expect(localStorage.clear).not.toHaveBeenCalled();
          expect(mockDependencies.core.logout).toHaveBeenCalledWith({
            clearAllData: false,
            clearCryptoData: false,
          });
        });

        it('should call clearAllData for ACCOUNT_DELETED with clearData', async () => {
          await lifeCycleRepository.logout(SIGN_OUT_REASON.ACCOUNT_DELETED, true);

          expect(localStorage.clear).toHaveBeenCalled();
          expect(mockDependencies.core.logout).toHaveBeenCalledWith({
            clearAllData: true,
            clearCryptoData: false,
          });
        });

        it('should call clearAllData for NO_APP_CONFIG with clearData', async () => {
          await lifeCycleRepository.logout(SIGN_OUT_REASON.NO_APP_CONFIG, true);

          expect(localStorage.clear).toHaveBeenCalled();
          expect(mockDependencies.core.logout).toHaveBeenCalledWith({
            clearAllData: true,
            clearCryptoData: false,
          });
        });
      });

      describe('cache and database deletion', () => {
        it('should clear cache storage when clearing data', async () => {
          await lifeCycleRepository.logout(SIGN_OUT_REASON.USER_REQUESTED, true);

          expect(CacheRepository.clearCacheStorage).toHaveBeenCalled();
        });

        it('should not clear cache storage when not clearing data', async () => {
          await lifeCycleRepository.logout(SIGN_OUT_REASON.USER_REQUESTED, false);

          expect(CacheRepository.clearCacheStorage).not.toHaveBeenCalled();
        });

        it('should delete database when clearing data', async () => {
          (mockDependencies.storageRepository.deleteDatabase as jest.Mock).mockResolvedValue(undefined);

          await lifeCycleRepository.logout(SIGN_OUT_REASON.USER_REQUESTED, true);

          expect(mockDependencies.storageRepository.deleteDatabase).toHaveBeenCalled();
        });

        it('should handle database deletion failure gracefully', async () => {
          (mockDependencies.storageRepository.deleteDatabase as jest.Mock).mockRejectedValue(
            new Error('Database deletion failed'),
          );

          await lifeCycleRepository.logout(SIGN_OUT_REASON.USER_REQUESTED, true);

          expect(lifeCycleRepository.redirectToLogin).toHaveBeenCalledWith(SIGN_OUT_REASON.USER_REQUESTED);
        });

        it('should not delete database when not clearing data', async () => {
          await lifeCycleRepository.logout(SIGN_OUT_REASON.USER_REQUESTED, false);

          expect(mockDependencies.storageRepository.deleteDatabase).not.toHaveBeenCalled();
        });
      });
    });

    describe('logout flow control', () => {
      it('should execute immediate logout for immediate sign out reasons', async () => {
        await lifeCycleRepository.logout(SIGN_OUT_REASON.SESSION_EXPIRED, false);

        expect((amplify as any).publish).toHaveBeenCalledWith(WebAppEvents.LIFECYCLE.SIGNED_OUT, false);
        expect(lifeCycleRepository.redirectToLogin).toHaveBeenCalledWith(SIGN_OUT_REASON.SESSION_EXPIRED);
      });

      it('should handle immediate logout errors and redirect', async () => {
        (mockDependencies.core.logout as jest.Mock).mockImplementation(() => {
          return Promise.reject(new BaseError('LOGOUT_ERROR', 'Logout failed'));
        });

        await lifeCycleRepository.logout(SIGN_OUT_REASON.SESSION_EXPIRED, false);

        expect(lifeCycleRepository.redirectToLogin).toHaveBeenCalledWith(SIGN_OUT_REASON.SESSION_EXPIRED);
      });

      it('should handle unknown errors in immediate logout', async () => {
        (mockDependencies.core.logout as jest.Mock).mockImplementation(() => {
          return Promise.reject(new Error('Unknown error'));
        });

        await lifeCycleRepository.logout(SIGN_OUT_REASON.SESSION_EXPIRED, false);

        expect((amplify as any).publish).toHaveBeenCalledWith(WebAppEvents.LIFECYCLE.SIGNED_OUT, false);
      });

      it('should logout via backend when online for non-immediate reasons', async () => {
        window.navigator = {...originalNavigator, onLine: true} as any;

        await lifeCycleRepository.logout(SIGN_OUT_REASON.USER_REQUESTED, false);

        expect(mockDependencies.eventRepository.disconnectWebSocket).toHaveBeenCalled();
        expect((amplify as any).publish).toHaveBeenCalledWith(WebAppEvents.LIFECYCLE.SIGNED_OUT, false);
      });

      it('should handle backend logout errors and redirect', async () => {
        (mockDependencies.core.logout as jest.Mock).mockRejectedValue(new Error('Backend error'));

        await lifeCycleRepository.logout(SIGN_OUT_REASON.USER_REQUESTED, false);

        expect(lifeCycleRepository.redirectToLogin).toHaveBeenCalledWith(SIGN_OUT_REASON.USER_REQUESTED);
      });

      it('should wait for online connectivity when offline', async () => {
        window.navigator = {...originalNavigator, onLine: false} as any;
        const addEventListenerSpy = jest.spyOn(window, 'addEventListener');

        await lifeCycleRepository.logout(SIGN_OUT_REASON.USER_REQUESTED, false);

        expect(addEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
        expect((amplify as any).publish).not.toHaveBeenCalled();
      });
    });

    it('should publish SIGNED_OUT event with correct clearData flag', async () => {
      await lifeCycleRepository.logout(SIGN_OUT_REASON.USER_REQUESTED, true);

      expect((amplify as any).publish).toHaveBeenCalledWith(WebAppEvents.LIFECYCLE.SIGNED_OUT, true);
    });

    it('should clear typing users state', async () => {
      const clearTypingUsersMock = jest.fn();
      (useTypingIndicatorState as any).getState = jest.fn().mockReturnValue({
        clearTypingUsers: clearTypingUsersMock,
      });

      await lifeCycleRepository.logout(SIGN_OUT_REASON.USER_REQUESTED, false);

      expect(clearTypingUsersMock).toHaveBeenCalled();
    });

    it('should disconnect WebSocket', async () => {
      await lifeCycleRepository.logout(SIGN_OUT_REASON.USER_REQUESTED, false);

      expect(mockDependencies.eventRepository.disconnectWebSocket).toHaveBeenCalled();
    });

    it('sets SHOW_LOGIN flag on USER_REQUESTED logout', async () => {
      (mockDependencies.clientRepository.isCurrentClientPermanent as jest.Mock).mockReturnValue(true);

      await lifeCycleRepository.logout(SIGN_OUT_REASON.USER_REQUESTED, true);

      expect(storeValue).toHaveBeenCalledWith(StorageKey.AUTH.SHOW_LOGIN, true);
    });

    it('resets SHOW_LOGIN flag on non USER_REQUESTED logout like SESSION_EXPIRED)', async () => {
      (mockDependencies.clientRepository.isCurrentClientPermanent as jest.Mock).mockReturnValue(true);

      await lifeCycleRepository.logout(SIGN_OUT_REASON.SESSION_EXPIRED, false);

      expect(resetStoreValue).toHaveBeenCalledWith(StorageKey.AUTH.SHOW_LOGIN);
    });
  });

  describe('state management', () => {
    it('should track logging out state', () => {
      expect(lifeCycleRepository.getIsLoggingOut()).toBe(false);

      lifeCycleRepository.logout(SIGN_OUT_REASON.USER_REQUESTED, false);

      expect(lifeCycleRepository.getIsLoggingOut()).toBe(true);
    });

    it('should reset logging out state', () => {
      lifeCycleRepository['isCurrentlyLoggingOut'] = true;

      lifeCycleRepository.resetLogoutState();

      expect(lifeCycleRepository.getIsLoggingOut()).toBe(false);
    });
  });

  describe('doSimpleRedirect function', () => {
    it('should redirect to auth with search params', () => {
      const mockReplace = jest.fn();
      Object.defineProperty(window, 'location', {
        value: {
          search: '?test=1',
          hash: '',
          replace: mockReplace,
        },
        writable: true,
      });

      doSimpleRedirect(SIGN_OUT_REASON.USER_REQUESTED);

      expect(mockReplace).toHaveBeenCalledWith('/auth/?test=1');
    });

    it('should save redirect hash for user profiles when not signed in', () => {
      const mockReplace = jest.fn();
      const mockSetItem = jest.spyOn(Storage.prototype, 'setItem');
      Object.defineProperty(window, 'location', {
        value: {
          search: '',
          hash: '#/user/123',
          replace: mockReplace,
        },
        writable: true,
      });

      doSimpleRedirect(SIGN_OUT_REASON.NOT_SIGNED_IN);

      expect(mockSetItem).toHaveBeenCalledWith('LOGIN_REDIRECT_KEY', '#/user/123');
      expect(mockReplace).toHaveBeenCalledWith('/auth/');
      mockSetItem.mockRestore();
    });

    it('should add reason parameter for immediate sign out reasons', () => {
      const mockReplace = jest.fn();
      Object.defineProperty(window, 'location', {
        value: {
          search: '',
          hash: '',
          replace: mockReplace,
        },
        writable: true,
      });

      doSimpleRedirect(SIGN_OUT_REASON.SESSION_EXPIRED);

      expect(mockReplace).toHaveBeenCalledWith('/auth/?reason=expired');
    });
  });
});
