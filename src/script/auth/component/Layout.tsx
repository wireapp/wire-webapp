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

import {WavesPattern} from '@wireapp/react-ui-kit/lib/Images/WavesPattern';

import {Bold, COLOR_V2, FlexBox, Link, Logo, Text} from '@wireapp/react-ui-kit';

import {t} from 'Util/LocalizerUtil';

import {bodyCss, contentContainerCss, leftSectionCss, whiteFontCss} from './Layout.styles';

import {Config} from '../../Config';

export const Layout = ({children}: {children: ReactNode}) => {
  return (
    <FlexBox css={bodyCss}>
      <div css={leftSectionCss}>
        <Logo color={COLOR_V2.WHITE} scale={1.9} />
        <div css={{margin: '4rem 0'}}>
          <Text bold css={whiteFontCss} fontSize="1.5rem">
            {t('layoutSidebarHeader')}
          </Text>
          <br />
          <div css={{marginTop: '0.5rem'}}>
            <Text css={{...whiteFontCss, lineHeight: '1.5rem'}}>{t('layoutSidebarContent')}</Text>
            <br />
            <Link href={Config.getConfig().URL.WEBSITE_BASE}>
              <Bold css={{...whiteFontCss, textDecoration: 'underline'}}> {t('layoutSidebarLink')}</Bold>
            </Link>
          </div>
        </div>
        <WavesPattern />
      </div>

      <div css={contentContainerCss}>{children}</div>
    </FlexBox>
  );
};
