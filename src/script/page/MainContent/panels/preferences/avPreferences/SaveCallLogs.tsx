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

import {container} from 'tsyringe';

import {Button, ButtonVariant} from '@wireapp/react-ui-kit';

import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import type {CallingRepository} from 'Repositories/calling/CallingRepository';
import {UserState} from 'Repositories/user/UserState';
import {t} from 'Util/LocalizerUtil';
import {getCurrentDate} from 'Util/TimeUtil';
import {downloadBlob} from 'Util/util';

import {Config} from '../../../../../Config';
import {PreferencesSection} from '../components/PreferencesSection';

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
      const truncatedId = userState.self().id.slice(0, OBFUSCATION_TRUNCATE_TO);
      const sanitizedBrandName = brandName.replace(/[^A-Za-z0-9_]/g, '');
      const filename = `${sanitizedBrandName}-${truncatedId}-Calling_${getCurrentDate()}.log`;

      downloadBlob(blob, filename);
    } else {
      PrimaryModal.show(PrimaryModal.type.ACKNOWLEDGE, {
        text: {
          closeBtnLabel: t('modalCallEmptyLogCloseBtn'),
          message: t('modalCallEmptyLogMessage'),
          title: t('modalCallEmptyLogHeadline'),
        },
      });
    }
  };
  return (
    <PreferencesSection title={t('preferencesOptionsCallLogs')}>
      <div className="preferences-option">
        <Button
          variant={ButtonVariant.TERTIARY}
          onClick={saveCallLogs}
          data-uie-name="get-call-logs"
          aria-describedby="call-logs-description"
          type="button"
        >
          {t('preferencesOptionsCallLogsGet')}
        </Button>
      </div>
      <p id="call-logs-description" className="preferences-detail">
        {t('preferencesOptionsCallLogsDetail', {brandName})}
      </p>
    </PreferencesSection>
  );
};

export {SaveCallLogs};
