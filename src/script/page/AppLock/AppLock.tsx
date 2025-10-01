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

import React, {useCallback, useEffect, useRef, useState} from 'react';

import {amplify} from 'amplify';
import cx from 'classnames';
import {StatusCodes as HTTP_STATUS} from 'http-status-codes';
import {container} from 'tsyringe';

import {ValidationUtil} from '@wireapp/commons';
import {WebAppEvents} from '@wireapp/webapp-events';

import * as Icon from 'Components/Icon';
import {ModalComponent} from 'Components/Modals/ModalComponent';
import {ClientRepository} from 'Repositories/client';
import {ClientState} from 'Repositories/client/ClientState';
import {AppLockRepository} from 'Repositories/user/AppLockRepository';
import {AppLockState} from 'Repositories/user/AppLockState';
import {SIGN_OUT_REASON} from 'src/script/auth/SignOutReason';
import {Config} from 'src/script/Config';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';

export enum APPLOCK_STATE {
  FORGOT = 'applock.forgot',
  LOCKED = 'applock.locked',
  NONE = 'applock.none',
  SETUP = 'applock.setup',
  SETUP_CHANGE = 'applock.setup_change',
  WIPE_CONFIRM = 'applock.wipe-confirm',
  WIPE_PASSWORD = 'applock.wipe-password',
}

const DEFAULT_INACTIVITY_APP_LOCK_TIMEOUT_IN_SEC = 60;

