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

import React, {useEffect} from 'react';

import {TabIndex} from '@wireapp/react-ui-kit/lib/types/enums';
import {amplify} from 'amplify';

import {Runtime} from '@wireapp/commons';
import {WebAppEvents} from '@wireapp/webapp-events';

import {Icon} from 'Components/Icon';
import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {t} from 'Util/LocalizerUtil';

import {ListWrapper} from './ListWrapper';

import {
  ClientNotificationData,
  Notification,
  PreferenceNotificationRepository,
} from '../../../notification/PreferenceNotificationRepository';
import {TeamRepository} from '../../../team/TeamRepository';
import {ContentState, useAppState} from '../../useAppState';

type PreferencesProps = {
  onPreferenceItemClick: (itemId: ContentState) => void;
  teamRepository: Pick<TeamRepository, 'getTeam'>;
  preferenceNotificationRepository: Pick<PreferenceNotificationRepository, 'getNotifications'>;
};

const showNotification = (type: string, aggregatedNotifications: Notification[]) => {
  switch (type) {
    case PreferenceNotificationRepository.CONFIG.NOTIFICATION_TYPES.NEW_CLIENT: {
      PrimaryModal.show(
        PrimaryModal.type.ACCOUNT_NEW_DEVICES,
        {
          data: aggregatedNotifications.map(notification => notification.data) as ClientNotificationData[],
          preventClose: true,
          secondaryAction: {
            action: () => {
              amplify.publish(WebAppEvents.CONTENT.SWITCH, ContentState.PREFERENCES_DEVICES);
            },
          },
        },
        undefined,
      );
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

const NEW_DEVICE_NOTIFICATION_STATES = [ContentState.PREFERENCES_ACCOUNT, ContentState.PREFERENCES_DEVICES];

const PreferenceItem: React.FC<{
  IconComponent: React.FC;
  isSelected: boolean;
  label: string;
  onSelect: () => void;
  uieName: string;
}> = ({onSelect, isSelected, label, uieName, IconComponent}) => {
  return (
    <li
      role="tab"
      aria-selected={isSelected}
      aria-controls={label}
      tabIndex={TabIndex.UNFOCUSABLE}
      className="left-list-item"
    >
      <button
        type="button"
        className={`left-list-item-button ${isSelected ? 'left-list-item-button--active' : ''}`}
        onClick={onSelect}
        data-uie-name={uieName}
      >
        <span className="left-column-icon">
          <IconComponent />
        </span>
        <span className="column-center">{label}</span>
      </button>
    </li>
  );
};

const Preferences: React.FC<PreferencesProps> = ({
  teamRepository,
  preferenceNotificationRepository,
  onPreferenceItemClick,
}) => {
  const contentState = useAppState(state => state.contentState);

  useEffect(() => {
    // Update local team
    teamRepository.getTeam();
  }, [teamRepository]);

  useEffect(() => {
    if (NEW_DEVICE_NOTIFICATION_STATES.includes(contentState)) {
      preferenceNotificationRepository
        .getNotifications()
        .forEach(({type, notification}) => showNotification(type, notification));
    }
  }, [contentState, preferenceNotificationRepository]);

  const isDesktop = Runtime.isDesktopApp();
  const supportsCalling = Runtime.isSupportingLegacyCalling();

  const preferencesItems = [
    {
      IconComponent: Icon.Profile,
      id: ContentState.PREFERENCES_ACCOUNT,
      label: t('preferencesAccount'),
      uieName: 'go-account',
    },
    {
      IconComponent: Icon.Devices,
      id: ContentState.PREFERENCES_DEVICES,
      label: t('preferencesDevices'),
      uieName: 'go-devices',
    },
    {
      IconComponent: Icon.Options,
      id: ContentState.PREFERENCES_OPTIONS,
      label: t('preferencesOptions'),
      uieName: 'go-options',
    },
    {
      IconComponent: Icon.Av,
      hidden: !supportsCalling,
      id: ContentState.PREFERENCES_AV,
      label: t('preferencesAV'),
      uieName: 'go-audio-video',
    },
    {
      IconComponent: Icon.About,
      hidden: isDesktop,
      id: ContentState.PREFERENCES_ABOUT,
      label: t('preferencesAbout'),
      uieName: 'go-about',
    },
  ];

  return (
    <ListWrapper id="preferences" header={t('preferencesHeadline')}>
      <ul
        role="tablist"
        aria-label={t('tooltipPreferencesTabs')}
        className="left-list-items no-scroll preferences-list-items"
      >
        {preferencesItems
          .filter(item => !item.hidden)
          .map(item => (
            <PreferenceItem
              key={item.id}
              label={item.label}
              onSelect={() => onPreferenceItemClick(item.id)}
              isSelected={contentState === item.id}
              uieName={item.uieName}
              IconComponent={item.IconComponent}
            />
          ))}
      </ul>
    </ListWrapper>
  );
};

export {Preferences};
