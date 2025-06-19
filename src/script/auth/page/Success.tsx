/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import {HTMLProps, useEffect} from 'react';

import {FlexBox, Text, TextLink} from '@wireapp/react-ui-kit';

import {Config} from 'src/script/Config';
import {t} from 'Util/LocalizerUtil';

import {Page} from './Page';
import {styles} from './Success.styles.';

import {SuccessShield} from '../assets/SuccessShield';
import {AccountRegistrationLayout} from '../component/AccountRegistrationLayout';
import {EXTERNAL_ROUTE} from '../externalRoute';
import {PageView, resetTelemetrySession, trackTelemetryPageView} from '../util/trackingUtil';
import {pathWithParams} from '../util/urlUtil';

export interface RegistrationSuccessProps extends HTMLProps<Document> {}

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

          <TextLink
            data-uie-name="do-download-wire"
            onClick={() => secureOpen(pathWithParams(Config.getConfig().GET_WIRE_URL))}
            css={styles.link}
          >
            {t('success.downloadButton')}
          </TextLink>

          <TextLink
            data-uie-name="do-download-wire"
            onClick={() => secureOpen(pathWithParams(EXTERNAL_ROUTE.WEBAPP))}
            css={styles.link}
          >
            {t('success.openWebAppText')}
          </TextLink>
        </FlexBox>
      </AccountRegistrationLayout>
    </Page>
  );
};
