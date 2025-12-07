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

import {FC} from 'react';

import {BackupFileUpload} from 'Components/HistoryImport/BackupFileUpload';
import {Config} from 'src/script/Config';
import {ContentState} from 'src/script/page/useAppState';
import {t} from 'Util/LocalizerUtil';

import {Button, ButtonVariant} from '@wireapp/react-ui-kit';

import {PreferencesSection} from '../components/PreferencesSection';

interface HistoryBackupSectionProps {
  brandName: string;
  importFile: (file: File) => void;
  switchContent: (contentState: ContentState) => void;
}

const {
  FEATURE: {ENABLE_CROSS_PLATFORM_BACKUP_EXPORT},
} = Config.getConfig();

const HistoryBackupSection: FC<HistoryBackupSectionProps> = ({brandName, importFile, switchContent}) => {
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      importFile(file);
    }
  };
  return (
    <PreferencesSection
      hasSeparator
      title={t('preferencesOptionsBackupHeader')}
      className="preferences-section-conversation-history"
      aria-label={t('preferencesOptionsBackupExportHeadline')}
    >
      <Button
        variant={ButtonVariant.TERTIARY}
        onClick={() => switchContent(ContentState.HISTORY_EXPORT)}
        data-uie-name="do-backup-export"
        aria-describedby="preferences-history-describe-1"
        type="button"
      >
        {t('preferencesOptionsBackupExportHeadline')}
      </Button>
      <p id="preferences-history-describe-1" className="preferences-detail">
        {t('preferencesOptionsBackupExportSecondary', {brandName})}
      </p>
      <BackupFileUpload
        onFileChange={handleFileChange}
        backupImportHeadLine={t('preferencesOptionsBackupImportHeadline')}
        variant={ButtonVariant.TERTIARY}
        cssClassName="preferences-history-restore-button"
      />
      <p id="preferences-history-describe-2" className="preferences-detail">
        {ENABLE_CROSS_PLATFORM_BACKUP_EXPORT
          ? t('preferencesOptionsBackupImportCrossPlatformSecondary')
          : t('preferencesOptionsBackupImportSecondary')}
      </p>
    </PreferencesSection>
  );
};

export {HistoryBackupSection};
