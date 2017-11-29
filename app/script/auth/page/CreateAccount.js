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

import {ArrowIcon} from '@wireapp/react-ui-kit/Icon';
import {COLOR} from '@wireapp/react-ui-kit/Identity';
import {connect} from 'react-redux';
import {Container, ContainerXS, Columns, Column} from '@wireapp/react-ui-kit/Layout';
import {createAccountStrings} from '../../strings';
import {Form, Input, InputBlock, Button, Checkbox, CheckboxLabel, ErrorMessage} from '@wireapp/react-ui-kit/Form';
import {H1, Link} from '@wireapp/react-ui-kit/Text';
import {injectIntl, FormattedHTMLMessage} from 'react-intl';
import {Link as RRLink} from 'react-router-dom';
import {parseError, parseValidationErrors} from '../util/errorUtil';
import {withRouter} from 'react-router';
import * as AuthAction from '../module/action/AuthAction';
import * as AuthSelector from '../module/selector/AuthSelector';
import * as UserAction from '../module/action/UserAction';
import ValidationError from '../module/action/ValidationError';
import Page from './Page';
import React, {Component} from 'react';
import ROUTE from '../route';

class CreateAccount extends Component {
  constructor(props) {
    super(props);
    this.inputs = {};
    this.state = {
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
  }

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
      .then(() => this.props.pushAccountRegistrationData({...this.state}))
      .then(() => this.props.doSendActivationCode(this.state.email))
      .then(() => this.props.history.push(ROUTE.VERIFY))
      .catch(error => console.error('Failed to send email code', error));
  };

  isSubmitButtonDisabled = () => {
    const {email, name, password, termsAccepted} = this.state;
    return !(email && name && password && termsAccepted);
  };

  render() {
    const {intl: {formatMessage: _}} = this.props;
    return (
      <Page hasTeamData>
        <Container centerText verticalCenter style={{width: '100%'}}>
          <Columns>
            <Column style={{display: 'flex'}}>
              <div style={{margin: 'auto'}}>
                <Link to={ROUTE.CREATE_TEAM} data-uie-name="go-register-team" component={RRLink}>
                  <ArrowIcon direction="left" color={COLOR.GRAY} />
                </Link>
              </div>
            </Column>
            <Column style={{flexBasis: 384, flexGrow: 0, padding: 0}}>
              <ContainerXS
                centerText
                style={{display: 'flex', flexDirection: 'column', height: 428, justifyContent: 'space-between'}}
              >
                <H1 center>{_(createAccountStrings.headLine)}</H1>
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
                            validInputs: {...this.state.validInputs, name: true},
                          })
                        }
                        innerRef={node => (this.inputs.name = node)}
                        markInvalid={!this.state.validInputs.name}
                        defaultValue={this.state.name}
                        autoComplete="section-create-team username"
                        placeholder={_(createAccountStrings.namePlaceholder)}
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
                            validInputs: {...this.state.validInputs, email: true},
                          })
                        }
                        innerRef={node => (this.inputs.email = node)}
                        markInvalid={!this.state.validInputs.email}
                        defaultValue={this.state.email}
                        autoComplete="section-create-team email"
                        placeholder={_(createAccountStrings.emailPlaceholder)}
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
                            validInputs: {...this.state.validInputs, password: true},
                          })
                        }
                        innerRef={node => (this.inputs.password = node)}
                        markInvalid={!this.state.validInputs.password}
                        defaultValue={this.state.password}
                        autoComplete="section-create-team new-password"
                        type="password"
                        placeholder={_(createAccountStrings.passwordPlaceholder)}
                        maxLength="1024"
                        minLength="8"
                        pattern=".{8,1024}"
                        required
                        data-uie-name="enter-password"
                      />
                    </InputBlock>
                    <ErrorMessage data-uie-name="error-message">{parseError(this.props.authError)}</ErrorMessage>
                    <ErrorMessage data-uie-name="error-message">
                      {parseValidationErrors(this.state.validationErrors)}
                    </ErrorMessage>
                  </div>
                  <Checkbox
                    onChange={event => this.setState({termsAccepted: event.target.checked})}
                    name="accept"
                    required
                    defaultChecked={this.state.termsAccepted}
                    data-uie-name="do-terms"
                    style={{justifyContent: 'center'}}
                  >
                    <CheckboxLabel>
                      <FormattedHTMLMessage
                        {...createAccountStrings.terms}
                        values={{linkParams: 'data-uie-name="go-terms" href="#"'}}
                      />
                    </CheckboxLabel>
                  </Checkbox>
                  <Button
                    disabled={this.isSubmitButtonDisabled()}
                    formNoValidate
                    type="submit"
                    style={{margin: '0 auto -16px'}}
                    data-uie-name="do-next"
                  >
                    {_(createAccountStrings.nextButton)}
                  </Button>
                </Form>
              </ContainerXS>
            </Column>
            <Column />
          </Columns>
        </Container>
      </Page>
    );
  }
}

export default withRouter(
  injectIntl(
    connect(
      state => ({
        account: AuthSelector.getAccount(state),
        authError: AuthSelector.getError(state),
      }),
      {...AuthAction, ...UserAction}
    )(CreateAccount)
  )
);
