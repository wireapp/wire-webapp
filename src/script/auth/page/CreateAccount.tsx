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

import {useNavigate} from 'react-router-dom';

import {ArrowIcon, COLOR, Column, Columns, Container, ContainerXS, H1, IsMobile} from '@wireapp/react-ui-kit';

import {t} from 'Util/LocalizerUtil';

import {Page} from './Page';

import {Config} from '../../../script/Config';
import {AccountForm} from '../component/AccountForm';
import {RouterLink} from '../component/RouterLink';
import {ROUTE} from '../route';

type Props = React.HTMLProps<HTMLDivElement>;

const CreateAccount = ({}: Props) => {
  const navigate = useNavigate();
  const backArrow = (
    <RouterLink to={ROUTE.CREATE_TEAM} data-uie-name="go-register-team">
      <ArrowIcon direction="left" color={COLOR.TEXT} style={{opacity: 0.56}} />
    </RouterLink>
  );

  return (
    <Page hasTeamData>
      <IsMobile>
        <div style={{margin: 16}}>{backArrow}</div>
      </IsMobile>
      <Container centerText verticalCenter style={{width: '100%'}}>
        <Columns>
          <IsMobile not>
            <Column style={{display: 'flex'}}>
              <div style={{margin: 'auto'}}>{backArrow}</div>
            </Column>
          </IsMobile>
          <Column style={{flexBasis: 384, flexGrow: 0, padding: 0}}>
            <ContainerXS
              centerText
              style={{display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 428}}
            >
              <H1 center>{t('createAccount.headLine')}</H1>
              <AccountForm
                onSubmit={() => {
                  if (Config.getConfig().FEATURE.ENABLE_EXTRA_CLIENT_ENTROPY) {
                    navigate(ROUTE.SET_ENTROPY);
                  } else {
                    navigate(ROUTE.VERIFY_EMAIL_CODE);
                  }
                }}
                submitText={t('createAccount.nextButton')}
              />
            </ContainerXS>
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

export {CreateAccount};
