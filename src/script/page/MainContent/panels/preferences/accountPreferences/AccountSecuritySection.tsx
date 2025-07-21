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

import React from 'react';

import {amplify} from 'amplify';
import {container} from 'tsyringe';

import {Runtime} from '@wireapp/commons';
import {TabIndex, Link, LinkVariant} from '@wireapp/react-ui-kit';
import {WebAppEvents} from '@wireapp/webapp-events';

import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {User} from 'Repositories/entity/User';
import {TeamState} from 'Repositories/team/TeamState';
import {AppLockState} from 'Repositories/user/AppLockState';
import {FEATURES, hasAccessToFeature} from 'Repositories/user/UserPermission';
import {UserRepository} from 'Repositories/user/UserRepository';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';

import {externalUrl, getManageTeamUrl} from '../../../../../externalRoute';
import {PreferencesSection} from '../components/PreferencesSection';

interface AccountSecuritySectionProps {
  appLockState?: AppLockState;
  selfUser: User;
  teamState?: TeamState;
  userRepository: UserRepository;
}

const AccountSecuritySection: React.FC<AccountSecuritySectionProps> = ({
  selfUser,
  userRepository,
  appLockState = container.resolve(AppLockState),
  teamState = container.resolve(TeamState),
}) => {
  const createTeamUrl = externalUrl.createTeam;
  const manageTeamUrl = getManageTeamUrl('client_settings');
  const {teamRole} = useKoSubscribableChildren(selfUser, ['teamRole']);
  const {isAppLockActivated} = useKoSubscribableChildren(appLockState, ['isAppLockActivated']);
  const {isTeam} = useKoSubscribableChildren(teamState, ['isTeam']);
  const isMacOsWrapper = Runtime.isDesktopApp() && Runtime.isMacOS();

  const onClickDeleteAccount = () =>
    PrimaryModal.show(
      PrimaryModal.type.CONFIRM,
      {
        primaryAction: {
          action: () => userRepository.deleteMe(),
          text: t('modalAccountDeletionAction'),
        },
        text: {
          message: t('modalAccountDeletionMessage'),
          title: t('modalAccountDeletionHeadline'),
        },
      },
      undefined,
    );

  return (
    <PreferencesSection hasSeparator className="preferences-section-account-security">
      {manageTeamUrl && hasAccessToFeature(FEATURES.MANAGE_TEAM, teamRole) && (
        <Link
          tabIndex={TabIndex.FOCUSABLE}
          variant={LinkVariant.PRIMARY}
          href={manageTeamUrl}
          targetBlank
          data-uie-name="do-manage-team"
          type="button"
        >
          {t('preferencesAccountManageTeam')}
        </Link>
      )}

      {createTeamUrl && !isMacOsWrapper && (
        <Link variant={LinkVariant.PRIMARY} targetBlank href={createTeamUrl} data-uie-name="do-create-team">
          {t('preferencesAccountCreateTeam')}
        </Link>
      )}
      {isAppLockActivated && (
        <Link
          tabIndex={TabIndex.FOCUSABLE}
          variant={LinkVariant.PRIMARY}
          onClick={() => amplify.publish(WebAppEvents.PREFERENCES.CHANGE_APP_LOCK_PASSPHRASE)}
          data-uie-name="do-reset-app-lock"
          type="button"
        >
          {t('preferencesAccountResetAppLockPassphrase')}
        </Link>
      )}
      {!selfUser?.isNoPasswordSSO && (
        <Link
          tabIndex={TabIndex.FOCUSABLE}
          variant={LinkVariant.PRIMARY}
          href={externalUrl.passwordReset}
          targetBlank
          title={t('tooltipPreferencesPassword')}
          data-uie-name="do-reset-password"
          type="button"
        >
          {t('preferencesAccountResetPassword')}
        </Link>
      )}

      {!isTeam && (
        <Link
          tabIndex={TabIndex.FOCUSABLE}
          variant={LinkVariant.PRIMARY}
          onClick={onClickDeleteAccount}
          data-uie-name="go-delete-account"
          type="button"
        >
          {t('preferencesAccountDelete')}
        </Link>
      )}
    </PreferencesSection>
  );
};

export {AccountSecuritySection};
