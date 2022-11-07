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

import {FC, ReactElement, useEffect, useRef, useState} from 'react';

import {LoadingBar} from 'Components/LoadingBar/LoadingBar';

import {styles} from './AppLoader.styles';

import {User} from '../../entity/User';

interface AppLoaderProps {
  init: (onProgress: (progress: number, message?: string) => void) => Promise<User | undefined>;
  children: (selfUser: User) => ReactElement;
}

interface LoadingProgress {
  progress: number;
  message: string;
}

const defaultLoadingState: LoadingProgress = {
  message: '',
  progress: 0,
};

export const AppLoader: FC<AppLoaderProps> = ({init, children}) => {
  const [loadingState, setLoadingState] = useState<LoadingProgress>(defaultLoadingState);
  const [selfUser, setSelfUser] = useState<User>();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (!isFirstRender.current) {
      return;
    }
    isFirstRender.current = false;

    init((progress, message) => {
      setLoadingState(previousState => ({message: message ?? previousState?.message ?? '', progress}));
    }).then(user => setSelfUser(user));
  }, []);

  if (selfUser) {
    return children(selfUser);
  }

  return (
    <div css={styles} data-uie-name="status-webapp" data-uie-value="is-loading">
      <LoadingBar {...loadingState} />
    </div>
  );
};
