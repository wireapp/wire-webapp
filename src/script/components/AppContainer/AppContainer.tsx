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

import {FC} from 'react';

import {ClientType} from '@wireapp/api-client/lib/client/';
import {container} from 'tsyringe';

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

  return (
    <AppLoader init={onProgress => app.initApp(clientType, onProgress)}>
      {selfUser => <AppMain app={app} selfUser={selfUser} mainView={mainView} />}
    </AppLoader>
  );
};
