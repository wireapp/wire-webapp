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

import {container} from 'tsyringe';

import {LoadingBar} from 'Components/LoadingBar/LoadingBar';
import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {ClientState} from 'src/script/client/ClientState';
import {User} from 'src/script/entity/User';
import {ContentState} from 'src/script/page/useAppState';
import {t} from 'Util/LocalizerUtil';
import {getLogger} from 'Util/Logger';
import {getCurrentDate} from 'Util/TimeUtil';
import {downloadBlob} from 'Util/util';

import {CancelError} from '../../backup/Error';
import {Config} from '../../Config';
import {RootContext} from '../../page/RootProvider';

enum ExportState {
  COMPRESSING = 'ExportState.STATE.COMPRESSING',
  DONE = 'ExportState.STATE.DONE',
  EXPORTING = 'ExportState.STATE.EXPORTING',
  PREPARING = 'ExportState.STATE.PREPARING',
}

export const CONFIG = {
  FILE_EXTENSION: 'desktop_wbu',
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
    exportHistory();
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
    const userName = user.username();
    const fileExtension = CONFIG.FILE_EXTENSION;
    const sanitizedBrandName = Config.getConfig().BRAND_NAME.replace(/[^A-Za-z0-9_]/g, '');
    const filename = `${sanitizedBrandName}-${userName}-Backup_${getCurrentDate()}.${fileExtension}`;

    dismissExport();

    if (archiveBlob) {
      downloadBlob(archiveBlob, filename, 'application/octet-stream');
    }
  };

  const onCancel = () => backupRepository.cancelAction();

  const getBackUpPassword = (): Promise<string> => {
    return new Promise(resolve => {
      PrimaryModal.show(PrimaryModal.type.PASSWORD_ADVANCED_SECURITY, {
        primaryAction: {
          action: async (password: string) => {
            resolve(password);
          },
          text: t('backupEncryptionModalAction'),
        },
        secondaryAction: [
          {
            action: () => {
              resolve('');
              dismissExport();
            },
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
    });
  };

  const exportHistory = async () => {
    const password = await getBackUpPassword();
    setHistoryState(ExportState.PREPARING);
    setHasError(false);

    try {
      const numberOfRecords = await backupRepository.getBackupInitData();
      logger.log(`Exporting '${numberOfRecords}' records from history`);

      setNumberOfRecords(numberOfRecords);
      setNumberOfProcessedRecords(0);

      const archiveBlob = await backupRepository.generateHistory(
        user,
        clientState.currentClient().id,
        onProgress,
        password,
      );

      onSuccess(archiveBlob);
      logger.log(`Completed export of '${numberOfRecords}' records from history`);
    } catch (error) {
      onError(error as Error);
    }
  };

  return (
    <div id="history-export">
      {isPreparing && <LoadingBar progress={loadingProgress} message={loadingMessage} />}

      {isExporting && (
        <>
          <LoadingBar progress={loadingProgress} message={loadingMessage} className="with-cancel" />

          <button
            type="button"
            className="cancel-button accent-text"
            onClick={onCancel}
            data-uie-name="do-cancel-history-export"
          >
            {t('backupCancel')}
          </button>
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

            <div className="history-message__buttons">
              <button className="button" onClick={downloadArchiveFile} data-uie-name="do-save-history-export">
                {t('backupExportSaveFileAction')}
              </button>
            </div>
          </div>

          <button
            type="button"
            className="cancel-button accent-text"
            onClick={dismissExport}
            data-uie-name="do-cancel-history-export"
          >
            {t('backupCancel')}
          </button>
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

          <div className="history-message__buttons">
            <button
              className="button button-inverted"
              onClick={exportHistory}
              data-uie-name="do-try-again-history-export-error"
            >
              {t('backupTryAgain')}
            </button>

            <button className="button" data-uie-name="do-dismiss-history-export-error" onClick={dismissExport}>
              {t('backupCancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export {HistoryExport};
