/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import {amplify} from 'amplify';

import {WebAppEvents} from '@wireapp/webapp-events';

import {useTypingIndicatorState} from 'Components/InputBar/TypingIndicator';
import {CacheRepository} from 'Repositories/cache/CacheRepository';
import type {ClientRepository} from 'Repositories/client/ClientRepository';
import type {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import type {EventRepository} from 'Repositories/event/EventRepository';
import {StorageKey} from 'Repositories/storage/StorageKey';
import type {StorageRepository} from 'Repositories/storage/StorageRepository';
import type {UserRepository} from 'Repositories/user/UserRepository';
import {getLogger, Logger} from 'Util/Logger';
import {includesString} from 'Util/StringUtil';
import {appendParameter} from 'Util/UrlUtil';

import {SIGN_OUT_REASON} from '../../auth/SignOutReason';
import {URLParameter} from '../../auth/URLParameter';
import {BaseError} from '../../error/BaseError';
import {ClientError} from '../../error/ClientError';
import {externalUrl} from '../../externalRoute';
import type {Core} from '../../service/CoreSingleton';

const LogoutConfig = {
  LOGIN_REDIRECT_STORAGE_KEY: 'LOGIN_REDIRECT_KEY',
  IMMEDIATE_LOGOUT_REASONS: [
    SIGN_OUT_REASON.NO_APP_CONFIG,
    SIGN_OUT_REASON.ACCOUNT_DELETED,
    SIGN_OUT_REASON.CLIENT_REMOVED,
    SIGN_OUT_REASON.SESSION_EXPIRED,
  ],
  TEMPORARY_GUEST_REASONS: [
    SIGN_OUT_REASON.MULTIPLE_TABS,
    SIGN_OUT_REASON.SESSION_EXPIRED,
    SIGN_OUT_REASON.USER_REQUESTED,
  ],
};

/**
 * Simple redirect function for authentication flow.
 * Handles user profile URL saving and immediate sign-out reason parameter addition.
 */
export const doSimpleRedirect = (signOutReason: SIGN_OUT_REASON): void => {
  let url = `/auth/${location.search}`;

  if (location.hash.startsWith('#/user/') && signOutReason === SIGN_OUT_REASON.NOT_SIGNED_IN) {
    localStorage.setItem('LOGIN_REDIRECT_KEY', location.hash);
  }

  const immediateSignOutReasons = LogoutConfig.IMMEDIATE_LOGOUT_REASONS;

  if (immediateSignOutReasons.includes(signOutReason)) {
    url = appendParameter(url, `${URLParameter.REASON}=${signOutReason}`);
  }

  window.location.replace(url);
};

export interface LifeCycleDependencies {
  clientRepository: ClientRepository;
  conversationRepository: ConversationRepository;
  eventRepository: EventRepository;
  storageRepository: StorageRepository;
  userRepository: UserRepository;
  core: Core;
}

/**
 * Repository responsible for managing user lifecycle events like logout and redirect flows.
 * Handles data cleanup, authentication redirects, and maintains logout state.
 */
export class LifeCycleRepository {
  private readonly logger: Logger;
  private isCurrentlyLoggingOut = false;

  // Configuration constants for sign-out behavior
  private static readonly LOGOUT_CONFIG = LogoutConfig;

  constructor(private readonly dependencies: LifeCycleDependencies) {
    this.logger = getLogger('LifeCycleRepository');
  }

  /**
   * Handles login redirect after connectivity verification.
   * Temporary guests are redirected to the main website instead of login.
   */
  redirectToLogin = (signOutReason: SIGN_OUT_REASON): void => {
    this.logger.info(`Redirecting to login after connectivity verification. Reason: ${signOutReason}`);

    const isTemporaryGuestSignOut = LifeCycleRepository.LOGOUT_CONFIG.TEMPORARY_GUEST_REASONS.includes(signOutReason);
    const currentUser = this.dependencies.userRepository['userState'].self();
    const isTemporaryGuestUser = currentUser?.isTemporaryGuest();

    // Redirect temporary guests to main website instead of login page
    if (isTemporaryGuestSignOut && isTemporaryGuestUser && externalUrl.website) {
      return window.location.replace(externalUrl.website);
    }

    doSimpleRedirect(signOutReason);
  };

  /**
   * Performs complete user logout with selective data cleanup based on sign-out reason.
   * Handles different cleanup scenarios: normal logout, data wipe, client removal, crypto issues.
   */
  public logout = async (signOutReason: SIGN_OUT_REASON, shouldClearAllData: boolean): Promise<void> => {
    // Prevent concurrent logout operations
    if (this.isCurrentlyLoggingOut) {
      return;
    }
    this.isCurrentlyLoggingOut = true;

    // Helper function to notify about logout completion and redirect
    const completeLogoutAndRedirect = (): void => {
      this.logger.info(
        `Logout process completed. Redirecting to login. Reason: ${signOutReason}, ClearAllData: ${shouldClearAllData}`,
      );
      amplify.publish(WebAppEvents.LIFECYCLE.SIGNED_OUT, shouldClearAllData);
      this.redirectToLogin(signOutReason);
    };

    // Main logout operation with comprehensive cleanup
    const performLogout = async (): Promise<void> => {
      await this.cleanupActiveSession();
      await this.cleanupLocalStorage(signOutReason, shouldClearAllData);
      await this.performCoreLogout(signOutReason, shouldClearAllData);
      await this.cleanupPersistentStorage(shouldClearAllData);

      return completeLogoutAndRedirect();
    };

    // Backend logout with error handling
    const performBackendLogout = async (): Promise<void> => {
      this.logger.info(`Logout triggered by '${signOutReason}': Disconnecting user from the backend.`);
      try {
        await performLogout();
      } catch (error) {
        this.logger.error(
          `Logout triggered by '${signOutReason}' and errored: ${error instanceof Error ? error.message : error}.`,
        );
        // Fallback to redirect even if logout fails
        completeLogoutAndRedirect();
      }
    };

    // Handle immediate logout scenarios
    const requiresImmediateLogout = LifeCycleRepository.LOGOUT_CONFIG.IMMEDIATE_LOGOUT_REASONS.includes(signOutReason);

    if (requiresImmediateLogout) {
      try {
        return await performLogout();
      } catch (error) {
        if (error instanceof BaseError) {
          this.logger.error(`Logout triggered by '${signOutReason}' and errored: ${error.message}.`);
        }
        return completeLogoutAndRedirect();
      }
    }

    // If online, perform backend logout immediately
    if (navigator.onLine) {
      return performBackendLogout();
    }

    // Wait for connectivity before attempting backend logout
    this.logger.warn('No internet access. Continuing when internet connectivity regained.');
    window.addEventListener('online', () => performBackendLogout());
  };

  /**
   * Cleans up active conversation state and disconnects WebSocket connections.
   */
  private readonly cleanupActiveSession = async (): Promise<void> => {
    const activeConversation = this.dependencies.conversationRepository.getActiveConversation();

    // Send typing stop notification for active conversation
    if (activeConversation) {
      try {
        await this.dependencies.conversationRepository.sendTypingStop(activeConversation);
      } catch (error) {
        this.logger.warn('Failed to send typing stop before logout.', error);
      }
    }

    // Clear all typing indicators
    const {clearTypingUsers} = useTypingIndicatorState.getState();
    clearTypingUsers();

    // Disconnect from real-time events
    this.dependencies.eventRepository.disconnectWebSocket();
  };

  /**
   * Selectively clears localStorage while preserving necessary authentication keys.
   * Handles cookie label preservation based on data clearing preferences.
   */
  private readonly cleanupLocalStorage = async (
    signOutReason: SIGN_OUT_REASON,
    shouldClearAllData: boolean,
  ): Promise<void> => {
    // Always preserve the login preference
    const storageKeysToPreserve = [StorageKey.AUTH.SHOW_LOGIN];

    // Determine if we should keep permanent client data
    const shouldPreservePermanentClientData = this.shouldKeepPermanentClientData(shouldClearAllData);
    if (shouldPreservePermanentClientData) {
      storageKeysToPreserve.push(StorageKey.AUTH.PERSIST);
    }

    // Handle cookie label preservation
    const currentUser = this.dependencies.userRepository['userState'].self();
    if (currentUser) {
      const cookieLabelsToPreserve = this.determineCookieLabelsToPreserve(currentUser, shouldClearAllData);
      storageKeysToPreserve.push(...cookieLabelsToPreserve);

      // Clear localStorage selectively, keeping conversation input for session expiry
      const shouldPreserveConversationInput = signOutReason === SIGN_OUT_REASON.SESSION_EXPIRED;
      const deletedKeys = CacheRepository.clearLocalStorage(shouldPreserveConversationInput, storageKeysToPreserve);
      this.logger.debug(`Deleted "${deletedKeys.length}" keys from localStorage.`, deletedKeys);
    }

    // Perform complete localStorage wipe for specific scenarios
    const requiresCompleteLocalStorageWipe = this.shouldWipeLocalStorage(signOutReason, shouldClearAllData);
    if (requiresCompleteLocalStorageWipe) {
      localStorage.clear();
    }
  };

  /**
   * Determines whether to preserve permanent client data based on client type and user preferences.
   */
  private readonly shouldKeepPermanentClientData = (shouldClearAllData: boolean): boolean => {
    if (shouldClearAllData) {
      return false;
    }

    try {
      return this.dependencies.clientRepository.isCurrentClientPermanent();
    } catch (error) {
      // Handle case where client is not set
      const isClientNotSetError = error instanceof ClientError && error.type === ClientError.TYPE.CLIENT_NOT_SET;
      if (isClientNotSetError) {
        return false;
      }
      throw error;
    }
  };

  /**
   * Determines which cookie labels should be preserved during logout.
   * User's own cookie label is deleted only when explicitly clearing all data.
   */
  private readonly determineCookieLabelsToPreserve = (currentUser: any, shouldClearAllData: boolean): string[] => {
    const userCookieLabelKey = this.dependencies.clientRepository.constructCookieLabelKey(currentUser.email());
    const allStorageKeys = Object.keys(amplify.store());

    return allStorageKeys.filter(storageKey => {
      const isCookieLabel = includesString(storageKey, StorageKey.AUTH.COOKIE_LABEL);
      const isCurrentUserCookieLabel = storageKey === userCookieLabelKey;
      const shouldDeleteCurrentUserLabel = isCurrentUserCookieLabel && shouldClearAllData;

      // Preserve cookie labels except user's own when clearing all data
      return isCookieLabel && !shouldDeleteCurrentUserLabel;
    });
  };

  /**
   * Determines if localStorage should be completely wiped based on sign-out reason and user preferences.
   */
  private readonly shouldWipeLocalStorage = (signOutReason: SIGN_OUT_REASON, shouldClearAllData: boolean): boolean => {
    const isClientRemoved = signOutReason === SIGN_OUT_REASON.CLIENT_REMOVED;
    const isCryptoIssue = signOutReason === SIGN_OUT_REASON.MLS_CLIENT_MISMATCH;

    return shouldClearAllData || isClientRemoved || isCryptoIssue;
  };

  /**
   * Performs core logout operation with appropriate data clearing flags.
   * Handles different scenarios: normal logout, identity wipe, crypto wipe.
   */
  private readonly performCoreLogout = async (
    signOutReason: SIGN_OUT_REASON,
    shouldClearAllData: boolean,
  ): Promise<void> => {
    // Determine what type of data clearing is needed - these flags are mutually exclusive
    const shouldWipeCryptoData = signOutReason === SIGN_OUT_REASON.MLS_CLIENT_MISMATCH;
    let shouldWipeIdentityData = shouldClearAllData || signOutReason === SIGN_OUT_REASON.CLIENT_REMOVED;

    // Log crypto mismatch for debugging
    if (shouldWipeCryptoData) {
      this.logger.error('Client mismatch detected. Wiping crypto data and local client.');
      shouldWipeIdentityData = false; // Crypto wipe takes precedence
    }

    // Perform core logout with appropriate flags
    await this.dependencies.core.logout({
      clearAllData: shouldWipeIdentityData,
      clearCryptoData: shouldWipeCryptoData,
    });
  };

  /**
   * Cleans up persistent storage (cache and database) when user requests complete data removal.
   */
  private readonly cleanupPersistentStorage = async (shouldClearAllData: boolean): Promise<void> => {
    if (!shouldClearAllData) {
      return;
    }

    // Clear cache storage, not a blocking operation therefore not awaited
    void CacheRepository.clearCacheStorage();

    // Delete database with error handling
    try {
      await this.dependencies.storageRepository.deleteDatabase();
    } catch (error) {
      this.logger.error('Failed to delete database before logout', error);
    }
  };

  /**
   * Returns the current logout state.
   */
  getIsLoggingOut = (): boolean => this.isCurrentlyLoggingOut;

  /**
   * Resets the logout state.
   */
  resetLogoutState = (): void => {
    this.isCurrentlyLoggingOut = false;
  };
}
