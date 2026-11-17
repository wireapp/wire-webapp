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

import {useRef, useState, type FunctionComponent, type ReactElement} from 'react';

import type {Maybe} from 'true-myth';

import {PreferencesSection} from './components/preferencesSection';

import type {BrowserLogDownload} from '../../../../logger/createBrowserLogDownload';
import {Button, ButtonVariant} from '../../../../uiKit/inputs/button/button';
import type {Translate} from '../../../../util/localizerUtil/translationTypes';

type DownloadBrowserLogsOptions = {
  readonly downloadBrowserLogs: Maybe<BrowserLogDownload>;
  readonly translate: Translate;
};

export const DownloadBrowserLogs: FunctionComponent<DownloadBrowserLogsOptions> = function DownloadBrowserLogs(
  options: DownloadBrowserLogsOptions,
): ReactElement | null {
  const {downloadBrowserLogs, translate} = options;
  const exportInProgress = useRef(false);
  const [isExporting, setIsExporting] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);

  async function handleDownload(): Promise<void> {
    if (downloadBrowserLogs.isNothing) {
      return;
    }
    if (exportInProgress.current) {
      return;
    }
    exportInProgress.current = true;
    setIsExporting(true);
    setHasFailed(false);
    try {
      // Invoke directly: the operation opens the picker before its first await.
      const outcome = await downloadBrowserLogs.value();
      setHasFailed(outcome === 'failed');
    } catch {
      setHasFailed(true);
    } finally {
      exportInProgress.current = false;
      setIsExporting(false);
    }
  }

  if (downloadBrowserLogs.isNothing) {
    return null;
  }

  return (
    <PreferencesSection title={translate('preferencesBrowserLogsTitle')} hasSeparator>
      <div className="preferences-option">
        <Button
          type="button"
          variant={ButtonVariant.TERTIARY}
          data-uie-name="download-browser-logs"
          disabled={isExporting}
          aria-busy={isExporting}
          onClick={handleDownload}
        >
          {translate('preferencesBrowserLogsDownload')}
        </Button>
      </div>
      {hasFailed && <p role="alert">{translate('preferencesBrowserLogsFailed')}</p>}
    </PreferencesSection>
  );
};
