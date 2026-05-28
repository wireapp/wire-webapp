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

import {useState} from 'react';

import {Tooltip} from '@wireapp/react-ui-kit';

import {useAppNotification} from 'Components/AppNotification';
import {useAi} from 'src/script/ai';
import {OllamaUnreachableError, OllamaModelMissingError} from 'src/script/ai/ollama/errors';
import type {AiReportRecord} from 'src/script/ai/storage/records/AiReportRecord';
import {generateReportDetailUrl} from 'src/script/router/routeGenerator';
import {navigate} from 'src/script/router/Router';
import {getLogger} from 'Util/logger';

import {styles} from './ReportsListPage.styles';

const log = getLogger('AI/ScanButton');

interface ScanButtonProps {
  reports: AiReportRecord[];
}

/** Scan trigger button. Disabled while any report is scanning or interrupted (D6). */
export const ScanButton = ({reports}: ScanButtonProps) => {
  const {scanRunner} = useAi();
  const [isLoading, setIsLoading] = useState(false);
  const notification = useAppNotification();

  const isDisabled =
    isLoading || reports.some(report => report.status === 'scanning' || report.status === 'interrupted');

  const handleClick = async () => {
    setIsLoading(true);
    try {
      const reportId = await scanRunner.start();
      navigate(generateReportDetailUrl(reportId));
    } catch (error) {
      if (error instanceof OllamaUnreachableError) {
        notification.show({message: 'Cannot reach Ollama. Check that Ollama is running at the configured URL.'});
      } else if (error instanceof OllamaModelMissingError) {
        notification.show({
          message: 'The configured Ollama model is not installed. Go to AI Preferences to change the model.',
        });
      } else {
        log.error('Unexpected error in ScanButton:', error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isDisabled) {
    return (
      <Tooltip body="A scan is already running. Resume or wait for it to finish.">
        <span>
          <button className={styles.scanButton} onClick={handleClick} disabled={isDisabled}>
            Scan
          </button>
        </span>
      </Tooltip>
    );
  }

  return (
    <button className={styles.scanButton} onClick={handleClick} disabled={isDisabled}>
      Scan
    </button>
  );
};
