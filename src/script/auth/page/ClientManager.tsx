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

import {ContainerXS, H1, Link, Muted} from '@wireapp/react-ui-kit';
import React, {useEffect} from 'react';
import {useIntl} from 'react-intl';
import {connect} from 'react-redux';
import {AnyAction, Dispatch} from 'redux';
import useReactRouter from 'use-react-router';
import {Config} from '../../Config';
import {clientManagerStrings} from '../../strings';
import ClientList from '../component/ClientList';
import {actionRoot as ROOT_ACTIONS} from '../module/action/';
import {RootState, bindActionCreators} from '../module/reducer';
import {ROUTE} from '../route';
import Page from './Page';

interface Props extends React.HTMLProps<HTMLDivElement> {}

const ClientManager = ({doGetAllClients, doLogout}: Props & ConnectedProps & DispatchProps) => {
  const {formatMessage: _} = useIntl();
  const {history} = useReactRouter();
  useEffect(() => {
    doGetAllClients();
  }, []);
  const logout = async () => {
    try {
      await doLogout();
      history.push(ROUTE.INDEX);
    } catch (error) {}
  };
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
        <Muted center style={{marginBottom: '42px'}} data-uie-name="status-device-limit-info">
          {_(clientManagerStrings.subhead, {brandName: Config.getConfig().BRAND_NAME})}
        </Muted>
        <ClientList />
        <Link onClick={logout} style={{alignSelf: 'center', margin: '48px 0 80px 0'}} data-uie-name="go-sign-out">
          {_(clientManagerStrings.logout)}
        </Link>
      </ContainerXS>
    </Page>
  );
};

type ConnectedProps = ReturnType<typeof mapStateToProps>;
const mapStateToProps = (state: RootState) => ({});

type DispatchProps = ReturnType<typeof mapDispatchToProps>;
const mapDispatchToProps = (dispatch: Dispatch<AnyAction>) =>
  bindActionCreators(
    {
      doGetAllClients: ROOT_ACTIONS.clientAction.doGetAllClients,
      doLogout: ROOT_ACTIONS.authAction.doLogout,
    },
    dispatch,
  );

export default connect(mapStateToProps, mapDispatchToProps)(ClientManager);
