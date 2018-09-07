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

import {getLanguage} from '../module/selector/LanguageSelector';
import React, {Component} from 'react';
import {ROUTE} from '../route';
import {isDesktopApp, isMacOS} from '../Runtime';
import {
  Link,
  Text,
  Bold,
  ProfileIcon,
  RoundContainer,
  TeamIcon,
  Logo,
  COLOR,
  Columns,
  Column,
  ContainerXS,
} from '@wireapp/react-ui-kit';
import {connect} from 'react-redux';
import {indexStrings} from '../../strings';
import {injectIntl} from 'react-intl';
import Page from './Page';

class Index extends Component {
  onRegisterPersonalClick = () => {
    this.props.history.push(ROUTE.CREATE_ACCOUNT);
  };

  onRegisterTeamClick = () => {
    this.props.history.push(ROUTE.CREATE_TEAM);
  };

  onLoginClick = () => {
    this.props.history.push(ROUTE.LOGIN);
  };

  render() {
    const {
      intl: {formatMessage: _},
    } = this.props;
    const isMacOsWrapper = isDesktopApp() && isMacOS();
    return (
      <Page>
        <ContainerXS centerText verticalCenter>
          <Logo scale={1.68} data-uie-name="ui-wire-logo" />
          <Columns style={{margin: '70px auto'}}>
            <Column style={{marginLeft: isMacOsWrapper ? 0 : 16}}>
              <Link onClick={this.onRegisterPersonalClick} data-uie-name="go-register-personal">
                <RoundContainer color={COLOR.GREEN} style={{marginBottom: 12}}>
                  <ProfileIcon color={COLOR.WHITE} />
                </RoundContainer>
                <Bold fontSize="24px" color={COLOR.LINK}>
                  {_(indexStrings.createAccountForPersonalUse)}
                </Bold>
                <br />
                <Text light fontSize="16px" color={COLOR.LINK} style={{lineHeight: '36px'}}>
                  {_(indexStrings.createPersonalAccount)}
                </Text>
              </Link>
            </Column>
            {!isMacOsWrapper && (
              <Column>
                <Link onClick={this.onRegisterTeamClick} data-uie-name="go-register-team">
                  <RoundContainer style={{marginBottom: 12}}>
                    <TeamIcon color={COLOR.WHITE} />
                  </RoundContainer>
                  <Bold fontSize="24px" color={COLOR.LINK}>
                    {_(indexStrings.createAccountForOrganizations)}
                  </Bold>
                  <br />
                  <Text light fontSize="16px" color={COLOR.LINK} style={{lineHeight: '36px'}}>
                    {_(indexStrings.createTeam)}
                  </Text>
                </Link>
              </Column>
            )}
          </Columns>
          <Text>{_(indexStrings.loginInfo)}</Text>
          <br />
          <Link fontSize="24px" textTransform="none" onClick={this.onLoginClick} data-uie-name="go-login">
            {_(indexStrings.login)}
          </Link>
        </ContainerXS>
      </Page>
    );
  }
}

export default injectIntl(
  connect(
    state => ({language: getLanguage(state)}),
    null
  )(Index)
);
