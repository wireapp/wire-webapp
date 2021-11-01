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
import {StatusCodes as HTTP_STATUS} from 'http-status-codes';

import AvailabilityState from 'Components/AvailabilityState';
import Avatar, {AVATAR_SIZE} from 'Components/Avatar';
import {useEnrichedFields} from 'Components/panel/EnrichedFields';
import React, {useRef} from 'react';
import {AppLockState} from '../../user/AppLockState';
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
import {StorageKey} from 'src/script/storage';
import {Config} from 'src/script/Config';
import HistoryBackupSection from './accountPreferences/HistoryBackupSection';
import AccountSecuritySection from './accountPreferences/AccountSecuritySection';
import {PropertiesRepository} from 'src/script/properties/PropertiesRepository';
import PrivacySection from './accountPreferences/PrivacySection';
import {AppLockRepository} from 'src/script/user/AppLockRepository';
import LogoutSection from './accountPreferences/LogoutSection';
import DataUsageSection from './accountPreferences/DataUsageSection';
import PreferencesSection from './accountPreferences/PreferencesSection';
import {getLogger} from 'Util/Logger';
import {amplify} from 'amplify';
import {WebAppEvents} from '@wireapp/webapp-events';
import {ModalsViewModel} from 'src/script/view_model/ModalsViewModel';

interface AccountPreferencesProps {
  appLockRepository: AppLockRepository;
  appLockState: AppLockState;
  clientRepository: ClientRepository;
  propertiesRepository: PropertiesRepository;
  richProfileRepository: RichProfileRepository;
  teamState: TeamState;
  userRepository: UserRepository;
  userState: UserState;
}

const logger = getLogger('AccountPreferences');

const AccountPreferences: React.FC<AccountPreferencesProps> = ({
  clientRepository,
  userRepository,
  propertiesRepository,
  appLockRepository,
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

  const changeEmail = async (enteredEmail: string): Promise<void> => {
    try {
      await userRepository.changeEmail(enteredEmail);
      amplify.publish(WebAppEvents.WARNING.MODAL, ModalsViewModel.TYPE.ACKNOWLEDGE, {
        text: {
          message: t('authPostedResendDetail'),
          title: t('modalPreferencesAccountEmailHeadline'),
        },
      });
    } catch (error) {
      logger.warn('Failed to send reset email request', error);
      if (error.code === HTTP_STATUS.BAD_REQUEST) {
        amplify.publish(WebAppEvents.WARNING.MODAL, ModalsViewModel.TYPE.ACKNOWLEDGE, {
          text: {
            message: t('modalPreferencesAccountEmailInvalidMessage'),
            title: t('modalPreferencesAccountEmailErrorHeadline'),
          },
        });
      }
      if (error.code === HTTP_STATUS.CONFLICT) {
        amplify.publish(WebAppEvents.WARNING.MODAL, ModalsViewModel.TYPE.ACKNOWLEDGE, {
          text: {
            message: t('modalPreferencesAccountEmailTakenMessage'),
            title: t('modalPreferencesAccountEmailErrorHeadline'),
          },
        });
      }
    }
  };

  return (
    <div>
      <div className="preferences-titlebar">{t('preferencesAccount')}</div>
      <div ref={setScrollbarRef}>
        {name}
        <Avatar participant={selfUser} avatarSize={AVATAR_SIZE.X_LARGE} />
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
          <AccountInput label="Displayname" value={name} />
          <AccountInput label="Username" value={username} />
          <AccountInput label="Email" value={email} readOnly={!canEditProfile} onChange={changeEmail} />
          {richFields.map(({type, value}) => (
            <AccountInput key={type} label={type} value={value} readOnly />
          ))}
        </PreferencesSection>
        <DataUsageSection {...{brandName, isActivatedAccount, propertiesRepository}} />
        <PrivacySection {...{appLockRepository, propertiesRepository}} />
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
  template: '<div data-bind="react:{userRepository}"></div>',
});
