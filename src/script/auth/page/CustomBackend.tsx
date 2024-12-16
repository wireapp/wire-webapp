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

import {useEffect, useState} from 'react';

import {BackendConfig} from '@wireapp/api-client/lib/account/BackendConfig';
import {useNavigate, useSearchParams} from 'react-router-dom';
import {container} from 'tsyringe';

import {Button, ButtonVariant, Container, Muted, Text} from '@wireapp/react-ui-kit';

import {APIClient} from 'src/script/service/APIClientSingleton';
import {t} from 'Util/LocalizerUtil';

import {Page} from './Page';

import {QUERY_KEY, ROUTE} from '../route';
import {getSearchParams} from '../util/urlUtil';

export function CustomBackend() {
  const [searchParams] = useSearchParams();
  const url = searchParams.get(QUERY_KEY.CONFIG_URL);
  const navigate = useNavigate();
  const [config, setConfig] = useState<BackendConfig | undefined>();
  const [isDetailVisible, setIsDetailVisible] = useState(false);

  if (!url) {
    navigate(ROUTE.INDEX);
  }

  const apiClient = container.resolve(APIClient);

  useEffect(() => {
    if (url) {
      apiClient.api.account
        .getBackendConfig(url)
        .then(res => {
          setConfig(res);
        })
        .catch(() => {
          navigate(ROUTE.INDEX);
        });
    }
  }, [apiClient.api.account, navigate, url]);

  const details = [
    {
      label: t('redirectBackendName'),
      text: config?.backendName,
    },
    {
      label: t('redirectBackendURL'),
      text: config?.backendURL,
    },
    {
      label: t('redirectBackendWSURL'),
      text: config?.backendWSURL,
    },
    {
      label: t('redirectBlacklistURL'),
      text: config?.blacklistURL,
    },
    {
      label: t('redirectTeamsURL'),
      text: config?.teamsURL,
    },
    {
      label: t('redirectAccountURL'),
      text: config?.accountURL,
    },
    {
      label: t('redirectWebsiteURL'),
      text: config?.websiteURL,
    },
  ];

  const toggleDetails = () => {
    setIsDetailVisible(visibility => !visibility);
  };

  const onConnect = () => {
    if (config?.webAppURL) {
      window.location.assign(
        `/auth?${getSearchParams({[QUERY_KEY.DESTINATION_URL]: encodeURIComponent(`https://local.zinfra.io:8081/auth/#/login?email=${searchParams.get(QUERY_KEY.EMAIL)}`)})}#${
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
          {t('redirectSubHeader', {backendName: config?.backendName || ''})}
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
          <Button css={{flex: '1'}} variant={ButtonVariant.SECONDARY}>
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
