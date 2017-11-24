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
import React, {Component} from 'react';
import ROUTE from '../route';

class Page extends Component {
  restartTeamRegistrationFlow = () => {
    window.location = ROUTE.CREATE_TEAM;
  };

  checkAccountData = account => {
    if (!account.name || !account.email || !account.password) {
      this.restartTeamRegistrationFlow();
    }
  };

  checkTeamData = account => {
    const {team} = account;
    if (!team || !team.name) {
      this.restartTeamRegistrationFlow();
    }
  };

  render() {
    const checkAccountData = this.props.hasAccountData;
    const checkTeamData = this.props.hasTeamData;

    return (
      <div>
        {checkAccountData && this.checkAccountData(this.props.account)}
        {checkTeamData && this.checkTeamData(this.props.account)}
        {this.props.children}
      </div>
    );
  }
}

export default connect(state => ({
  account: AuthSelector.getAccount(state),
}))(Page);
