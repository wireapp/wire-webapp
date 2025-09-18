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

import {FC, ReactNode, useEffect, useRef, useState} from 'react';

import {LoadingBar} from 'Components/LoadingBar/LoadingBar';
import {User} from 'Repositories/entity/User';

import {styles} from './AppLoader.styles';

interface AppLoaderProps {
  init: (onProgress: (message?: string) => void) => Promise<User | undefined>;
  children: (selfUser: User) => ReactNode;
}

interface LoadingProgress {
  message: string;
}

const defaultLoadingState: LoadingProgress = {
  message: '',
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

    init(message => {
      setLoadingState(previousState => ({message: message ?? previousState?.message ?? ''}));
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
