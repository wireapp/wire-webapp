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
  DeviceIcon,
  COLOR,
  Form,
  Input,
  InputSubmitCombo,
  RoundIconButton,
  ICON_NAME,
  ContainerXS,
  Text,
  Line,
  Small,
  ErrorMessage,
} from '@wireapp/react-ui-kit';
import {parseError, parseValidationErrors} from '../util/errorUtil';
import ValidationError from '../module/action/ValidationError';
import {clientItemStrings} from '../../strings';
import {injectIntl} from 'react-intl';

class ClientItem extends React.Component {
  static initialState = {
    password: '',
    validPassword: true,
    validationError: null,
  };
  state = ClientItem.initialState;

  formatId = (id = '?') => id.toUpperCase().replace(/(..)/g, '$1 ');

  formatDate = dateString =>
    dateString
      ? new Date(dateString).toLocaleString('en-US', {
          day: 'numeric',
          hour: 'numeric',
          hour12: false,
          minute: 'numeric',
          month: 'short',
          weekday: 'short',
          year: 'numeric',
        })
      : '?';

  formatName = (model, clazz) =>
    model || (
      <Text bold textTransform={'capitalize'}>
        {clazz}
      </Text>
    ) ||
    '?';

  resetState = () => this.setState(ClientItem.initialState);

  wrappedOnClick = event => {
    this.resetState();
    this.props.onClick(event);
  };

  handleSubmit = event => {
    event.preventDefault();
    if (this.props.isFetching) {
      return;
    }
    let validationError = null;
    if (!this.passwordInput.checkValidity()) {
      validationError = ValidationError.handleValidationState(this.passwordInput.name, this.passwordInput.validity);
    }
    this.setState({validPassword: this.passwordInput.validity.valid, validationError});
    return Promise.resolve(validationError)
      .then(error => {
        if (error) {
          throw error;
        }
      })
      .then(() => this.props.onClientRemoval(this.state.password))
      .catch(error => {
        if (!error.label) {
          throw error;
        }
      });
  };

  render() {
    const {client, selected, clientError, intl: {formatMessage: _}} = this.props;
    const {validationError, validPassword, password} = this.state;
    return (
      <ContainerXS>
        <ContainerXS
          style={selected ? {backgroundColor: 'white', borderRadius: '10px'} : {}}
          data-uie-value={client.model}
        >
          <ContainerXS
            onClick={this.wrappedOnClick}
            style={
              selected
                ? {cursor: 'pointer', margin: '16px 0 0 0', padding: '5px 16px 0 16px'}
                : {cursor: 'pointer', margin: '0 0 0 0', padding: '5px 16px 0 16px'}
            }
            data-uie-name="go-remove-device"
          >
            <div style={{display: 'flex', flexDirection: 'row'}}>
              <div style={{flexBasis: '32px', margin: 'auto'}}>
                <DeviceIcon />
              </div>
              <div style={{flexGrow: 1}}>
                <Text bold block data-uie-name="device-header-model">
                  {this.formatName(client.model, client.class)}
                </Text>
                <Small block data-uie-name="device-id">{`ID: ${this.formatId(client.id)}`}</Small>
                <Small block>{this.formatDate(client.time)}</Small>
              </div>
            </div>
            <Line color={COLOR.GRAY_LIGHTEN_72} style={{margin: '4px 0 0 0'}} />
          </ContainerXS>
          {selected && (
            <ContainerXS style={{margin: '-5px 0 0 0', padding: '5px'}}>
              <Form>
                <InputSubmitCombo style={{marginBottom: '0'}}>
                  <Input
                    autoFocus
                    name="password"
                    placeholder={_(clientItemStrings.passwordPlaceholder)}
                    type="password"
                    innerRef={node => (this.passwordInput = node)}
                    value={password}
                    autoComplete="section-login password"
                    maxLength="1024"
                    minLength="8"
                    pattern=".{8,1024}"
                    required
                    onChange={event =>
                      this.setState({
                        password: event.target.value,
                        validPassword: true,
                      })
                    }
                    data-uie-name="remove-device-password"
                  />
                  <RoundIconButton
                    disabled={!password || !validPassword}
                    color={COLOR.RED}
                    type="submit"
                    icon={ICON_NAME.TRASH}
                    formNoValidate
                    onClick={this.handleSubmit}
                    data-uie-name="do-remove-device"
                  />
                </InputSubmitCombo>
              </Form>
            </ContainerXS>
          )}
        </ContainerXS>
        {validationError && selected ? (
          <div style={{margin: '16px 0 0 0'}}>{parseValidationErrors(validationError)}</div>
        ) : clientError && selected ? (
          <ErrorMessage style={{margin: '16px 0 0 0'}} data-uie-name="error-message">
            {parseError(clientError)}
          </ErrorMessage>
        ) : null}
      </ContainerXS>
    );
  }
}

export default injectIntl(ClientItem);
