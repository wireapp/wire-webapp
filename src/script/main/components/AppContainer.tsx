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
import type {App} from '../app';

interface AppProps {
  app: App;
  clientType: ClientType;
}

export const AppContainer: React.FC<AppProps> = ({app, clientType}) => {
  return (
    <AppLoader app={app} clientType={clientType}>
      {(app, selfUser) => <WireApp app={app} selfUser={selfUser} />}
    </AppLoader>
  );
};
