/*
 * Wire
 * Copyright (C) 2020 Wire Swiss GmbH
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

import {ContainerXS, FlexBox, COLOR, InfoIcon, Text, Bold} from '@wireapp/react-ui-kit';
import {SVGIcon} from '@wireapp/react-ui-kit/dist/Icon/SVGIcon';
import {UrlUtil} from '@wireapp/commons';

import React, {useState, useEffect} from 'react';
import {useIntl} from 'react-intl';
import {connect} from 'react-redux';
import {AnyAction, Dispatch} from 'redux';
import {bindActionCreators} from '../module/reducer';
import Page from './Page';
import {QUERY_KEY} from '../route';
import {actionRoot} from '../module/action';
import {isDesktopApp} from '../Runtime';
import SVGProvider from '../util/SVGProvider';
import {customEnvRedirectStrings} from '../../strings';

interface Props extends React.HTMLProps<HTMLDivElement> {}

const REDIRECT_DELAY = 5000;
const CustomEnvironmentRedirect = ({doNavigate, doSendNavigationEvent}: Props & DispatchProps) => {
  const {formatMessage: _} = useIntl();

  const [destinationUrl, setDestinationUrl] = useState(null);
  const [displayUrl, setDisplayUrl] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const destinationParam = UrlUtil.getURLParameter(QUERY_KEY.DESTINATION_URL);
    const [destinationAddress] = destinationParam.split('?');
    setDestinationUrl(destinationParam);
    setDisplayUrl(destinationAddress);
  }, []);

  useEffect(() => {
    let redirectTimeoutId: number;
    if (destinationUrl) {
      redirectTimeoutId = window.setTimeout(() => {
        if (isDesktopApp()) {
          doSendNavigationEvent(destinationUrl).catch(console.error);
        } else {
          doNavigate(destinationUrl);
        }
      }, REDIRECT_DELAY);
      window.requestAnimationFrame(() => setIsAnimating(true));
    }
    return () => {
      window.clearTimeout(redirectTimeoutId);
    };
  }, [destinationUrl]);

  return (
    <Page>
      <FlexBox column>
        <FlexBox
          justify="center"
          align="flex-end"
          style={{backgroundColor: 'black', height: 216, marginBottom: 64, width: '100vw'}}
        >
          <FlexBox
            justify="center"
            align="center"
            style={{
              backgroundColor: COLOR.ICON,
              borderRadius: '50%',
              boxShadow: '0 2px 4px 0 rgba(53, 63, 71, 0.29)',
              height: 120,
              marginBottom: -64,
              width: 120,
            }}
          >
            <SVGIcon color={COLOR.WHITE} realWidth={47} realHeight={38}>
              <g dangerouslySetInnerHTML={{__html: SVGProvider['logo-icon']?.documentElement?.innerHTML}} />
            </SVGIcon>
            <svg style={{position: 'absolute'}} width={124} height={124} viewBox="0 0 124 124" fill="none">
              <circle
                style={{
                  strokeDashoffset: isAnimating ? 0 : 377,
                  transition: `stroke-dashoffset ${REDIRECT_DELAY}ms linear`,
                }}
                cx="62"
                cy="62"
                r="60"
                strokeWidth="4"
                stroke={COLOR.BLUE}
                strokeLinecap="round"
                strokeDasharray={377}
                transform="rotate(-90)"
                transform-origin="center"
              />
            </svg>
          </FlexBox>
        </FlexBox>

        <ContainerXS centerText style={{marginTop: 48}}>
          <Text block center>
            {_(customEnvRedirectStrings.redirectTo)}
          </Text>
          <Bold block center>
            {displayUrl}
          </Bold>
          <FlexBox
            column
            align="center"
            style={{backgroundColor: COLOR.BLUE_OPAQUE_16, borderRadius: 8, marginTop: 40, padding: '16px 24px'}}
          >
            <InfoIcon color={COLOR.BLUE} style={{marginBottom: 8}} />
            <Text fontSize="14px" color={COLOR.BLUE}>
              {_(customEnvRedirectStrings.credentialsInfo)}
            </Text>
          </FlexBox>
        </ContainerXS>
      </FlexBox>
    </Page>
  );
};

type DispatchProps = ReturnType<typeof mapDispatchToProps>;
const mapDispatchToProps = (dispatch: Dispatch<AnyAction>) =>
  bindActionCreators(
    {
      doNavigate: actionRoot.navigationAction.doNavigate,
      doSendNavigationEvent: actionRoot.wrapperEventAction.doSendNavigationEvent,
    },
    dispatch,
  );

export default connect(null, mapDispatchToProps)(CustomEnvironmentRedirect);
