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

import {TeamData} from '@wireapp/api-client/lib/team';
import {connect} from 'react-redux';
import {Navigate} from 'react-router-dom';

import {UnsupportedBrowser} from '../component/UnsupportedBrowser';
import {RootState} from '../module/reducer';
import {RegistrationDataState} from '../module/reducer/authReducer';
import * as AuthSelector from '../module/selector/AuthSelector';
import {ROUTE} from '../route';

interface Props extends React.HTMLProps<HTMLDivElement> {
  hasAccountData?: boolean;
  hasTeamData?: boolean;
  isAuthenticated?: boolean;
}

const hasInvalidAccountData = (account: RegistrationDataState) => !account.name || !account.email || !account.password;

const hasInvalidTeamData = ({team}: {team: TeamData}) => !team || !team.name;

const redirects = {
  [AuthSelector.REGISTER_FLOW.PERSONAL]: ROUTE.CREATE_ACCOUNT,
  [AuthSelector.REGISTER_FLOW.GENERIC_INVITATION]: ROUTE.CREATE_ACCOUNT,
  [AuthSelector.REGISTER_FLOW.TEAM]: ROUTE.CREATE_TEAM,
};

const PageComponent = ({
  hasAccountData,
  hasTeamData,
  currentFlow,
  isAuthenticated,
  isStateAuthenticated,
  account,
  children,
}: Props & ConnectedProps) => {
  if (
    (hasAccountData && hasInvalidAccountData(account) && !isStateAuthenticated) ||
    (hasTeamData && hasInvalidTeamData(account) && !isStateAuthenticated) ||
    (isAuthenticated && !isStateAuthenticated)
  ) {
    return <Navigate to={redirects[currentFlow] || ROUTE.INDEX} replace />;
  }
  return <UnsupportedBrowser>{children}</UnsupportedBrowser>;
};

type ConnectedProps = ReturnType<typeof mapStateToProps>;
const mapStateToProps = (state: RootState) => ({
  account: AuthSelector.getAccount(state),
  currentFlow: AuthSelector.getCurrentFlow(state),
  isStateAuthenticated: AuthSelector.isAuthenticated(state),
});

const Page = connect(mapStateToProps)(PageComponent);

export {Page};
