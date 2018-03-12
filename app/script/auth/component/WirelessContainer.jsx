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

import {Link, Small, Logo, Header, Footer, Content, CloseIcon, CheckIcon} from '@wireapp/react-ui-kit';
import {footerStrings, cookiePolicyStrings} from '../../strings';
import {injectIntl, FormattedHTMLMessage} from 'react-intl';
import EXTERNAL_ROUTE from '../externalRoute';
import React from 'react';

export const WirelessContainer = ({
  showCookiePolicyBanner,
  onCookiePolicyBannerAccept,
  onCookiePolicyBannerClose,
  children,
  intl: {formatMessage: _},
}) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      width: '100%',
    }}
  >
    {showCookiePolicyBanner && (
      <Header
        style={{
          backgroundColor: 'rgba(254, 191, 2, 0.2)',
          display: 'flex',
          height: 'auto',
          margin: '0',
        }}
      >
        <div style={{margin: '16px 16px', textAlign: 'center', width: '100%'}}>
          <Link href={EXTERNAL_ROUTE.WIRE_PRIVACY_POLICY} style={{fontSize: '16px'}} textTransform="none" bold={false}>
            <FormattedHTMLMessage style={{textAlign: 'center'}} {...cookiePolicyStrings.bannerText} />
          </Link>
        </div>
        <div onClick={onCookiePolicyBannerAccept} style={{margin: '20px'}}>
          <CheckIcon />
        </div>
        <div onClick={onCookiePolicyBannerClose} style={{margin: '20px'}}>
          <CloseIcon />
        </div>
      </Header>
    )}
    <Content>
      <Header style={{height: '40px', marginLeft: '8px', marginTop: '20px'}}>
        <Logo width={72} />
      </Header>
      <Content style={{flex: '1', paddingLeft: '8px', width: '100%'}}>{children}</Content>
      <Footer style={{height: '30px', justifyContent: 'flex-end', margin: '0 0 18px 8px'}}>
        <Link href={EXTERNAL_ROUTE.WIRE_ROOT}>{_(footerStrings.wireLink)}</Link>
        <Small> &middot; {_(footerStrings.copy)}</Small>
      </Footer>
    </Content>
  </div>
);

export default injectIntl(WirelessContainer);
