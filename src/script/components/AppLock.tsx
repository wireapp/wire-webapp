import React from 'react';
import ReactDOM from 'react-dom';
import {ClientRepository} from '../client/ClientRepository';
import {User} from '../entity/User';
import ModalComponent from './ModalComponent';

interface AppLockProps {
  clientRepository: ClientRepository;
  selfUser: User;
}

const AppLock: React.FC<AppLockProps> = ({children}) => {
  return (
    <ModalComponent
      // params="isShown: isVisible(), onClosed: onClosed, showLoading: isLoading()"
      isShown={true}
      showLoading={false}
      data-uie-name="applock-modal"
    >
      <div className="modal__header">
        <div className="modal__header__title" data-bind="text: headerText()" data-uie-name="applock-modal-header"></div>
      </div>
      <div className="modal__body">
        {/* <!-- ko if: isSetupScreen() --> */}
        <form data-bind="submit: onSetCode, template: {afterRender: startObserver}">
          <div
            className="modal__text"
            data-bind="html: t('modalAppLockSetupMessage', {}, {br: '<br>'})"
            data-uie-name="label-applock-set-text"
          ></div>
          <div
            className="modal__text modal__label"
            data-bind="text: t('modalAppLockPasscode')"
            data-uie-name="label-applock-unlock-text"
          ></div>
          <input
            className="modal__input"
            type="password"
            data-bind="textInput: setupPassphrase, attr: {'data-uie-status': isSetupPassphraseValid() ? 'valid' : 'invalid'}"
            data-uie-name="input-applock-set-a"
            autoComplete="new-password"
          />
          <div
            className="modal__passcode__info"
            data-bind="css:{'modal__passcode__info--valid': isSetupPassphraseLength()}"
          >
            At least 8 charcters long
          </div>
          <div
            className="modal__passcode__info"
            data-bind="css:{'modal__passcode__info--valid': isSetupPassphraseLower()}"
          >
            A lowercase letter
          </div>
          <div
            className="modal__passcode__info"
            data-bind="css:{'modal__passcode__info--valid': isSetupPassphraseUpper()}"
          >
            An uppercase letter
          </div>
          <div
            className="modal__passcode__info"
            data-bind="css:{'modal__passcode__info--valid': isSetupPassphraseDigit()}"
          >
            A digit
          </div>
          <div
            className="modal__passcode__info"
            data-bind="css:{'modal__passcode__info--valid': isSetupPassphraseSpecial()}"
          >
            A special character
          </div>
          <div className="modal__buttons">
            <button
              type="submit"
              data-bind="enable: isSetupPassphraseValid(), text: t('modalAppLockSetupAcceptButton')"
              className="modal__button modal__button--primary modal__button--full"
              data-uie-name="do-action"
            ></button>
          </div>
        </form>
        {/* <!-- /ko --> */}

        {/* <!-- ko if: isLockScreen() --> */}
        <form data-bind="submit: onUnlock, template: {afterRender: startObserver}">
          <div
            className="modal__text modal__label"
            data-bind="text: t('modalAppLockPasscode')"
            data-uie-name="label-applock-unlock-text"
          ></div>
          <input
            className="modal__input"
            type="password"
            data-bind="event: {'keydown': clearUnlockError}, attr: {id: Math.random().toString(), name:Math.random().toString()}"
            data-uie-name="input-applock-unlock"
            autoComplete="new-password"
          />
          <div
            className="modal__input__error"
            data-bind="text: unlockError()"
            data-uie-name="label-applock-unlock-error"
          ></div>

          <div
            className="modal__cta"
            data-bind="click: onClickForgot, text: t('modalAppLockLockedForgotCTA')"
            data-uie-name="go-forgot-passphrase"
          ></div>

          <div className="modal__buttons">
            <button
              type="submit"
              className="modal__button modal__button--primary modal__button--full"
              data-uie-name="do-action"
              data-bind="text: t('modalAppLockLockedUnlockButton')"
            ></button>
          </div>
        </form>
        {/* <!-- /ko --> */}

        {/* <!-- ko if: isForgotScreen() --> */}
        <div data-bind="template: {afterRender: startObserver}">
          <div
            className="modal__text"
            data-bind="text: t('modalAppLockForgotMessage')"
            data-uie-name="label-applock-forgot-text"
          ></div>
          <div
            className="modal__cta"
            data-bind="click: onClickWipe, text: t('modalAppLockForgotWipeCTA')"
            data-uie-name="go-wipe-database"
          ></div>
          <div className="modal__buttons">
            <button
              data-bind="click: onGoBack, text: t('modalAppLockForgotGoBackButton')"
              className="modal__button modal__button--secondary modal__button--full"
              data-uie-name="do-go-back"
            ></button>
          </div>
        </div>
        {/* <!-- /ko --> */}

        {/* <!-- ko if: isWipeConfirmScreen() --> */}
        <div data-bind="template: {afterRender: startObserver}">
          <div
            className="modal__text"
            data-bind="text: t('modalAppLockWipeConfirmMessage')"
            data-uie-name="label-applock-wipe-confirm-text"
          ></div>
          <div className="modal__buttons">
            <button
              data-bind="click: onGoBack, text: t('modalAppLockWipeConfirmGoBackButton')"
              className="modal__button modal__button--secondary"
              data-uie-name="do-go-back"
            ></button>
            <button
              data-bind="click: onClickWipeConfirm, text: t('modalAppLockWipeConfirmConfirmButton')"
              className="modal__button modal__button--primary modal__button--alert"
              data-uie-name="do-action"
            ></button>
          </div>
        </div>
        {/* <!-- /ko --> */}

        {/* <!-- ko if: isWipePasswordScreen() --> */}
        <form data-bind="submit: onWipeDatabase, template: {afterRender: startObserver}">
          <input
            className="modal__input"
            type="password"
            autoComplete="new-password"
            data-bind="event: {'keydown': clearWipeError}, attr: {placeholder: t('modalAppLockWipePasswordPlaceholder')}"
            data-uie-name="input-applock-wipe"
          />
          <div
            className="modal__input__error"
            style={{height: 20}}
            data-bind="text: wipeError()"
            data-uie-name="label-applock-wipe-error"
          ></div>
          <div className="modal__buttons">
            <button
              type="button"
              data-bind="click: onGoBack, text: t('modalAppLockWipePasswordGoBackButton')"
              className="modal__button modal__button--secondary"
              data-uie-name="do-go-back"
            ></button>
            <button
              type="submit"
              className="modal__button modal__button--primary modal__button--alert"
              data-uie-name="do-action"
              data-bind="text: t('modalAppLockWipePasswordConfirmButton')"
            ></button>
          </div>
        </form>
        {/* <!-- /ko --> */}
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
