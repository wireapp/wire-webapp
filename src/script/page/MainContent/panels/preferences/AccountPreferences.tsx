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

import React, {useRef} from 'react';

import {container} from 'tsyringe';

import {Runtime} from '@wireapp/commons';

import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {useEnrichedFields} from 'Components/panel/EnrichedFields';
import {ContentState} from 'src/script/page/useAppState';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';
import {getLogger} from 'Util/Logger';
import {loadValue} from 'Util/StorageUtil';
import {isTemporaryClientAndNonPersistent} from 'Util/util';

import {AccountInput} from './accountPreferences/AccountInput';
import {AccountLink} from './accountPreferences/AccountLink';
import {AccountSecuritySection} from './accountPreferences/AccountSecuritySection';
import {AvailabilityButtons} from './accountPreferences/AvailabilityButtons';
import {AvatarInput} from './accountPreferences/AvatarInput';
import {DataUsageSection} from './accountPreferences/DataUsageSection';
import {EmailInput} from './accountPreferences/EmailInput';
import {HistoryBackupSection} from './accountPreferences/HistoryBackupSection';
import {LogoutSection} from './accountPreferences/LogoutSection';
import {NameInput} from './accountPreferences/NameInput';
import {PrivacySection} from './accountPreferences/PrivacySection';
import {UsernameInput} from './accountPreferences/UsernameInput';
import {PreferencesPage} from './components/PreferencesPage';
import {PreferencesSection} from './components/PreferencesSection';

import {ClientRepository} from '../../../../client/ClientRepository';
import {Config} from '../../../../Config';
import {ConversationRepository} from '../../../../conversation/ConversationRepository';
import {User} from '../../../../entity/User';
import {PropertiesRepository} from '../../../../properties/PropertiesRepository';
import {StorageKey} from '../../../../storage';
import {TeamState} from '../../../../team/TeamState';
import {RichProfileRepository} from '../../../../user/RichProfileRepository';
import type {UserRepository} from '../../../../user/UserRepository';
import {UserState} from '../../../../user/UserState';
import {AccentColorPicker} from '../../../AccentColorPicker';

interface AccountPreferencesProps {
  importFile: (file: File) => void;
  clientRepository: ClientRepository;
  conversationRepository: ConversationRepository;
  propertiesRepository: PropertiesRepository;
  switchContent: (contentState: ContentState) => void;
  richProfileRepository?: RichProfileRepository;
  /** Should the domain be displayed */
  showDomain?: boolean;
  teamState?: TeamState;
  userRepository: UserRepository;
  userState?: UserState;
}

const logger = getLogger('AccountPreferences');

const AccountPreferences: React.FC<AccountPreferencesProps> = ({
  importFile,
  clientRepository,
  userRepository,
  propertiesRepository,
  switchContent,
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
    PrimaryModal.show(
      PrimaryModal.type.CONFIRM,
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
          width: 'var(--preferences-width)',
        }}
      >
        <h3
          className="heading-h3 text-center ellipsis"
          title={name}
          css={{
            marginBottom: 16,
            width: '100%',
          }}
        >
          {name}
        </h3>

        <div>
          <AvatarInput {...{isActivatedAccount, selfUser, userRepository}} />
        </div>

        {isActivatedAccount && isTeam && <AvailabilityButtons {...{availability}} />}

        {isActivatedAccount && (
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
            {email && !selfUser.isNoPasswordSSO && <EmailInput {...{canEditProfile, email, userRepository}} />}
            {phone && <AccountInput label={t('preferencesAccountPhone')} value={phone} readOnly fieldName="phone" />}
            {isTeam && (
              <AccountInput label={t('preferencesAccountTeam')} value={teamName} readOnly fieldName="status-team" />
            )}
            {richFields.map(({type, value}) => (
              <AccountInput
                key={type}
                labelUie="item-enriched-key"
                valueUie="item-enriched-value"
                fieldName={type.replace(' ', '-')}
                label={type}
                value={value}
                readOnly
              />
            ))}
          </div>
          <AccountLink
            label={t('preferencesAccountLink')}
            value={`${Config.getConfig().URL.ACCOUNT_BASE}/user-profile/?id=${selfUser.id}`}
            data-uie-name="element-profile-link"
          />
        </PreferencesSection>
      ) : (
        <PreferencesSection hasSeparator>
          <button
            className="preferences-link"
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
          {!isTemporaryAndNonPersistent.current && (
            <HistoryBackupSection brandName={brandName} importFile={importFile} switchContent={switchContent} />
          )}
          <AccountSecuritySection {...{selfUser, userRepository}} />
          {!isDesktop && <LogoutSection {...{clientRepository}} />}
        </>
      )}
    </PreferencesPage>
  );
};

export {AccountPreferences};
