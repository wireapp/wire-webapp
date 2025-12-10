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

import {useEffect} from 'react';

import {SuccessShield} from '@wireapp/react-ui-kit/lib/Images/SuccessShield';

import {ActionLinkButton, FlexBox, Text} from '@wireapp/react-ui-kit';

import {Config} from 'src/script/Config';
import {t} from 'Util/LocalizerUtil';

import {Page} from './Page';
import {styles} from './Success.styles.';

import {AccountRegistrationLayout} from '../component/AccountRegistrationLayout';
import {EXTERNAL_ROUTE} from '../externalRoute';
import {PageView, resetTelemetrySession, trackTelemetryPageView} from '../util/trackingUtil';
import {pathWithParams} from '../util/urlUtil';

export const Success = () => {
  const secureOpen = (url: string) => {
    window.location.replace(url);
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
            {t('success.header')}
          </Text>
          <Text block center css={styles.subHeading}>
            {t('success.subheader')}
          </Text>

          <ActionLinkButton
            data-uie-name="do-download-wire"
            onClick={() => secureOpen(pathWithParams(Config.getConfig().GET_WIRE_URL))}
            css={styles.link}
          >
            {t('success.downloadButton')}
          </ActionLinkButton>

          <ActionLinkButton
            data-uie-name="do-open-wire-web"
            onClick={() => secureOpen(pathWithParams(EXTERNAL_ROUTE.WEBAPP))}
            css={styles.link}
          >
            {t('success.openWebAppText')}
          </ActionLinkButton>
        </FlexBox>
      </AccountRegistrationLayout>
    </Page>
  );
};
