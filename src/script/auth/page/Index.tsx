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

import {
  Bold,
  COLOR,
  Column,
  Columns,
  ContainerXS,
  ICON_NAME,
  Link,
  Logo,
  RoundIconButton,
  Text,
} from '@wireapp/react-ui-kit';
import * as React from 'react';
import {InjectedIntlProps, injectIntl} from 'react-intl';
import {connect} from 'react-redux';
import {Redirect, RouteComponentProps} from 'react-router';
import {indexStrings} from '../../strings';
import {Config} from '../config';
import {RootState, ThunkDispatch} from '../module/reducer';
import * as LanguageSelector from '../module/selector/LanguageSelector';
import {ROUTE} from '../route';
import {isDesktopApp, isMacOS} from '../Runtime';
import {pathWithParams} from '../util/urlUtil';
import {Page} from './Page';

interface Props extends React.HTMLAttributes<_Index>, RouteComponentProps {}

interface ConnectedProps {
  language: string;
}

interface DispatchProps {}

interface State {}

class _Index extends React.Component<Props & ConnectedProps & DispatchProps & InjectedIntlProps, State> {
  onRegisterPersonalClick = () => {
    this.props.history.push(ROUTE.CREATE_ACCOUNT);
  };

  onRegisterTeamClick = () => {
    this.props.history.push(ROUTE.CREATE_TEAM);
  };

  onLoginClick = () => {
    this.props.history.push(ROUTE.LOGIN);
  };

  render(): JSX.Element {
    const {
      intl: {formatMessage: _},
    } = this.props;
    const isMacOsWrapper = isDesktopApp() && isMacOS();
    return (
      <Page>
        {!Config.FEATURE.ENABLE_ACCOUNT_REGISTRATION && (
          <Redirect to={pathWithParams(ROUTE.LOGIN)} data-uie-name="redirect-login" />
        )}
        <ContainerXS centerText verticalCenter>
          <Logo scale={1.68} data-uie-name="ui-wire-logo" />
          <Columns style={{margin: '70px auto'}}>
            <Column style={{marginLeft: isMacOsWrapper ? 0 : 16}}>
              <Link onClick={this.onRegisterPersonalClick} data-uie-name="go-register-personal">
                <RoundIconButton
                  icon={ICON_NAME.PROFILE}
                  backgroundColor={COLOR.GREEN}
                  style={{marginBottom: 12}}
                  size={72}
                  iconHeight={31}
                  iconWidth={31}
                />
                <Bold fontSize="24px" color={COLOR.LINK}>
                  {_(indexStrings.createAccountForPersonalUse)}
                </Bold>
                <br />
                <Text
                  block
                  center
                  light
                  fontSize="16px"
                  color={COLOR.LINK}
                  style={{
                    marginTop: 8,
                  }}
                >
                  {_(indexStrings.createPersonalAccount)}
                </Text>
              </Link>
            </Column>
            {!isMacOsWrapper && (
              <Column>
                <Link onClick={this.onRegisterTeamClick} data-uie-name="go-register-team">
                  <RoundIconButton
                    style={{marginBottom: 12}}
                    size={72}
                    icon={ICON_NAME.TEAM}
                    iconHeight={31}
                    iconWidth={31}
                  />
                  <Bold fontSize="24px" color={COLOR.LINK}>
                    {_(indexStrings.createAccountForOrganizations)}
                  </Bold>
                  <br />
                  <Text
                    block
                    center
                    light
                    fontSize="16px"
                    color={COLOR.LINK}
                    style={{
                      marginTop: 8,
                    }}
                  >
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

export const Index = injectIntl(
  connect(
    (state: RootState): ConnectedProps => {
      return {language: LanguageSelector.getLanguage(state)};
    },
    (dispatch: ThunkDispatch): DispatchProps => {
      return {};
    }
  )(_Index)
);
