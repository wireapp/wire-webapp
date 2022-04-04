/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import {WebAppEvents} from '@wireapp/webapp-events';
import {amplify} from 'amplify';
import React from 'react';
import {HistoryExportViewModel} from '../../../view_model/content/HistoryExportViewModel';
import {ContentViewModel} from '../../../view_model/ContentViewModel';
import {t} from 'Util/LocalizerUtil';
import PreferencesSection from '../components/PreferencesSection';
import {handleKeyDown} from 'Util/KeyboardUtil';

interface HistoryBackupSectionProps {
  brandName: string;
}

const HistoryBackupSection: React.FC<HistoryBackupSectionProps> = ({brandName}) => {
  const fileInputRef = React.useRef(null);

  const fileInputClick = () => {
    fileInputRef.current.click();
  };

  return (
    <PreferencesSection
      hasSeparator
      title={t('preferencesOptionsBackupHeader')}
      className="preferences-section-conversation-history"
      aria-label={t('preferencesOptionsBackupExportHeadline')}
    >
      <button
        className="preferences-link accent-text"
        onClick={() => {
          {
            amplify.publish(WebAppEvents.CONTENT.SWITCH, ContentViewModel.STATE.HISTORY_EXPORT);
            amplify.publish(WebAppEvents.BACKUP.EXPORT.START);
          }
        }}
        data-uie-name="do-backup-export"
        aria-describedby="preferences-history-describe-1"
        type="button"
      >
        {t('preferencesOptionsBackupExportHeadline')}
      </button>
      <p id="preferences-history-describe-1" className="preferences-detail">
        {t('preferencesOptionsBackupExportSecondary', brandName)}
      </p>
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(event: React.KeyboardEvent<HTMLElement>) => handleKeyDown(event, fileInputClick)}
        aria-labelledby="do-backup-import"
      >
        <label
          className="preferences-link accent-text preferences-history-backup-import-field"
          data-uie-name="do-backup-import"
          id="do-backup-import"
          htmlFor="file-import-input"
        >
          <span>{t('preferencesOptionsBackupImportHeadline')}</span>
          <input
            id="file-import-input"
            ref={fileInputRef}
            tabIndex={-1}
            type="file"
            accept={`.${HistoryExportViewModel.CONFIG.FILE_EXTENSION}`}
            onChange={(event: any) => {
              const file = event.target.files[0];
              if (file) {
                amplify.publish(WebAppEvents.CONTENT.SWITCH, ContentViewModel.STATE.HISTORY_IMPORT);
                amplify.publish(WebAppEvents.BACKUP.IMPORT.START, file);
              }
            }}
            onFocus={({target}) => target.blur()}
            data-uie-name="input-import-file"
            aria-describedby="preferences-history-describe-2"
          />
        </label>
      </div>
      <p id="preferences-history-describe-2" className="preferences-detail">
        {t('preferencesOptionsBackupImportSecondary')}
      </p>
    </PreferencesSection>
  );
};

export default HistoryBackupSection;
