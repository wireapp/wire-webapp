/*
 * Wire
 * Copyright (C) 2020 Wire Swiss GmbH
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

import {Button, ContainerXS, Logo} from '@wireapp/react-ui-kit';
import React from 'react';
import useReactRouter from 'use-react-router';
import {Config} from '../../Config';
import {ROUTE} from '../route';
import Page from './Page';

interface Props extends React.HTMLProps<HTMLDivElement> {}

const Index = ({}: Props) => {
  const {history} = useReactRouter();
  return (
    <Page>
      <ContainerXS centerText verticalCenter>
        <Logo scale={1.68} data-uie-name="ui-wire-logo" />
        {Config.FEATURE.ENABLE_ACCOUNT_REGISTRATION && (
          <Button onClick={() => history.push(ROUTE.SET_ACCOUNT_TYPE)} block data-uie-name="go-set-account-type">
            {'Create account'}
          </Button>
        )}
        <Button onClick={() => history.push(ROUTE.LOGIN)} block data-uie-name="go-login">
          {'Login'}
        </Button>
        <Button onClick={() => history.push(ROUTE.SSO)} block data-uie-name="go-sso-login">
          {'Enterprise login'}
        </Button>
      </ContainerXS>
    </Page>
  );
};

export default Index;
