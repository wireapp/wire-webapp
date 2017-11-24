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

import {connect} from 'react-redux';
import * as AuthSelector from '../module/selector/AuthSelector';
import React from 'react';
import ROUTE from '../route';
import {Redirect} from 'react-router';

const hasValidAccountData = account => !account.name || !account.email || !account.password;

const hasValidTeamData = ({team}) => !team || !team.name;

const createTeamRedirect = <Redirect to={ROUTE.CREATE_TEAM} />;

function Page({hasAccountData, hasTeamData, account, children}) {
  if (hasAccountData && hasValidAccountData(account)) {
    return createTeamRedirect;
  }
  if (hasTeamData && hasValidTeamData(account)) {
    return createTeamRedirect;
  }
  return children;
}

export default connect(state => ({
  account: AuthSelector.getAccount(state),
}))(Page);
