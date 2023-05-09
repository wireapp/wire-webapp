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

import {FC, useEffect, useState} from 'react';

import {Icon} from 'Components/Icon';
import {LoadingBar} from 'Components/LoadingBar/LoadingBar';
import {User} from 'src/script/entity/User';
import {ContentState} from 'src/script/page/useAppState';
import {t} from 'Util/LocalizerUtil';
import {getLogger} from 'Util/Logger';
import {loadFileBuffer} from 'Util/util';

import {BackupRepository} from '../../backup/BackupRepository';
import {CancelError, DifferentAccountError, IncompatibleBackupError} from '../../backup/Error';
import {Config} from '../../Config';
import {MotionDuration} from '../../motion/MotionDuration';

export enum HistoryImportState {
  DONE = 'HistoryImportState.STATE.DONE',
  IMPORTING = 'HistoryImportState.STATE.IMPORTING',
  PREPARING = 'HistoryImportState.STATE.PREPARING',
}

interface HistoryImportProps {
  readonly backupRepository: BackupRepository;
  file: File;
  switchContent: (contentState: ContentState) => void;
  user: User;
}

const HistoryImport: FC<HistoryImportProps> = ({user, backupRepository, file, switchContent}) => {
  const logger = getLogger('HistoryImportViewModel');

  const [historyImportState, setHistoryImportState] = useState(HistoryImportState.PREPARING);
  const [error, setError] = useState<Error | null>(null);
  const [errorHeadline, setErrorHeadline] = useState('');
  const [errorSecondary, setErrorSecondary] = useState('');

  const [numberOfRecords, setNumberOfRecords] = useState<number>(0);
  const [numberOfProcessedRecords, setNumberOfProcessedRecords] = useState<number>(0);
  const loadingProgress = Math.floor((numberOfProcessedRecords / numberOfRecords) * 100);

  const isPreparing = !error && historyImportState === HistoryImportState.PREPARING;
  const isImporting = !error && historyImportState === HistoryImportState.IMPORTING;
  const isDone = !error && historyImportState === HistoryImportState.DONE;

  const replacements = {
    processed: numberOfProcessedRecords.toString(),
    progress: loadingProgress.toString(),
    total: numberOfRecords.toString(),
  };

  const historyImportMessages: Partial<Record<HistoryImportState, string>> = {
    [HistoryImportState.PREPARING]: t('backupImportProgressHeadline'),
    [HistoryImportState.IMPORTING]: t('backupImportProgressSecondary', replacements),
  };

  const loadingMessage = historyImportMessages?.[historyImportState] || '';

  const onCancel = () => backupRepository.cancelAction();

  const dismissImport = () => {
    switchContent(ContentState.PREFERENCES_ACCOUNT);
  };

  const onInit = (numberOfRecords: number) => {
    setHistoryImportState(HistoryImportState.IMPORTING);
    setNumberOfRecords(numberOfRecords);
    setNumberOfProcessedRecords(0);
  };

  const onProgress = (numberProcessed: number) => setNumberOfProcessedRecords(prevState => prevState + numberProcessed);

  const onSuccess = (): void => {
    setError(null);
    setHistoryImportState(HistoryImportState.DONE);

    window.setTimeout(dismissImport, MotionDuration.X_LONG * 2);
  };

  const onError = (error: Error) => {
    if (error instanceof CancelError) {
      logger.log('History import was cancelled');
      dismissImport();

      return;
    }

    setError(error);
    logger.error(`Failed to import history: ${error.message}`, error);

    if (error instanceof DifferentAccountError) {
      setErrorHeadline(t('backupImportAccountErrorHeadline'));
      setErrorSecondary(t('backupImportAccountErrorSecondary'));
    } else if (error instanceof IncompatibleBackupError) {
      setErrorHeadline(t('backupImportVersionErrorHeadline'));
      setErrorSecondary(t('backupImportVersionErrorSecondary', Config.getConfig().BRAND_NAME));
    } else {
      setErrorHeadline(t('backupImportGenericErrorHeadline'));
      setErrorSecondary(t('backupImportGenericErrorSecondary'));
    }
  };

  const importHistory = async (file: File) => {
    setHistoryImportState(HistoryImportState.PREPARING);
    setError(null);

    const data = await loadFileBuffer(file);

    try {
      await backupRepository.importHistory(user, data, onInit, onProgress);
      onSuccess();
    } catch (error) {
      onError(error as Error);
    }
  };

  useEffect(() => {
    importHistory(file);
  }, []);

  return (
    <div style={{height: '100%'}}>
      <h2 className="visually-hidden">{t('accessibility.headings.historyImport')}</h2>

      <div id="history-import">
        {isPreparing && <LoadingBar progress={loadingProgress} message={loadingMessage} />}

        {isImporting && (
          <>
            <LoadingBar progress={loadingProgress} message={loadingMessage} className="with-cancel" />

            <button
              type="button"
              className="cancel-button accent-text"
              onClick={onCancel}
              data-uie-name="do-cancel-history-import"
            >
              {t('backupCancel')}
            </button>
          </>
        )}

        {isDone && (
          <div className="history-message">
            <Icon.Check />
            <h2 className="history-message__headline" data-uie-name="status-history-import-success">
              {t('backupImportSuccessHeadline')}
            </h2>
          </div>
        )}

        {error && (
          <div className="history-message">
            <h2 className="history-message__headline" data-uie-name="status-history-import-error-headline">
              {errorHeadline}
            </h2>

            <p className="history-message__info" data-uie-name="status-history-import-error-info">
              {errorSecondary}
            </p>

            <div className="history-message__buttons">
              <button className="button" onClick={dismissImport} data-uie-name="do-dismiss-history-import-error">
                {t('backupCancel')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export {HistoryImport};
