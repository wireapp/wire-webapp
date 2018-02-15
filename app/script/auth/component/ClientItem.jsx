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
  COLOR,
  Input,
  InputSubmitCombo,
  RoundIconButton,
  ICON_NAME,
  ContainerXS,
  Text,
  Line,
  Small,
} from '@wireapp/react-ui-kit';

class ClientItem extends React.Component {
  state = {
    editMode: false,
    password: null,
  };

  toggleEditMode = () => this.setState({editMode: !this.state.editMode});

  formatFingerprint = (fingerprint = '00') =>
    fingerprint
      .toUpperCase()
      .match(/.{1,2}/g)
      .join(' ');

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
    const {name, fingerprint, created} = this.props;
    return (
      <ContainerXS style={this.state.editMode ? {backgroundColor: 'white', borderRadius: '10px'} : {}}>
        <ContainerXS onClick={this.toggleEditMode} style={{margin: '0px', padding: '5px 15px'}}>
          <Text bold block>
            {name}
          </Text>
          <Small block>{`ID: ${this.formatFingerprint(fingerprint)}`}</Small>
          <Small block>{this.formatDate(created)}</Small>
          <Line />
        </ContainerXS>
        {this.state.editMode && (
          <ContainerXS style={{margin: '-15px 0 0 0', padding: '5px'}}>
            <InputSubmitCombo style={{marginBottom: '0'}}>
              <Input
                placeholder="Password"
                onChange={event => this.setState({...this.state, password: event.target.value})}
              />
              <RoundIconButton
                color={COLOR.RED}
                type="submit"
                icon={ICON_NAME.CLOSE}
                formNoValidate
                onClick={event => this.props.onClientRemoval(event, this.state.password)}
              />
            </InputSubmitCombo>
          </ContainerXS>
        )}
      </ContainerXS>
    );
  }
}

export default ClientItem;
