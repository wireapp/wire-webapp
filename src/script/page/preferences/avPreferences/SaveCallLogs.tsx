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

import {amplify} from 'amplify';
import React from 'react';
import {WebAppEvents} from '@wireapp/webapp-events';
import {container} from 'tsyringe';

import {t} from 'Util/LocalizerUtil';
import {getCurrentDate} from 'Util/TimeUtil';
import {downloadBlob} from 'Util/util';
import {Config} from '../../../Config';
import PreferencesSection from '../components/PreferencesSection';
import type {CallingRepository} from '../../../calling/CallingRepository';
import {ModalsViewModel} from '../../../view_model/ModalsViewModel';
import {UserState} from '../../../user/UserState';

interface SaveCallLogsProps {
  callingRepository: CallingRepository;
  userState?: UserState;
}

const OBFUSCATION_TRUNCATE_TO = 4;

const SaveCallLogs: React.FC<SaveCallLogsProps> = ({callingRepository, userState = container.resolve(UserState)}) => {
  const brandName = Config.getConfig().BRAND_NAME;
  const saveCallLogs = () => {
    const messageLog = callingRepository.getCallLog();
    if (messageLog) {
      const callLog = [messageLog.join('\r\n')];
      const blob = new Blob(callLog, {type: 'text/plain;charset=utf-8'});
      const truncatedId = userState.self().id.substr(0, OBFUSCATION_TRUNCATE_TO);
      const sanitizedBrandName = brandName.replace(/[^A-Za-z0-9_]/g, '');
      const filename = `${sanitizedBrandName}-${truncatedId}-Calling_${getCurrentDate()}.log`;

      downloadBlob(blob, filename);
    } else {
      amplify.publish(WebAppEvents.WARNING.MODAL, ModalsViewModel.TYPE.ACKNOWLEDGE, {
        text: {
          message: t('modalCallEmptyLogMessage'),
          title: t('modalCallEmptyLogHeadline'),
        },
      });
    }
  };
  return (
    <PreferencesSection title={t('preferencesOptionsCallLogs')}>
      <div className="preferences-option">
        <button
          className="preferences-link accent-text"
          onClick={saveCallLogs}
          data-uie-name="get-call-logs"
          aria-describedby="call-logs-description"
          type="button"
        >
          {t('preferencesOptionsCallLogsGet')}
        </button>
      </div>
      <p id="call-logs-description" className="preferences-detail">
        {t('preferencesOptionsCallLogsDetail', brandName)}
      </p>
    </PreferencesSection>
  );
};

export default SaveCallLogs;
