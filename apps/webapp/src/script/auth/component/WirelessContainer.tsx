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

import {LogoFullIcon} from 'Components/Icon';
import {FormattedMessage} from 'react-intl';
import {t} from 'Util/LocalizerUtil';

import {CloseIcon, Content, Footer, Header, Link, Small} from '@wireapp/react-ui-kit';

import {Config} from '../../Config';
import {EXTERNAL_ROUTE} from '../externalRoute';

interface WirelessContainerProps {
  children: React.ReactNode;
  onCookiePolicyBannerClose?: (event: React.MouseEvent<HTMLElement>) => void;
  showCookiePolicyBanner?: boolean;
}

const WirelessContainer = ({showCookiePolicyBanner, onCookiePolicyBannerClose, children}: WirelessContainerProps) => {
  return (
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
              onClick={(event: React.MouseEvent<HTMLAnchorElement>) => onCookiePolicyBannerClose?.(event)}
              href={Config.getConfig().URL.PRIVACY_POLICY}
              style={{fontSize: '1rem'}}
              target="_blank"
              textTransform="none"
              bold={false}
              data-uie-name="go-privacy"
            >
              <FormattedMessage
                id="cookiePolicyStrings.bannerText"
                values={{
                  newline: <br />,
                  strong: (...chunks: any[]) => <strong>{chunks}</strong>,
                }}
              />
            </Link>
          </div>
          <button
            type="button"
            onClick={(event: React.MouseEvent<HTMLButtonElement>) => onCookiePolicyBannerClose?.(event)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '16px',
              position: 'absolute',
              right: 0,
              top: 0,
            }}
            data-uie-name="do-close-cookie-banner"
          >
            <CloseIcon />
          </button>
        </Header>
      )}
      <Content>
        <Header style={{height: '40px', marginLeft: '8px', marginTop: '20px'}}>
          <LogoFullIcon width={70} height={22} />
        </Header>
        <Content style={{flex: '1', paddingLeft: '8px', width: '100%'}}>{children}</Content>
        <Footer style={{height: '30px', justifyContent: 'flex-end', margin: '0 0 18px 8px'}}>
          <Link href={EXTERNAL_ROUTE.WIRE_WEBSITE}>{Config.getConfig().WEBSITE_LABEL}</Link>
          <Small> &middot; {t('footer.copy')}</Small>
        </Footer>
      </Content>
    </div>
  );
};

export {WirelessContainer};
