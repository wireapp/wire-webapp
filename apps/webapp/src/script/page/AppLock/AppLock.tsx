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

import {useCallback, useEffect, useRef, useState, Fragment, FormEvent} from 'react';

import {amplify} from 'amplify';
import cx from 'classnames';
import {container} from 'tsyringe';

import {ValidationUtil} from '@wireapp/commons';
import {Button, ButtonVariant, Checkbox, CheckboxLabel, Input, Link, LinkVariant} from '@wireapp/react-ui-kit';
import {WebAppEvents} from '@wireapp/webapp-events';

import * as Icon from 'Components/Icon';
import {ModalComponent} from 'Components/Modals/ModalComponent';
import {ClientRepository} from 'Repositories/client';
import {ClientState} from 'Repositories/client/ClientState';
import {AppLockRepository} from 'Repositories/user/AppLockRepository';
import {AppLockState} from 'Repositories/user/AppLockState';
import {SIGN_OUT_REASON} from 'src/script/auth/SignOutReason';
import {Config} from 'src/script/Config';
import {useKoSubscribableChildren} from 'Util/componentUtil';
import {t} from 'Util/localizerUtil';

import {applockStyles} from './Applock.styles';

export enum APPLOCK_STATE {
  FORGOT = 'applock.forgot',
  LOCKED = 'applock.locked',
  LOGOUT = 'applock.logout',
  NONE = 'applock.none',
  SETUP = 'applock.setup',
  SETUP_CHANGE = 'applock.setup_change',
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
  const [localAppState, setLocalAppState] = useState<APPLOCK_STATE>(APPLOCK_STATE.NONE);
  const [unlockError, setUnlockError] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [setupPassphrase, setSetupPassphrase] = useState('');
  const [clearData, setClearData] = useState(false);
  const [inactivityTimeoutId, setInactivityTimeoutId] = useState<number>();
  const [scheduledTimeoutId, setScheduledTimeoutId] = useState<number>();
  const {isAppLockActivated, isAppLockEnabled, isAppLockEnforced} = useKoSubscribableChildren(appLockState, [
    'isAppLockActivated',
    'isAppLockEnabled',
    'isAppLockEnforced',
  ]);

