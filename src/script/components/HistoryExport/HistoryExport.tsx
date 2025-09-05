/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {useContext, useEffect, useState} from 'react';

import {amplify} from 'amplify';
import {container} from 'tsyringe';

import {Button, ButtonVariant, FlexBox} from '@wireapp/react-ui-kit';
import {WebAppEvents} from '@wireapp/webapp-events';

import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {ProgressBar} from 'Components/ProgressBar/ProgressBar';
import {CancelError} from 'Repositories/backup/Error';
import {ClientState} from 'Repositories/client/ClientState';
import {User} from 'Repositories/entity/User';
import {EventName} from 'Repositories/tracking/EventName';
import {Segmentation} from 'Repositories/tracking/Segmentation';
import {ContentState} from 'src/script/page/useAppState';
import {t} from 'Util/LocalizerUtil';
import {getLogger} from 'Util/Logger';
import {getCurrentDate} from 'Util/TimeUtil';
import {downloadBlob} from 'Util/util';

import {Config} from '../../Config';
import {RootContext} from '../../page/RootProvider';

enum ExportState {
  COMPRESSING = 'ExportState.STATE.COMPRESSING',
  DONE = 'ExportState.STATE.DONE',
  EXPORTING = 'ExportState.STATE.EXPORTING',
  PREPARING = 'ExportState.STATE.PREPARING',
}

export const CONFIG = {
  LEGACY_FILE_EXTENSION: 'desktop_wbu',
  UNIVERSAL_FILE_EXTENSION: 'wbu',
};

interface HistoryExportProps {
  switchContent: (contentState: ContentState) => void;
  readonly user: User;
  readonly clientState?: ClientState;
}

