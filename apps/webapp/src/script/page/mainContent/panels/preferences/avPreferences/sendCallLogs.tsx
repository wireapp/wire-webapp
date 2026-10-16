/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {ReactNode, useMemo} from 'react';

import {Maybe} from 'true-myth';
import {container} from 'tsyringe';

import {Button, ButtonVariant} from '@wireapp/react-ui-kit';

import {PrimaryModal, removeCurrentModal} from 'Components/Modals/PrimaryModal';
import type {CallingRepository} from 'Repositories/calling/CallingRepository';
import {
  CallLogsReport,
  CallLogsErrorStatus,
  CallLogsService,
  createMockCallLogsService,
} from 'Repositories/calling/callLogsService';
import {UserState} from 'Repositories/user/userState';
import {useApplicationContext} from 'src/script/page/rootProvider';

import {confirmationMessageStyles, mockNoticeStyles, reportStyles} from './sendCallLogs.styles';

import {Config} from '../../../../../Config';
import {PreferencesSection} from '../components/preferencesSection';

interface SendCallLogsProps {
  callingRepository: CallingRepository;
  callLogsService?: CallLogsService;
  userState?: UserState;
}

const OBFUSCATION_TRUNCATE_TO = 4;
const ISO_DATE_PREFIX_LENGTH = 10;

const callLogsErrorTranslationKeys = {
  400: 'modalCallLogsError400',
  409: 'modalCallLogsError409',
  413: 'modalCallLogsError413',
  422: 'modalCallLogsError422',
  502: 'modalCallLogsError502',
  500: 'modalCallLogsError500',
  network: 'modalCallLogsErrorNetwork',
} as const satisfies Record<CallLogsErrorStatus, string>;

const SendCallLogs = ({
  callingRepository,
  callLogsService,
  userState = container.resolve(UserState),
}: SendCallLogsProps) => {
  const {translate, clock} = useApplicationContext();
  const brandName = Config.getConfig().BRAND_NAME;
  const mockService = useMemo(() => {
    return createMockCallLogsService(clock);
  }, [clock]);
  const service = callLogsService ?? mockService;

  const showMessage = (title: string, message: ReactNode) => {
    PrimaryModal.show(PrimaryModal.type.ACKNOWLEDGE, {text: {title, message}}, undefined, translate);
  };

  const showReport = (report: CallLogsReport) => {
    showMessage(
      translate('modalCallLogsSuccessTitle'),
      <div>
        <p>{translate('modalCallLogsSuccessMessage', {bytes: report.bytes.toLocaleString(), brandName})}</p>
        <p css={mockNoticeStyles}>{translate('modalCallLogsMockNotice')}</p>
        <dl css={reportStyles}>
          {(
            [
              ['modalCallLogsReportFile', report.file_name],
              ['modalCallLogsReportParticipant', report.participant_id],
              ['modalCallLogsReportFormat', report.format],
              ['modalCallLogsReportEntries', report.entries_exported],
              ['modalCallLogsReportRecords', report.log_records_exported],
              ['modalCallLogsReportParticipants', report.participants_hashed],
              ['modalCallLogsReportDuration', report.duration_ms],
              ['modalCallLogsReportSpanIds', report.improvised_span_ids],
            ] as const
          ).map(([label, value]) => {
            return (
              <div key={label}>
                <dt>{translate(label)}</dt>
                <dd>{value}</dd>
              </div>
            );
          })}
        </dl>
        {report.improvised_span_ids !== 0 && <p role="alert">{translate('modalCallLogsSpanWarning')}</p>}
      </div>,
    );
  };

  const sendCallLogs = () => {
    const messageLog = callingRepository.getCallLog();
    if (messageLog === undefined || messageLog.length === 0) {
      showMessage(translate('modalCallEmptyLogHeadline'), translate('modalCallEmptyLogMessage'));
      return;
    }

    PrimaryModal.show(
      PrimaryModal.type.OPTION,
      {
        closeOnConfirm: false,
        optionPosition: 'after-actions',
        optionVariant: 'warning',
        primaryAction: {
          text: translate('modalCallLogsSendConfirm'),
          action: (force: boolean) => {
            PrimaryModal.replace(
              PrimaryModal.type.LOADING,
              {
                preventClose: true,
                hideCloseBtn: true,
                text: {
                  title: translate('modalCallLogsSending'),
                  message: translate('modalCallLogsSendingMessage'),
                },
              },
              translate,
            );
            const truncatedId = Maybe.of(userState.self())
              .map(user => {
                return user.id.slice(0, OBFUSCATION_TRUNCATE_TO);
              })
              .unwrapOr('unknown');
            const sanitizedBrandName = brandName.replace(/[^A-Za-z0-9_]/g, '');
            const date = clock.currentDate.toISOString().slice(0, ISO_DATE_PREFIX_LENGTH);
            const filename = `${sanitizedBrandName}-${truncatedId}-Calling_${date}.log`;
            const file = new File([messageLog.join('\r\n')], filename, {type: 'text/plain;charset=utf-8'});
            return service.sendCallLogs(file, {force}).match({
              Resolved: report => {
                removeCurrentModal();
                showReport(report);
              },
              Rejected: error => {
                removeCurrentModal();
                showMessage(
                  translate('modalCallLogsSendErrorTitle'),
                  translate(callLogsErrorTranslationKeys[error.status]),
                );
              },
            });
          },
        },
        secondaryAction: {text: translate('modalCallLogsSendCancel')},
        text: {
          title: translate('modalCallLogsSendTitle'),
          option: translate('modalCallLogsForceOption'),
          message: <p css={confirmationMessageStyles}>{translate('modalCallLogsSendMessage', {brandName})}</p>,
        },
      },
      undefined,
      translate,
    );
  };

  return (
    <PreferencesSection title={translate('preferencesOptionsCallLogs')}>
      <div className="preferences-option">
        <Button
          variant={ButtonVariant.TERTIARY}
          onClick={sendCallLogs}
          data-uie-name="send-call-logs"
          aria-describedby="call-logs-description"
          type="button"
        >
          {translate('preferencesOptionsCallLogsSend')}
        </Button>
      </div>
      <p id="call-logs-description" className="preferences-detail">
        {translate('preferencesOptionsCallLogsSendDetail', {brandName})}
      </p>
    </PreferencesSection>
  );
};

export {SendCallLogs};
