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

import {H1, Text, Link, ContainerXS} from '@wireapp/react-ui-kit';
import {injectIntl} from 'react-intl';
import Page from './Page';
import React from 'react';
import * as ClientAction from '../module/action/ClientAction';
import ClientList from '../component/ClientList';
import * as AuthAction from '../module/action/AuthAction';
import {connect} from 'react-redux';
import {clientManagerStrings} from '../../strings';
import {ROUTE} from '../route';

class ClientManager extends React.Component {
  componentWillMount = () => this.props.doGetAllClients();

  logout = () =>
    this.props
      .doLogout()
      .catch(() => {})
      .then(() => this.props.history.push(ROUTE.LOGIN));

  render() {
    const {intl: {formatMessage: _}} = this.props;
    return (
      <Page>
        <ContainerXS
          centerText
          verticalCenter
          style={{display: 'flex', flexDirection: 'column', justifyContent: 'space-around', minHeight: 428}}
        >
          <H1 center style={{marginTop: '140px'}}>
            {_(clientManagerStrings.headline)}
          </H1>
          <Text center style={{marginBottom: '42px'}} data-uie-name="status-device-limit-info">
            {_(clientManagerStrings.subhead)}
          </Text>
          <ClientList />
          <Link
            onClick={this.logout}
            style={{alignSelf: 'center', margin: '48px 0 80px 0'}}
            data-uie-name="go-sign-out"
          >
            {_(clientManagerStrings.logout)}
          </Link>
        </ContainerXS>
      </Page>
    );
  }
}

export default injectIntl(connect(null, {...AuthAction, ...ClientAction})(ClientManager));