const HistoryExport = ({switchContent, user, clientState = container.resolve(ClientState)}: HistoryExportProps) => {
  const logger = getLogger('HistoryExport');

  const [historyState, setHistoryState] = useState<ExportState>(ExportState.PREPARING);
  const [hasError, setHasError] = useState<boolean>(false);

  const [numberOfRecords, setNumberOfRecords] = useState<number>(0);
  const [numberOfProcessedRecords, setNumberOfProcessedRecords] = useState<number>(0);

  const [archiveBlob, setArchiveBlob] = useState<Blob | null>(null);

  const mainViewModel = useContext(RootContext);

  useEffect(() => {
    showBackupModal();
  }, []);

  if (!mainViewModel) {
    return null;
  }

  const {content: contentViewModel} = mainViewModel;
  const backupRepository = contentViewModel.repositories.backup;

  const loadingProgress = Math.floor((numberOfProcessedRecords / numberOfRecords) * 100);

  const isPreparing = !hasError && historyState === ExportState.PREPARING;
  const isExporting = !hasError && [ExportState.EXPORTING, ExportState.COMPRESSING].includes(historyState);
  const isDone = !hasError && historyState === ExportState.DONE;

  const replacements = {
    processed: numberOfProcessedRecords.toString(),
    progress: loadingProgress.toString(),
    total: numberOfRecords.toString(),
  };

  const historyMessages: Partial<Record<ExportState, string>> = {
    [ExportState.PREPARING]: t('backupExportProgressHeadline'),
    [ExportState.EXPORTING]: t('backupExportProgressSecondary', replacements),
    [ExportState.COMPRESSING]: t('backupExportProgressCompressing'),
  };

  const loadingMessage = historyMessages?.[historyState] || '';

  const dismissExport = () => {
    switchContent(ContentState.PREFERENCES_ACCOUNT);
  };

  const onProgress = (processedNumber: number) => {
    setHistoryState(ExportState.EXPORTING);
    setNumberOfProcessedRecords(prevState => prevState + processedNumber);
  };

  const onSuccess = (archiveBlob: Blob) => {
    setHistoryState(ExportState.DONE);
    setHasError(false);
    setArchiveBlob(archiveBlob);
  };

  const onError = (error: Error) => {
    if (error instanceof CancelError) {
      logger.log('History export was cancelled');
      dismissExport();

      return;
    }

    setHasError(true);
    logger.error(`Failed to export history: ${error.message}`, error);
  };

  const downloadArchiveFile = () => {
    const {
      FEATURE: {ENABLE_CROSS_PLATFORM_BACKUP_EXPORT},
    } = Config.getConfig();
    const userName = user.username();
    const fileExtension = ENABLE_CROSS_PLATFORM_BACKUP_EXPORT
      ? CONFIG.UNIVERSAL_FILE_EXTENSION
      : CONFIG.LEGACY_FILE_EXTENSION;
    const sanitizedBrandName = Config.getConfig().BRAND_NAME.replace(/[^A-Za-z0-9_]/g, '');
    const filename = `${sanitizedBrandName}-${userName}-Backup_${getCurrentDate()}.${fileExtension}`;

    dismissExport();

    if (archiveBlob) {
      downloadBlob(archiveBlob, filename, 'application/octet-stream');
    }
  };

  const onCancel = () => {
    amplify.publish(WebAppEvents.ANALYTICS.EVENT, EventName.HISTORY.BACKUP_CANCELLED, {
      [Segmentation.GENERAL.STEP]: Segmentation.BACKUP_CREATION.CANCELLATION_STEP.DURING_BACKUP,
    });
    backupRepository.cancelAction();
  };

  const onClose = () => {
    amplify.publish(WebAppEvents.ANALYTICS.EVENT, EventName.HISTORY.BACKUP_CANCELLED, {
      [Segmentation.GENERAL.STEP]: Segmentation.BACKUP_CREATION.CANCELLATION_STEP.BEFORE_BACKUP,
    });
    dismissExport();
  };

  const showBackupModal = () => {
    PrimaryModal.show(PrimaryModal.type.PASSWORD_ADVANCED_SECURITY, {
      preventClose: true,
      primaryAction: {
        action: async (password: string, hasMultipleAttempts: boolean) => {
          exportHistory(password, hasMultipleAttempts);
        },
        text: t('backupEncryptionModalAction'),
      },
      secondaryAction: [
        {
          action: () => onClose(),
          text: t('backupEncryptionModalCloseBtn'),
        },
      ],
      passwordOptional: true,
      text: {
        closeBtnLabel: t('backupEncryptionModalCloseBtn'),
        input: t('backupEncryptionModalPlaceholder'),
        message: t('backupEncryptionModalMessage'),
        title: t('backupEncryptionModalTitle'),
      },
    });
  };

  const exportHistory = async (password: string, hasMultipleAttempts: boolean) => {
    setHistoryState(ExportState.PREPARING);
    setHasError(false);

    try {
      const startTime = Date.now();
      const numberOfRecords = await backupRepository.getBackupInitData();
      logger.log(`Exporting '${numberOfRecords}' records from history`);

      setNumberOfRecords(numberOfRecords);
      setNumberOfProcessedRecords(0);

      if (clientState.currentClient) {
        const archiveBlob = await backupRepository.generateHistory(
          user,
          clientState.currentClient.id,
          onProgress,
          password,
        );
        amplify.publish(WebAppEvents.ANALYTICS.EVENT, EventName.HISTORY.BACKUP_CREATED, {
          // converting to seconds
          [Segmentation.BACKUP_CREATION.CREATION_DURATION]: Math.ceil((Date.now() - startTime) / 1000),
          [Segmentation.BACKUP_CREATION.PASSWORD]: password ? Segmentation.GENERAL.YES : Segmentation.GENERAL.NO,
          [Segmentation.BACKUP_CREATION.PASSWORD_MULTIPLE_ATTEMPTS]: hasMultipleAttempts
            ? Segmentation.GENERAL.YES
            : Segmentation.GENERAL.NO,
        });
        onSuccess(archiveBlob);
        logger.log(`Completed export of '${numberOfRecords}' records from history`);
      } else {
        throw new Error('No local client found');
      }
    } catch (error) {
      onError(error as Error);
    }
  };

  return (
    <div id="history-export">
      {isPreparing && <ProgressBar progress={loadingProgress} message={loadingMessage} />}

      {isExporting && (
        <>
          <ProgressBar progress={loadingProgress} message={loadingMessage} className="with-cancel" />

          <Button variant={ButtonVariant.SECONDARY} onClick={onCancel} data-uie-name="do-cancel-history-export">
            {t('backupCancel')}
          </Button>
        </>
      )}

      {isDone && (
        <>
          <div className="history-message">
            <h2 className="history-message__headline" data-uie-name="status-history-export-success-headline">
              {t('backupExportSuccessHeadline')}
            </h2>

            <p className="history-message__info" data-uie-name="status-history-export-success-info">
              {t('backupExportSuccessSecondary')}
            </p>
            <FlexBox className="history-message__buttons" justify="center">
              <Button
                variant={ButtonVariant.SECONDARY}
                onClick={dismissExport}
                data-uie-name="do-cancel-history-export"
              >
                {t('backupCancel')}
              </Button>

              <Button onClick={downloadArchiveFile} data-uie-name="do-save-history-export">
                {t('backupExportSaveFileAction')}
              </Button>
            </FlexBox>
          </div>
        </>
      )}

      {hasError && (
        <div className="history-message" data-uie-name="status-history-export-error">
          <h2 className="history-message__headline" data-uie-name="status-history-export-error-headline">
            {t('backupExportGenericErrorHeadline')}
          </h2>

          <p className="history-message__info" data-uie-name="status-history-export-error-info">
            {t('backupExportGenericErrorSecondary')}
          </p>
          <FlexBox justify="center" className="history-message__buttons">
            <Button
              variant={ButtonVariant.SECONDARY}
              data-uie-name="do-dismiss-history-export-error"
              onClick={dismissExport}
            >
              {t('backupCancel')}
            </Button>

            <Button onClick={showBackupModal} data-uie-name="do-try-again-history-export-error">
              {t('backupTryAgain')}
            </Button>
          </FlexBox>
        </div>
      )}
    </div>
  );
};

export {HistoryExport};
