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

import {useEffect, useState} from 'react';

import {LogoIcon} from 'Components/Icon';
import {connect} from 'react-redux';
import {t} from 'Util/LocalizerUtil';
import {afterRender} from 'Util/util';

import {Runtime, UrlUtil} from '@wireapp/commons';
import {COLOR, ContainerXS, FlexBox, Text} from '@wireapp/react-ui-kit';

import {Page} from './Page';

import {actionRoot} from '../module/action';
import {ThunkDispatch} from '../module/reducer';
import {QUERY_KEY} from '../route';
import {getEnterpriseLoginV2FF} from '../util/helpers';

const REDIRECT_DELAY = 5000;
const CustomEnvironmentRedirectComponent = ({doNavigate, doSendNavigationEvent}: DispatchProps) => {
  const [destinationUrl, setDestinationUrl] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const isEnterpriseLoginV2Enabled = getEnterpriseLoginV2FF();

  useEffect(() => {
    const destinationParam = UrlUtil.getURLParameter(QUERY_KEY.DESTINATION_URL);
    setDestinationUrl(destinationParam);
  }, []);

  useEffect(() => {
    let redirectTimeoutId: number;
    if (destinationUrl) {
      redirectTimeoutId = window.setTimeout(() => {
        if (Runtime.isDesktopApp()) {
          doSendNavigationEvent(destinationUrl).catch(console.error);
        } else {
          doNavigate(destinationUrl);
        }
      }, REDIRECT_DELAY);
      afterRender(() => setIsAnimating(true));
    }
    return () => {
      window.clearTimeout(redirectTimeoutId);
    };
  }, [destinationUrl]);

  return (
    <Page withSideBar={isEnterpriseLoginV2Enabled}>
      <FlexBox column>
        <FlexBox justify="center" align="flex-end" style={{marginBottom: 64, alignSelf: 'center', padding: '4px'}}>
          <FlexBox
            justify="center"
            align="center"
            style={{
              backgroundColor: COLOR.ICON,
              borderRadius: '50%',
              boxShadow: '0 2px 4px 0 rgba(53, 63, 71, 0.29)',
              height: 120,
              marginBottom: -64,
              position: 'relative',
              width: 120,
            }}
          >
            <LogoIcon aria-hidden="true" fill={COLOR.WHITE} color={COLOR.WHITE} width={47} height={38} />
            <svg
              aria-hidden="true"
              style={{position: 'absolute'}}
              width={124}
              height={124}
              viewBox="0 0 124 124"
              fill="none"
              data-uie-name="redirection-timer"
            >
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
                // eslint-disable-next-line react/no-unknown-property
                transform-origin="center"
              />
            </svg>
          </FlexBox>
        </FlexBox>
        <ContainerXS centerText style={{marginTop: 48}}>
          <Text block bold fontSize={'24px'} center style={{marginBottom: 16, marginTop: 0}}>
            {t('customEnvRedirect.redirectHeadline')}
          </Text>
          <Text block center>
            {t('customEnvRedirect.redirectTo')}
          </Text>
          <Text block center fontSize="16px" bold style={{marginTop: '16px'}} data-uie-name="credentials-info">
            {t('customEnvRedirect.credentialsInfo')}
          </Text>
        </ContainerXS>
      </FlexBox>
    </Page>
  );
};

type DispatchProps = ReturnType<typeof mapDispatchToProps>;
const mapDispatchToProps = (dispatch: ThunkDispatch) => ({
  doNavigate: (...args: Parameters<typeof actionRoot.navigationAction.doNavigate>) =>
    dispatch(actionRoot.navigationAction.doNavigate(...args)),
  doSendNavigationEvent: (...args: Parameters<typeof actionRoot.wrapperEventAction.doSendNavigationEvent>) =>
    dispatch(actionRoot.wrapperEventAction.doSendNavigationEvent(...args)),
});

const CustomEnvironmentRedirect = connect(null, mapDispatchToProps)(CustomEnvironmentRedirectComponent);

export {CustomEnvironmentRedirect};
