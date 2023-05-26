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

import {FC, useEffect} from 'react';

import {ClientType} from '@wireapp/api-client/lib/client/';
import {container} from 'tsyringe';

import {SIGN_OUT_REASON} from 'src/script/auth/SignOutReason';
import {useSingleInstance} from 'src/script/hooks/useSingleInstance';

import {Configuration} from '../../Config';
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
  const app = new App(container.resolve(Core), container.resolve(APIClient), config);
  // Publishing application on the global scope for debug and testing purposes.
  window.wire.app = app;
  const mainView = new MainViewModel(app.repository);

  const {hasOtherInstance, registerInstance} = useSingleInstance();

  useEffect(() => {
    if (hasOtherInstance) {
      // eslint-disable-next-line no-console
      console.log('Another instance is already running. AppContainer will not render.', app, Core, APIClient);
      return;
    }
    const killInstance = registerInstance();
    window.addEventListener('beforeunload', killInstance);
  }, []);

  useEffect(() => {
    // Prevent Chrome (and Electron) from pushing the content out of the
    // viewport when using form elements (e.g. in the preferences)
    const resetWindowScroll = () => window.scrollTo(0, 0);
    document.addEventListener('scroll', resetWindowScroll);

    return () => document.removeEventListener('scroll', resetWindowScroll);
  }, []);

  if (hasOtherInstance) {
    app.redirectToLogin(SIGN_OUT_REASON.MULTIPLE_TABS);
    return null;
  }

  return (
    <AppLoader init={onProgress => app.initApp(clientType, onProgress)}>
      {selfUser => <AppMain app={app} selfUser={selfUser} mainView={mainView} />}
    </AppLoader>
  );
};
