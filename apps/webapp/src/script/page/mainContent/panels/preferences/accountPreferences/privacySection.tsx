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

import React, {type FunctionComponent} from 'react';

import {container} from 'tsyringe';

import {RECEIPT_MODE} from '../../../../../apiClient/conversation/data/conversationReceiptModeUpdateData';
import {Config} from '../../../../../Config';
import {PropertiesRepository} from '../../../../../repositories/properties/propertiesRepository';
import {AppLockRepository} from '../../../../../repositories/user/appLockRepository';
import {AppLockState} from '../../../../../repositories/user/appLockState';
import {CONVERSATION_TYPING_INDICATOR_MODE} from '../../../../../repositories/user/typingIndicatorMode';
import {Checkbox, CheckboxLabel} from '../../../../../uiKit/inputs/checkbox/checkbox';
import {useKoSubscribableChildren} from '../../../../../util/componentUtil';
import {formatDurationCaption, TIME_IN_MILLIS} from '../../../../../util/timeUtil';
import {useApplicationContext} from '../../../../rootProvider';
import {PreferencesSection} from '../components/preferencesSection';

interface PrivacySectionProps {
  appLockRepository: AppLockRepository;
  appLockState?: AppLockState;
  propertiesRepository: PropertiesRepository;
}

const PrivacySection: FunctionComponent<PrivacySectionProps> = ({
  propertiesRepository,
  appLockRepository,
  appLockState = container.resolve(AppLockState),
}: PrivacySectionProps) => {
  const {translate} = useApplicationContext();
  const {isAppLockEnabled, isAppLockAvailable, isAppLockEnforced, appLockInactivityTimeoutSecs} =
    useKoSubscribableChildren(appLockState, [
      'isAppLockEnabled',
      'isAppLockAvailable',
      'isAppLockEnforced',
      'appLockInactivityTimeoutSecs',
    ]);

  const enableMdmConfig = Config.getConfig().FEATURE.ENABLE_MDM_CONFIG;
  const appLockOverride = Config.getDesktopConfig()?.managedConfig?.applockOverride === true;
  const isMdmAppLockDisabled = enableMdmConfig && appLockOverride;

  const {receiptMode, typingIndicatorMode} = useKoSubscribableChildren(propertiesRepository, [
    'receiptMode',
    'typingIndicatorMode',
  ]);

  const changeReceiptMode = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const isChecked = event.target.checked;

    void propertiesRepository.updateProperty(
      PropertiesRepository.CONFIG.WIRE_RECEIPT_MODE.key,
      isChecked ? RECEIPT_MODE.ON : RECEIPT_MODE.OFF,
    );
  };

  const handleTypingModeChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const isChecked = event.target.checked;

    void propertiesRepository.updateProperty(
      PropertiesRepository.CONFIG.WIRE_TYPING_INDICATOR_MODE.key,
      isChecked ? CONVERSATION_TYPING_INDICATOR_MODE.ON : CONVERSATION_TYPING_INDICATOR_MODE.OFF,
    );
  };

  return (
    <PreferencesSection
      hasSeparator
      className="preferences-section-privacy"
      title={translate('preferencesAccountPrivacy')}
    >
      <>
        <Checkbox
          onChange={changeReceiptMode}
          checked={receiptMode === RECEIPT_MODE.ON}
          data-uie-name="status-preference-read-receipts"
        >
          <CheckboxLabel htmlFor="status-preference-read-receipts">
            {translate('preferencesAccountReadReceiptsCheckbox')}
          </CheckboxLabel>
        </Checkbox>
        <p className="preferences-detail preferences-detail-intended">
          {translate('preferencesAccountReadReceiptsDetail')}
        </p>
      </>

      <div className="checkbox-margin">
        <Checkbox
          onChange={handleTypingModeChange}
          checked={typingIndicatorMode === CONVERSATION_TYPING_INDICATOR_MODE.ON}
          data-uie-name="status-preference-typing-indicator"
        >
          <CheckboxLabel htmlFor="status-preference-typing-indicator">
            {translate('preferencesAccountTypingIndicatorCheckbox')}
          </CheckboxLabel>
        </Checkbox>
        <p className="preferences-detail preferences-detail-intended">
          {translate('preferencesAccountTypingIndicatorsDetail')}
        </p>
      </div>
      {isAppLockAvailable && (
        <div className="checkbox-margin">
          <Checkbox
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
              appLockRepository.setEnabled(event.target.checked);
            }}
            checked={isAppLockEnabled}
            disabled={isAppLockEnforced || isMdmAppLockDisabled}
            data-uie-name="status-preference-applock"
          >
            <CheckboxLabel htmlFor="status-preference-applock">
              {translate('preferencesAccountAppLockCheckbox')}
            </CheckboxLabel>
          </Checkbox>
          <p className="preferences-detail preferences-detail-intended">
            {translate('preferencesAccountAppLockDetail', {
              locktime: formatDurationCaption(appLockInactivityTimeoutSecs * TIME_IN_MILLIS.SECOND, translate),
            })}
          </p>
        </div>
      )}
    </PreferencesSection>
  );
};

export {PrivacySection};
