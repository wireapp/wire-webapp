/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import sodium from 'libsodium-wrappers-sumo';
import {container, singleton} from 'tsyringe';

import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {t} from 'Util/LocalizerUtil';

import {AppLockState} from './AppLockState';
import {UserState} from './UserState';

const APP_LOCK_STORAGE = 'app_lock';
const APP_LOCK_ENABLED_STORAGE = 'app_lock_enabled';

@singleton()
export class AppLockRepository {
  getPassphraseStorageKey: () => string;
  getEnabledStorageKey: () => string;
  constructor(
    private readonly userState = container.resolve(UserState),
    private readonly appLockState = container.resolve(AppLockState),
  ) {
    this.getPassphraseStorageKey = (): string => `${APP_LOCK_STORAGE}_${this.userState.self().id}`;
    this.getEnabledStorageKey = (): string => `${APP_LOCK_ENABLED_STORAGE}_${this.userState.self().id}`;
    const hasPassphrase = !!this.getStoredPassphrase();
    this.appLockState.hasPassphrase(hasPassphrase);
    this.appLockState.isActivatedInPreferences(this.getStoredEnabled() === 'true');
    if (hasPassphrase) {
      this.startPassphraseObserver();
    }

    this.appLockState.isAppLockDisabledOnTeam.subscribe(this.handleDisabledOnTeam);
    this.handleDisabledOnTeam(this.appLockState.isAppLockDisabledOnTeam());
  }

  getStoredPassphrase = (): string => window.localStorage.getItem(this.getPassphraseStorageKey());

  getStoredEnabled = (): string => window.localStorage.getItem(this.getEnabledStorageKey());

  handlePassphraseStorageEvent = ({key, oldValue}: StorageEvent): void => {
    const storageKey = this.getPassphraseStorageKey();
    if (key === storageKey) {
      window.localStorage.setItem(storageKey, oldValue);
    }
  };

  private readonly handleDisabledOnTeam = (isDisabled: boolean): void => {
    if (isDisabled) {
      this.removeCode();
    }
  };

  private readonly startPassphraseObserver = (): void => {
    window.addEventListener('storage', this.handlePassphraseStorageEvent);
  };

  private readonly stopPassphraseObserver = (): void => {
    window.removeEventListener('storage', this.handlePassphraseStorageEvent);
  };

  setEnabled = (enabled: boolean) => {
    const disableFeature = () => {
      this.appLockState.isActivatedInPreferences(false);
      window.localStorage.removeItem(this.getEnabledStorageKey());
    };
    if (enabled) {
      window.localStorage.setItem(this.getEnabledStorageKey(), 'true');
      this.appLockState.isActivatedInPreferences(true);
    } else if (this.appLockState.hasPassphrase()) {
      // If the user has set a passphrase we want to ask confirmation before disabling the feature
      PrimaryModal.show(PrimaryModal.type.CONFIRM, {
        primaryAction: {
          action: disableFeature,
          text: t('AppLockDisableTurnOff'),
        },
        secondaryAction: {
          text: t('AppLockDisableCancel'),
        },
        text: {
          title: t('ApplockDisableHeadline'),
          message: t('AppLockDisableInfo'),
        },
      });
    } else {
      disableFeature();
    }
  };

  setCode = async (code: string): Promise<void> => {
    this.stopPassphraseObserver();
    await sodium.ready;
    const hashed = sodium.crypto_pwhash_str(
      code,
      sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
      sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
    );
    window.localStorage.setItem(this.getPassphraseStorageKey(), hashed);
    this.startPassphraseObserver();
    this.appLockState.hasPassphrase(true);
  };

  removeCode = () => {
    this.stopPassphraseObserver();
    window.localStorage.removeItem(this.getPassphraseStorageKey());
    this.appLockState.hasPassphrase(false);
  };

  checkCode = async (code: string): Promise<boolean> => {
    const hashedCode = this.getStoredPassphrase();
    await sodium.ready;
    return sodium.crypto_pwhash_str_verify(hashedCode, code);
  };
}
