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

import {Navigate} from 'react-router-dom';

import {Runtime} from '@wireapp/commons';
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
  TeamIcon,
  Text,
} from '@wireapp/react-ui-kit';

import {t} from 'Util/LocalizerUtil';

import {Page} from './Page';

import {Config} from '../../Config';
import {RouterLink} from '../component/RouterLink';
import {ROUTE} from '../route';
import {pathWithParams} from '../util/urlUtil';

type Props = React.HTMLProps<HTMLDivElement>;

const SetAccountType = ({}: Props) => {
  const isMacOsWrapper = Runtime.isDesktopApp() && Runtime.isMacOS();

  const backArrow = (
    <RouterLink to={ROUTE.INDEX} data-uie-name="go-index" aria-label={t('index.goBack')}>
      <ArrowIcon direction="left" color={COLOR.TEXT} style={{opacity: 0.56}} />
    </RouterLink>
  );

  const iconStyles: React.CSSProperties = {
    alignItems: 'center',
    borderRadius: '50%',
    display: 'flex',
    height: 72,
    justifyContent: 'center',
    margin: '0 auto',
    width: 72,
  };

  return (
    <Page>
      {(Config.getConfig().FEATURE.ENABLE_DOMAIN_DISCOVERY ||
        Config.getConfig().FEATURE.ENABLE_SSO ||
        Config.getConfig().FEATURE.ENABLE_ACCOUNT_REGISTRATION) && (
        <IsMobile>
          <div style={{margin: 16}}>{backArrow}</div>
        </IsMobile>
      )}
      {!Config.getConfig().FEATURE.ENABLE_ACCOUNT_REGISTRATION && (
        <Navigate to={pathWithParams(ROUTE.INDEX)} replace data-uie-name="redirect-login" />
      )}
      {isMacOsWrapper && (
        <Navigate to={pathWithParams(ROUTE.CREATE_ACCOUNT)} replace data-uie-name="redirect-register-personal" />
      )}
      <Container centerText verticalCenter style={{width: '100%'}}>
        <Columns>
          <IsMobile not>
            <Column style={{display: 'flex'}}>
              <div style={{margin: 'auto'}}>{backArrow}</div>
            </Column>
          </IsMobile>
          <Column style={{flexBasis: 384, flexGrow: 0, padding: 0}}>
            <Column>
              <Logo scale={1.68} data-uie-name="ui-wire-logo" />
            </Column>
            <Columns style={{margin: '70px auto'}}>
              <Column style={{marginLeft: isMacOsWrapper ? 0 : 16}}>
                <RouterLink to={ROUTE.CREATE_ACCOUNT} data-uie-name="go-register-personal">
                  <div
                    style={{
                      ...iconStyles,
                      background: COLOR.GREEN,
                    }}
                  >
                    <ProfileIcon height={31} width={31} color={'white'} />
                  </div>
                  <Bold fontSize="24px" color={COLOR.LINK}>
                    {t('index.createAccountForPersonalUse')}
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
                    {t('index.createPersonalAccount')}
                  </Text>
                </RouterLink>
              </Column>
              <Column>
                <Link
                  href={`${Config.getConfig().URL.TEAMS_BASE}/register/email`}
                  target="_blank"
                  data-uie-name="go-register-team"
                >
                  <div
                    style={{
                      ...iconStyles,
                      background: COLOR.BLUE,
                    }}
                  >
                    <TeamIcon height={31} width={31} color={'white'} />
                  </div>
                  <Bold fontSize="24px" color={COLOR.LINK}>
                    {t('index.createAccountForOrganizations')}
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
                    {t('index.createTeam')}
                  </Text>
                </Link>
              </Column>
            </Columns>
          </Column>
          <Column />
        </Columns>
      </Container>
      <IsMobile>
        <div style={{minWidth: 48}} />
      </IsMobile>
    </Page>
  );
};

export {SetAccountType};
