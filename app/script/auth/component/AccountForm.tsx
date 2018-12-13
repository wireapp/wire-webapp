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

import {Button, Checkbox, CheckboxLabel, ErrorMessage, Form, Input, InputBlock} from '@wireapp/react-ui-kit';
import * as React from 'react';
import {FormattedHTMLMessage, InjectedIntlProps, injectIntl} from 'react-intl';
import {connect} from 'react-redux';
import {accountFormStrings} from '../../strings';
import EXTERNAL_ROUTE from '../externalRoute';
import ROOT_ACTIONS from '../module/action/';
import BackendError from '../module/action/BackendError';
import ValidationError from '../module/action/ValidationError';
import {RootState, ThunkDispatch} from '../module/reducer';
import {RegistrationDataState} from '../module/reducer/authReducer';
import * as AuthSelector from '../module/selector/AuthSelector';
import * as AccentColor from '../util/AccentColor';
import {parseError, parseValidationErrors} from '../util/errorUtil';

interface Props extends React.FormHTMLAttributes<HTMLFormElement> {
  beforeSubmit?: () => Promise<void>;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  submitText?: string;
}

interface ConnectedProps {
  account: RegistrationDataState;
  authError: Error;
  isFetching: boolean;
  isPersonalFlow: boolean;
}

interface DispatchProps {
  doSendActivationCode: (email: string) => Promise<void>;
  pushAccountRegistrationData: (registrationData: Partial<RegistrationDataState>) => Promise<void>;
}

interface State {
  registrationData: {
    accent_id: number;
    email: string;
    name: string;
    password: string;
    termsAccepted: boolean;
  };
  validInputs: {
    [field: string]: boolean;
  };
  validationErrors: Error[];
}

type CombinedProps = Props & ConnectedProps & DispatchProps & InjectedIntlProps;

class AccountForm extends React.PureComponent<CombinedProps, State> {
  private readonly inputs: {
    name?: HTMLInputElement;
    email?: HTMLInputElement;
    password?: HTMLInputElement;
  } = {};

  state: State = {
    registrationData: {
      accent_id: AccentColor.random().id,
      email: this.props.account.email || '',
      name: this.props.account.name || '',
      password: this.props.account.password || '',
      termsAccepted: this.props.account.termsAccepted || false,
    },
    validInputs: {
      email: true,
      name: true,
      password: true,
    },
    validationErrors: [],
  };

  componentWillReceiveProps({account}: CombinedProps) {
    if (account) {
      if (account.email !== this.state.registrationData.email) {
        this.setState({
          registrationData: {
            ...this.state.registrationData,
            email: account.email,
          },
        });
      }
      if (account.name !== this.props.account.name) {
        this.setState({
          registrationData: {
            ...this.state.registrationData,
            name: account.name,
          },
        });
      }
    }
  }

  createURLForToU = () => {
    return `${EXTERNAL_ROUTE.WIRE_WEBSITE}/legal/terms/${this.props.isPersonalFlow ? 'personal' : 'teams'}/`;
  };

  handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validInputs: {[field: string]: boolean} = this.state.validInputs;
    const errors: Error[] = [];

    Object.entries(this.inputs).forEach(([inputKey, currentInput]) => {
      currentInput.value = currentInput.value.trim();
      if (!currentInput.checkValidity()) {
        errors.push(ValidationError.handleValidationState(currentInput.name, currentInput.validity));
      }
      validInputs[inputKey] = currentInput.validity.valid;
    });

