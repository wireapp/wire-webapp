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

import {useRef, useState, type ReactElement, type ReactNode} from 'react';

import type {Maybe} from 'true-myth';

import {PreferencesSection} from './components/preferencesSection';

import type {ApplicationLogDownload} from '../../../../logger/applicationLogDownload';
import {Button, ButtonVariant} from '../../../../uiKit/inputs/button/button';
import type {Translate} from '../../../../util/localizerUtil/translationTypes';

type DownloadApplicationLogsProps = {
  readonly downloadApplicationLogs: Maybe<ApplicationLogDownload>;
  readonly translate: Translate;
};

export function DownloadApplicationLogs(properties: DownloadApplicationLogsProps): ReactElement | null {
  const {downloadApplicationLogs, translate} = properties;
  const exportInProgress = useRef(false);
  const [isExporting, setIsExporting] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);

  async function handleDownload(): Promise<void> {
    if (downloadApplicationLogs.isNothing) {
      return;
    }
    if (exportInProgress.current) {
      return;
    }
    exportInProgress.current = true;
    setIsExporting(true);
    setHasFailed(false);
    try {
      // Invoke in the click's call stack so the operation can use the user activation.
      const downloadResult = await downloadApplicationLogs.value();
      setHasFailed(downloadResult.isErr);
    } catch {
      setHasFailed(true);
    } finally {
      exportInProgress.current = false;
      setIsExporting(false);
    }
  }

  function renderFailureMessage(): ReactNode {
    if (hasFailed) {
      return <p role="alert">{translate('preferencesApplicationLogsFailed')}</p>;
    }

    return null;
  }

  if (downloadApplicationLogs.isNothing) {
    return null;
  }

  return (
    <PreferencesSection title={translate('preferencesApplicationLogsTitle')} hasSeparator>
      <div className="preferences-option">
        <Button
          type="button"
          variant={ButtonVariant.TERTIARY}
          data-uie-name="download-application-logs"
          disabled={isExporting}
          aria-busy={isExporting}
          onClick={handleDownload}
        >
          {translate('preferencesApplicationLogsDownload')}
        </Button>
      </div>
      {renderFailureMessage()}
    </PreferencesSection>
  );
}
