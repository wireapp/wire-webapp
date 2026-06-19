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

import {useCallback, useEffect, useState} from 'react';

import {Button, ButtonVariant} from '@wireapp/react-ui-kit';

import * as Icon from 'Components/icon';
import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {ProgressBar} from 'Components/ProgressBar/ProgressBar';
import {BackupRepository} from 'Repositories/backup/backupRepository';
import {
  CancelError,
  DifferentAccountError,
  IncompatibleBackupError,
  IncompatibleBackupFormatError,
  InvalidPassword,
} from 'Repositories/backup/error';
import {User} from 'Repositories/entity/User';
import {useApplicationContext} from 'src/script/page/RootProvider';
import {ContentState} from 'src/script/page/useAppState';
import {checkBackupEncryption} from 'Util/backupUtil';
import {getLogger} from 'Util/logger';
import {loadFileBuffer} from 'Util/util';

import {BackupFileUpload} from './BackupFileUpload';

import {Config} from '../../Config';
import {MotionDuration} from '../../motion/MotionDuration';

export enum HistoryImportState {
  DONE = 'HistoryImportState.STATE.DONE',
  IMPORTING = 'HistoryImportState.STATE.IMPORTING',
  PREPARING = 'HistoryImportState.STATE.PREPARING',
}

const HISTORY_IMPORT_DISMISS_DELAY_MULTIPLIER = 2;
const PERCENTAGE_MULTIPLIER = 100;

interface HistoryImportProps {
  readonly backupRepository: BackupRepository;
  file: File;
  switchContent: (contentState: ContentState) => void;
  user: User;
}

