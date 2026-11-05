/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import {ReactNode} from 'react';

import {WavesPattern} from '@wireapp/react-ui-kit/lib/images/wavesPattern';

import {Bold, COLOR_V2, FlexBox, Link, Logo, Text} from '@wireapp/react-ui-kit';

import {ShieldIcon} from 'Components/icon';
import {useApplicationContext} from 'src/script/page/rootProvider';

import {bodyCss, contentContainerCss, leftSectionCss, whiteFontCss, setupSidebarStyles} from './layout.styles';

import {Config} from '../../Config';

interface LayoutProps {
  children: ReactNode;
  variant?: 'login' | 'two-factor';
  activeStep?: number;
}

export const Layout = ({children, variant = 'login', activeStep = 0}: LayoutProps) => {
  const {translate} = useApplicationContext();
  return (
    <FlexBox css={bodyCss}>
      <div css={leftSectionCss}>
        {variant === 'two-factor' ? (
          <aside css={setupSidebarStyles}>
            <div>
              <div className="two-factor-sidebar-icon">
                <ShieldIcon aria-hidden="true" />
              </div>
              <h2>{translate('preferencesSecurityProtectAccount')}</h2>
              <p>{translate('preferencesSecurityProtectAccountDetail')}</p>
            </div>
            <ol>
              {[
                translate('preferencesSecurityLinkAppStep'),
                translate('preferencesSecurityEnterCodeStep'),
                translate('preferencesSecuritySaveRecoveryCodes'),
              ].map((label, index) => {
                return (
                  <li
                    key={label}
                    className={index + 1 <= activeStep ? 'active' : ''}
                    aria-current={index + 1 === activeStep ? 'step' : false}
                  >
                    <span>{index + 1}</span>
                    {label}
                  </li>
                );
              })}
            </ol>
          </aside>
        ) : (
          <>
            <Logo color={COLOR_V2.WHITE} scale={1.9} ariaLabel={translate('accessibility.logo.wire')} />
            <div css={{margin: '4rem 0'}}>
              <Text bold css={whiteFontCss} fontSize="1.5rem">
                {translate('layoutSidebarHeader')}
              </Text>
              <br />
              <div css={{marginTop: '0.5rem'}}>
                <Text css={{...whiteFontCss, lineHeight: '1.5rem'}}>{translate('layoutSidebarContent')}</Text>
                <br />
                <Link href={Config.getConfig().URL.WEBSITE_BASE} target="_blank" rel="noopener noreferrer">
                  <Bold css={{...whiteFontCss, textDecoration: 'underline'}}> {translate('layoutSidebarLink')}</Bold>
                </Link>
              </div>
            </div>
            <span aria-hidden="true">
              <WavesPattern />
            </span>
          </>
        )}
      </div>

      <div css={contentContainerCss}>{children}</div>
    </FlexBox>
  );
};
