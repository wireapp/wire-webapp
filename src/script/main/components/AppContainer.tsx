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

import {AppLoader} from './AppLoader';
import {ClientType} from '@wireapp/api-client/src/client/';
import {WireApp} from './WireApp';

import {Configuration} from '../../Config';
import {container} from 'tsyringe';
import {APIClient} from '../../service/APIClientSingleton';
import {Core} from '../../service/CoreSingleton';
import {App} from '../app';

interface AppProps {
  config: Configuration;
  clientType: ClientType;
}

export const AppContainer: React.FC<AppProps> = ({config, clientType}) => {
  const app = new App(container.resolve(Core), container.resolve(APIClient));
  return (
    <AppLoader init={onProgress => app.initApp(clientType, config, onProgress)}>
      {selfUser => <WireApp app={app} selfUser={selfUser} />}
    </AppLoader>
  );
};
