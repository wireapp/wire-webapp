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

import React, {useRef, useState} from 'react';

import {BackendError, BackendErrorLabel} from '@wireapp/api-client/lib/http';
import {FormattedMessage} from 'react-intl';
import {connect} from 'react-redux';
import {AnyAction, Dispatch} from 'redux';

import {ValidationUtil} from '@wireapp/commons';
import {Button, Checkbox, CheckboxLabel, Form, Input, Text} from '@wireapp/react-ui-kit';

import {handleEnterDown} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';
import {getLogger} from 'Util/Logger';

import {styles} from './AccountForm.styles';
import {Exception} from './Exception';

import {Config} from '../../Config';
import {actionRoot as ROOT_ACTIONS} from '../module/action/';
import {ValidationError} from '../module/action/ValidationError';
import {RootState, bindActionCreators} from '../module/reducer';
import * as AuthSelector from '../module/selector/AuthSelector';
import * as AccentColor from '../util/AccentColor';
import {
  EventName,
  initializeTelemetry,
  isTelemetryEnabled,
  resetTelemetrySession,
  Segmentation,
  trackTelemetryEvent,
} from '../util/trackingUtil';

const logger = getLogger('AccountForm');

interface Props {
  beforeSubmit?: () => Promise<void>;
  onSubmit: () => void;
}

