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

import {useEffect} from 'react';

import {PrimaryModal} from 'Components/Modals/PrimaryModal';

import {ContentState, useAppState} from './useAppState';

import {
  ClientNotificationData,
  Notification,
  PreferenceNotificationRepository,
} from '../notification/PreferenceNotificationRepository';

export const usePopNotification = (
  contentState: ContentState,
  preferenceNotification: PreferenceNotificationRepository,
) => {
  const {setContentState} = useAppState();

  const popNotification = () => {
    const showNotification = (type: string, aggregatedNotifications: Notification[]) => {
      const accountNewDevicesOptions = {
        data: aggregatedNotifications.map(notification => notification.data) as ClientNotificationData[],
        preventClose: true,
        secondaryAction: {
          action: () => setContentState(ContentState.PREFERENCES_DEVICES),
        },
      };

      switch (type) {
        case PreferenceNotificationRepository.CONFIG.NOTIFICATION_TYPES.NEW_CLIENT: {
          PrimaryModal.show(PrimaryModal.type.ACCOUNT_NEW_DEVICES, accountNewDevicesOptions, undefined);
          break;
        }

        case PreferenceNotificationRepository.CONFIG.NOTIFICATION_TYPES.READ_RECEIPTS_CHANGED: {
          PrimaryModal.show(
            PrimaryModal.type.ACCOUNT_READ_RECEIPTS_CHANGED,
            {
              data: aggregatedNotifications.pop()?.data as boolean,
              preventClose: true,
            },
            undefined,
          );
          break;
        }
      }
    };

    preferenceNotification.getNotifications().forEach(({type, notification}) => showNotification(type, notification));
  };

  useEffect(() => {
    if (contentState === ContentState.PREFERENCES_ACCOUNT) {
      popNotification();
    }
  }, []);
};
