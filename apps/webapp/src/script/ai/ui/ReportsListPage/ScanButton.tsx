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

import {Tooltip} from '@wireapp/react-ui-kit';

import {useAi} from 'src/script/ai';
import {OllamaUnreachableError, OllamaModelMissingError} from 'src/script/ai/ollama/errors';
import type {AiReportRecord} from 'src/script/ai/storage/records';
import {PrimaryModal} from 'src/script/components/Modals/PrimaryModal';
import {generateReportDetailUrl} from 'src/script/router/routeGenerator';
import {navigate} from 'src/script/router/Router';
import {getLogger} from 'Util/logger';

const log = getLogger('AI/ScanButton');

interface ScanButtonProps {
  reports: AiReportRecord[];
}

/** Scan trigger button. Disabled while any report is scanning or interrupted (D6). */
export const ScanButton = ({reports}: ScanButtonProps) => {
  const {scanRunner} = useAi();
  const isDisabled = reports.some(r => r.status === 'scanning' || r.status === 'interrupted');

  const handleClick = async () => {
    try {
      const reportId = await scanRunner.start();
      navigate(generateReportDetailUrl(reportId));
    } catch (error) {
      if (error instanceof OllamaUnreachableError) {
        PrimaryModal.show(PrimaryModal.type.ACKNOWLEDGE, {
          text: {
            title: 'Ollama Error',
            message: 'Cannot reach Ollama. Check that Ollama is running at the configured URL.',
          },
        });
      } else if (error instanceof OllamaModelMissingError) {
        PrimaryModal.show(PrimaryModal.type.ACKNOWLEDGE, {
          text: {
            title: 'Model Error',
            message: 'The configured Ollama model is not installed. Go to AI Preferences to change the model.',
          },
        });
      } else {
        log.error('Unexpected error in ScanButton.handleClick', error);
      }
    }
  };

  return (
    <Tooltip
      body={isDisabled ? 'A scan is already running. Resume or wait for it to finish.' : ''}
      disabled={!isDisabled}
    >
      <span>
        <button onClick={handleClick} disabled={isDisabled}>
          Scan
        </button>
      </span>
    </Tooltip>
  );
};
