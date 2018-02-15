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
import {parseError} from '../util/errorUtil';

class ClientItem extends React.Component {
  state = {
    password: null,
  };

  formatFingerprint = (fingerprint = '') => fingerprint.toUpperCase().replace(/(..)/g, '$1 ');

  formatDate = dateString =>
    new Date(dateString).toLocaleString('en-US', {
      day: 'numeric',
      hour: 'numeric',
      hour12: false,
      minute: 'numeric',
      month: 'short',
      weekday: 'short',
      year: 'numeric',
    });

  render() {
    const {selected, name, fingerprint, created} = this.props;
    return (
      <ContainerXS>
        <ContainerXS style={selected ? {backgroundColor: 'white', borderRadius: '10px'} : {}}>
          <ContainerXS
            onClick={this.props.onClick}
            style={{margin: '0px', padding: '5px 15px'}}
            data-uie-name="go-remove-device"
          >
            <div style={{display: 'flex', flexDirection: 'row'}}>
              <div style={{flexBasis: '30px', margin: 'auto'}}>
                <DeviceIcon />
              </div>
              <div style={{flexGrow: 1}}>
                <Text bold block>
                  {name}
                </Text>
                <Small block data-uie-name="device-id">{`ID: ${this.formatFingerprint(fingerprint)}`}</Small>
                <Small block>{this.formatDate(created)}</Small>
              </div>
            </div>
            <Line color={COLOR.GRAY} />
          </ContainerXS>
          {selected && (
            <ContainerXS style={{margin: '-15px 0 0 0', padding: '5px'}}>
              <InputSubmitCombo style={{marginBottom: '0'}}>
                <Input
                  placeholder="Password"
                  type="password"
                  onChange={event => this.setState({...this.state, password: event.target.value})}
                  data-uie-name="remove-device-password"
                />
                <RoundIconButton
                  color={COLOR.RED}
                  type="submit"
                  icon={ICON_NAME.TRASH}
                  formNoValidate
                  onClick={event => this.props.onClientRemoval(event, this.state.password)}
                  data-uie-name="do-remove-device"
                />
              </InputSubmitCombo>
            </ContainerXS>
          )}
        </ContainerXS>
        <ErrorMessage data-uie-name="error-message">{parseError(this.props.error)}</ErrorMessage>
      </ContainerXS>
    );
  }
}

export default ClientItem;
