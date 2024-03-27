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

import {FC, ReactNode, createContext, useContext} from 'react';

import {MainViewModel} from '../view_model/MainViewModel';

export const RootContext = createContext<MainViewModel | null>(null);

interface RootProviderProps {
  children?: ReactNode;
  value: MainViewModel;
}

export const RootProvider: FC<RootProviderProps> = ({children, value}) => {
  return <RootContext.Provider value={value}>{children}</RootContext.Provider>;
};

export const useMainViewModel = () => {
  const context = useContext(RootContext);
  if (!context) {
    throw new Error('MainViewModel was not initialised');
  }

  return context;
};
