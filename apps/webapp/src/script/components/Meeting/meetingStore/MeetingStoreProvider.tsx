/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {createContext, type ReactNode, useContext, useMemo} from 'react';

import {Maybe} from 'true-myth';
import {useStore} from 'zustand';

import type {MeetingStore, MeetingStoreState} from './createMeetingStore';

type MaybeMeetingStore = Maybe<MeetingStore>;

const MeetingStoreContext = createContext<MaybeMeetingStore>(Maybe.nothing());

type MeetingStoreProviderProps = {
  store: MeetingStore;
  children: ReactNode;
};

export const MeetingStoreProvider = ({store, children}: MeetingStoreProviderProps) => {
  const value = useMemo(() => Maybe.just(store), [store]);

  return <MeetingStoreContext.Provider value={value}>{children}</MeetingStoreContext.Provider>;
};

export const useMeetingStore = <T,>(selector: (state: MeetingStoreState) => T): T => {
  const maybeStore = useContext(MeetingStoreContext);

  if (maybeStore.isNothing) {
    throw new Error('MeetingStoreProvider has not been set');
  }

  return useStore(maybeStore.value, selector);
};
