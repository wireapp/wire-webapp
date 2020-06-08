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

import {ValidationUtil} from '@wireapp/commons';
import {Button, Checkbox, CheckboxLabel, Form, Input, InputBlock, Small} from '@wireapp/react-ui-kit';
import React from 'react';
import {FormattedMessage, useIntl} from 'react-intl';
import {connect} from 'react-redux';
import {AnyAction, Dispatch} from 'redux';
import {Config} from '../../Config';
import {accountFormStrings} from '../../strings';
import {actionRoot as ROOT_ACTIONS} from '../module/action/';
import {BackendError} from '../module/action/BackendError';
import {ValidationError} from '../module/action/ValidationError';
import {RootState, bindActionCreators} from '../module/reducer';
import * as AuthSelector from '../module/selector/AuthSelector';
import * as AccentColor from '../util/AccentColor';
import Exception from './Exception';

interface Props extends React.HTMLProps<HTMLFormElement> {
  beforeSubmit?: () => Promise<void>;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  submitText?: string;
}

const AccountForm = ({account, ...props}: Props & ConnectedProps & DispatchProps) => {
  const {formatMessage: _} = useIntl();
  const [registrationData, setRegistrationData] = React.useState({
    accent_id: AccentColor.random().id,
    email: account.email || '',
    name: account.name || '',
    password: account.password || '',
    termsAccepted: account.termsAccepted || false,
  });

  const [validInputs, setValidInputs] = React.useState<Record<string, boolean>>({
    email: true,
    name: true,
    password: true,
    terms: true,
  });

  const [validationErrors, setValidationErrors] = React.useState([]);

  const inputs = {
    email: React.useRef<HTMLInputElement>(),
    name: React.useRef<HTMLInputElement>(),
    password: React.useRef<HTMLInputElement>(),
    terms: React.useRef<HTMLInputElement>(),
  };

  React.useEffect(() => {
    setRegistrationData({
      ...registrationData,
      email: account.email,
    });
  }, [account.email]);

  React.useEffect(() => {
    setRegistrationData({
      ...registrationData,
      name: account.name,
    });
  }, [account.name]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors: Error[] = [];
    const newValidInputs: Record<string, boolean> = {};

    Object.entries(inputs).forEach(([inputKey, currentInput]) => {
      const currentInputNode = currentInput.current;
      if (!['password', 'terms'].includes(inputKey)) {
        currentInputNode.value = currentInputNode.value.trim();
      }
      if (!currentInputNode.checkValidity()) {
        errors.push(ValidationError.handleValidationState(currentInputNode.name, currentInputNode.validity));
      }
      newValidInputs[inputKey] = currentInputNode.validity.valid;
    });
    setValidInputs(newValidInputs);
    setValidationErrors(errors);
    try {
      if (errors.length > 0) {
        throw errors[0];
      }
      await (props.beforeSubmit && props.beforeSubmit());
      await props.pushAccountRegistrationData({...registrationData});
      await props.doSendActivationCode(registrationData.email);
      return props.onSubmit(event);
    } catch (error) {
      if (error && error.label) {
        switch (error.label) {
          case BackendError.AUTH_ERRORS.BLACKLISTED_EMAIL:
          case BackendError.AUTH_ERRORS.INVALID_EMAIL:
          case BackendError.AUTH_ERRORS.KEY_EXISTS: {
            inputs.email.current.setCustomValidity(error.label);
            setValidInputs({...validInputs, email: false});
            break;
          }
          case BackendError.AUTH_ERRORS.INVALID_CREDENTIALS:
          case BackendError.GENERAL_ERRORS.UNAUTHORIZED: {
            inputs.email.current.setCustomValidity(error.label);
            inputs.password.current.setCustomValidity(error.label);
            setValidInputs({...validInputs, email: false, password: false});
            break;
          }
          default: {
            const isValidationError = Object.values(ValidationError.ERROR).some(errorType =>
              error.label.endsWith(errorType),
            );
            if (!isValidationError) {
              throw error;
            }
          }
        }
      } else {
        console.error('Account registration error', error);
      }
    }
  };
  return (
    <Form onSubmit={handleSubmit} style={{display: 'flex', flexDirection: 'column'}}>
      <div>
        <InputBlock>
          <Input
            name="name"
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
              inputs.name.current.setCustomValidity('');
              setRegistrationData({...registrationData, name: event.target.value});
              setValidInputs({...validInputs, name: true});
            }}
            ref={inputs.name}
            markInvalid={!validInputs.name}
            value={registrationData.name}
            autoComplete="section-create-team username"
            placeholder={_(accountFormStrings.namePlaceholder)}
            onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
              if (event.key === 'Enter') {
                inputs.email.current.focus();
              }
            }}
            autoFocus
            maxLength={64}
            minLength={2}
            pattern=".{2,64}"
            required
            data-uie-name="enter-name"
          />
          <Input
            name="email"
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
              inputs.email.current.setCustomValidity('');
              setRegistrationData({...registrationData, email: event.target.value});
              setValidInputs({...validInputs, email: true});
            }}
            ref={inputs.email}
            markInvalid={!validInputs.email}
            value={registrationData.email}
            autoComplete="section-create-team email"
            placeholder={_(
              props.isPersonalFlow
                ? accountFormStrings.emailPersonalPlaceholder
                : accountFormStrings.emailTeamPlaceholder,
            )}
            onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
              if (event.key === 'Enter') {
                inputs.password.current.focus();
              }
            }}
            maxLength={128}
            type="email"
            required
            data-uie-name="enter-email"
          />
          <Input
            name="password"
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
              inputs.password.current.setCustomValidity('');
              setRegistrationData({...registrationData, password: event.target.value});
              setValidInputs({...validInputs, password: true});
            }}
            ref={inputs.password}
            markInvalid={!validInputs.password}
            value={registrationData.password}
            autoComplete="section-create-team new-password"
            type="password"
            placeholder={_(accountFormStrings.passwordPlaceholder)}
            pattern={ValidationUtil.getNewPasswordPattern(Config.getConfig().NEW_PASSWORD_MINIMUM_LENGTH)}
            required
            data-uie-name="enter-password"
          />
        </InputBlock>
        <Small
          style={{
            display: validationErrors.length ? 'none' : 'block',
            marginBottom: '32px',
            padding: '0 16px',
          }}
          data-uie-name="element-password-help"
        >
          {_(accountFormStrings.passwordHelp, {minPasswordLength: Config.getConfig().NEW_PASSWORD_MINIMUM_LENGTH})}
        </Small>
        <Exception errors={[props.authError, ...validationErrors]} />
      </div>
      <Checkbox
        ref={inputs.terms}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
          inputs.terms.current.setCustomValidity('');
          setRegistrationData({...registrationData, termsAccepted: event.target.checked});
          setValidInputs({...validInputs, terms: true});
        }}
        markInvalid={!validInputs.terms}
        name="accept"
        required
        checked={registrationData.termsAccepted}
        data-uie-name="do-terms"
        style={{justifyContent: 'center'}}
      >
        <CheckboxLabel>
          {Config.getConfig().FEATURE.ENABLE_ACCOUNT_REGISTRATION_ACCEPT_TERMS_AND_PRIVACY_POLICY ? (
            <FormattedMessage
              {...accountFormStrings.termsAndPrivacyPolicy}
              values={{
                // eslint-disable-next-line react/display-name
                privacypolicy: (...chunks: string[] | React.ReactNode[]) => (
                  <a
                    target="_blank"
                    rel="noopener noreferrer"
                    data-uie-name="go-privacy-policy"
                    href={Config.getConfig().URL.PRIVACY_POLICY}
                  >
                    {chunks}
                  </a>
                ),
                // eslint-disable-next-line react/display-name
                terms: (...chunks: string[] | React.ReactNode[]) => (
                  <a
                    target="_blank"
                    rel="noopener noreferrer"
                    data-uie-name="go-terms"
                    href={
                      props.isPersonalFlow
                        ? Config.getConfig().URL.TERMS_OF_USE_PERSONAL
                        : Config.getConfig().URL.TERMS_OF_USE_TEAMS
                    }
                  >
                    {chunks}
                  </a>
                ),
              }}
            />
          ) : (
            <FormattedMessage
              {...accountFormStrings.terms}
              values={{
                // eslint-disable-next-line react/display-name
                terms: (...chunks: string[] | React.ReactNode[]) => (
                  <a
                    target="_blank"
                    rel="noopener noreferrer"
                    data-uie-name="go-terms"
                    href={
                      props.isPersonalFlow
                        ? Config.getConfig().URL.TERMS_OF_USE_PERSONAL
                        : Config.getConfig().URL.TERMS_OF_USE_TEAMS
                    }
                  >
                    {chunks}
                  </a>
                ),
              }}
            />
          )}
        </CheckboxLabel>
      </Checkbox>
      <Button
        disabled={
          !(
            registrationData.email &&
            registrationData.name &&
            registrationData.password &&
            registrationData.termsAccepted
          ) || props.isFetching
        }
        formNoValidate
        type="submit"
        style={{margin: '16px auto'}}
        data-uie-name="do-next"
      >
        {props.submitText || _(accountFormStrings.submitButton)}
      </Button>
    </Form>
  );
};

type ConnectedProps = ReturnType<typeof mapStateToProps>;
const mapStateToProps = (state: RootState) => ({
  account: AuthSelector.getAccount(state),
  authError: AuthSelector.getError(state),
  isFetching: AuthSelector.isFetching(state),
  isPersonalFlow: AuthSelector.isPersonalFlow(state),
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

export default connect(mapStateToProps, mapDispatchToProps)(AccountForm);
