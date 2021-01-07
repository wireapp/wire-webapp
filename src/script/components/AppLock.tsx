import React, {useState} from 'react';
import ReactDOM from 'react-dom';
import {ValidationUtil} from '@wireapp/commons';

import {t} from 'Util/LocalizerUtil';
import {ClientRepository} from '../client/ClientRepository';
import {Config} from '../Config';
import {User} from '../entity/User';
import ModalComponent from './ModalComponent';

export enum APPLOCK_STATE {
  FORGOT = 'applock.forgot',
  LOCKED = 'applock.locked',
  NONE = 'applock.none',
  SETUP = 'applock.setup',
  SETUP_CHANGE = 'applock.setup_change',
  WIPE_CONFIRM = 'applock.wipe-confirm',
  WIPE_PASSWORD = 'applock.wipe-password',
}

const passwordRegexLength = new RegExp(`^.{${Config.getConfig().NEW_PASSWORD_MINIMUM_LENGTH},}$`);
const passwordRegexLower = new RegExp(/(?=.*[a-z])/);
const passwordRegexUpper = new RegExp(/(?=.*[A-Z])/);
const passwordRegexDigit = new RegExp(/(?=.*[0-9])/);
const passwordRegexSpecial = new RegExp(/(?=.*[!@#$%^&*(),.?":{}|<>])/);
const passwordRegex = new RegExp(ValidationUtil.getNewPasswordPattern(Config.getConfig().NEW_PASSWORD_MINIMUM_LENGTH));

interface AppLockProps {
  clientRepository: ClientRepository;
  selfUser: User;
}

const AppLock: React.FC<AppLockProps> = ({children}) => {
  const [appLockState, setAppLockState] = useState<APPLOCK_STATE>(APPLOCK_STATE.NONE);
  const [wipeError, setWipeError] = useState<string>('');
  const [unlockError, setUnlockError] = useState<string>('');
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [setupPassphrase, setSetupPassphrase] = useState<string>('');

  const isSetupScreen = appLockState === APPLOCK_STATE.SETUP;
  const isLockScreen = appLockState === APPLOCK_STATE.LOCKED;
  const isForgotScreen = appLockState === APPLOCK_STATE.FORGOT;
  const isSetupChange = appLockState === APPLOCK_STATE.SETUP_CHANGE;
  const isWipeConfirmScreen = appLockState === APPLOCK_STATE.WIPE_CONFIRM;
  const isWipePasswordScreen = appLockState === APPLOCK_STATE.WIPE_PASSWORD;

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
        return t('modalAppLockSetupChangeTitle');
      case APPLOCK_STATE.SETUP:
        return t('modalAppLockSetupTitle');
      case APPLOCK_STATE.LOCKED:
        return t('modalAppLockLockedTitle');
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
      <div className="modal__body">
        {isSetupScreen && (
          <form data-bind="template: {afterRender: startObserver}">
            <div
              className="modal__text"
              dangerouslySetInnerHTML={{__html: t('modalAppLockSetupMessage', {}, {br: '<br>'})}}
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
              At least 8 charcters long
            </div>
            <div className={`modal__passcode__info ${isSetupPassphraseLower ? 'modal__passcode__info--valid' : ''}`}>
              A lowercase letter
            </div>
            <div className={`modal__passcode__info ${isSetupPassphraseUpper ? 'modal__passcode__info--valid' : ''}`}>
              An uppercase letter
            </div>
            <div className={`modal__passcode__info ${isSetupPassphraseDigit ? 'modal__passcode__info--valid' : ''}`}>
              A digit
            </div>
            <div className={`modal__passcode__info ${isSetupPassphraseSpecial ? 'modal__passcode__info--valid' : ''}`}>
              A special character
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

        {isLockScreen && (
          <form data-bind="submit: onUnlock, template: {afterRender: startObserver}">
            <div className="modal__text modal__label" data-uie-name="label-applock-unlock-text">
              {t('modalAppLockPasscode')}
            </div>
            <input
              className="modal__input"
              type="password"
              id={Math.random().toString()}
              name={Math.random().toString()}
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

        {isForgotScreen && (
          <div data-bind="template: {afterRender: startObserver}">
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
          </div>
        )}

        {isWipeConfirmScreen && (
          <div data-bind="template: {afterRender: startObserver}">
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
          </div>
        )}

        {isWipePasswordScreen && (
          <form data-bind="submit: onWipeDatabase, template: {afterRender: startObserver}">
            <input
              className="modal__input"
              type="password"
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
