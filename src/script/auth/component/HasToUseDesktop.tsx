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

import {useIntl} from 'react-intl';

import {Runtime} from '@wireapp/commons';
import {Container, H2, H3} from '@wireapp/react-ui-kit';

import {WirelessContainer} from './WirelessContainer';

import {Config} from '../../Config';
import {unsupportedJoinStrings, unsupportedStrings} from '../../strings';

const hasToUseDesktopApplication = () =>
  !Runtime.isDesktopApp() && Config.getConfig().FEATURE.ENABLE_ENFORCE_DESKTOP_APPLICATION_ONLY;

interface UnsupportedBrowserProps extends React.HTMLProps<HTMLDivElement> {
  isTemporaryGuest?: boolean;
}

export const HasToUseDesktop = ({children, isTemporaryGuest}: UnsupportedBrowserProps) => {
  const {formatMessage: _} = useIntl();
  if (hasToUseDesktopApplication() && !isTemporaryGuest && !Runtime.isMobileOS()) {
    return (
      <WirelessContainer>
        <Container verticalCenter>
          <H2 css={{fontWeight: 500, marginBottom: 10, marginTop: 0}} data-uie-name="element-unsupported-headline">
            {_(isTemporaryGuest ? unsupportedJoinStrings.unsupportedJoinHeadline : unsupportedStrings.headlineBrowser, {
              brandName: Config.getConfig().BRAND_NAME,
            })}
          </H2>
          <H3 css={{marginBottom: 10}} data-uie-name="element-unsupported-desktop-only">
            {_(unsupportedStrings.desktopOnlyMessage, {brandName: Config.getConfig().BRAND_NAME})}
          </H3>
        </Container>
      </WirelessContainer>
    );
  }

  return <>{children}</>;
};
