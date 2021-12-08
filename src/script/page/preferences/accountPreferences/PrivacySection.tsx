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
import {AppLockState} from '../../../user/AppLockState';
import {RECEIPT_MODE} from '@wireapp/api-client/src/conversation/data';
import {t} from 'Util/LocalizerUtil';
import {container} from 'tsyringe';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {PropertiesRepository} from '../../../properties/PropertiesRepository';
import {AppLockRepository} from '../../../user/AppLockRepository';
import {formatDurationCaption} from 'Util/TimeUtil';
import PreferencesSection from '../components/PreferencesSection';
import PreferencesCheckbox from '../components/PreferencesCheckbox';

interface PrivacySectionProps {
  appLockRepository?: AppLockRepository;
  appLockState?: AppLockState;
  propertiesRepository: PropertiesRepository;
}

const PrivacySection: React.FC<PrivacySectionProps> = ({
  propertiesRepository,
  appLockRepository = container.resolve(AppLockRepository),
  appLockState = container.resolve(AppLockState),
}) => {
  const {isAppLockEnabled, isAppLockAvailable, isAppLockEnforced, appLockInactivityTimeoutSecs} =
    useKoSubscribableChildren(appLockState, [
      'isAppLockEnabled',
      'isAppLockAvailable',
      'isAppLockEnforced',
      'appLockInactivityTimeoutSecs',
    ]);

  const {receiptMode} = useKoSubscribableChildren(propertiesRepository, ['receiptMode']);
  return (
    <PreferencesSection hasSeparator className="preferences-section-privacy" title={t('preferencesAccountPrivacy')}>
      <PreferencesCheckbox
        checked={receiptMode === RECEIPT_MODE.ON}
        onChange={checked =>
          propertiesRepository.updateProperty(
            PropertiesRepository.CONFIG.WIRE_RECEIPT_MODE.key,
            checked ? RECEIPT_MODE.ON : RECEIPT_MODE.OFF,
          )
        }
        label={t('preferencesAccountReadReceiptsCheckbox')}
        details={t('preferencesAccountReadReceiptsDetail')}
        uieName="status-preference-read-receipts"
      />

      {isAppLockAvailable && (
        <PreferencesCheckbox
          checked={isAppLockEnabled}
          disabled={isAppLockEnforced}
          onChange={checked => appLockRepository.setEnabled(checked)}
          label={t('preferencesAccountAppLockCheckbox')}
          details={t('preferencesAccountAppLockDetail', formatDurationCaption(appLockInactivityTimeoutSecs * 1000))}
          uieName="status-preference-applock"
        />
      )}
    </PreferencesSection>
  );
};

export default PrivacySection;
