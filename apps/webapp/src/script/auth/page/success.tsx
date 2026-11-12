/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {useEffect, type FunctionComponent} from 'react';

import {Page} from './page';
import {styles} from './success.styles';

import {Config} from '../../Config';
import {replaceBrowserLocation} from '../../navigation/browserLocation';
import {useApplicationContext} from '../../page/rootProvider';
import {SuccessShield} from '../../uiKit/images/successShield';
import {FlexBox} from '../../uiKit/layout/flexBox/flexBox';
import {ActionLinkButton} from '../../uiKit/typography/actionLink/actionLink';
import {Text} from '../../uiKit/typography/text/text';
import {AccountRegistrationLayout} from '../component/accountRegistrationLayout';
import {EXTERNAL_ROUTE} from '../externalRoute';
import {PageView, resetTelemetrySession, trackTelemetryPageView} from '../util/trackingUtil';
import {pathWithParams} from '../util/urlUtil';

export const Success: FunctionComponent = () => {
  const {translate} = useApplicationContext();
  const secureOpen = (url: string): void => {
    replaceBrowserLocation(url);
  };

  useEffect(() => {
    trackTelemetryPageView(PageView.ACCOUNT_COMPLETION_SCREEN_4);
    resetTelemetrySession();
  }, []);

  return (
    <Page>
      <AccountRegistrationLayout>
        <FlexBox css={styles.container}>
          <SuccessShield />
          <Text block center css={styles.heading}>
            {translate('success.header')}
          </Text>
          <Text block center css={styles.subHeading}>
            {translate('success.subheader')}
          </Text>

          <ActionLinkButton
            data-uie-name="do-download-wire"
            onClick={() => {
              return secureOpen(pathWithParams(Config.getConfig().GET_WIRE_URL));
            }}
            css={styles.link}
          >
            {translate('success.downloadButton')}
          </ActionLinkButton>

          <ActionLinkButton
            data-uie-name="do-open-wire-web"
            onClick={() => {
              return secureOpen(pathWithParams(EXTERNAL_ROUTE.WEBAPP));
            }}
            css={styles.link}
          >
            {translate('success.openWebAppText')}
          </ActionLinkButton>
        </FlexBox>
      </AccountRegistrationLayout>
    </Page>
  );
};
