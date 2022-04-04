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
import React, {useRef} from 'react';
import {container} from 'tsyringe';
import {useEnrichedFields} from 'Components/panel/EnrichedFields';

import {registerReactComponent, useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';
import {getLogger} from 'Util/Logger';
import {loadValue} from 'Util/StorageUtil';
import {isTemporaryClientAndNonPersistent} from 'Util/util';

import {ClientRepository} from '../../client/ClientRepository';
import {Config} from '../../Config';
import {ConversationRepository} from '../../conversation/ConversationRepository';
import {User} from '../../entity/User';
import {PropertiesRepository} from '../../properties/PropertiesRepository';
import {StorageKey} from '../../storage';
import {TeamState} from '../../team/TeamState';
import {RichProfileRepository} from '../../user/RichProfileRepository';
import type {UserRepository} from '../../user/UserRepository';
import {UserState} from '../../user/UserState';
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
import PreferencesSection from './components/PreferencesSection';
import PrivacySection from './accountPreferences/PrivacySection';
import UsernameInput from './accountPreferences/UsernameInput';
import PreferencesPage from './components/PreferencesPage';
import AccountLink from './accountPreferences/AccountLink';

interface AccountPreferencesProps {
  clientRepository: ClientRepository;
  conversationRepository: ConversationRepository;
  propertiesRepository: PropertiesRepository;
  richProfileRepository?: RichProfileRepository;
  /** Should the domain be displayed */
  showDomain?: boolean;
  teamState?: TeamState;
  userRepository: UserRepository;
  userState?: UserState;
}

const logger = getLogger('AccountPreferences');

const AccountPreferences: React.FC<AccountPreferencesProps> = ({
  clientRepository,
  userRepository,
  propertiesRepository,
  conversationRepository,
  showDomain = false,
  userState = container.resolve(UserState),
  teamState = container.resolve(TeamState),
}) => {
  const {self: selfUser, isActivatedAccount} = useKoSubscribableChildren(userState, ['self', 'isActivatedAccount']);
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
  const config = Config.getConfig();
  const brandName = config.BRAND_NAME;
  const isConsentCheckEnabled = config.FEATURE.CHECK_CONSENT;

  const richFields = useEnrichedFields(selfUser, {addDomain: showDomain, addEmail: false});
  const domain = selfUser.domain;
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

  return (
    <PreferencesPage title={t('preferencesAccount')}>
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
        <PreferencesSection hasSeparator title={t('preferencesAccountInfo')}>
          <div
            css={{
              display: 'flex',
              flexDirection: 'row',
              flexWrap: 'wrap',
              marginLeft: '-8px',
            }}
          >
            <NameInput {...{canEditProfile, name, userRepository}} />
            <UsernameInput {...{canEditProfile, userRepository, username}} domain={showDomain ? domain : undefined} />
            {email && <EmailInput {...{canEditProfile, email, userRepository}} />}
            {phone && (
              <AccountInput label={t('preferencesAccountPhone')} value={phone} readOnly data-uie-name="enter-phone" />
            )}
            {isTeam && (
              <AccountInput label={t('preferencesAccountTeam')} value={teamName} readOnly data-uie-name="status-team" />
            )}
            {richFields.map(({type, value}) => (
              <AccountInput
                key={type}
                labelUie="item-enriched-key"
                valueUie="item-enriched-value"
                label={type}
                value={value}
                readOnly
              />
            ))}
            <AccountLink
              label={t('preferencesAccountLink')}
              value={`${Config.getConfig().URL.ACCOUNT_BASE}/user-profile/?id=${selfUser.id}`}
              data-uie-name="element-profile-link"
            />
          </div>
        </PreferencesSection>
      ) : (
        <PreferencesSection hasSeparator>
          <button
            className="preferences-link accent-text"
            onClick={clickOnLeaveGuestRoom}
            data-uie-name="do-leave-guest-room"
            type="button"
          >
            {t('preferencesAccountLeaveGuestRoom')}
          </button>
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
    </PreferencesPage>
  );
};

export default AccountPreferences;

registerReactComponent('account-preferences', {
  component: AccountPreferences,
  template:
    '<div data-bind="react:{clientRepository, userRepository, propertiesRepository, conversationRepository, showDomain}"></div>',
});
