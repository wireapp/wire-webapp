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

import {ErrorBoundary} from 'react-error-boundary';
import {container} from 'tsyringe';

import {Runtime} from '@wireapp/commons';

import {UserVerificationBadges} from 'Components/badge';
import {ErrorFallback} from 'Components/errorfallback';
import {PrimaryModal} from 'Components/modals/primarymodal';
import {useEnrichedFields} from 'Components/panel/enrichedfields';
import {ClientRepository} from 'Repositories/client';
import {ConversationRepository} from 'Repositories/conversation/conversationrepository';
import {ConversationState} from 'Repositories/conversation/conversationstate';
import {User} from 'Repositories/entity/user';
import {PropertiesRepository} from 'Repositories/properties/propertiesrepository';
import {TeamState} from 'Repositories/team/teamstate';
import {AppLockRepository} from 'Repositories/user/applockrepository';
import type {UserRepository} from 'Repositories/user/userrepository';
import {TeamCreationAccountHeader} from 'src/script/page/leftSidebar/panels/conversations/conversationtabs/teamcreation/teamcreationaccountheader';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {ContentState} from 'src/script/page/useAppState';
import {Core} from 'src/script/service/coreSingleton';
import {useKoSubscribableChildren} from 'Util/componentUtil';
import {getLogger} from 'Util/logger';

import {AccountInput} from './accountpreferences/accountinput';
import {AccountLink} from './accountpreferences/accountlink';
import {AccountSecuritySection} from './accountpreferences/accountsecuritysection';
import {AvailabilityButtons} from './accountpreferences/availabilitybuttons';
import {AvatarInput} from './accountpreferences/avatarinput';
import {DataUsageSection} from './accountpreferences/datausagesection';
import {EmailInput} from './accountpreferences/emailinput';
import {HistoryBackupSection} from './accountpreferences/historybackupsection';
import {LogoutSection} from './accountpreferences/logoutsection';
import {NameInput} from './accountpreferences/nameinput';
import {PrivacySection} from './accountpreferences/privacysection';
import {UsernameInput} from './accountpreferences/usernameinput';
import {PreferencesPage} from './components/preferencespage';
import {PreferencesSection} from './components/preferencessection';

import {Config} from '../../../../config';
import {AccentColorPicker} from '../../../accentColorPicker';

interface AccountPreferencesProps {
  appLockRepository: AppLockRepository;
  importFile: (file: File) => void;
  clientRepository: ClientRepository;
  conversationRepository: ConversationRepository;
  propertiesRepository: PropertiesRepository;
  switchContent: (contentState: ContentState) => void;
  /** Should the domain be displayed */
  showDomain?: boolean;
  teamState?: TeamState;
  userRepository: UserRepository;
  selfUser: User;
  isActivatedAccount?: boolean;
  conversationState?: ConversationState;
}

const logger = getLogger('AccountPreferences');

