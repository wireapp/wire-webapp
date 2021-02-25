import React, {useState, useEffect, useRef, useCallback} from 'react';
import ReactDOM from 'react-dom';
import {ValidationUtil} from '@wireapp/commons';
import {UrlUtil} from '@wireapp/commons';
import {WebAppEvents} from '@wireapp/webapp-events';
import {container} from 'tsyringe';
import sodium from 'libsodium-wrappers-sumo';
import {amplify} from 'amplify';
import {StatusCodes as HTTP_STATUS} from 'http-status-codes';

import {t} from 'Util/LocalizerUtil';

import {ClientRepository} from '../client/ClientRepository';
import {Config} from '../Config';
import {User} from '../entity/User';
import {QUERY_KEY} from '../auth/route';
import ModalComponent from 'Components/ModalComponent';
import {TeamState} from '../team/TeamState';
import {SIGN_OUT_REASON} from '../auth/SignOutReason';
import {ClientState} from '../client/ClientState';

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

export interface AppLockProps {
  clientRepository: ClientRepository;
  clientState?: ClientState;
  selfUser: User;
  teamState?: TeamState;
}

const APP_LOCK_STORAGE = 'app_lock';
const getStorageKey = (userId: string) => `${APP_LOCK_STORAGE}_${userId}`;
const getStored = (userId: string) => window.localStorage.getItem(getStorageKey(userId));
export const hasPassphrase = (userId: string) => !!getStored(userId);