const passwordRegex = new RegExp(ValidationUtil.getNewPasswordPattern(Config.getConfig().NEW_PASSWORD_MINIMUM_LENGTH));
const passwordRegexDigit = /(?=.*[0-9])/;
const passwordRegexLength = new RegExp(`^.{${Config.getConfig().NEW_PASSWORD_MINIMUM_LENGTH},}$`);
const passwordRegexLower = /(?=.*[a-z])/;
const passwordRegexSpecial = /(?=.*[!@#$%^&*(),.?":{}|<>])/;
const passwordRegexUpper = /(?=.*[A-Z])/;

interface AppLockProps {
  appLockRepository?: AppLockRepository;
  appLockState?: AppLockState;
  clientRepository: ClientRepository;
  clientState?: ClientState;
}

const AppLock = ({
  clientRepository,
  clientState = container.resolve(ClientState),
  appLockState = container.resolve(AppLockState),
  appLockRepository = container.resolve(AppLockRepository),
}: AppLockProps) => {
  const [state, setState] = useState<APPLOCK_STATE>(APPLOCK_STATE.NONE);
  const [wipeError, setWipeError] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [setupPassphrase, setSetupPassphrase] = useState('');
  const [inactivityTimeoutId, setInactivityTimeoutId] = useState<number>();
  const [scheduledTimeoutId, setScheduledTimeoutId] = useState<number>();
  const {isAppLockActivated, isAppLockEnabled, isAppLockEnforced} = useKoSubscribableChildren(appLockState, [
    'isAppLockActivated',
    'isAppLockEnabled',
    'isAppLockEnforced',
  ]);

  // We log the user out if there is a style change on the app element
  // i.e. if there is an attempt to remove the blur effect
  const {current: appObserver} = useRef(
    new MutationObserver(mutationRecords => {
      const [{attributeName}] = mutationRecords;
      if (attributeName === 'style') {
        amplify.publish(WebAppEvents.LIFECYCLE.SIGN_OUT, SIGN_OUT_REASON.USER_REQUESTED);
      }
    }),
  );

  // We log the user out if the modal is removed from the DOM
  const {current: modalObserver} = useRef(
    new MutationObserver(() => {
      const modalInDOM = document.querySelector('[data-uie-name="applock-modal"]');
      if (!modalInDOM) {
        amplify.publish(WebAppEvents.LIFECYCLE.SIGN_OUT, SIGN_OUT_REASON.USER_REQUESTED);
      }
    }),
  );

  const getInactivityAppLockTimeoutInSeconds = () => {
    const backendTimeout = appLockState.appLockInactivityTimeoutSecs();
    return Number.isFinite(backendTimeout) ? backendTimeout : DEFAULT_INACTIVITY_APP_LOCK_TIMEOUT_IN_SEC;
  };

  const getScheduledAppLockTimeoutInSeconds = () => {
    const configTimeout = Config.getConfig().FEATURE?.APPLOCK_SCHEDULED_TIMEOUT;
    return Number.isFinite(configTimeout) ? configTimeout : null;
  };

  const isScheduledAppLockEnabled = () => {
    return getScheduledAppLockTimeoutInSeconds() !== null;
  };

  const startAppLockTimeout = useCallback(() => {
    window.clearTimeout(inactivityTimeoutId);
    const id = window.setTimeout(showAppLock, getInactivityAppLockTimeoutInSeconds() * 1000);
    setInactivityTimeoutId(id);
  }, [inactivityTimeoutId]);

  const clearAppLockTimeout = useCallback(() => {
    window.clearTimeout(inactivityTimeoutId);
  }, [inactivityTimeoutId]);

  useEffect(() => {
    amplify.subscribe(WebAppEvents.PREFERENCES.CHANGE_APP_LOCK_PASSPHRASE, changePassphrase);
  }, []);

  useEffect(() => {
    if (isAppLockEnabled) {
      showAppLock();
    } else if (appLockState.hasPassphrase()) {
      appLockRepository.removeCode();
    }
  }, [isAppLockEnabled]);

  useEffect(() => {
    if (isAppLockActivated) {
      window.addEventListener('blur', startAppLockTimeout);
      window.addEventListener('focus', clearAppLockTimeout);
      return () => {
        window.removeEventListener('blur', startAppLockTimeout);
        window.removeEventListener('focus', clearAppLockTimeout);
      };
    }
    return clearAppLockTimeout();
  }, [isAppLockActivated, clearAppLockTimeout, startAppLockTimeout]);

  useEffect(() => {
    const app = window.document.querySelector<HTMLDivElement>('#app');
    app?.style.setProperty('filter', isVisible ? 'blur(100px)' : '', 'important');
    app?.style.setProperty('pointer-events', isVisible ? 'none' : 'auto', 'important');

    if (isVisible) {
      const wireMain = document.querySelector('#wire-main');
      if (wireMain) {
        modalObserver.observe(wireMain, {
          childList: true,
        });
      }
      const appElement = document.querySelector('#app');
      if (appElement) {
        appObserver.observe(appElement, {attributes: true});
      }
    }
    return () => {
      modalObserver.disconnect();
      appObserver.disconnect();
    };
  }, [state, isVisible]);

  const showAppLock = () => {
    setState(appLockState.hasPassphrase() ? APPLOCK_STATE.LOCKED : APPLOCK_STATE.SETUP);
    setIsVisible(true);
  };

  const onUnlock = async (event: React.FormEvent) => {
    event.preventDefault();
    const target = event.target as HTMLFormElement & {password: HTMLInputElement};
    const isCorrectCode = await appLockRepository.checkCode(target.password.value);
    if (isCorrectCode) {
      setIsVisible(false);
      startScheduledTimeout();
      return;
    }
    setUnlockError(t('modalAppLockLockedError'));
  };

  const startScheduledTimeout = () => {
    if (isScheduledAppLockEnabled()) {
      window.clearTimeout(scheduledTimeoutId);
      setScheduledTimeoutId(window.setTimeout(showAppLock, getScheduledAppLockTimeoutInSeconds() * 1000));
    }
  };

  const onSetCode = async (event: React.FormEvent) => {
    event.preventDefault();
    await appLockRepository.setCode(setupPassphrase);
    setIsVisible(false);
    startScheduledTimeout();
  };

  const onWipeDatabase = async (event: React.FormEvent) => {
    const target = event.target as HTMLFormElement & {password: HTMLInputElement};
    try {
      setIsLoading(true);
      const currentClientId = clientState.currentClient.id;
      await clientRepository.clientService.deleteClient(currentClientId, target.password.value);
      appLockRepository.removeCode();
      amplify.publish(WebAppEvents.LIFECYCLE.SIGN_OUT, SIGN_OUT_REASON.USER_REQUESTED, true);
    } catch ({code, message}) {
      setIsLoading(false);
      if ([HTTP_STATUS.BAD_REQUEST, HTTP_STATUS.UNAUTHORIZED, HTTP_STATUS.FORBIDDEN].includes(code)) {
        return setWipeError(t('modalAppLockWipePasswordError'));
      }
      setWipeError(message);
    }
  };

  const changePassphrase = () => {
    setState(APPLOCK_STATE.SETUP);
    setIsVisible(true);
  };

  const isSetupPassphraseValid = passwordRegex.test(setupPassphrase);
  const isSetupPassphraseLower = passwordRegexLower.test(setupPassphrase);
  const isSetupPassphraseUpper = passwordRegexUpper.test(setupPassphrase);
  const isSetupPassphraseDigit = passwordRegexDigit.test(setupPassphrase);
  const isSetupPassphraseLength = passwordRegexLength.test(setupPassphrase);
  const isSetupPassphraseSpecial = passwordRegexSpecial.test(setupPassphrase);

  const clearWipeError = () => setWipeError('');
  const clearUnlockError = () => setUnlockError('');
  const onGoBack = () => setState(APPLOCK_STATE.LOCKED);
  const onClickForgot = () => setState(APPLOCK_STATE.FORGOT);
  const onClickWipe = () => setState(APPLOCK_STATE.WIPE_CONFIRM);
  const onClickWipeConfirm = () => setState(APPLOCK_STATE.WIPE_PASSWORD);
  const onClosed = () => {
    setState(APPLOCK_STATE.NONE);
    setSetupPassphrase('');
  };
  const onCancelAppLock = () => {
    appLockRepository.setEnabled(false);
    setIsVisible(false);
  };

  const headerText = () => {
    switch (state) {
      case APPLOCK_STATE.SETUP_CHANGE:
        return t('modalAppLockSetupChangeTitle', {brandName: Config.getConfig().BRAND_NAME});
      case APPLOCK_STATE.SETUP:
        return t('modalAppLockSetupTitle');
      case APPLOCK_STATE.LOCKED:
        return t('modalAppLockLockedTitle', {brandName: Config.getConfig().BRAND_NAME});
      case APPLOCK_STATE.FORGOT:
        return t('modalAppLockForgotTitle');
      case APPLOCK_STATE.WIPE_CONFIRM:
        return t('modalAppLockWipeConfirmTitle');
      case APPLOCK_STATE.WIPE_PASSWORD:
        return t('modalAppLockWipePasswordTitle', {brandName: Config.getConfig().BRAND_NAME});
      default:
        return '';
    }
  };

  return (
    <ModalComponent isShown={isVisible} showLoading={isLoading} onClosed={onClosed} data-uie-name="applock-modal">
      <div className="modal__header">
        {!isAppLockEnforced && !isAppLockActivated && (
          <button
            type="button"
            className="modal__header__button"
            onClick={onCancelAppLock}
            data-uie-name="do-close"
            aria-label={t('modalAppLockSetupCloseBtn')}
          >
            <span className="modal__header__icon" aria-hidden="true">
              <Icon.CloseIcon />
            </span>
          </button>
        )}

        <h2 className="modal__header__title" data-uie-name="applock-modal-header">
          {headerText()}
        </h2>
      </div>

      <div className="modal__body" data-uie-name="applock-modal-body" data-uie-value={state}>
        {state === APPLOCK_STATE.SETUP && (
          <form onSubmit={onSetCode}>
            <p
              className="modal__text"
              dangerouslySetInnerHTML={{__html: t('modalAppLockSetupMessage', undefined, {br: '<br><br>'})}}
              data-uie-name="label-applock-set-text"
            />

            <label
              className="modal__text modal__label"
              data-uie-name="label-applock-unlock-text"
              htmlFor="input-applock-set-a"
            >
              {t('modalAppLockPasscode')}
            </label>

            {/* eslint jsx-a11y/no-autofocus : "off" */}
            <input
              aria-label={t('modalAppLockSetupTitle')}
              autoFocus
              className="modal__input"
              type="password"
              value={setupPassphrase}
              onChange={event => setSetupPassphrase(event.target.value)}
              data-uie-status={isSetupPassphraseValid ? 'valid' : 'invalid'}
              data-uie-name="input-applock-set-a"
              autoComplete="new-password"
              id="input-applock-set-a"
            />

            <p
              className={cx('modal__passcode__info', {'modal__passcode__info--valid': isSetupPassphraseLength})}
              data-uie-status={isSetupPassphraseLength ? 'valid' : 'invalid'}
              data-uie-name="passcode-validation-charnumber"
            >
              {t('modalAppLockSetupLong', {
                minPasswordLength: Config.getConfig().NEW_PASSWORD_MINIMUM_LENGTH.toString(),
              })}
            </p>

            <p
              className={cx('modal__passcode__info', {'modal__passcode__info--valid': isSetupPassphraseLower})}
              data-uie-status={isSetupPassphraseLower ? 'valid' : 'invalid'}
              data-uie-name="passcode-validation-lowercase"
            >
              {t('modalAppLockSetupLower')}
            </p>

            <p
              className={cx('modal__passcode__info', {'modal__passcode__info--valid': isSetupPassphraseUpper})}
              data-uie-status={isSetupPassphraseUpper ? 'valid' : 'invalid'}
              data-uie-name="passcode-validation-uppercase"
            >
              {t('modalAppLockSetupUppercase')}
            </p>

            <p
              className={cx('modal__passcode__info', {'modal__passcode__info--valid': isSetupPassphraseDigit})}
              data-uie-status={isSetupPassphraseDigit ? 'valid' : 'invalid'}
              data-uie-name="passcode-validation-digit"
            >
              {t('modalAppLockSetupDigit')}
            </p>

            <p
              className={cx('modal__passcode__info', {'modal__passcode__info--valid': isSetupPassphraseSpecial})}
              data-uie-status={isSetupPassphraseSpecial ? 'valid' : 'invalid'}
              data-uie-name="passcode-validation-specialchar"
            >
              {t('modalAppLockSetupSpecial')}
            </p>

            <div className="modal__buttons">
              {!isAppLockEnforced && (
                <button
                  type="button"
                  className="modal__button modal__button--secondary"
                  data-uie-name="do-cancel-applock"
                  onClick={onCancelAppLock}
                >
                  {t('modalConfirmSecondary')}
                </button>
              )}

              <button
                type="submit"
                className="modal__button modal__button--primary modal__button--full"
                data-uie-name="do-action"
                disabled={!isSetupPassphraseValid}
              >
                {t('modalAppLockSetupAcceptButton')}
              </button>
            </div>
          </form>
        )}

        {state === APPLOCK_STATE.SETUP_CHANGE && (
          <form onSubmit={onSetCode}>
            <div
              className="modal__text"
              dangerouslySetInnerHTML={{
                __html: t(
                  'modalAppLockSetupChangeMessage',
                  {brandName: Config.getConfig().BRAND_NAME},
                  {br: '<br><br>'},
                ),
              }}
              data-uie-name="label-applock-set-text"
            />

            <div className="modal__text modal__label" data-uie-name="label-applock-unlock-text">
              {t('modalAppLockPasscode')}
            </div>

            <input
              aria-label={t('modalAppLockSetupChangeTitle', {brandName: Config.getConfig().BRAND_NAME})}
              autoFocus
              className="modal__input"
              type="password"
              value={setupPassphrase}
              onChange={event => setSetupPassphrase(event.target.value)}
              data-uie-status={isSetupPassphraseValid ? 'valid' : 'invalid'}
              data-uie-name="input-applock-set-a"
              autoComplete="new-password"
            />

            <p className={cx('modal__passcode__info', {'modal__passcode__info--valid': isSetupPassphraseLength})}>
              {t('modalAppLockSetupLong', {
                minPasswordLength: Config.getConfig().NEW_PASSWORD_MINIMUM_LENGTH.toString(),
              })}
            </p>

            <p className={cx('modal__passcode__info', {'modal__passcode__info--valid': isSetupPassphraseLower})}>
              {t('modalAppLockSetupLower')}
            </p>

            <p className={cx('modal__passcode__info', {'modal__passcode__info--valid': isSetupPassphraseUpper})}>
              {t('modalAppLockSetupUppercase')}
            </p>

            <p className={cx('modal__passcode__info', {'modal__passcode__info--valid': isSetupPassphraseDigit})}>
              {t('modalAppLockSetupDigit')}
            </p>

            <p className={cx('modal__passcode__info', {'modal__passcode__info--valid': isSetupPassphraseSpecial})}>
              {t('modalAppLockSetupSpecial')}
            </p>

            <div className="modal__buttons">
              <button
                type="submit"
                className="modal__button modal__button--primary modal__button--full"
                data-uie-name="do-action"
                disabled={!isSetupPassphraseValid}
              >
                {t('modalAppLockSetupAcceptButton')}
              </button>
            </div>
          </form>
        )}

        {state === APPLOCK_STATE.LOCKED && (
          <form onSubmit={onUnlock}>
            <div className="modal__text modal__label" data-uie-name="label-applock-unlock-text">
              {t('modalAppLockPasscode')}
            </div>

            <input
              aria-label={t('modalAppLockLockedTitle', {brandName: Config.getConfig().BRAND_NAME})}
              autoFocus
              className="modal__input"
              type="password"
              id={Math.random().toString()}
              name="password"
              onKeyDown={clearUnlockError}
              data-uie-name="input-applock-unlock"
              autoComplete="new-password"
            />

            <p className="modal__input__error" data-uie-name="label-applock-unlock-error">
              {unlockError}
            </p>

            <button
              type="button"
              className="button-reset-default block modal__cta"
              data-uie-name="go-forgot-passphrase"
              onClick={onClickForgot}
            >
              {t('modalAppLockLockedForgotCTA')}
            </button>

            <div className="modal__buttons">
              <button
                type="submit"
                className="modal__button modal__button--primary modal__button--full"
                data-uie-name="do-action"
              >
                {t('modalAppLockLockedUnlockButton')}
              </button>
            </div>
          </form>
        )}

        {state === APPLOCK_STATE.FORGOT && (
          <React.Fragment>
            <div className="modal__text" data-uie-name="label-applock-forgot-text">
              {t('modalAppLockForgotMessage')}
            </div>

            <button
              type="button"
              className="button-reset-default block modal__cta"
              onClick={onClickWipe}
              data-uie-name="go-wipe-database"
            >
              {t('modalAppLockForgotWipeCTA')}
            </button>

            <div className="modal__buttons">
              <button
                onClick={onGoBack}
                className="modal__button modal__button--secondary modal__button--full"
                data-uie-name="do-go-back"
              >
                {t('modalAppLockForgotGoBackButton')}
              </button>
            </div>
          </React.Fragment>
        )}

        {state === APPLOCK_STATE.WIPE_CONFIRM && (
          <React.Fragment>
            <div className="modal__text" data-uie-name="label-applock-wipe-confirm-text">
              {t('modalAppLockWipeConfirmMessage')}
            </div>

            <div className="modal__buttons">
              <button onClick={onGoBack} className="modal__button modal__button--secondary" data-uie-name="do-go-back">
                {t('modalAppLockWipeConfirmGoBackButton')}
              </button>

              <button
                onClick={onClickWipeConfirm}
                className="modal__button modal__button--primary modal__button--alert"
                data-uie-name="do-action"
              >
                {t('modalAppLockWipeConfirmConfirmButton')}
              </button>
            </div>
          </React.Fragment>
        )}

        {state === APPLOCK_STATE.WIPE_PASSWORD && (
          <form onSubmit={onWipeDatabase}>
            <input
              aria-label={t('modalAppLockWipePasswordTitle', {brandName: Config.getConfig().BRAND_NAME})}
              autoFocus
              className="modal__input"
              type="password"
              name="password"
              autoComplete="new-password"
              placeholder={t('modalAppLockWipePasswordPlaceholder')}
              onKeyDown={clearWipeError}
              data-uie-name="input-applock-wipe"
            />

            <p className="modal__input__error" style={{height: 20}} data-uie-name="label-applock-wipe-error">
              {wipeError}
            </p>

            <div className="modal__buttons">
              <button
                type="button"
                onClick={onGoBack}
                className="modal__button modal__button--secondary"
                data-uie-name="do-go-back"
              >
                {t('modalAppLockWipePasswordGoBackButton')}
              </button>

              <button
                type="submit"
                className="modal__button modal__button--primary modal__button--alert"
                data-uie-name="do-action"
              >
                {t('modalAppLockWipePasswordConfirmButton')}
              </button>
            </div>
          </form>
        )}
      </div>
    </ModalComponent>
  );
};

export {AppLock};
