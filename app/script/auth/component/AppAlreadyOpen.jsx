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

import React, {Component} from 'react';
import {connect} from 'react-redux';
import {injectIntl} from 'react-intl';
import Cookies from 'js-cookie';
import {appAlreadyOpenStrings} from '../../strings';
// import {APP_INSTANCE_ID} from '../config';
import {H3, Button, Container, COLOR, Columns, Column, Modal, Text} from '@wireapp/react-ui-kit';

const COOKIE_NAME_APP_OPENED = 'app_opened';

class AppAlreadyOpen extends Component {
  state = {
    cookie: Cookies.get(COOKIE_NAME_APP_OPENED),
    isAppAlreadyOpen: !!Cookies.get(COOKIE_NAME_APP_OPENED),
  };

  onClose = () => this.setState({...this.state, isAppAlreadyOpen: false});

  onContinue = () => this.setState({...this.state, isAppAlreadyOpen: false});

  onCancel = () => this.setState({...this.state, isAppAlreadyOpen: false});

  render = () => {
    const {intl: {formatMessage: _}} = this.props;
    const {isAppAlreadyOpen} = this.state;
    return (
      isAppAlreadyOpen && (
        <Modal onClose={this.onClose}>
          <Container style={{maxWidth: '400px'}}>
            <H3 style={{fontWeight: '500'}}>{_(appAlreadyOpenStrings.headline)}</H3>
            <Text>{_(appAlreadyOpenStrings.text)}</Text>
            <Columns style={{marginTop: '20px'}}>
              <Column style={{textAlign: 'center'}}>
                <Button onClick={this.onCancel} backgroundColor={COLOR.GRAY}>
                  {_(appAlreadyOpenStrings.cancelButton)}
                </Button>
              </Column>
              <Column style={{textAlign: 'center'}}>
                <Button onClick={this.onContinue}>{_(appAlreadyOpenStrings.continueButton)}</Button>
              </Column>
            </Columns>
          </Container>
        </Modal>
      )
    );
  };
}

export default injectIntl(connect(state => ({}))(AppAlreadyOpen));
