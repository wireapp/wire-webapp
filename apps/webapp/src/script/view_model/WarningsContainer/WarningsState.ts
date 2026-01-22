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

import {amplify} from 'amplify';
import {create} from 'zustand';

import {WebAppEvents} from '@wireapp/webapp-events';

import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {AppPermissionState} from 'Repositories/notification/AppPermissionState';
import {t} from 'Util/LocalizerUtil';
import {safeWindowOpen} from 'Util/SanitizationUtil';

import {TYPE} from './WarningsTypes';

import {Config} from '../../Config';

type WarningsState = {
  name: string;
  warnings: TYPE[];
  setName: (newName: string) => void;
  addWarning: (warning: TYPE) => void;
  removeWarning: (warning: TYPE) => void;
};

const useWarningsState = create<WarningsState>((set, get) => ({
  addWarning: type => set(state => ({...state, warnings: [...state.warnings, type]})),
  name: '',
  removeWarning: type => set(state => ({...state, warnings: [...state.warnings.filter(warning => warning !== type)]})),
  setName: newName => set(state => ({...state, name: newName})),
  warnings: [],
}));

const getVisibleWarning = (): TYPE => {
  const {warnings} = useWarningsState.getState();
  const visibleWarning = warnings[warnings.length - 1];
  return visibleWarning;
};

const hideWarning = (type = getVisibleWarning()) => {
  const {warnings, removeWarning} = useWarningsState.getState();
  if (warnings.includes(type)) {
    removeWarning(type);
  }
};

const showWarning = (type: TYPE, info?: {name: string}) => {
  const {setName, addWarning} = useWarningsState.getState();
  const visibleWarning = getVisibleWarning();
  const connectivityTypes = [TYPE.CONNECTIVITY_RECONNECT, TYPE.NO_INTERNET];
  const isConnectivityWarning = connectivityTypes.includes(type);
  const visibleWarningIsLifecycleUpdate = visibleWarning === TYPE.LIFECYCLE_UPDATE;
  if (isConnectivityWarning && !visibleWarningIsLifecycleUpdate) {
    hideWarning(visibleWarning);
  }

  if (info) {
    setName(info.name);
  }

  addWarning(type);
};

/**
 * Close warning.
 * @note Used to close a warning banner by clicking the close button
 */
const closeWarning = (): void => {
  const {warnings, removeWarning} = useWarningsState.getState();
  const visibleWarning = warnings[warnings.length - 1];
  const warningToClose = visibleWarning;
  const URL = Config.getConfig().URL;

  if (warnings.includes(warningToClose)) {
    removeWarning(warningToClose);
  }

  switch (warningToClose) {
    case TYPE.REQUEST_MICROPHONE: {
      PrimaryModal.show(PrimaryModal.type.ACKNOWLEDGE, {
        primaryAction: {
          action: () => {
            safeWindowOpen(URL.SUPPORT.MICROPHONE_ACCESS_DENIED);
          },
          text: t('modalCallNoMicrophoneAction'),
        },
        text: {
          message: t('modalCallNoMicrophoneMessage'),
          title: t('modalCallNoMicrophoneHeadline'),
        },
      });
      break;
    }

    case TYPE.REQUEST_NOTIFICATION: {
      // We block subsequent permission requests for notifications when the user ignores the request.
      amplify.publish(WebAppEvents.NOTIFICATION.PERMISSION_STATE, AppPermissionState.IGNORED);
      break;
    }
  }
};

export {useWarningsState, showWarning, hideWarning, closeWarning};
