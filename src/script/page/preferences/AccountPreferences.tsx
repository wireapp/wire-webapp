/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import {Runtime} from '@wireapp/commons';
import {Availability} from '@wireapp/protocol-messaging';

import AvailabilityState from 'Components/AvailabilityState';
import {useEnrichedFields} from 'Components/panel/EnrichedFields';
import React, {useEffect, useRef} from 'react';
import {container} from 'tsyringe';
import {registerReactComponent, useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';
import useEffectRef from 'Util/useEffectRef';
import {ClientRepository} from '../../client/ClientRepository';
import {User} from '../../entity/User';
import {TeamState} from '../../team/TeamState';
import {AvailabilityContextMenu} from '../../ui/AvailabilityContextMenu';
import {useFadingScrollbar} from '../../ui/fadingScrollbar';
import {nameFromType} from '../../user/AvailabilityMapper';
import {RichProfileRepository} from '../../user/RichProfileRepository';
import type {UserRepository} from '../../user/UserRepository';
import {UserState} from '../../user/UserState';
import AccentColorPicker from '../AccentColorPicker';
import AccountInput from './accountPreferences/AccountInput';
import {isTemporaryClientAndNonPersistent} from 'Util/util';
import {loadValue} from 'Util/StorageUtil';
import {StorageKey} from '../../storage';
import {Config} from '../../Config';
import HistoryBackupSection from './accountPreferences/HistoryBackupSection';
import AccountSecuritySection from './accountPreferences/AccountSecuritySection';
import {PropertiesRepository} from '../../properties/PropertiesRepository';
import PrivacySection from './accountPreferences/PrivacySection';
import LogoutSection from './accountPreferences/LogoutSection';
import DataUsageSection from './accountPreferences/DataUsageSection';
import PreferencesSection from './accountPreferences/PreferencesSection';
import {getLogger} from 'Util/Logger';
import EmailInput from './accountPreferences/EmailInput';
import UsernameInput from './accountPreferences/UsernameInput';
import {ConversationRepository} from '../../conversation/ConversationRepository';
import {PreferenceNotificationRepository} from '../../notification/PreferenceNotificationRepository';
import AvatarInput from './accountPreferences/AvatarInput';
import NameInput from './accountPreferences/NameInput';

interface AccountPreferencesProps {
  clientRepository: ClientRepository;
  conversationRepository: ConversationRepository;
  preferenceNotificationRepository: PreferenceNotificationRepository;
  propertiesRepository: PropertiesRepository;
  richProfileRepository?: RichProfileRepository;
  teamState?: TeamState;
  userRepository: UserRepository;
  userState?: UserState;
}

const logger = getLogger('AccountPreferences');

const AccountPreferences: React.FC<AccountPreferencesProps> = ({
  clientRepository,
  userRepository,
  propertiesRepository,
  userState = container.resolve(UserState),
  teamState = container.resolve(TeamState),
  richProfileRepository = container.resolve(RichProfileRepository),
}) => {
  const [scrollbarRef, setScrollbarRef] = useEffectRef<HTMLDivElement>();
  useFadingScrollbar(scrollbarRef);

  const {self: selfUser, isActivatedAccount} = useKoSubscribableChildren(userState, ['self', 'isActivatedAccount']);
  const {isTeam} = useKoSubscribableChildren(teamState, ['isTeam']);
  const {name, email, availability, username, managedBy} = useKoSubscribableChildren(selfUser, [
    'name',
    'email',
    'availability',
    'username',
    'managedBy',
  ]);
  const canEditProfile = managedBy === User.CONFIG.MANAGED_BY.WIRE;
  const isDesktop = Runtime.isDesktopApp();
  const isTemporaryAndNonPersistent = useRef(isTemporaryClientAndNonPersistent(loadValue(StorageKey.AUTH.PERSIST)));
  const brandName = Config.getConfig().BRAND_NAME;

  const richFields = useEnrichedFields(selfUser, false, richProfileRepository);

  useEffect(() => {
    //popNotifications

    return () => {
      //reset stuff?
    };
  }, []);

  return (
    <div style={{display: 'flex', flexDirection: 'column', height: '100vh'}}>
      <div className="preferences-titlebar">{t('preferencesAccount')}</div>
      <div className="preferences-content" ref={setScrollbarRef}>
        {name}
        <AvatarInput {...{isActivatedAccount, selfUser, userRepository}} />
        {isTeam && (
          <div
            onClick={event => {
              AvailabilityContextMenu.show(event.nativeEvent, 'preferences-account-availability-menu');
            }}
          >
            <AvailabilityState
              label={
                availability === Availability.Type.NONE
                  ? t('preferencesAccountAvailabilityUnset')
                  : nameFromType(availability)
              }
              availability={availability}
              showArrow
              dataUieName="status-availability-in-profile"
            />
          </div>
        )}
        {canEditProfile && (
          <AccentColorPicker user={selfUser} doSetAccentColor={id => userRepository.changeAccentColor(id)} />
        )}
        <PreferencesSection title={t('preferencesAccountInfo')}>
          <NameInput {...{canEditProfile, name, userRepository}} />
          <UsernameInput {...{canEditProfile, userRepository, username}} domain={selfUser.domain} />
          <EmailInput {...{canEditProfile, email, userRepository}} />
          {richFields.map(({type, value}) => (
            <AccountInput key={type} label={type} value={value} readOnly />
          ))}
        </PreferencesSection>
        <DataUsageSection {...{brandName, isActivatedAccount, propertiesRepository}} />
        <PrivacySection {...{propertiesRepository}} />
        {isActivatedAccount && (
          <>
            {!isTemporaryAndNonPersistent.current && <HistoryBackupSection {...{brandName}} />}
            <AccountSecuritySection {...{selfUser, userRepository}} />
            {!isDesktop && <LogoutSection {...{clientRepository}} />}
          </>
        )}
      </div>
    </div>
  );
};

export default AccountPreferences;

registerReactComponent('account-preferences', {
  component: AccountPreferences,
  // bindings:
  //   'clientRepository, userRepository, propertiesRepository, conversationRepository, preferenceNotificationRepository',
  template:
    '<div data-bind="react:{clientRepository, userRepository, propertiesRepository, conversationRepository, preferenceNotificationRepository}"></div>',
});
