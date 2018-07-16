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

import React from 'react';
import {
  Button,
  Container,
  ContainerXS,
  Columns,
  Column,
  RoundIconButton,
  InputSubmitCombo,
  ICON_NAME,
  Form,
  Input,
  H1,
  Text,
  Link,
  ArrowIcon,
  COLOR,
} from '@wireapp/react-ui-kit';
import {Link as RRLink} from 'react-router-dom';
import {connect} from 'react-redux';
import {injectIntl} from 'react-intl';
import {parseValidationErrors} from '../util/errorUtil';
import * as AuthSelector from '../module/selector/AuthSelector';
import AppAlreadyOpen from '../component/AppAlreadyOpen';
import {withRouter} from 'react-router';
import {resetError} from '../module/action/creator/AuthActionCreator';
import Page from './Page';
import {ROUTE} from '../route';
import ValidationError from '../module/action/ValidationError';

class SingleSignOn extends React.PureComponent {
  inputs = {};
  state = {
    code: '',
    validInputs: {
      code: true,
    },
    validationErrors: [],
  };

  componentDidMount = () => {
    // if (z.util.Environment.browser.supports.clipboard) {
    this.extractSSOLink();
    // }
  };

  componentWillReceiveProps = nextProps => {};

  componentWillUnmount = () => {};

  handleSubmit = event => {
    event.preventDefault();
    if (this.props.isFetching) {
      return;
    }
    this.inputs.code.value = this.inputs.code.value.trim();
    const validationErrors = [];
    const validInputs = this.state.validInputs;

    Object.entries(this.inputs).forEach(([inputKey, currentInput]) => {
      if (!currentInput.checkValidity()) {
        validationErrors.push(ValidationError.handleValidationState(currentInput.name, currentInput.validity));
      }
      validInputs[inputKey] = currentInput.validity.valid;
    });

    this.setState({validInputs, validationErrors});
    return Promise.resolve(validationErrors)
      .then(errors => {
        if (errors.length) {
          throw errors[0];
        }
      })
      .catch(error => {
        switch (error.label) {
          default: {
            throw error;
          }
        }
      });
    throw new Error('CODE NOT VALID. CONTACT YOUR ADMINISTARTOR');
  };

  extractSSOLink = () => {
    this.readFromClipboard().then(code => {
      const isValidSSOLink = this.isValidateInput(code);
      if (isValidSSOLink) {
        this.setState({code});
      }
    });
  };

  readFromClipboard = () => navigator.clipboard.readText().catch(error => console.error('Something went wrong', error));

  isValidateInput = inputString => inputString && inputString.includes('sso.wire.com');

  render() {
    const {code, validInputs, validationErrors} = this.state;
    return (
      <Page>
        <Container centerText verticalCenter style={{width: '100%'}}>
          <AppAlreadyOpen />
          <Columns>
            <Column style={{display: 'flex'}}>
              <div style={{margin: 'auto'}}>
                <Link to={ROUTE.LOGIN} component={RRLink} data-uie-name="go-login">
                  <ArrowIcon direction="left" color={COLOR.GRAY} />
                </Link>
              </div>
            </Column>
            <Column style={{flexBasis: 384, flexGrow: 0, padding: 0}}>
              <ContainerXS
                centerText
                style={{display: 'flex', flexDirection: 'column', height: 428, justifyContent: 'space-between'}}
              >
                <div>
                  <H1 center>{'Company log in'}</H1>
                  <Text>{"Paste here the link from your company's directory"}</Text>
                  <Form style={{marginTop: 30}} data-uie-name="sso">
                    <InputSubmitCombo>
                      <Input
                        name="code"
                        tabIndex="1"
                        onChange={event =>
                          this.setState({
                            code: event.target.value,
                            validInputs: {...validInputs, code: true},
                          })
                        }
                        innerRef={node => (this.inputs.code = node)}
                        markInvalid={!validInputs.code}
                        value={code}
                        autoComplete="section-login sso-code"
                        placeholder={'PASTE LINK'}
                        maxLength="128"
                        autoFocus
                        type="text"
                        required
                        data-uie-name="enter-code"
                      />
                      <RoundIconButton
                        tabIndex="2"
                        disabled={!code}
                        type="submit"
                        formNoValidate
                        icon={ICON_NAME.ARROW}
                        onClick={this.handleSubmit}
                        data-uie-name="do-sso-sign-in"
                      />
                    </InputSubmitCombo>
                    {validationErrors.length ? parseValidationErrors(validationErrors) : null}
                    <Button onClick={this.extractSSOLink} data-uie-name="do-paste-sso-code">
                      {'Paste'}
                    </Button>
                  </Form>
                </div>
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
        isFetching: AuthSelector.isFetching(state),
        loginError: AuthSelector.getError(state),
      }),
      {resetError}
    )(SingleSignOn)
  )
);