const HistoryImport = ({user, backupRepository, file, switchContent}: HistoryImportProps) => {
  const logger = getLogger('HistoryImportViewModel');
  const {translate} = useApplicationContext();

  const [historyImportState, setHistoryImportState] = useState(HistoryImportState.PREPARING);
  const [error, setError] = useState<Error | null>(null);
  const [errorHeadline, setErrorHeadline] = useState('');
  const [errorSecondary, setErrorSecondary] = useState('');

  const [numberOfRecords, setNumberOfRecords] = useState<number>(0);
  const [numberOfProcessedRecords, setNumberOfProcessedRecords] = useState<number>(0);
  const loadingProgress = Math.floor((numberOfProcessedRecords / numberOfRecords) * PERCENTAGE_MULTIPLIER);

  const isPreparing = !error && historyImportState === HistoryImportState.PREPARING;
  const isImporting = !error && historyImportState === HistoryImportState.IMPORTING;
  const isDone = !error && historyImportState === HistoryImportState.DONE;

  const replacements = {
    processed: numberOfProcessedRecords.toString(),
    progress: loadingProgress.toString(),
    total: numberOfRecords.toString(),
  };

  const historyImportMessages: Partial<Record<HistoryImportState, string>> = {
    [HistoryImportState.PREPARING]: translate('backupImportProgressHeadline'),
    [HistoryImportState.IMPORTING]: translate('backupImportProgressSecondary', replacements),
  };

  const loadingMessage = historyImportMessages[historyImportState] ?? '';

  const onCancel = () => backupRepository.cancelAction();

  const dismissImport = useCallback(() => {
    switchContent(ContentState.PREFERENCES_ACCOUNT);
  }, [switchContent]);

  const onInit = useCallback((numberOfRecords: number) => {
    setHistoryImportState(HistoryImportState.IMPORTING);
    setNumberOfRecords(numberOfRecords);
    setNumberOfProcessedRecords(0);
  }, []);

  const onProgress = useCallback((numberProcessed: number) => {
    setNumberOfProcessedRecords(prevState => prevState + numberProcessed);
  }, []);

  const onSuccess = useCallback((): void => {
    setError(null);
    setHistoryImportState(HistoryImportState.DONE);

    window.setTimeout(dismissImport, MotionDuration.X_LONG * HISTORY_IMPORT_DISMISS_DELAY_MULTIPLIER);
  }, [dismissImport]);

  const onError = useCallback(
    (error: Error) => {
      if (error instanceof CancelError) {
        logger.log('History import was cancelled');
        dismissImport();

        return;
      }

      setError(error);
      logger.error(`Failed to import history: ${error.message}`, error);

      if (error instanceof DifferentAccountError) {
        setErrorHeadline(translate('backupImportAccountErrorHeadline'));
        setErrorSecondary(translate('backupImportAccountErrorSecondary'));
      } else if (error instanceof IncompatibleBackupError) {
        setErrorHeadline(translate('backupImportVersionErrorHeadline'));
        //the "brandname" should be provided
        //the correct syntax is suspected to create issues with electron's console see https://wearezeta.atlassian.net/browse/WPB-15317
        //TODO: figure out the issue with the electron console
        //@ts-expect-error
        setErrorSecondary(translate('backupImportVersionErrorSecondary', Config.getConfig().BRAND_NAME));
      } else if (error instanceof IncompatibleBackupFormatError) {
        setErrorHeadline(translate('backupImportFormatErrorHeadline'));
        setErrorSecondary(translate('backupImportFormatErrorSecondary'));
      } else if (error instanceof InvalidPassword) {
        setErrorHeadline(translate('backupImportPasswordErrorHeadline'));
        setErrorSecondary(translate('backupImportPasswordErrorSecondary'));
      } else {
        setErrorHeadline(translate('backupImportGenericErrorHeadline'));
        setErrorSecondary(translate('backupImportGenericErrorSecondary'));
      }
    },
    [dismissImport, logger, translate],
  );

  const getBackUpPassword = useCallback((): Promise<string> => {
    return new Promise(resolve => {
      PrimaryModal.show(
        PrimaryModal.type.PASSWORD_ADVANCED_SECURITY,
        {
          primaryAction: {
            action: async (password: string) => {
              resolve(password);
            },
            text: translate('backupDecryptionModalAction'),
          },
          secondaryAction: [
            {
              action: () => {
                resolve('');
                dismissImport();
              },
              text: translate('backupEncryptionModalCloseBtn'),
            },
          ],
          passwordOptional: false,
          text: {
            closeBtnLabel: translate('backupEncryptionModalCloseBtn'),
            input: translate('backupDecryptionModalPlaceholder'),
            message: translate('backupDecryptionModalMessage'),
            title: translate('backupDecryptionModalTitle'),
          },
        },
        undefined,
        translate,
      );
    });
  }, [dismissImport, translate]);

  const processHistoryImport = useCallback(
    async (file: File, password?: string) => {
      setHistoryImportState(HistoryImportState.PREPARING);
      setError(null);

      const data = await loadFileBuffer(file);

      try {
        await backupRepository.importHistory(user, data, onInit, onProgress, password);
        onSuccess();
      } catch (error: unknown) {
        onError(error as Error);
      }
    },
    [backupRepository, onError, onInit, onProgress, onSuccess, user],
  );

  const importHistory = useCallback(
    async (file: File) => {
      const isEncrypted = await checkBackupEncryption(file);

      if (isEncrypted) {
        const password = await getBackUpPassword();

        if (password) {
          await processHistoryImport(file, password);
        }
      } else {
        await processHistoryImport(file);
      }
    },
    [getBackUpPassword, processHistoryImport],
  );

  useEffect(() => {
    void importHistory(file);
  }, [file, importHistory]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setError(null);
      await importHistory(file);
    }
  };

  return (
    <div style={{height: '100%'}}>
      <h2 className="visually-hidden">{translate('accessibility.headings.historyImport')}</h2>

      <div id="history-import">
        {isPreparing && <ProgressBar progress={loadingProgress} message={loadingMessage} />}

        {isImporting && (
          <>
            <ProgressBar progress={loadingProgress} message={loadingMessage} className="with-cancel" />

            <Button variant={ButtonVariant.SECONDARY} onClick={onCancel} data-uie-name="do-cancel-history-import">
              {translate('backupCancel')}
            </Button>
          </>
        )}

        {isDone && (
          <div className="history-message">
            <Icon.CheckIcon />
            <h2 className="history-message__headline" data-uie-name="status-history-import-success">
              {translate('backupImportSuccessHeadline')}
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
              <Button
                variant={ButtonVariant.SECONDARY}
                className="button button-secondary"
                onClick={dismissImport}
                data-uie-name="do-dismiss-history-import-error"
              >
                {translate('backupCancel')}
              </Button>
              <BackupFileUpload
                onFileChange={handleFileChange}
                backupImportHeadLine={translate('preferencesOptionsBackupTryAgain')}
                variant={ButtonVariant.PRIMARY}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export {HistoryImport};
