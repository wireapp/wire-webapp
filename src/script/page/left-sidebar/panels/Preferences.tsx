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

import React from 'react';
import {t} from 'Util/LocalizerUtil';

import {Runtime} from '@wireapp/commons';
import Icon from 'Components/Icon';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {ListViewModel} from '../../../view_model/ListViewModel';
import {ContentViewModel} from '../../../view_model/ContentViewModel';
import ListWrapper from './ListWrapper';

type PreferencesProps = {
  contentViewModel: ContentViewModel;
  isTemporaryGuest?: boolean;
  listViewModel: ListViewModel;
  onClose: () => void;
};

const PreferenceItem: React.FC<{
  IconComponent: React.FC;
  isSelected: boolean;
  label: string;
  onSelect: () => void;
  uieName: string;
}> = ({onSelect, isSelected, label, uieName, IconComponent}) => {
  return (
    <li className="left-list-item">
      <button
        type="button"
        className={`left-list-item-button ${isSelected && 'accent-text accent-fill'}`}
        onClick={onSelect}
        data-uie-name={uieName}
      >
        <span className="left-column-icon">
          <IconComponent />
        </span>
        <span className="center-column">{label}</span>
      </button>
    </li>
  );
};

const Preferences: React.FC<PreferencesProps> = ({listViewModel, contentViewModel, onClose}) => {
  const {state: contentState} = useKoSubscribableChildren(contentViewModel, ['state']);

  const isDesktop = Runtime.isDesktopApp();
  const supportsCalling = Runtime.isSupportingLegacyCalling();

  const items = [
    {
      IconComponent: Icon.Profile,
      id: ContentViewModel.STATE.PREFERENCES_ACCOUNT,
      label: t('preferencesAccount'),
      uieName: 'go-account',
    },
    {
      IconComponent: Icon.Devices,
      id: ContentViewModel.STATE.PREFERENCES_DEVICES,
      label: t('preferencesDevices'),
      uieName: 'go-devices',
    },
    {
      IconComponent: Icon.Options,
      id: ContentViewModel.STATE.PREFERENCES_OPTIONS,
      label: t('preferencesOptions'),
      uieName: 'go-options',
    },
    {
      IconComponent: Icon.Av,
      hidden: !supportsCalling,
      id: ContentViewModel.STATE.PREFERENCES_AV,
      label: t('preferencesAV'),
      uieName: 'go-audio-video',
    },
    {
      IconComponent: Icon.About,
      hidden: isDesktop,
      id: ContentViewModel.STATE.PREFERENCES_ABOUT,
      label: t('preferencesAbout'),
      uieName: 'go-about',
    },
  ];

  return (
    <ListWrapper
      listViewModel={listViewModel}
      openState={ListViewModel.STATE.PREFERENCES}
      id="preferences"
      header={t('preferencesHeadline')}
      onClose={onClose}
    >
      <ul className="left-list-items no-scroll preferences-list-items">
        {items
          .filter(item => !item.hidden)
          .map(item => (
            <PreferenceItem
              key={item.id}
              label={item.label}
              onSelect={() => contentViewModel.switchContent(item.id)}
              isSelected={contentState === item.id}
              uieName={item.uieName}
              IconComponent={item.IconComponent}
            />
          ))}
      </ul>
    </ListWrapper>
  );
};

export default Preferences;
