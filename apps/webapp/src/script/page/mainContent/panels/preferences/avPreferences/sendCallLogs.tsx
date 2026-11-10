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

import {ReactNode, useMemo, useState, type JSX} from 'react';

import type {CSSObject} from '@emotion/react';
import {Maybe} from 'true-myth';
import {container} from 'tsyringe';

import {
  callLogsModalBodyStyles,
  confirmationMessageStyles,
  mockNoticeStyles,
  reportStyles,
} from './sendCallLogs.styles';

import {PrimaryModal, removeCurrentModal} from '../../../../../components/Modals/PrimaryModal';
import {Config} from '../../../../../Config';
import type {CallingRepository} from '../../../../../repositories/calling/CallingRepository';
import {
  CallLogsReport,
  CallLogsErrorStatus,
  CallLogsService,
  createMockCallLogsService,
  createHttpCallLogsService,
} from '../../../../../repositories/calling/callLogsService';
import {useCallLogsUploadSettings} from '../../../../../repositories/calling/callLogsUploadSettings';
import {UserState} from '../../../../../repositories/user/userState';
import {Button, ButtonVariant} from '../../../../../uiKit/inputs/button/button';
import {useApplicationContext} from '../../../../rootProvider';

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
  response: 'modalCallLogsErrorResponse',
} as const satisfies Record<CallLogsErrorStatus, string>;

const SendCallLogs = ({
  callingRepository,
  callLogsService,
  userState = container.resolve(UserState),
}: SendCallLogsProps): JSX.Element => {
  const [isUploading, setIsUploading] = useState(false);
  const {translate, clock} = useApplicationContext();
  const brandName = Config.getConfig().BRAND_NAME;
  const mockService = useMemo(() => {
    return createMockCallLogsService(clock);
  }, [clock]);
  const {mode, serverAddress} = useCallLogsUploadSettings();
  const service = useMemo(() => {
    return callLogsService ?? (mode === 'server' ? createHttpCallLogsService(serverAddress) : mockService);
  }, [callLogsService, mode, serverAddress, mockService]);

  const showMessage = (title: string, message: ReactNode, bodyCSS: CSSObject = {}): void => {
    PrimaryModal.show(PrimaryModal.type.ACKNOWLEDGE, {bodyCSS, text: {title, message}}, undefined, translate);
  };

  const showReport = (report: CallLogsReport): void => {
    showMessage(
      translate('modalCallLogsSuccessTitle'),
      <div>
        <p>{translate('modalCallLogsSuccessMessage', {bytes: report.bytes.toLocaleString(), brandName})}</p>
        {mode === 'mock' && <p css={mockNoticeStyles}>{translate('modalCallLogsMockNotice')}</p>}
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
      callLogsModalBodyStyles,
    );
  };

  const sendCallLogs = (): void => {
    const messageLog = callingRepository.getCallLog();
    if (messageLog === undefined || messageLog.length === 0) {
      showMessage(translate('modalCallEmptyLogHeadline'), translate('modalCallEmptyLogMessage'));
      return;
    }

    PrimaryModal.show(
      PrimaryModal.type.OPTION,
      {
        closeOnConfirm: false,
        bodyCSS: callLogsModalBodyStyles,
        optionPosition: 'after-actions',
        optionVariant: 'warning',
        primaryAction: {
          text: translate('modalCallLogsSendConfirm'),
          action: (force: boolean) => {
            removeCurrentModal();
            setIsUploading(true);
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
                setIsUploading(false);
                showReport(report);
              },
              Rejected: error => {
                setIsUploading(false);
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
          message: (
            <div>
              <p css={confirmationMessageStyles}>{translate('modalCallLogsSendMessage', {brandName})}</p>
              {mode === 'server' && (
                <p css={mockNoticeStyles}>{translate('modalCallLogsServerDestination', {serverAddress})}</p>
              )}
            </div>
          ),
        },
      },
      undefined,
      translate,
    );
  };

  return (
    <>
      <div className="preferences-option">
        <Button
          variant={ButtonVariant.TERTIARY}
          onClick={sendCallLogs}
          disabled={isUploading}
          data-uie-name="send-call-logs"
          aria-describedby="send-call-logs-description"
          type="button"
        >
          {translate(isUploading ? 'modalCallLogsSending' : 'preferencesOptionsCallLogsSend')}
        </Button>
      </div>
      <p id="send-call-logs-description" className="preferences-detail">
        {translate('preferencesOptionsCallLogsSendDetail', {brandName})}
      </p>
    </>
  );
};

export {SendCallLogs};
