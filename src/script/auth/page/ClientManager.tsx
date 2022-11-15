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

import React, {useEffect} from 'react';

import {useIntl} from 'react-intl';
import {connect} from 'react-redux';
import {AnyAction, Dispatch} from 'redux';

import {Button, ButtonVariant, ContainerXS, H1, Muted, useTimeout} from '@wireapp/react-ui-kit';

import {Page} from './Page';

import {Config} from '../../Config';
import {clientManagerStrings} from '../../strings';
import {ClientList} from '../component/ClientList';
import {actionRoot as ROOT_ACTIONS} from '../module/action/';
import {RootState, bindActionCreators} from '../module/reducer';
import {QUERY_KEY} from '../route';

type Props = React.HTMLProps<HTMLDivElement>;

const ClientManagerComponent = ({doGetAllClients, doLogout}: Props & ConnectedProps & DispatchProps) => {
  const {formatMessage: _} = useIntl();
  const SFAcode = localStorage.getItem(QUERY_KEY.CONVERSATION_CODE);
  const timeRemaining = JSON.parse(localStorage.getItem(QUERY_KEY.JOIN_EXPIRES) ?? '{}')?.data ?? Date.now();

  // Automatically log the user out if ten minutes passes and they are a 2fa user.
  const {startTimeout} = useTimeout(
    () => {
      localStorage.removeItem(QUERY_KEY.CONVERSATION_CODE);
      localStorage.removeItem(QUERY_KEY.JOIN_EXPIRES);
      logout();
    },
    timeRemaining - Date.now() > 0 ? timeRemaining - Date.now() : 0,
  );

  useEffect(() => {
    doGetAllClients();
    if (SFAcode) {
      startTimeout();
    }
  }, [SFAcode, doGetAllClients, startTimeout]);

  const logout = async () => {
    try {
      await doLogout();
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
        <Button
          variant={ButtonVariant.SECONDARY}
          onClick={logout}
          style={{alignSelf: 'center', margin: '48px 0 80px 0'}}
          data-uie-name="go-sign-out"
        >
          {_(clientManagerStrings.logout)}
        </Button>
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

const ClientManager = connect(mapStateToProps, mapDispatchToProps)(ClientManagerComponent);

export {ClientManager};
