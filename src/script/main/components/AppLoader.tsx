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

import LoadingBar from 'Components/LoadingBar';
import {ClientType} from '@wireapp/api-client/src/client';
import {useEffect, useRef, useState} from 'react';
import {styles} from './AppLoader.styles';
import type {App} from '../app';

interface AppLoaderProps {
  app: App;
  clientType: ClientType;
  children: (repositories: any) => any;
}

interface LoadingProgress {
  progress: number;
  message: string;
}

export const AppLoader: React.FC<AppLoaderProps> = ({app, clientType, children}) => {
  const [loadingState, setLoadingState] = useState<LoadingProgress>({message: '', progress: 0});
  const isFirstRender = useRef<boolean>(true);
  useEffect(() => {
    if (!isFirstRender.current) {
      return;
    }
    isFirstRender.current = false;
    app
      .initApp(clientType, (progress, message) => {
        setLoadingState(previouState => ({message: message ?? previouState?.message ?? '', progress}));
      })
      .then(() => setLoadingState({message: '', progress: 100}));
  }, []);

  if (loadingState?.progress === 100) {
    return children(app.repository);
  }

  return (
    <div css={styles}>
      <LoadingBar {...loadingState} />
    </div>
  );
};
