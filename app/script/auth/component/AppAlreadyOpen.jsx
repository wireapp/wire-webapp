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

import React from 'react';
import {connect} from 'react-redux';
import {injectIntl} from 'react-intl';
import {appAlreadyOpenStrings} from '../../strings';
import * as CookieAction from '../module/action/CookieAction';
// import {APP_INSTANCE_ID} from '../config';
import {H3, Button, Container, Columns, Column, Modal, Text} from '@wireapp/react-ui-kit';
import * as CookieSelector from '../module/selector/CookieSelector';

class AppAlreadyOpen extends React.Component {
  onContinue = () => {};
  render = () => {
    const {isAppAlreadyOpen, intl: {formatMessage: _}} = this.props;
    return (
      isAppAlreadyOpen && (
        <Modal>
          <Container style={{maxWidth: '400px'}}>
            <H3 style={{fontWeight: '500'}}>{_(appAlreadyOpenStrings.headline)}</H3>
            <Text>{_(appAlreadyOpenStrings.text)}</Text>
            <Columns style={{marginTop: '20px'}}>
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

export default injectIntl(
  connect(
    state => ({
      isAppAlreadyOpen: CookieSelector.isAppAlreadyOpen(state),
    }),
    {...CookieAction}
  )(AppAlreadyOpen)
);