  const isTemporaryClient = clientState.currentClient?.isTemporary();

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
  }, [localAppState, isVisible]);

  const showAppLock = () => {
    setLocalAppState(appLockState.hasPassphrase() ? APPLOCK_STATE.LOCKED : APPLOCK_STATE.SETUP);
    setIsVisible(true);
  };

  const onUnlock = async (event: FormEvent) => {
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

  const onSetCode = async (event: FormEvent) => {
    event.preventDefault();
    await appLockRepository.setCode(setupPassphrase);
    setIsVisible(false);
    startScheduledTimeout();
  };

  const onLogout = (clearData: boolean) => {
    appLockRepository.removeCode();
    amplify.publish(WebAppEvents.LIFECYCLE.SIGN_OUT, SIGN_OUT_REASON.USER_REQUESTED, clearData);
  };

  const changePassphrase = () => {
    setLocalAppState(APPLOCK_STATE.SETUP);
    setIsVisible(true);
  };

  const isSetupPassphraseValid = passwordRegex.test(setupPassphrase);
  const isSetupPassphraseLower = passwordRegexLower.test(setupPassphrase);
  const isSetupPassphraseUpper = passwordRegexUpper.test(setupPassphrase);
  const isSetupPassphraseDigit = passwordRegexDigit.test(setupPassphrase);
  const isSetupPassphraseLength = passwordRegexLength.test(setupPassphrase);
  const isSetupPassphraseSpecial = passwordRegexSpecial.test(setupPassphrase);

  const clearUnlockError = () => setUnlockError('');
  const onGoBack = () => setLocalAppState(APPLOCK_STATE.LOCKED);
  const onClickForgot = () => setLocalAppState(APPLOCK_STATE.FORGOT);
  const onClickLogout = async () => {
    if (isTemporaryClient) {
      await clientRepository.logoutClient();
    } else {
      setLocalAppState(APPLOCK_STATE.LOGOUT);
    }
  };
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
      case APPLOCK_STATE.LOGOUT:
        return t('modalAccountLogoutHeadline');
      case APPLOCK_STATE.FORGOT:
        return t('modalAppLockForgotTitle');
      default:
        return '';
    }
  };

  const ErrorMessage = () => (
    <p className="modal__input__error" data-uie-name="label-applock-unlock-error">
      {unlockError}
    </p>
  );

  return (
    <ModalComponent isShown={isVisible} onClosed={onClosed} data-uie-name="applock-modal">
      <div className="modal__header" css={applockStyles.headerStyle}>
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

      <div className="modal__body" data-uie-name="applock-modal-body" data-uie-value={localAppState}>
        {localAppState === APPLOCK_STATE.SETUP && (
          <form onSubmit={onSetCode}>
            <p
              className="modal__text"
              dangerouslySetInnerHTML={{__html: t('modalAppLockSetupMessage', undefined, {br: '<br><br>'})}}
              data-uie-name="label-applock-set-text"
            />

            {/* eslint jsx-a11y/no-autofocus : "off" */}
            <Input
              aria-label={t('modalAppLockSetupTitle')}
              autoFocus
              className="modal__input"
              label={t('modalAppLockPasscode')}
              type="password"
              placeholder={t('modalAppLockInputPlaceholder')}
              value={setupPassphrase}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => setSetupPassphrase(event.target.value)}
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

            <div css={applockStyles.buttonGroupStyle}>
              {!isAppLockEnforced && (
                <Button
                  css={applockStyles.buttonStyle}
                  variant={ButtonVariant.SECONDARY}
                  type="button"
                  data-uie-name="do-cancel-applock"
                  onClick={onCancelAppLock}
                >
                  {t('modalConfirmSecondary')}
                </Button>
              )}

              <Button
                css={!isAppLockEnforced ? applockStyles.buttonStyle : undefined}
                block={isAppLockEnforced}
                type="submit"
                data-uie-name="do-action"
                disabled={!isSetupPassphraseValid}
              >
                {t('modalAppLockSetupAcceptButton')}
              </Button>
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

            <Input
              aria-label={t('modalAppLockSetupChangeTitle', {brandName: Config.getConfig().BRAND_NAME})}
              autoFocus
              className="modal__input"
              label={t('modalAppLockPasscode')}
              type="password"
              placeholder={t('modalAppLockInputPlaceholder')}
              value={setupPassphrase}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => setSetupPassphrase(event.target.value)}
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
              <Button block type="submit" data-uie-name="do-action" disabled={!isSetupPassphraseValid}>
                {t('modalAppLockSetupAcceptButton')}
              </Button>
            </div>
          </form>
        )}

        {state === APPLOCK_STATE.LOCKED && (
          <form onSubmit={onUnlock}>
            <label htmlFor="input-applock-unlock" data-uie-name="label-applock-unlock-text">
              {t('modalAppLockPasscode')}
            </label>
            <Input
              aria-label={t('modalAppLockLockedTitle', {brandName: Config.getConfig().BRAND_NAME})}
              autoFocus
              type="password"
              placeholder={t('modalAppLockInputPlaceholder')}
              id="input-applock-unlock"
              name="password"
              onKeyDown={clearUnlockError}
              data-uie-name="input-applock-unlock"
              autoComplete="current-password"
              error={ErrorMessage()}
            />

            <Button block type="submit" data-uie-name="do-action" css={applockStyles.unlockButtonStyle}>
              {t('modalAppLockLockedUnlockButton')}
            </Button>

            <Link
              variant={LinkVariant.PRIMARY}
              type="button"
              css={applockStyles.linkStyle}
              className="button-reset-default block modal__cta"
              data-uie-name="go-forgot-passphrase"
              onClick={onClickForgot}
            >
              {t('modalAppLockLockedForgotCTA')}
            </Link>
          </form>
        )}

        {state === APPLOCK_STATE.FORGOT && (
          <Fragment>
            <p>{t('modalAppLockForgotMessage')}</p>
            <br />
            <p>{t('modalAppLockForgotSecondMessage')}</p>
            <div css={applockStyles.buttonGroupStyle}>
              <Button
                css={applockStyles.buttonStyle}
                variant={ButtonVariant.SECONDARY}
                onClick={onGoBack}
                data-uie-name="do-go-back"
              >
                {t('modalAppLockForgotGoBackButton')}
              </Button>
              <Button css={applockStyles.buttonStyle} onClick={onClickLogout} data-uie-name="go-wipe-database">
                {t('modalAccountLogoutAction')}
              </Button>
            </div>
          </Fragment>
        )}

        {localAppState === APPLOCK_STATE.LOGOUT && (
          <Fragment>
            <Checkbox
              checked={clearData}
              data-uie-name="modal-option-checkbox"
              id="clear-data-checkbox"
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                const value = event.target.checked;
                setClearData(value);
              }}
            >
              <CheckboxLabel className="label-xs" htmlFor="clear-data-checkbox">
                {t('modalAccountLogoutOption')}
              </CheckboxLabel>
            </Checkbox>

            <div css={applockStyles.buttonGroupStyle}>
              <Button
                css={applockStyles.buttonStyle}
                variant={ButtonVariant.SECONDARY}
                onClick={onGoBack}
                data-uie-name="do-go-back"
              >
                {t('modalAppLockLogoutCancelButton')}
              </Button>

              <Button css={applockStyles.buttonStyle} onClick={() => onLogout(clearData)} data-uie-name="do-action">
                {t('modalAccountLogoutAction')}
              </Button>
            </div>
          </Fragment>
        )}
      </div>
    </ModalComponent>
  );
};

export {AppLock};
