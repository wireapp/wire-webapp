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
import React from 'react';
import {User} from '../../../../../entity/User';
import {getAccountPagesUrl, getCreateTeamUrl, getManageTeamUrl, URL_PATH} from '../../../../../externalRoute';
import {TeamState} from '../../../../../team/TeamState';
import {AppLockState} from '../../../../../user/AppLockState';
import {FEATURES, hasAccessToFeature} from '../../../../../user/UserPermission';
import {UserRepository} from '../../../../../user/UserRepository';
import {container} from 'tsyringe';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';
import {safeWindowOpen} from 'Util/SanitizationUtil';
import PreferencesSection from '../components/PreferencesSection';
import {Link, LinkVariant} from '@wireapp/react-ui-kit';
import {PrimaryModalType} from 'Components/Modals/PrimaryModal/PrimaryModalTypes';

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
  const createTeamUrl = getCreateTeamUrl();
  const manageTeamUrl = getManageTeamUrl('client_settings');
  const {teamRole} = useKoSubscribableChildren(selfUser, ['teamRole']);
  const {isAppLockActivated} = useKoSubscribableChildren(appLockState, ['isAppLockActivated']);
  const {isTeam} = useKoSubscribableChildren(teamState, ['isTeam']);
  const isMacOsWrapper = Runtime.isDesktopApp() && Runtime.isMacOS();

  const onClickDeleteAccount = () =>
    amplify.publish(
      WebAppEvents.WARNING.MODAL,
      PrimaryModalType.CONFIRM,
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
          tabIndex={0}
          variant={LinkVariant.PRIMARY}
          onClick={() => safeWindowOpen(manageTeamUrl)}
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
          tabIndex={0}
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
          tabIndex={0}
          variant={LinkVariant.PRIMARY}
          onClick={() => safeWindowOpen(getAccountPagesUrl(URL_PATH.PASSWORD_RESET))}
          title={t('tooltipPreferencesPassword')}
          data-uie-name="do-reset-password"
          type="button"
        >
          {t('preferencesAccountResetPassword')}
        </Link>
      )}

      {!isTeam && (
        <Link
          tabIndex={0}
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

export default AccountSecuritySection;