export const AccountPreferences = ({
  appLockRepository,
  importFile,
  clientRepository,
  userRepository,
  propertiesRepository,
  switchContent,
  conversationRepository,
  selfUser,
  isActivatedAccount = false,
  showDomain = false,
  teamState = container.resolve(TeamState),
  conversationState = container.resolve(ConversationState),
}: AccountPreferencesProps) => {
  const core = container.resolve(Core);
  const {translate} = useApplicationContext();
  const {isTeam, teamName} = useKoSubscribableChildren(teamState, ['isTeam', 'teamName']);
  const {name, email, availability, username, managedBy} = useKoSubscribableChildren(selfUser, [
    'name',
    'email',
    'availability',
    'username',
    'managedBy',
  ]);

  const canEditProfile = managedBy === User.CONFIG.MANAGED_BY.WIRE;
  const isDesktop = Runtime.isDesktopApp();
  const config = Config.getConfig();
  const brandName = config.BRAND_NAME;
  const isConsentCheckEnabled = config.FEATURE.CHECK_CONSENT;
  const isTeamCreationEnabled =
    Config.getConfig().FEATURE.ENABLE_TEAM_CREATION &&
    core.backendFeatures.version >= Config.getConfig().MIN_TEAM_CREATION_SUPPORTED_API_VERSION;

  const richFields = useEnrichedFields(selfUser, {addDomain: showDomain, addEmail: false}, translate);
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
              void clientRepository.logoutClient();
            } catch (error: unknown) {
              logger.warn('Error while leaving room', error);
            }
          },
          text: translate('modalAccountLeaveGuestRoomAction'),
        },
        text: {
          message: translate('modalAccountLeaveGuestRoomMessage'),
          title: translate('modalAccountLeaveGuestRoomHeadline'),
        },
      },
      undefined,
      translate,
    );
  };

  return (
    <PreferencesPage title={translate('preferencesAccount')}>
      <div className="preferences-wrapper">
        {isTeamCreationEnabled && !teamState.isInTeam(selfUser) && <TeamCreationAccountHeader />}
        <div className="preferences-account-name">
          <h3 className="heading-h3 text-center" title={name}>
            {name}
          </h3>

          <UserVerificationBadges user={selfUser} groupId={conversationState.selfMLSConversation()?.groupId} />
        </div>

        <div className="preferences-account-image">
          <ErrorBoundary FallbackComponent={ErrorFallback}>
            <AvatarInput
              selfUser={selfUser}
              isActivatedAccount={isActivatedAccount}
              userRepository={userRepository}
              hideAvailabilityStatus
            />
          </ErrorBoundary>
        </div>

        {isActivatedAccount && isTeam && <AvailabilityButtons availability={availability} />}

        {isActivatedAccount && (
          <div className="preferences-accent-color-picker">
            <AccentColorPicker user={selfUser} doSetAccentColor={id => userRepository.changeAccentColor(id)} />
          </div>
        )}
      </div>

      {isActivatedAccount ? (
        <PreferencesSection hasSeparator title={translate('preferencesAccountInfo')}>
          <div
            css={{
              display: 'flex',
              flexDirection: 'row',
              flexWrap: 'wrap',
              marginLeft: '-8px',
            }}
          >
            <NameInput canEditProfile={canEditProfile} name={name} userRepository={userRepository} />

            <UsernameInput
              canEditProfile={canEditProfile}
              userRepository={userRepository}
              username={username}
              domain={showDomain ? domain : undefined}
            />

            {email && !selfUser.isNoPasswordSSO && (
              <EmailInput canEditProfile={canEditProfile} email={email} userRepository={userRepository} />
            )}

            {isTeam && (
              <AccountInput
                label={translate('preferencesAccountTeam')}
                value={teamName}
                readOnly
                fieldName="status-team"
              />
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
            label={translate('preferencesAccountLink')}
            value={`${Config.getConfig().URL.ACCOUNT_BASE}/user-profile/?id=${selfUser.id}@${selfUser.domain}`}
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
            {translate('preferencesAccountLeaveGuestRoom')}
          </button>

          <div className="preferences-leave-disclaimer">{translate('preferencesAccountLeaveGuestRoomDescription')}</div>
        </PreferencesSection>
      )}

      {isConsentCheckEnabled && (
        <DataUsageSection
          brandName={brandName}
          isActivatedAccount={isActivatedAccount}
          propertiesRepository={propertiesRepository}
        />
      )}

      <PrivacySection appLockRepository={appLockRepository} propertiesRepository={propertiesRepository} />

      {isActivatedAccount && (
        <>
          <HistoryBackupSection brandName={brandName} importFile={importFile} switchContent={switchContent} />

          <AccountSecuritySection selfUser={selfUser} userRepository={userRepository} />

          {!isDesktop && <LogoutSection clientRepository={clientRepository} />}
        </>
      )}
    </PreferencesPage>
  );
};
