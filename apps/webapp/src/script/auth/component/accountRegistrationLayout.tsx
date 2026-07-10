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

import {CheckRoundIcon, COLOR_V2, FlexBox, Logo, Text} from '@wireapp/react-ui-kit';

import {useApplicationContext} from 'src/script/page/rootProvider';

import {
  bodyCss,
  contentContainerCss,
  leftSectionCss,
  registrationLayoutSubHeaderContainerCss,
  registrationLayoutSubHeaderCss,
  registrationLayoutContainerCss,
  whiteFontCss,
  registrationLayoutListItemContainerCss,
  registrationLayoutListItemIconCss,
} from './layout.styles';

export const AccountRegistrationLayout = ({children}: {children: ReactNode}) => {
  const {translate} = useApplicationContext();
  const featureList = [
    translate('registrationLayout.listItem1'),
    translate('registrationLayout.listItem2'),
    translate('registrationLayout.listItem3'),
  ];

  return (
    <FlexBox css={bodyCss}>
      <div css={leftSectionCss}>
        <Logo color={COLOR_V2.WHITE} scale={1.9} ariaLabel={translate('accessibility.logo.wire')} />
        <div css={registrationLayoutContainerCss}>
          <Text bold css={whiteFontCss} fontSize="1.5rem">
            {translate('registrationLayout.header')}
          </Text>
          <br />
          <div css={registrationLayoutSubHeaderContainerCss}>
            <Text css={registrationLayoutSubHeaderCss}>{translate('registrationLayout.subhead')}</Text>
          </div>

          {featureList.map(item => (
            <div key={item} css={registrationLayoutListItemContainerCss}>
              <CheckRoundIcon
                css={registrationLayoutListItemIconCss}
                width={16}
                height={16}
                color={COLOR_V2.GREEN_DARK_500}
              />
              <Text css={whiteFontCss}>{item}</Text>
            </div>
          ))}

          <div css={registrationLayoutSubHeaderContainerCss}>
            <Text css={registrationLayoutSubHeaderCss}>{translate('registrationLayout.footer')}</Text>
          </div>
        </div>
        <span aria-hidden="true">
          <WavesPattern />
        </span>
      </div>

      <div css={contentContainerCss}>{children}</div>
    </FlexBox>
  );
};