    this.setState({validInputs, validationErrors: errors});
    return Promise.resolve()
      .then(() => {
        if (errors.length > 0) {
          throw errors[0];
        }
      })
      .then(() => this.props.beforeSubmit && this.props.beforeSubmit())
      .then(() => this.props.pushAccountRegistrationData({...this.state.registrationData}))
      .then(() => this.props.doSendActivationCode(this.state.registrationData.email))
      .then(() => this.props.onSubmit(event))
      .catch(error => {
        if (error.label) {
          switch (error.label) {
            case BackendError.AUTH_ERRORS.BLACKLISTED_EMAIL:
            case BackendError.AUTH_ERRORS.INVALID_EMAIL:
            case BackendError.AUTH_ERRORS.KEY_EXISTS: {
              this.setState(state => ({validInputs: {...state.validInputs, email: false}}));
              break;
            }
            case BackendError.AUTH_ERRORS.INVALID_CREDENTIALS:
            case BackendError.GENERAL_ERRORS.UNAUTHORIZED: {
              this.setState(state => ({validInputs: {...state.validInputs, email: false, password: false}}));
              break;
            }
            default: {
              const isValidationError = Object.values(ValidationError.ERROR).some(errorType =>
                error.label.endsWith(errorType)
              );
              if (!isValidationError) {
                throw error;
              }
            }
          }
        } else {
          throw error;
        }
      });
  };

  render() {
    const {
      isFetching,
      isPersonalFlow,
      submitText,
      intl: {formatMessage: _},
    } = this.props;
    const {
      registrationData: {name, email, password, termsAccepted},
      validInputs,
    } = this.state;
    return (
      <Form onSubmit={this.handleSubmit} style={{display: 'flex', flexDirection: 'column'}}>
        <div>
          <InputBlock>
            <Input
              name="name"
              onChange={event =>
                this.setState({
                  registrationData: {
                    ...this.state.registrationData,
                    name: event.target.value,
                  },
                  validInputs: {...validInputs, name: true},
                })
              }
              innerRef={node => (this.inputs.name = node)}
              markInvalid={!validInputs.name}
              value={name}
              autoComplete="section-create-team username"
              placeholder={_(accountFormStrings.namePlaceholder)}
              onKeyDown={event => {
                if (event.key === 'Enter') {
                  this.inputs.email.focus();
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
              onChange={event =>
                this.setState({
                  registrationData: {
                    ...this.state.registrationData,
                    email: event.target.value,
                  },
                  validInputs: {...validInputs, email: true},
                })
              }
              innerRef={node => (this.inputs.email = node)}
              markInvalid={!validInputs.email}
              value={email}
              autoComplete="section-create-team email"
              placeholder={_(
                isPersonalFlow ? accountFormStrings.emailPersonalPlaceholder : accountFormStrings.emailTeamPlaceholder
              )}
              onKeyDown={event => {
                if (event.key === 'Enter') {
                  this.inputs.password.focus();
                }
              }}
              maxLength={128}
              type="email"
              required
              data-uie-name="enter-email"
            />
            <Input
              name="password"
              onChange={event =>
                this.setState({
                  registrationData: {
                    ...this.state.registrationData,
                    password: event.target.value,
                  },
                  validInputs: {...validInputs, password: true},
                })
              }
              innerRef={node => (this.inputs.password = node)}
              markInvalid={!validInputs.password}
              value={password}
              autoComplete="section-create-team new-password"
              type="password"
              placeholder={_(accountFormStrings.passwordPlaceholder)}
              maxLength={1024}
              minLength={8}
              pattern=".{8,1024}"
              required
              data-uie-name="enter-password"
            />
          </InputBlock>
          <ErrorMessage data-uie-name="error-message">{parseError(this.props.authError)}</ErrorMessage>
          <div data-uie-name="error-message">{parseValidationErrors(this.state.validationErrors)}</div>
        </div>
        <Checkbox
          onChange={event =>
            this.setState({
              registrationData: {
                ...this.state.registrationData,
                termsAccepted: event.target.checked,
              },
            })
          }
          name="accept"
          required
          checked={termsAccepted}
          data-uie-name="do-terms"
          style={{justifyContent: 'center'}}
        >
          <CheckboxLabel>
            <FormattedHTMLMessage
              {...accountFormStrings.terms}
              values={{
                linkParams: `target=_blank data-uie-name=go-terms href=${this.createURLForToU()}`,
              }}
            />
          </CheckboxLabel>
        </Checkbox>
        <Button
          disabled={!(email && name && password && termsAccepted) || isFetching}
          formNoValidate
          type="submit"
          style={{margin: '16px auto'}}
          data-uie-name="do-next"
        >
          {submitText || _(accountFormStrings.submitButton)}
        </Button>
      </Form>
    );
  }
}

export default injectIntl(
  connect(
    (state: RootState): ConnectedProps => {
      return {
        account: AuthSelector.getAccount(state),
        authError: AuthSelector.getError(state),
        isFetching: AuthSelector.isFetching(state),
        isPersonalFlow: AuthSelector.isPersonalFlow(state),
      };
    },
    (dispatch: ThunkDispatch): DispatchProps => {
      return {
        doSendActivationCode: (email: string) => dispatch(ROOT_ACTIONS.userAction.doSendActivationCode(email)),
        pushAccountRegistrationData: (registrationData: Partial<RegistrationDataState>) => {
          return dispatch(ROOT_ACTIONS.authAction.pushAccountRegistrationData(registrationData));
        },
      };
    }
  )(AccountForm)
);
