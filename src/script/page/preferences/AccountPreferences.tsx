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
import {WebAppEvents} from '@wireapp/webapp-events';
import {amplify} from 'amplify';
import React, {useEffect, useRef} from 'react';
import {container} from 'tsyringe';
import {useEnrichedFields} from 'Components/panel/EnrichedFields';

import {registerReactComponent, useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';
import {getLogger} from 'Util/Logger';
import {loadValue} from 'Util/StorageUtil';
import useEffectRef from 'Util/useEffectRef';
import {isTemporaryClientAndNonPersistent} from 'Util/util';

import {ClientEntity} from '../../client/ClientEntity';
import {ClientRepository} from '../../client/ClientRepository';
import {Config} from '../../Config';
import {ConversationRepository} from '../../conversation/ConversationRepository';
import {User} from '../../entity/User';
import {Notification, PreferenceNotificationRepository} from '../../notification/PreferenceNotificationRepository';
import {PropertiesRepository} from '../../properties/PropertiesRepository';
import {StorageKey} from '../../storage';
import {TeamState} from '../../team/TeamState';
import {useFadingScrollbar} from '../../ui/fadingScrollbar';
import {RichProfileRepository} from '../../user/RichProfileRepository';
import type {UserRepository} from '../../user/UserRepository';
import {UserState} from '../../user/UserState';
import {ContentViewModel} from '../../view_model/ContentViewModel';
import {modals, ModalsViewModel} from '../../view_model/ModalsViewModel';
import AccentColorPicker from '../AccentColorPicker';
import AccountInput from './accountPreferences/AccountInput';
import AccountSecuritySection from './accountPreferences/AccountSecuritySection';
import AvailabilityInput from './accountPreferences/AvailabilityInput';
import AvatarInput from './accountPreferences/AvatarInput';
import DataUsageSection from './accountPreferences/DataUsageSection';
import EmailInput from './accountPreferences/EmailInput';
import HistoryBackupSection from './accountPreferences/HistoryBackupSection';
import LogoutSection from './accountPreferences/LogoutSection';
import NameInput from './accountPreferences/NameInput';
import PreferencesSection from './accountPreferences/PreferencesSection';
import PrivacySection from './accountPreferences/PrivacySection';
import UsernameInput from './accountPreferences/UsernameInput';

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
  preferenceNotificationRepository,
  conversationRepository,
  userState = container.resolve(UserState),
  teamState = container.resolve(TeamState),
  richProfileRepository = container.resolve(RichProfileRepository),
}) => {
  const [scrollbarRef, setScrollbarRef] = useEffectRef<HTMLDivElement>();
  useFadingScrollbar(scrollbarRef);

  let {self: selfUser, isActivatedAccount} = useKoSubscribableChildren(userState, ['self', 'isActivatedAccount']);
  const {isTeam, teamName} = useKoSubscribableChildren(teamState, ['isTeam', 'teamName']);
  const {name, email, availability, username, managedBy, phone} = useKoSubscribableChildren(selfUser, [
    'name',
    'email',
    'availability',
    'username',
    'managedBy',
    'phone',
  ]);
  const canEditProfile = managedBy === User.CONFIG.MANAGED_BY.WIRE;
  const isDesktop = Runtime.isDesktopApp();
  const isTemporaryAndNonPersistent = useRef(isTemporaryClientAndNonPersistent(loadValue(StorageKey.AUTH.PERSIST)));
  const brandName = Config.getConfig().BRAND_NAME;
  const isConsentCheckEnabled = Config.getConfig().FEATURE.CHECK_CONSENT;

  const richFields = useEnrichedFields(selfUser, false, richProfileRepository);
  const domain = selfUser.domain;
  isActivatedAccount = false;
  const clickOnLeaveGuestRoom = (): void => {
    modals.showModal(
      ModalsViewModel.TYPE.CONFIRM,
      {
        preventClose: true,
        primaryAction: {
          action: async (): Promise<void> => {
            try {
              await conversationRepository.leaveGuestRoom();
              clientRepository.logoutClient();
            } catch (error) {
              logger.warn('Error while leaving room', error);
            }
          },
          text: t('modalAccountLeaveGuestRoomAction'),
        },
        text: {
          message: t('modalAccountLeaveGuestRoomMessage'),
          title: t('modalAccountLeaveGuestRoomHeadline'),
        },
      },
      undefined,
    );
  };

  useEffect(() => {
    const showNotification = (type: string, aggregatedNotifications: Notification[]) => {
      switch (type) {
        case PreferenceNotificationRepository.CONFIG.NOTIFICATION_TYPES.NEW_CLIENT: {
          modals.showModal(
            ModalsViewModel.TYPE.ACCOUNT_NEW_DEVICES,
            {
              data: aggregatedNotifications.map(notification => notification.data) as ClientEntity[],
              preventClose: true,
              secondaryAction: {
                action: () => {
                  amplify.publish(WebAppEvents.CONTENT.SWITCH, ContentViewModel.STATE.PREFERENCES_DEVICES);
                },
              },
            },
            undefined,
          );
          break;
        }

        case PreferenceNotificationRepository.CONFIG.NOTIFICATION_TYPES.READ_RECEIPTS_CHANGED: {
          modals.showModal(
            ModalsViewModel.TYPE.ACCOUNT_READ_RECEIPTS_CHANGED,
            {
              data: aggregatedNotifications.pop().data as boolean,
              preventClose: true,
            },
            undefined,
          );
          break;
        }
      }
    };
    preferenceNotificationRepository
      .getNotifications()
      .forEach(({type, notification}) => showNotification(type, notification));
  }, []);

  return (
    <div style={{display: 'flex', flexDirection: 'column', height: '100vh'}}>
      <div className="preferences-titlebar">{t('preferencesAccount')}</div>
      <div className="preferences-content" ref={setScrollbarRef}>
        <div
          css={{
            alignItems: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            paddingBottom: 32,
            width: 560,
          }}
        >
          <div
            css={{
              fontWeight: 400,
            }}
          >
            {name}
          </div>
          <div>
            <AvatarInput {...{isActivatedAccount, selfUser, userRepository}} />
          </div>
          {isActivatedAccount && isTeam && <AvailabilityInput {...{availability}} />}
          {isActivatedAccount && canEditProfile && (
            <div>
              <AccentColorPicker user={selfUser} doSetAccentColor={id => userRepository.changeAccentColor(id)} />
            </div>
          )}
        </div>
        {isActivatedAccount ? (
          <PreferencesSection title={t('preferencesAccountInfo')}>
            <div
              css={{
                display: 'flex',
                flexDirection: 'row',
                flexWrap: 'wrap',
              }}
            >
              <NameInput {...{canEditProfile, name, userRepository}} />
              <UsernameInput {...{canEditProfile, userRepository, username, domain}} />
              {email && <EmailInput {...{canEditProfile, email, userRepository}} />}
              {phone && <AccountInput label="Phone" value={phone} readOnly />}
              {isTeam && <AccountInput label="Team" value={teamName} readOnly />}
              {domain && <AccountInput label="Domain" value={domain} readOnly />}
              {richFields.map(({type, value}) => (
                <AccountInput key={type} label={type} value={value} readOnly />
              ))}
            </div>
          </PreferencesSection>
        ) : (
          <PreferencesSection>
            <div
              className="preferences-link accent-text"
              onClick={clickOnLeaveGuestRoom}
              data-uie-name="do-leave-guest-room"
            >
              {t('preferencesAccountLeaveGuestRoom')}
            </div>
            <div className="preferences-leave-disclaimer">{t('preferencesAccountLeaveGuestRoomDescription')}</div>
          </PreferencesSection>
        )}
        {isConsentCheckEnabled && <DataUsageSection {...{brandName, isActivatedAccount, propertiesRepository}} />}
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
  template:
    '<div data-bind="react:{clientRepository, userRepository, propertiesRepository, conversationRepository, preferenceNotificationRepository}"></div>',
});
