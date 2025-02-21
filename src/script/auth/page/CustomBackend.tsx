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

import {useState} from 'react';

import {pathWithParams} from '@wireapp/commons/lib/util/UrlUtil';
import {connect} from 'react-redux';
import {useLocation, useNavigate} from 'react-router-dom';
import {bindActionCreators, Dispatch} from 'redux';

import {Button, ButtonVariant, Container, Muted, Text} from '@wireapp/react-ui-kit';

import {t} from 'Util/LocalizerUtil';

import {Page} from './Page';

import {actionRoot as ROOT_ACTIONS} from '../module/action/';
import {QUERY_KEY, ROUTE} from '../route';
import {BackendConfig} from '../util/configUtil';
import {getSearchParams} from '../util/urlUtil';

function CustomBackendComponent({doNavigate}: DispatchProps) {
  const navigate = useNavigate();
  const {state} = useLocation();
  const config = state.config as BackendConfig;
  const [isDetailVisible, setIsDetailVisible] = useState(false);

  const navigateToIndex = () => {
    navigate(ROUTE.INDEX);
  };

  if (!config) {
    navigateToIndex();
  }

  const details = [
    {
      label: t('redirectBackendName'),
      text: config?.title,
    },
    {
      label: t('redirectBackendURL'),
      text: config?.endpoints.backendURL,
    },
    {
      label: t('redirectBackendWSURL'),
      text: config?.endpoints.backendWSURL,
    },
    {
      label: t('redirectBlacklistURL'),
      text: config?.endpoints.blackListURL,
    },
    {
      label: t('redirectTeamsURL'),
      text: config?.endpoints.teamsURL,
    },
    {
      label: t('redirectAccountURL'),
      text: config?.endpoints.accountsURL,
    },
    {
      label: t('redirectWebsiteURL'),
      text: config?.endpoints.websiteURL,
    },
  ];

  const toggleDetails = () => {
    setIsDetailVisible(visibility => !visibility);
  };

  const onConnect = () => {
    if (config?.endpoints.websiteURL) {
      const welcomeUrl = pathWithParams(config.webAppUrl, {[QUERY_KEY.SSO_AUTO_LOGIN]: true});
      doNavigate(
        `/auth?${getSearchParams({[QUERY_KEY.DESTINATION_URL]: encodeURIComponent(welcomeUrl)})}#${
          ROUTE.CUSTOM_ENV_REDIRECT
        }`,
      );
    }
  };

  return (
    <Page withSideBar>
      <Container centerText verticalCenter style={{width: '100%', maxWidth: '22rem'}}>
        <Text block center css={{fontSize: '1.5rem'}}>
          {t('redirectHeader')}
        </Text>
        <Text block center>
          {t('redirectSubHeader', {backendName: config?.title || ''})}
        </Text>
        {isDetailVisible && (
          <div>
            {details.map(({label, text}) => (
              <div css={{margin: '1rem'}} key={label}>
                <Muted>{label}</Muted>
                <br />
                <Text>{text}</Text>
              </div>
            ))}
          </div>
        )}
        <Text css={{textDecoration: 'underline', cursor: 'pointer'}} onClick={toggleDetails}>
          {isDetailVisible ? t('redirectHideDetails') : t('redirectShowDetails')}
        </Text>
        <div
          css={{
            marginTop: '2rem',
            gap: '1rem',
            display: 'flex',
          }}
        >
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
}

type DispatchProps = ReturnType<typeof mapDispatchToProps>;
const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators(
    {
      doNavigate: ROOT_ACTIONS.navigationAction.doNavigate,
    },
    dispatch,
  );

const CustomBackend = connect(null, mapDispatchToProps)(CustomBackendComponent);

export {CustomBackend};
