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

import {CloseIcon, Content, Footer, Header, Link, Logo, Small} from '@wireapp/react-ui-kit';
import * as React from 'react';
import {FormattedHTMLMessage, InjectedIntlProps, injectIntl} from 'react-intl';
import {cookiePolicyStrings, footerStrings} from '../../strings';
import EXTERNAL_ROUTE from '../externalRoute';

export interface Props extends React.HTMLAttributes<HTMLDivElement> {
  showCookiePolicyBanner?: boolean;
  onCookiePolicyBannerClose?: (event: React.MouseEvent<HTMLDivElement>) => void;
}

export const WirelessContainer: React.SFC<Props & InjectedIntlProps> = ({
  showCookiePolicyBanner,
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
        <div style={{margin: '16px 40px', textAlign: 'center', width: '100%'}}>
          <Link
            onClick={onCookiePolicyBannerClose}
            href={EXTERNAL_ROUTE.WIRE_PRIVACY_POLICY}
            style={{fontSize: '16px'}}
            target="_blank"
            textTransform="none"
            bold={false}
            data-uie-name="go-privacy"
          >
            <FormattedHTMLMessage {...cookiePolicyStrings.bannerText} />
          </Link>
        </div>
        <div
          onClick={onCookiePolicyBannerClose}
          style={{cursor: 'pointer', padding: '16px', position: 'absolute', right: 0, top: 0}}
          data-uie-name="do-close-cookie-banner"
        >
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
        <Link href={EXTERNAL_ROUTE.WIRE_WEBSITE}>{_(footerStrings.wireLink)}</Link>
        <Small> &middot; {_(footerStrings.copy)}</Small>
      </Footer>
    </Content>
  </div>
);

export default injectIntl(WirelessContainer);
