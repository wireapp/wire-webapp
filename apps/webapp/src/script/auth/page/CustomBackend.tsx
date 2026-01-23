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

import {pathWithParams} from '@wireapp/commons/lib/util/UrlUtil';
import {useSelector} from 'react-redux';
import {useNavigate} from 'react-router-dom';

import {Button, ButtonVariant, Container, Text} from '@wireapp/react-ui-kit';

import {LogoFullIcon} from 'Components/Icon';
import {t} from 'Util/LocalizerUtil';

import {buttonContainerCss, containerCss, headerCss, logoCss, paragraphCss} from './CustomBackend.styles';
import {Page} from './Page';

import * as AuthSelector from '../module/selector/AuthSelector';
import {QUERY_KEY, ROUTE} from '../route';
import {getSearchParams, navigateTo} from '../util/urlUtil';

export const CustomBackend = () => {
  const navigate = useNavigate();
  const {customBackendURL: url} = useSelector(AuthSelector.getAccount);

  const navigateToIndex = () => {
    navigate(ROUTE.SSO);
  };

  const onConnect = () => {
    if (url) {
      const welcomeUrl = pathWithParams(url, {[QUERY_KEY.SSO_AUTO_LOGIN]: true});
      navigateTo(
        `/auth?${getSearchParams({[QUERY_KEY.DESTINATION_URL]: encodeURIComponent(welcomeUrl)})}#${
          ROUTE.CUSTOM_ENV_REDIRECT
        }`,
      );
    }
  };

  return (
    <Page withSideBar>
      <Container centerText verticalCenter css={containerCss}>
        <LogoFullIcon aria-hidden="true" width={102} height={33} css={logoCss} data-uie-name="ui-wire-logo" />
        <Text block center css={headerCss}>
          {t('redirectHeader')}
        </Text>
        <Text block center>
          {t('redirectParagraph1', {url})}
        </Text>
        <Text block center css={paragraphCss}>
          {t('redirectParagraph2')}
        </Text>

        <div css={buttonContainerCss}>
          <Button css={{flex: '1'}} onClick={navigateToIndex} variant={ButtonVariant.SECONDARY}>
            {t('redirectCancel')}
          </Button>
          <Button css={{flex: '1'}} onClick={onConnect}>
            {t('redirectConnect')}
          </Button>
        </div>
      </Container>
    </Page>
  );
};
