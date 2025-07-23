/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {FC, useEffect, useMemo} from 'react';

import {ClientType} from '@wireapp/api-client/lib/client/';
import {amplify} from 'amplify';
import {container} from 'tsyringe';

import {StyledApp, THEME_ID} from '@wireapp/react-ui-kit';
import {WebAppEvents} from '@wireapp/webapp-events';

import {DetachedCallingCell} from 'Components/calling/DetachedCallingCell';
import {PrimaryModalComponent} from 'Components/Modals/PrimaryModal/PrimaryModal';
import {QualityFeedbackModal} from 'Components/Modals/QualityFeedbackModal';
import {PROPERTIES_TYPE} from 'Repositories/properties/PropertiesType';
import {SIGN_OUT_REASON} from 'src/script/auth/SignOutReason';
import {useAppSoftLock} from 'src/script/hooks/useAppSoftLock';
import {useSingleInstance} from 'src/script/hooks/useSingleInstance';
import {isDetachedCallingFeatureEnabled} from 'Util/isDetachedCallingFeatureEnabled';

import {useAccentColor} from './hooks/useAccentColor';
import {useTheme} from './hooks/useTheme';

import {Config, Configuration} from '../../Config';
import {setAppLocale} from '../../localization/Localizer';
import {App} from '../../main/app';
import {AppMain} from '../../page/AppMain';
import {APIClient} from '../../service/APIClientSingleton';
import {Core} from '../../service/CoreSingleton';
import {MainViewModel} from '../../view_model/MainViewModel';
import {AppLoader} from '../AppLoader';

interface AppProps {
  config: Configuration;
  clientType: ClientType;
}

export const AppContainer: FC<AppProps> = ({config, clientType}) => {
  setAppLocale();
  const app = useMemo(() => new App(container.resolve(Core), container.resolve(APIClient), config), []);
  const enableAutoLogin = Config.getConfig().FEATURE.ENABLE_AUTO_LOGIN;

  // Publishing application on the global scope for debug and testing purposes.
  window.wire.app = app;
  const mainView = new MainViewModel(app.repository);
  useTheme(() => app.repository.properties.getPreference(PROPERTIES_TYPE.INTERFACE.THEME));
  useAccentColor();

  const {hasOtherInstance, registerInstance} = useSingleInstance();

  useEffect(() => {
    if (hasOtherInstance) {
      return;
    }
    const killInstance = registerInstance();
    /* We need to wait the very last moment to de-register the instance.
     * If we do it too early (like beforeunload event) then the app could detect it's no longer the single instance running and redirect to the login page
     */
    window.addEventListener('pagehide', killInstance);
  }, []);

  useEffect(() => {
    // Prevent Chrome (and Electron) from pushing the content out of the
    // viewport when using form elements (e.g. in the preferences)
    const resetWindowScroll = () => window.scrollTo(0, 0);
    document.addEventListener('scroll', resetWindowScroll);

    return () => document.removeEventListener('scroll', resetWindowScroll);
  }, []);

  const {repository: repositories} = app;

  const {softLockEnabled} = useAppSoftLock(repositories.calling, repositories.notification);

  if (hasOtherInstance) {
    // Automatically sign out the user if the user has multiple tabs open
    if (enableAutoLogin) {
      amplify.publish(WebAppEvents.LIFECYCLE.SIGN_OUT, SIGN_OUT_REASON.MULTIPLE_TABS);
    } else {
      app.redirectToLogin(SIGN_OUT_REASON.MULTIPLE_TABS);
    }

    return null;
  }

  return (
    <>
      <AppLoader init={onProgress => app.initApp(clientType, onProgress)}>
        {selfUser => {
          return <AppMain app={app} selfUser={selfUser} mainView={mainView} locked={softLockEnabled} />;
        }}
      </AppLoader>

      <StyledApp themeId={THEME_ID.DEFAULT} css={{backgroundColor: 'unset', height: '100%'}}>
        <PrimaryModalComponent />
        <QualityFeedbackModal callingRepository={app.repository.calling} />
      </StyledApp>

      {isDetachedCallingFeatureEnabled() && (
        <DetachedCallingCell
          propertiesRepository={app.repository.properties}
          callingRepository={app.repository.calling}
          mediaRepository={app.repository.media}
          toggleScreenshare={mainView.calling.callActions.toggleScreenshare}
        />
      )}
    </>
  );
};