const AppLock: React.FC<AppLockProps> = ({
  clientRepository,
  selfUser,
  teamState = container.resolve(TeamState),
  clientState = container.resolve(ClientState),
}) => {
  const [appLockState, setAppLockState] = useState<APPLOCK_STATE>(APPLOCK_STATE.NONE);
  const [wipeError, setWipeError] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [setupPassphrase, setSetupPassphrase] = useState('');
  const [inactivityTimeoutId, setInactivityTimeoutId] = useState<number>();
  const [scheduledTimeoutId, setScheduledTimeoutId] = useState<number>();

  const {current: appObserver} = useRef(
    new MutationObserver(mutationRecords => {
      const [{attributeName}] = mutationRecords;
      if (attributeName === 'style') {
        amplify.publish(WebAppEvents.LIFECYCLE.SIGN_OUT, SIGN_OUT_REASON.USER_REQUESTED);
      }
    }),
  );

  const {current: modalObserver} = useRef(
    new MutationObserver(() => {
      const modalInDOM = document.querySelector('[data-uie-name="applock-modal"]');
      if (!modalInDOM) {
        amplify.publish(WebAppEvents.LIFECYCLE.SIGN_OUT, SIGN_OUT_REASON.USER_REQUESTED);
      }
    }),
  );

  const getInactivityAppLockTimeoutInSeconds = () => {
    const queryTimeout = parseInt(UrlUtil.getURLParameter(QUERY_KEY.APPLOCK_INACTIVITY_TIMEOUT), 10);
    const backendTimeout = teamState.isAppLockEnabled() && teamState.appLockInactivityTimeoutSecs();

    if (Number.isFinite(queryTimeout)) {
      return queryTimeout;
    }
    if (Number.isFinite(backendTimeout)) {
      return backendTimeout;
    }
    return DEFAULT_INACTIVITY_APP_LOCK_TIMEOUT_IN_SEC;
  };

  const getScheduledAppLockTimeoutInSeconds = () => {
    const queryTimeout = parseInt(UrlUtil.getURLParameter(QUERY_KEY.APPLOCK_SCHEDULED_TIMEOUT), 10);
    const configTimeout = Config.getConfig().FEATURE?.APPLOCK_SCHEDULED_TIMEOUT;

    if (Number.isFinite(queryTimeout)) {
      return queryTimeout;
    }
    if (Number.isFinite(configTimeout)) {
      return configTimeout;
    }
    return null;
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
    if (teamState.isAppLockEnabled()) {
      if (teamState.isAppLockEnforced() || hasPassphrase(selfUser.id)) {
        showAppLock();
      }
      startPassphraseObserver();
    }
    amplify.subscribe(WebAppEvents.PREFERENCES.CHANGE_APP_LOCK_PASSPHRASE, changePassphrase);
  }, []);

  useEffect(() => {
    if (teamState.isAppLockEnabled() && hasPassphrase(selfUser.id)) {
      window.addEventListener('blur', startAppLockTimeout);
      return () => window.removeEventListener('blur', startAppLockTimeout);
    }
    return undefined;
  }, [startAppLockTimeout]);

  useEffect(() => {
    if (teamState.isAppLockEnabled() && hasPassphrase(selfUser.id)) {
      window.addEventListener('focus', clearAppLockTimeout);
      return () => window.removeEventListener('focus', clearAppLockTimeout);
    }
    return undefined;
  }, [clearAppLockTimeout]);

  useEffect(() => {
    const app = window.document.querySelector<HTMLDivElement>('#app');
    app?.style.setProperty('filter', isVisible ? 'blur(100px)' : '', 'important');

    if (isVisible) {
      modalObserver.observe(document.querySelector('#wire-main'), {
        childList: true,
        subtree: true,
      });
      appObserver.observe(document.querySelector('#app'), {attributes: true});
    }
    return () => {
      modalObserver.disconnect();
      appObserver.disconnect();
    };
  }, [appLockState, isVisible]);

  const showAppLock = () => {
    setAppLockState(hasPassphrase(selfUser.id) ? APPLOCK_STATE.LOCKED : APPLOCK_STATE.SETUP);
    setIsVisible(true);
  };

  const handlePassphraseStorageEvent = ({key, oldValue}: StorageEvent) => {
    const storageKey = getStorageKey(selfUser.id);
    if (key === storageKey) {
      window.localStorage.setItem(storageKey, oldValue);
    }
  };

  const startPassphraseObserver = () => window.addEventListener('storage', handlePassphraseStorageEvent);

  const stopPassphraseObserver = () => window.removeEventListener('storage', handlePassphraseStorageEvent);

  const setCode = async (code: string) => {
    stopPassphraseObserver();
    await sodium.ready;
    const hashed = sodium.crypto_pwhash_str(
      code,
      sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
      sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
    );
    window.localStorage.setItem(getStorageKey(selfUser.id), hashed);
    startPassphraseObserver();
  };

  const onUnlock = async (event: React.FormEvent) => {
    event.preventDefault();
    const target = event.target as HTMLFormElement & {password: HTMLInputElement};
    const hashedCode = getStored(selfUser.id);
    await sodium.ready;
    if (sodium.crypto_pwhash_str_verify(hashedCode, target.password.value)) {
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
    await setCode(setupPassphrase);
    setIsVisible(false);
    startScheduledTimeout();
  };

  const onWipeDatabase = async (event: React.FormEvent) => {
    const target = event.target as HTMLFormElement & {password: HTMLInputElement};
    try {
      setIsLoading(true);
      const currentClientId = clientState.currentClient().id;
      await clientRepository.clientService.deleteClient(currentClientId, target.password.value);
      stopPassphraseObserver();
      window.localStorage.removeItem(getStorageKey(selfUser.id));
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
    setAppLockState(APPLOCK_STATE.SETUP);
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
  const onGoBack = () => setAppLockState(APPLOCK_STATE.LOCKED);
  const onClickForgot = () => setAppLockState(APPLOCK_STATE.FORGOT);
  const onClickWipe = () => setAppLockState(APPLOCK_STATE.WIPE_CONFIRM);
  const onClickWipeConfirm = () => setAppLockState(APPLOCK_STATE.WIPE_PASSWORD);
  const onClosed = () => {
    setAppLockState(APPLOCK_STATE.NONE);
    setSetupPassphrase('');
  };

  const headerText = () => {
    switch (appLockState) {
      case APPLOCK_STATE.SETUP_CHANGE:
        return t('modalAppLockSetupChangeTitle', Config.getConfig().BRAND_NAME);
      case APPLOCK_STATE.SETUP:
        return t('modalAppLockSetupTitle');
      case APPLOCK_STATE.LOCKED:
        return t('modalAppLockLockedTitle', Config.getConfig().BRAND_NAME);
      case APPLOCK_STATE.FORGOT:
        return t('modalAppLockForgotTitle');
      case APPLOCK_STATE.WIPE_CONFIRM:
        return t('modalAppLockWipeConfirmTitle');
      case APPLOCK_STATE.WIPE_PASSWORD:
        return t('modalAppLockWipePasswordTitle', Config.getConfig().BRAND_NAME);
      default:
        return '';
    }
  };

  return (
    <ModalComponent isShown={isVisible} showLoading={isLoading} onClosed={onClosed} data-uie-name="applock-modal">
      <div className="modal__header">
        <div className="modal__header__title" data-uie-name="applock-modal-header">
          {headerText()}
        </div>
      </div>
      <div className="modal__body" data-uie-name="applock-modal-body" data-uie-value={appLockState}>
        {appLockState === APPLOCK_STATE.SETUP && (
          <form onSubmit={onSetCode}>
            <div
              className="modal__text"
              dangerouslySetInnerHTML={{__html: t('modalAppLockSetupMessage', {}, {br: '<br><br>'})}}
              data-uie-name="label-applock-set-text"
            ></div>
            <div className="modal__text modal__label" data-uie-name="label-applock-unlock-text">
              {t('modalAppLockPasscode')}
            </div>
            <input
              className="modal__input"
              type="password"
              value={setupPassphrase}
              onChange={event => setSetupPassphrase(event.target.value)}
              data-uie-status={isSetupPassphraseValid ? 'valid' : 'invalid'}
              data-uie-name="input-applock-set-a"
              autoComplete="new-password"
            />
            <div className={`modal__passcode__info ${isSetupPassphraseLength ? 'modal__passcode__info--valid' : ''}`}>
              {t('modalAppLockSetupLong', {
                minPasswordLength: Config.getConfig().NEW_PASSWORD_MINIMUM_LENGTH.toString(),
              })}
            </div>
            <div className={`modal__passcode__info ${isSetupPassphraseLower ? 'modal__passcode__info--valid' : ''}`}>
              {t('modalAppLockSetupLower')}
            </div>
            <div className={`modal__passcode__info ${isSetupPassphraseUpper ? 'modal__passcode__info--valid' : ''}`}>
              {t('modalAppLockSetupUppercase')}
            </div>
            <div className={`modal__passcode__info ${isSetupPassphraseDigit ? 'modal__passcode__info--valid' : ''}`}>
              {t('modalAppLockSetupDigit')}
            </div>
            <div className={`modal__passcode__info ${isSetupPassphraseSpecial ? 'modal__passcode__info--valid' : ''}`}>
              {t('modalAppLockSetupSpecial')}
            </div>
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
        {appLockState === APPLOCK_STATE.SETUP_CHANGE && (
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
            ></div>
            <div className="modal__text modal__label" data-uie-name="label-applock-unlock-text">
              {t('modalAppLockPasscode')}
            </div>
            <input
              className="modal__input"
              type="password"
              value={setupPassphrase}
              onChange={event => setSetupPassphrase(event.target.value)}
              data-uie-status={isSetupPassphraseValid ? 'valid' : 'invalid'}
              data-uie-name="input-applock-set-a"
              autoComplete="new-password"
            />
            <div className={`modal__passcode__info ${isSetupPassphraseLength ? 'modal__passcode__info--valid' : ''}`}>
              {t('modalAppLockSetupLong', {
                minPasswordLength: Config.getConfig().NEW_PASSWORD_MINIMUM_LENGTH.toString(),
              })}
            </div>
            <div className={`modal__passcode__info ${isSetupPassphraseLower ? 'modal__passcode__info--valid' : ''}`}>
              {t('modalAppLockSetupLower')}
            </div>
            <div className={`modal__passcode__info ${isSetupPassphraseUpper ? 'modal__passcode__info--valid' : ''}`}>
              {t('modalAppLockSetupUppercase')}
            </div>
            <div className={`modal__passcode__info ${isSetupPassphraseDigit ? 'modal__passcode__info--valid' : ''}`}>
              {t('modalAppLockSetupDigit')}
            </div>
            <div className={`modal__passcode__info ${isSetupPassphraseSpecial ? 'modal__passcode__info--valid' : ''}`}>
              {t('modalAppLockSetupSpecial')}
            </div>
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

        {appLockState === APPLOCK_STATE.LOCKED && (
          <form onSubmit={onUnlock}>
            <div className="modal__text modal__label" data-uie-name="label-applock-unlock-text">
              {t('modalAppLockPasscode')}
            </div>
            <input
              className="modal__input"
              type="password"
              id={Math.random().toString()}
              name="password"
              onKeyDown={clearUnlockError}
              data-uie-name="input-applock-unlock"
              autoComplete="new-password"
            />
            <div className="modal__input__error" data-uie-name="label-applock-unlock-error">
              {unlockError}
            </div>

            <div className="modal__cta" data-uie-name="go-forgot-passphrase" onClick={onClickForgot}>
              {t('modalAppLockLockedForgotCTA')}
            </div>

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

        {appLockState === APPLOCK_STATE.FORGOT && (
          <React.Fragment>
            <div className="modal__text" data-uie-name="label-applock-forgot-text">
              {t('modalAppLockForgotMessage')}
            </div>
            <div className="modal__cta" onClick={onClickWipe} data-uie-name="go-wipe-database">
              {t('modalAppLockForgotWipeCTA')}
            </div>
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

        {appLockState === APPLOCK_STATE.WIPE_CONFIRM && (
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

        {appLockState === APPLOCK_STATE.WIPE_PASSWORD && (
          <form onSubmit={onWipeDatabase}>
            <input
              className="modal__input"
              type="password"
              name="password"
              autoComplete="new-password"
              placeholder={t('modalAppLockWipePasswordPlaceholder')}
              onKeyDown={clearWipeError}
              data-uie-name="input-applock-wipe"
            />
            <div className="modal__input__error" style={{height: 20}} data-uie-name="label-applock-wipe-error">
              {wipeError}
            </div>
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

export default {
  AppLock,
  init: (clientRepository: ClientRepository, selfUser: User) => {
    ReactDOM.render(
      <AppLock clientRepository={clientRepository} selfUser={selfUser} />,
      document.getElementById('applock'),
    );
  },
};
