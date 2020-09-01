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

import {COLOR, Container, ContainerXS, H1, H2, H3, Loading, Logo, Text} from '@wireapp/react-ui-kit';
import React from 'react';
import {FormattedMessage, MessageDescriptor} from 'react-intl';
import {connect} from 'react-redux';
import {Config} from '../../Config';
import {unsupportedJoinStrings, unsupportedStrings} from '../../strings';
import {RootState} from '../module/reducer';
import * as RuntimeSelector from '../module/selector/RuntimeSelector';
import {Runtime} from '@wireapp/commons';
import WirelessContainer from './WirelessContainer';

interface UnsupportedProps extends React.HTMLProps<HTMLDivElement> {
  headline: MessageDescriptor;
  subhead: MessageDescriptor;
}

const UnsupportedMessage: React.SFC<UnsupportedProps> = ({headline, subhead}) => (
  <ContainerXS verticalCenter centerText>
    <Logo height={20} />
    <H1 center style={{marginBottom: '48px', marginTop: '24px'}}>
      <FormattedMessage {...headline} values={{brandName: Config.getConfig().BRAND_NAME}} />
    </H1>
    <Text center>
      <FormattedMessage {...subhead} values={{brandName: Config.getConfig().BRAND_NAME}} />
    </Text>
  </ContainerXS>
);

export interface Props extends React.HTMLProps<HTMLDivElement> {
  isTemporaryGuest?: boolean;
}

export const UnsupportedBrowser = ({
  children,
  hasCookieSupport,
  hasIndexedDbSupport,
  isCheckingSupport,
  isSupportedBrowser,
  isTemporaryGuest,
}: Props & ConnectedProps) => {
  if (!isSupportedBrowser) {
    return (
      <WirelessContainer>
        <Container verticalCenter>
          <H2 style={{fontWeight: 500, marginBottom: '10px', marginTop: '0'}} color={COLOR.GRAY}>
            <FormattedMessage
              {...(isTemporaryGuest
                ? unsupportedJoinStrings.unsupportedJoinHeadline
                : unsupportedStrings.headlineBrowser)}
              values={{
                brandName: Config.getConfig().BRAND_NAME,
                // eslint-disable-next-line react/display-name
                newline: <br />,
                // eslint-disable-next-line react/display-name
                strong: (...chunks: any[]) => <strong style={{color: 'black'}}>{chunks}</strong>,
              }}
            />
          </H2>
          {isTemporaryGuest && Runtime.isMobileOS() ? (
            <H3 style={{marginBottom: '10px'}}>
              <FormattedMessage {...unsupportedJoinStrings.unsupportedJoinMobileSubhead} />
            </H3>
          ) : (
            <H3 style={{marginBottom: '10px'}}>
              <FormattedMessage
                {...unsupportedStrings.subheadBrowser}
                values={{
                  // eslint-disable-next-line react/display-name
                  strong: (...chunks: any[]) => <strong style={{fontWeight: 800}}>{chunks}</strong>,
                }}
              />
            </H3>
          )}
        </Container>
      </WirelessContainer>
    );
  }

  if (isCheckingSupport) {
    return (
      <ContainerXS centerText verticalCenter style={{justifyContent: 'center'}}>
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
  isCheckingSupport: RuntimeSelector.isChecking(state),
  isSupportedBrowser: RuntimeSelector.isSupportedBrowser(state),
});

export default connect(mapStateToProps)(UnsupportedBrowser);
