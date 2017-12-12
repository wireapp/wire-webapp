/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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

import {connect} from 'react-redux';
import {accountFormStrings} from '../../strings';
import {Form, Input, InputBlock, Button, Checkbox, CheckboxLabel, ErrorMessage} from '@wireapp/react-ui-kit/Form';
import {injectIntl, FormattedHTMLMessage} from 'react-intl';
import {parseError, parseValidationErrors} from '../util/errorUtil';
import * as AuthAction from '../module/action/AuthAction';
import * as AuthSelector from '../module/selector/AuthSelector';
import * as UserAction from '../module/action/UserAction';
import ValidationError from '../module/action/ValidationError';
import React, {PureComponent} from 'react';
import ROUTE from '../route';

class AccountForm extends PureComponent {
  inputs = {};
  state = {
    email: this.props.account.email,
    name: this.props.account.name,
    password: this.props.account.password,
    termsAccepted: this.props.account.termsAccepted,
    validInputs: {
      email: true,
      name: true,
      password: true,
    },
    validationErrors: [],
  };

  handleSubmit = event => {
    event.preventDefault();
    const validInputs = this.state.validInputs;
    const errors = [];
    for (const inputKey of Object.keys(this.inputs)) {
      const currentInput = this.inputs[inputKey];
      if (!currentInput.checkValidity()) {
        errors.push(ValidationError.handleValidationState(currentInput.name, currentInput.validity));
      }
      validInputs[inputKey] = currentInput.validity.valid;
    }
    this.setState({validInputs, validationErrors: errors});
    return Promise.resolve()
      .then(() => {
        if (errors.length > 0) {
          throw errors[0];
        }
      })
      .then(() => this.props.beforeSubmit && this.props.beforeSubmit())
      .then(() => this.props.pushAccountRegistrationData({...this.state}))
      .then(() => this.props.doSendActivationCode(this.state.email))
      .then(() => this.props.onSubmit())
      .catch(error => console.error('Failed to send email code', error));
  };

  render() {
    const {isFetching, submitText, intl: {formatMessage: _}} = this.props;
    const {name, email, password, termsAccepted, validInputs} = this.state;
    return (
      <Form
        onSubmit={this.handleSubmit}
        style={{
          display: 'flex',
          flexDirection: 'column',
          flexGrow: 1,
          justifyContent: 'space-between',
        }}
      >
        <div>
          <InputBlock>
            <Input
              name="name"
              onChange={event =>
                this.setState({
                  name: event.target.value,
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
              maxLength="64"
              minLength="2"
              pattern=".{2,64}"
              required
              data-uie-name="enter-name"
            />
            <Input
              name="email"
              onChange={event =>
                this.setState({
                  email: event.target.value,
                  validInputs: {...validInputs, email: true},
                })
              }
              innerRef={node => (this.inputs.email = node)}
              markInvalid={!validInputs.email}
              value={email}
              autoComplete="section-create-team email"
              placeholder={_(accountFormStrings.emailPlaceholder)}
              onKeyDown={event => {
                if (event.key === 'Enter') {
                  this.inputs.password.focus();
                }
              }}
              maxLength="128"
              type="email"
              required
              data-uie-name="enter-email"
            />
            <Input
              name="password"
              onChange={event =>
                this.setState({
                  password: event.target.value,
                  validInputs: {...validInputs, password: true},
                })
              }
              innerRef={node => (this.inputs.password = node)}
              markInvalid={!validInputs.password}
              value={password}
              autoComplete="section-create-team new-password"
              type="password"
              placeholder={_(accountFormStrings.passwordPlaceholder)}
              maxLength="1024"
              minLength="8"
              pattern=".{8,1024}"
              required
              data-uie-name="enter-password"
            />
          </InputBlock>
          <ErrorMessage data-uie-name="error-message">{parseError(this.props.authError)}</ErrorMessage>
          <div data-uie-name="error-message">{parseValidationErrors(this.state.validationErrors)}</div>
        </div>
        <Checkbox
          onChange={event => this.setState({termsAccepted: event.target.checked})}
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
                linkParams: `target=_blank data-uie-name=go-terms href=${ROUTE.WIRE_ROOT}/legal#terms`,
              }}
            />
          </CheckboxLabel>
        </Checkbox>
        <Button
          disabled={!(email && name && password && termsAccepted) || isFetching}
          formNoValidate
          type="submit"
          style={{margin: '0 auto -16px'}}
          data-uie-name="do-next"
        >
          {submitText || _(accountFormStrings.nextButton)}
        </Button>
      </Form>
    );
  }
}

export default injectIntl(
  connect(
    state => ({
      account: AuthSelector.getAccount(state),
      authError: AuthSelector.getError(state),
      isFetching: AuthSelector.isFetching(state),
    }),
    {...AuthAction, ...UserAction}
  )(AccountForm)
);