const AccountFormComponent = ({
  account,
  authError,
  doSendActivationCode,
  isFetching,
  onSubmit,
  pushAccountRegistrationData,
  beforeSubmit,
}: Props & ConnectedProps & DispatchProps) => {
  const [registrationData, setRegistrationData] = useState({
    accent_id: AccentColor.STRONG_BLUE.id,
    email: account.email || '',
    name: account.name,
    password: account.password,
    termsAccepted: account.termsAccepted,
    privacyPolicyAccepted: account.privacyPolicyAccepted,
    confirmPassword: account.password,
  });

  const [hasMultiplePasswordEntries, setHasMultiplePasswordEntries] = useState(false);

  const [validInputs, setValidInputs] = useState<Record<string, boolean>>({
    email: true,
    name: true,
    password: true,
    confirmPassword: true,
    privacyPolicy: true,
    terms: true,
  });

  const [validationErrors, setValidationErrors] = useState<Error[]>([]);

  const inputs = {
    email: useRef<HTMLInputElement | null>(null),
    name: useRef<HTMLInputElement | null>(null),
    password: useRef<HTMLInputElement | null>(null),
    confirmPassword: useRef<HTMLInputElement | null>(null),
    terms: useRef<HTMLInputElement | null>(null),
    privacyPolicy: useRef<HTMLInputElement | null>(null),
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors: Error[] | ValidationError[] = [];
    const newValidInputs: Record<string, boolean> = {};
    Object.entries(inputs).forEach(([inputKey, currentInput]) => {
      const currentInputNode = currentInput.current;
      if (currentInputNode) {
        if (!['password', 'terms', 'confirmPassword'].includes(inputKey)) {
          currentInputNode.value = currentInputNode.value.trim();
        }

        if (!currentInputNode.checkValidity()) {
          const validationError = ValidationError.handleValidationState(
            currentInputNode.name,
            currentInputNode.validity,
          );

          if (validationError) {
            errors.push(validationError);
            if (inputKey === 'password') {
              setHasMultiplePasswordEntries(true);
            }
          }
        }
        newValidInputs[inputKey] = currentInputNode.validity.valid;
      }
    });
    setValidInputs(newValidInputs);
    setValidationErrors(errors);

    try {
      if (errors.length > 0) {
        throw errors[0];
      }

      await (beforeSubmit && beforeSubmit());
      await pushAccountRegistrationData({...registrationData});
      await doSendActivationCode(registrationData.email);

      if (registrationData.privacyPolicyAccepted) {
        initializeTelemetry();
        trackTelemetryEvent(EventName.ACCOUNT_SETUP_SCREEN_1, {
          [Segmentation.MULTIPLE_PASSWORD_TRIES]: hasMultiplePasswordEntries,
        });
      } else {
        resetTelemetrySession();
      }

      return onSubmit();
    } catch (error) {
      const label = (error as BackendError)?.label;
      if (label) {
        switch (label) {
          case BackendErrorLabel.BLACKLISTED_EMAIL:
          case BackendErrorLabel.DOMAIN_BLOCKED_FOR_REGISTRATION:
          case BackendErrorLabel.INVALID_EMAIL:
          case BackendErrorLabel.KEY_EXISTS: {
            inputs.email.current?.setCustomValidity(label);
            setValidInputs({...validInputs, email: false});
            break;
          }
          case BackendErrorLabel.INVALID_CREDENTIALS:
          case BackendErrorLabel.UNAUTHORIZED: {
            inputs.email.current?.setCustomValidity(label);
            inputs.password.current?.setCustomValidity(label);
            setValidInputs({...validInputs, email: false, password: false});
            break;
          }
          default: {
            const isValidationError = Object.values(ValidationError.ERROR).some(errorType => label.endsWith(errorType));
            if (!isValidationError) {
              throw error;
            }
          }
        }
      } else {
        logger.error('Account registration error', error);
      }
    }
  };

  const isSubmitDisabled =
    !(
      registrationData.email &&
      registrationData.name &&
      registrationData.password &&
      registrationData.termsAccepted &&
      registrationData.confirmPassword
    ) || isFetching;

  return (
    <Form onSubmit={handleSubmit} css={styles.form}>
      <div css={styles.formBody}>
        <Input
          label={t('accountForm.nameLabel')}
          name="name"
          id="name"
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            inputs.name.current?.setCustomValidity('');
            setRegistrationData({...registrationData, name: event.target.value});
            setValidInputs({...validInputs, name: true});
          }}
          ref={inputs.name}
          markInvalid={!validInputs.name}
          value={registrationData.name}
          autoComplete="section-create-team username"
          placeholder={t('accountForm.namePlaceholder')}
          onKeyDown={event => handleEnterDown(event, () => inputs.email.current?.focus())}
          maxLength={64}
          minLength={2}
          pattern=".{2,64}"
          data-uie-name="enter-name"
        />

        <Input
          label={t('accountForm.emailLabel')}
          name="email"
          id="email"
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            inputs.email.current?.setCustomValidity('');
            setRegistrationData({...registrationData, email: event.target.value});
            setValidInputs({...validInputs, email: true});
          }}
          ref={inputs.email}
          markInvalid={!validInputs.email}
          value={registrationData.email}
          autoComplete="section-create-team email"
          placeholder={t('accountForm.emailPersonalPlaceholder')}
          onKeyDown={event => handleEnterDown(event, () => inputs.password.current?.focus())}
          maxLength={128}
          type="email"
          data-uie-name="enter-email"
        />

        <Input
          label={t('accountForm.passwordLabel')}
          name="password"
          id="password"
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            inputs.password.current?.setCustomValidity('');
            setRegistrationData({...registrationData, password: event.target.value});
            setValidInputs({...validInputs, password: true});
          }}
          ref={inputs.password}
          markInvalid={!validInputs.password}
          value={registrationData.password}
          autoComplete="section-create-team new-password"
          type="password"
          placeholder={t('accountForm.passwordPlaceholder')}
          pattern={ValidationUtil.getNewPasswordPattern(Config.getConfig().NEW_PASSWORD_MINIMUM_LENGTH)}
          data-uie-name="enter-password"
          showTogglePasswordLabel={t('showTogglePasswordLabel')}
          hideTogglePasswordLabel={t('hideTogglePasswordLabel')}
        />
        <Text muted css={styles.passwordInfo(!!validationErrors.length)} data-uie-name="element-password-help">
          {t('accountForm.passwordHelp', {minPasswordLength: String(Config.getConfig().NEW_PASSWORD_MINIMUM_LENGTH)})}
        </Text>

        <Input
          label={t('accountForm.passwordLabel')}
          name="confirmPassword"
          id="confirmPassword"
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            inputs.confirmPassword.current?.setCustomValidity('');
            setRegistrationData(prevState => ({...prevState, confirmPassword: event.target.value}));
            setValidInputs(prevState => ({...prevState, confirmPassword: true}));
          }}
          ref={inputs.confirmPassword}
          markInvalid={!validInputs.confirmPassword}
          value={registrationData.confirmPassword}
          type="password"
          placeholder={t('accountForm.confirmPasswordPlaceholder')}
          pattern={`^${registrationData.password?.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`}
          data-uie-name="enter-confirm-password"
          showTogglePasswordLabel={t('showTogglePasswordLabel')}
          hideTogglePasswordLabel={t('hideTogglePasswordLabel')}
        />

        <Exception errors={[authError, ...validationErrors]} />
      </div>

      <Checkbox
        ref={inputs.terms}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
          inputs.terms.current?.setCustomValidity('');
          setRegistrationData({...registrationData, termsAccepted: event.target.checked});
          setValidInputs({...validInputs, terms: true});
        }}
        markInvalid={!validInputs.terms}
        name="accept-terms"
        id="accept-terms"
        checked={registrationData.termsAccepted}
        data-uie-name="do-accept-terms"
        wrapperCSS={styles.checkbox}
      >
        <CheckboxLabel htmlFor="accept-terms" css={styles.checkboxLabel}>
          <FormattedMessage
            id="accountForm.termsAndConditions"
            values={{
              termsAndConditionsLink: (
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  data-uie-name="go-terms-and-conditions"
                  href={Config.getConfig().URL.TERMS_OF_USE_PERSONAL}
                  css={styles.checkboxLink}
                >
                  {t('accountForm.termsAndConditionsLink')}
                </a>
              ),
            }}
          />
        </CheckboxLabel>
      </Checkbox>

      {isTelemetryEnabled() && (
        <Checkbox
          wrapperCSS={styles.checkbox}
          ref={inputs.privacyPolicy}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            inputs.privacyPolicy.current?.setCustomValidity('');
            setRegistrationData({...registrationData, privacyPolicyAccepted: event.target.checked});
            setValidInputs({...validInputs, privacyPolicy: true});
          }}
          markInvalid={!validInputs.privacyPolicy}
          name="accept-privacy-policy"
          id="accept-privacy-policy"
          checked={registrationData.privacyPolicyAccepted}
          data-uie-name="do-accept-privacy-policy"
        >
          <CheckboxLabel htmlFor="accept-privacy-policy" css={styles.checkboxLabel}>
            <FormattedMessage
              id="accountForm.privacyPolicy"
              values={{
                privacyPolicyLink: (
                  <a
                    target="_blank"
                    rel="noopener noreferrer"
                    data-uie-name="go-privacy-policy"
                    href={Config.getConfig().URL.PRIVACY_POLICY}
                    css={styles.checkboxLink}
                  >
                    {t('accountForm.privacyPolicyLink')}
                  </a>
                ),
              }}
            />
          </CheckboxLabel>
        </Checkbox>
      )}

      <Button
        disabled={isSubmitDisabled}
        formNoValidate
        type="submit"
        css={styles.submitButton}
        data-uie-name="do-next"
      >
        {t('accountForm.continueButtonText')}
      </Button>
    </Form>
  );
};

type ConnectedProps = ReturnType<typeof mapStateToProps>;
const mapStateToProps = (state: RootState) => ({
  account: AuthSelector.getAccount(state),
  authError: AuthSelector.getError(state),
  isFetching: AuthSelector.isFetching(state),
});

type DispatchProps = ReturnType<typeof mapDispatchToProps>;
const mapDispatchToProps = (dispatch: Dispatch<AnyAction>) =>
  bindActionCreators(
    {
      doSendActivationCode: ROOT_ACTIONS.userAction.doSendActivationCode,
      pushAccountRegistrationData: ROOT_ACTIONS.authAction.pushAccountRegistrationData,
    },
    dispatch,
  );

const AccountForm = connect(mapStateToProps, mapDispatchToProps)(AccountFormComponent);

export {AccountForm};
