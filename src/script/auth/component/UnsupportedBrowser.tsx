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

import {MessageDescriptor, useIntl} from 'react-intl';
import {connect} from 'react-redux';

import {Runtime} from '@wireapp/commons';
import {Container, ContainerXS, H1, H2, H3, Loading, Logo, Text} from '@wireapp/react-ui-kit';

import {WirelessContainer} from './WirelessContainer';

import {Config} from '../../Config';
import {unsupportedJoinStrings, unsupportedStrings} from '../../strings';
import {RootState} from '../module/reducer';
import * as RuntimeSelector from '../module/selector/RuntimeSelector';

interface UnsupportedProps extends React.HTMLProps<HTMLDivElement> {
  headline: MessageDescriptor;
  subhead: MessageDescriptor;
}

const UnsupportedMessage: React.FC<UnsupportedProps> = ({headline, subhead}) => {
  const {formatMessage: _} = useIntl();
  return (
    <ContainerXS verticalCenter centerText>
      <Logo height={20} />
      <H1 center css={{marginBottom: 48, marginTop: 24}}>
        {_(headline, {brandName: Config.getConfig().BRAND_NAME})}
      </H1>
      <Text center>{_(subhead, {brandName: Config.getConfig().BRAND_NAME})}</Text>
    </ContainerXS>
  );
};

export interface UnsupportedBrowserProps extends React.HTMLProps<HTMLDivElement> {
  isTemporaryGuest?: boolean;
}

export const UnsupportedBrowserComponent = ({
  children,
  hasCookieSupport,
  hasIndexedDbSupport,
  isCheckingSupport,
  isSupportedBrowser,
  isTemporaryGuest,
  hasToUseDesktopApplication,
}: UnsupportedBrowserProps & ConnectedProps) => {
  const {formatMessage: _} = useIntl();
  if (!isSupportedBrowser) {
    return (
      <WirelessContainer>
        <Container verticalCenter>
          <H2 css={{fontWeight: 500, marginBottom: 10, marginTop: 0}} data-uie-name="element-unsupported-headline">
            {_(isTemporaryGuest ? unsupportedJoinStrings.unsupportedJoinHeadline : unsupportedStrings.headlineBrowser, {
              brandName: Config.getConfig().BRAND_NAME,
            })}
            {Runtime.getBrowserName()}
          </H2>
          {isTemporaryGuest && Runtime.isMobileOS() ? (
            <H3 css={{marginBottom: 10}} data-uie-name="element-unsupported-mobile-guest">
              {_(unsupportedJoinStrings.unsupportedJoinMobileSubhead)}
            </H3>
          ) : hasToUseDesktopApplication ? (
            <H3 css={{marginBottom: 10}} data-uie-name="element-unsupported-desktop-only">
              {_(unsupportedStrings.desktopOnlyMessage, {brandName: Config.getConfig().BRAND_NAME})}
            </H3>
          ) : (
            <H3 css={{marginBottom: 10}} data-uie-name="element-unsupported-general">
              {_(unsupportedStrings.subheadBrowser, {
                strong: (...chunks: any[]) => <strong style={{fontWeight: 800}}>{chunks}</strong>,
              })}
            </H3>
          )}
        </Container>
      </WirelessContainer>
    );
  }

  if (isCheckingSupport) {
    return (
      <ContainerXS centerText verticalCenter css={{justifyContent: 'center'}}>
        <Loading />
      </ContainerXS>
    );
  }

  if (!hasCookieSupport) {
    return (
      <UnsupportedMessage headline={unsupportedStrings.headlineCookies} subhead={unsupportedStrings.subheadCookies} />
    );
  }

  if (!hasIndexedDbSupport) {
    return (
      <UnsupportedMessage
        headline={unsupportedStrings.headlineIndexedDb}
        subhead={unsupportedStrings.subheadIndexedDb}
      />
    );
  }

  return <>{children}</>;
};

type ConnectedProps = ReturnType<typeof mapStateToProps>;
const mapStateToProps = (state: RootState) => ({
  hasCookieSupport: RuntimeSelector.hasCookieSupport(state),
  hasIndexedDbSupport: RuntimeSelector.hasIndexedDbSupport(state),
  hasToUseDesktopApplication: RuntimeSelector.hasToUseDesktopApplication(state),
  isCheckingSupport: RuntimeSelector.isChecking(state),
  isSupportedBrowser: RuntimeSelector.isSupportedBrowser(state),
});

const UnsupportedBrowser = connect(mapStateToProps)(UnsupportedBrowserComponent);

export {UnsupportedBrowser};
