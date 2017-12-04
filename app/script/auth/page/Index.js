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

import * as TrackingAction from '../module/action/TrackingAction';
import React, {Component} from 'react';
import ROUTE from '../route';
import {Columns, Column, ContainerXS} from '@wireapp/react-ui-kit/Layout';
import {connect} from 'react-redux';
import {indexStrings} from '../../strings';
import {injectIntl} from 'react-intl';
import {Logo, COLOR} from '@wireapp/react-ui-kit/Identity';
import {ProfileIcon, RoundContainer, TeamIcon} from '@wireapp/react-ui-kit/Icon';
import {Link, Paragraph, Text, Bold} from '@wireapp/react-ui-kit/Text';

class Index extends Component {
  componentDidMount() {
    this.props.trackEvent({name: TrackingAction.EVENT_NAME.START.OPENED_START_SCREEN});
  }

  onRegisterPersonalClick = () =>
    this.trackAndNavigate(
      TrackingAction.EVENT_NAME.START.OPENED_PERSONAL_REGISTRATION,
      `${ROUTE.LOGIN}?hl=${this.props.language}#register`
    );

  onRegisterTeamClick = () => {
    return Promise.resolve()
      .then(() => this.props.trackEvent({name: TrackingAction.EVENT_NAME.START.OPENED_TEAM_REGISTRATION}))
      .then(() => this.props.history.push(ROUTE.CREATE_TEAM));
  };

  onLoginClick = () => {
    const searchParams = window.location.search;
    this.trackAndNavigate(TrackingAction.EVENT_NAME.START.OPENED_LOGIN, `${ROUTE.LOGIN}${searchParams}#login`);
  };

  trackAndNavigate = (eventName, url) => {
    return Promise.resolve()
      .then(() => this.props.trackEvent({name: eventName}))
      .then(() => (window.location = url));
  };

  render() {
    const {intl: {formatMessage: _}} = this.props;
    return (
      <ContainerXS centerText verticalCenter>
        <Logo id="wire-logo" scale={1.68} />
        <Paragraph center>{_(indexStrings.claim)}</Paragraph>
        <Columns style={{margin: '70px auto'}}>
          <Column>
            <Link data-uie-name="go-register-personal" onClick={this.onRegisterPersonalClick}>
              <RoundContainer style={{marginBottom: 12}}>
                <ProfileIcon color={COLOR.WHITE} />
              </RoundContainer>
              <Bold fontSize="24px" color={COLOR.LINK}>
                {_(indexStrings.createAccount)}
              </Bold>
              <br />
              <Text light fontSize="16px" color={COLOR.LINK} style={{lineHeight: '36px'}}>
                {_(indexStrings.createAccountFor)}
              </Text>
            </Link>
          </Column>
          <Column>
            <Link data-uie-name="go-register-team" onClick={this.onRegisterTeamClick}>
              <RoundContainer color={COLOR.GREEN} style={{marginBottom: 12}}>
                <TeamIcon color={COLOR.WHITE} />
              </RoundContainer>
              <Bold fontSize="24px" color={COLOR.LINK}>
                {_(indexStrings.createTeam)}
              </Bold>
              <br />
              <Text light fontSize="16px" color={COLOR.LINK} style={{lineHeight: '36px'}}>
                {_(indexStrings.createTeamFor)}
              </Text>
            </Link>
          </Column>
        </Columns>
        <Text>{_(indexStrings.loginInfo)}</Text>
        <br />
        <Link data-uie-name="go-login" fontSize="24px" textTransform="none" onClick={this.onLoginClick}>
          {_(indexStrings.login)}
        </Link>
      </ContainerXS>
    );
  }
}

export default injectIntl(connect(({languageState}) => ({language: languageState.language}), TrackingAction)(Index));
