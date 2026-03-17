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

import {ReactNode, ReactElement, createContext, useContext, useMemo} from 'react';

import {WallClock} from '../clock/wallClock';
import {StartupFeatureToggleName} from '../featureToggles/startupFeatureToggles';
import {MainViewModel} from '../view_model/MainViewModel';

export type RootContextValue = {
  readonly mainViewModel: MainViewModel;
  readonly wallClock: WallClock;
  readonly doesApplicationNeedForceReload: boolean;
  readonly isFeatureToggleEnabled: (featureName: StartupFeatureToggleName) => boolean;
};

export const RootContext = createContext<RootContextValue | null>(null);

interface RootProviderProps {
  children?: ReactNode;
  value: RootContextValue;
}

export function RootProvider(properties: RootProviderProps): ReactElement {
  const {value, children} = properties;

  const rootContextValue = useMemo(() => {
    return value;
  }, [value]);

  return <RootContext.Provider value={rootContextValue}>{children}</RootContext.Provider>;
}

export function useApplicationContext(): RootContextValue {
  const applicationContextOrNull = useContext(RootContext);

  if (!applicationContextOrNull) {
    throw new Error('RootContext has not been set');
  }

  return applicationContextOrNull;
}

export function useMainViewModel(): MainViewModel {
  const applicationContext = useApplicationContext();

  return applicationContext.mainViewModel;
}
