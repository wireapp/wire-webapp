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

import {Link, Small, Logo, Container, Header, Footer, Content} from '@wireapp/react-ui-kit';
import {footerStrings} from '../../strings';
import {injectIntl} from 'react-intl';
import ROUTE from '../route';
import React from 'react';

export const WirelessContainer = ({children, intl: {formatMessage: _}}) => (
  <Container
    style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      width: '100%',
    }}
  >
    <Header style={{height: '40px', marginLeft: '8px', marginTop: '20px'}}>
      <Logo width={72} />
    </Header>
    <Content style={{flex: '1', paddingLeft: '8px', width: '520px'}}>{children}</Content>
    <Footer style={{height: '30px', justifyContent: 'flex-end', margin: '0 0 18px 8px'}}>
      <Link href={ROUTE.WIRE_ROOT}>{_(footerStrings.wireLink)}</Link>
      <Small> &middot; {_(footerStrings.copy)}</Small>
    </Footer>
  </Container>
);

export default injectIntl(WirelessContainer);
