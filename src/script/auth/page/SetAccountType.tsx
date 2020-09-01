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
  ArrowIcon,
  Bold,
  COLOR,
  Column,
  Columns,
  Container,
  IsMobile,
  Link,
  Logo,
  ProfileIcon,
  RoundIconButton,
  TeamIcon,
  Text,
} from '@wireapp/react-ui-kit';
import React from 'react';
import {useIntl} from 'react-intl';
import {Redirect} from 'react-router';
import useReactRouter from 'use-react-router';
import {Config} from '../../Config';
import {setAccountTypeStrings} from '../../strings';
import RouterLink from '../component/RouterLink';
import {ROUTE} from '../route';
import {Runtime} from '@wireapp/commons';
import {pathWithParams} from '../util/urlUtil';
import Page from './Page';

interface Props extends React.HTMLProps<HTMLDivElement> {}

const SetAccountType = ({}: Props) => {
  const {formatMessage: _} = useIntl();
  const {history} = useReactRouter();
  const isMacOsWrapper = Runtime.isDesktopApp() && Runtime.isMacOS();

  const backArrow = (
    <RouterLink to={ROUTE.INDEX} data-uie-name="go-index">
      <ArrowIcon direction="left" color={COLOR.TEXT} style={{opacity: 0.56}} />
    </RouterLink>
  );
  return (
    <Page>
      {!Config.getConfig().FEATURE.ENABLE_ACCOUNT_REGISTRATION && (
        <Redirect to={pathWithParams(ROUTE.INDEX)} data-uie-name="redirect-login" />
      )}
      {isMacOsWrapper && (
        <Redirect to={pathWithParams(ROUTE.CREATE_ACCOUNT)} data-uie-name="redirect-register-personal" />
      )}
      <Container centerText verticalCenter style={{width: '100%'}}>
        <Columns>
          <IsMobile not>
            <Column style={{display: 'flex'}}>
              <div style={{margin: 'auto'}}>{backArrow}</div>
            </Column>
          </IsMobile>
          <Column style={{flexBasis: 384, flexGrow: 0, padding: 0}}>
            <Logo scale={1.68} data-uie-name="ui-wire-logo" />
            <Columns style={{margin: '70px auto'}}>
              <Column style={{marginLeft: isMacOsWrapper ? 0 : 16}}>
                <Link onClick={() => history.push(ROUTE.CREATE_ACCOUNT)} data-uie-name="go-register-personal">
                  <RoundIconButton backgroundColor={COLOR.GREEN} style={{marginBottom: 12}} size={72}>
                    <ProfileIcon height={31} width={31} />
                  </RoundIconButton>
                  <Bold fontSize="24px" color={COLOR.LINK}>
                    {_(setAccountTypeStrings.createAccountForPersonalUse)}
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
                    {_(setAccountTypeStrings.createPersonalAccount)}
                  </Text>
                </Link>
              </Column>
              <Column>
                <Link onClick={() => history.push(ROUTE.CREATE_TEAM)} data-uie-name="go-register-team">
                  <RoundIconButton style={{marginBottom: 12}} size={72}>
                    <TeamIcon height={31} width={31} />
                  </RoundIconButton>
                  <Bold fontSize="24px" color={COLOR.LINK}>
                    {_(setAccountTypeStrings.createAccountForOrganizations)}
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
                    {_(setAccountTypeStrings.createTeam)}
                  </Text>
                </Link>
              </Column>
            </Columns>
          </Column>
          <Column />
        </Columns>
      </Container>
    </Page>
  );
};

export default SetAccountType;
