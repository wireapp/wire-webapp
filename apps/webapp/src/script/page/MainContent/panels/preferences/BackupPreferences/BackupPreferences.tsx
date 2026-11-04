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

import {useId, useState} from 'react';

import {AlertIcon, Button, ButtonVariant, HistoryIcon, LockClosedIcon, ShieldIcon, Switch} from '@wireapp/react-ui-kit';

import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {RadioGroup} from 'Components/Radio';
import {User} from 'Repositories/entity/User';
import {Config} from 'src/script/Config';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';

import {getBackupKeyCredentialId} from './backupKey/BackupKey';
import {SaveBackupKeyModal} from './backupKey/SaveBackupKeyModal';
import {useBackupKeyStore} from './backupKey/useBackupKeyStore';
import {mockBackupPreferencesState} from './BackupPreferences.mock';
import {
  actionsStyle,
  adminChipStyle,
  bannerActionStyle,
  bannerStyle,
  bannerTextStyle,
  growStyle,
  keyRowStyle,
  labelStyle,
  progressBarStyle,
  progressLabelStyle,
  progressPercentStyle,
  progressStyle,
  progressTrackStyle,
  rowStyle,
  statusIconStyle,
  statusLineStyle,
  statusRowStyle,
  statusTextStyle,
  statusTitleStyle,
  summaryStyle,
  valueStyle,
} from './BackupPreferences.styles';
import {BackupFrequency, BackupPreferencesViewState} from './BackupPreferences.types';

import {PreferencesPage} from '../components/PreferencesPage';
import {PreferencesSection} from '../components/PreferencesSection';

interface BackupPreferencesProps {
  selfUser: User;
  state?: BackupPreferencesViewState;
}

// Actions are not implemented yet, the screen is a static prototype
const noop = () => {};

const getStatusLine = (enabled: boolean, paused: boolean, frequency: BackupFrequency, brandName: string) => {
  if (!enabled) {
    return t('preferencesBackupStatusOff');
  }
  if (paused) {
    return t('preferencesBackupStatusPaused');
  }
  switch (frequency) {
    case BackupFrequency.DAILY:
      return t('preferencesBackupStatusDaily', {brandName});
    case BackupFrequency.MONTHLY:
      return t('preferencesBackupStatusMonthly', {brandName});
    case BackupFrequency.WEEKLY:
    default:
      return t('preferencesBackupStatusWeekly', {brandName});
  }
};

export const BackupPreferences = ({selfUser, state = mockBackupPreferencesState}: BackupPreferencesProps) => {
  const {adminEnforced, run, location, lastBackup, nextBackup} = state;
  const brandName = Config.getConfig().BRAND_NAME;

  const [autoBackupEnabled, setAutoBackupEnabled] = useState(state.autoBackupEnabled);
  const [frequency, setFrequency] = useState(state.frequency);
  const [isSaveKeyModalOpen, setIsSaveKeyModalOpen] = useState(false);
  const hasKey = useBackupKeyStore(keyState => !!keyState.key);
  const {email, username, name} = useKoSubscribableChildren(selfUser, ['email', 'username', 'name']);

  const statusTitleId = useId();
  const statusLineId = useId();
  const scheduleHeaderId = useId();

  const paused = autoBackupEnabled && state.paused;
  const isActive = autoBackupEnabled && !paused;
  const showSummary = !run && (autoBackupEnabled || !!lastBackup);

  const openSaveKeyModal = () => setIsSaveKeyModalOpen(true);

  const confirmCreateNewKey = () => {
    PrimaryModal.show(PrimaryModal.type.CONFIRM, {
      primaryAction: {
        action: openSaveKeyModal,
        text: t('preferencesBackupKeyCreate'),
      },
      secondaryAction: {
        text: t('modalConfirmSecondary'),
      },
      text: {
        message: t('preferencesBackupKeyNewMessage'),
        title: t('preferencesBackupKeyNewTitle'),
      },
    });
  };

  const frequencyOptions = [
    {label: t('preferencesBackupScheduleDaily'), value: BackupFrequency.DAILY},
    {label: t('preferencesBackupScheduleWeekly'), value: BackupFrequency.WEEKLY},
    {label: t('preferencesBackupScheduleMonthly'), value: BackupFrequency.MONTHLY},
  ];

  return (
    <PreferencesPage title={t('preferencesBackup')}>
      {paused && (
        <div css={bannerStyle('danger')} role="alert" data-uie-name="backup-paused-banner">
          <AlertIcon />
          <p css={bannerTextStyle}>{t('preferencesBackupPausedBanner')}</p>
          <button type="button" css={bannerActionStyle} onClick={noop} data-uie-name="do-choose-backup-folder">
            {t('preferencesBackupChooseFolder')}
          </button>
        </div>
      )}

      {adminEnforced && autoBackupEnabled && (
        <div css={bannerStyle('info')} data-uie-name="backup-admin-banner">
          <ShieldIcon />
          <p css={bannerTextStyle}>{t('preferencesBackupAdminBanner')}</p>
        </div>
      )}

      <PreferencesSection uieName="backup-status">
        <div css={statusRowStyle}>
          <div css={statusIconStyle(isActive)}>
            <HistoryIcon />
          </div>
          <div css={statusTextStyle}>
            <p id={statusTitleId} css={statusTitleStyle}>
              {t('preferencesBackupAutomaticTitle')}
            </p>
            <p id={statusLineId} css={statusLineStyle} data-uie-name="backup-status-line">
              {getStatusLine(autoBackupEnabled, paused, frequency, brandName)}
            </p>
          </div>
          <Switch
            aria-labelledby={statusTitleId}
            aria-describedby={statusLineId}
            checked={autoBackupEnabled}
            disabled={adminEnforced}
            onToggle={setAutoBackupEnabled}
            dataUieName="backup-auto-toggle"
          />
        </div>

        {run && (
          <div css={progressStyle} data-uie-name="backup-progress">
            <div css={progressLabelStyle}>
              <span>
                {run.kind === 'restore' ? t('preferencesBackupProgressRestore') : t('preferencesBackupProgressBackup')}
              </span>
              <span css={progressPercentStyle}>{`${Math.round(run.progress)}%`}</span>
            </div>
            <div
              css={progressTrackStyle}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(run.progress)}
            >
              <div css={progressBarStyle(run.progress)} />
            </div>
            <p className="preferences-detail">{t('preferencesBackupProgressHint', {brandName})}</p>
          </div>
        )}

        {showSummary && (
          <div css={summaryStyle} data-uie-name="backup-summary">
            <div>
              <p css={labelStyle}>{t('preferencesBackupLastBackup')}</p>
              <p css={valueStyle}>{lastBackup ?? t('preferencesBackupNever')}</p>
            </div>
            <div>
              <p css={labelStyle}>{t('preferencesBackupNextBackup')}</p>
              <p css={valueStyle}>{isActive && nextBackup ? nextBackup : t('preferencesBackupNotScheduled')}</p>
            </div>
          </div>
        )}

        <div css={actionsStyle}>
          {run ? (
            <Button variant={ButtonVariant.SECONDARY} onClick={noop} data-uie-name="do-cancel-backup" type="button">
              {t('preferencesBackupCancel')}
            </Button>
          ) : (
            <Button variant={ButtonVariant.SECONDARY} onClick={noop} data-uie-name="do-backup-now" type="button">
              {t('preferencesBackupNow')}
            </Button>
          )}
        </div>
      </PreferencesSection>

      {autoBackupEnabled && (
        <>
          <PreferencesSection hasSeparator uieName="backup-schedule">
            <h3 id={scheduleHeaderId} className="preferences-header">
              {t('preferencesBackupScheduleHeader')}
            </h3>
            {adminEnforced && (
              <span css={adminChipStyle} data-uie-name="backup-schedule-admin">
                <ShieldIcon />
                {t('preferencesBackupScheduleAdmin')}
              </span>
            )}
            <RadioGroup<BackupFrequency>
              ariaLabelledBy={scheduleHeaderId}
              name="backup-frequency"
              selectedValue={frequency}
              onChange={setFrequency}
              options={frequencyOptions}
              disabled={adminEnforced}
            />
            <p className="preferences-detail">{t('preferencesBackupScheduleHint', {brandName})}</p>
          </PreferencesSection>

          <PreferencesSection hasSeparator title={t('preferencesBackupLocationHeader')} uieName="backup-location">
            <div css={rowStyle}>
              <div css={growStyle}>
                <p css={labelStyle}>{t('preferencesBackupLocationLabel')}</p>
                <p css={valueStyle} data-uie-name="backup-location-path">
                  {location}
                </p>
              </div>
              <Button
                variant={ButtonVariant.SECONDARY}
                onClick={noop}
                data-uie-name="do-change-backup-folder"
                type="button"
              >
                {t('preferencesBackupLocationChange')}
              </Button>
            </div>
            <p className="preferences-detail">{t('preferencesBackupLocationHint')}</p>
          </PreferencesSection>
        </>
      )}

      <PreferencesSection hasSeparator title={t('preferencesBackupKeyHeader')} uieName="backup-key">
        {hasKey ? (
          <>
            <div css={keyRowStyle}>
              <LockClosedIcon />
              <div css={growStyle}>
                <p css={valueStyle}>{t('preferencesBackupKeyTitle')}</p>
                <p className="preferences-detail">{t('preferencesBackupKeyDescription', {brandName})}</p>
              </div>
            </div>
            <div css={actionsStyle}>
              <Button
                variant={ButtonVariant.SECONDARY}
                onClick={confirmCreateNewKey}
                data-uie-name="do-create-backup-key"
                type="button"
              >
                {t('preferencesBackupKeyCreate')}
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="preferences-detail">{t('preferencesBackupKeyMissing')}</p>
            <div css={actionsStyle}>
              <Button
                variant={ButtonVariant.SECONDARY}
                onClick={openSaveKeyModal}
                data-uie-name="do-generate-backup-key"
                type="button"
              >
                {t('preferencesBackupKeyGenerate')}
              </Button>
            </div>
          </>
        )}
      </PreferencesSection>

      <PreferencesSection hasSeparator title={t('preferencesBackupRestoreHeader')} uieName="backup-restore">
        <div css={rowStyle}>
          <p className="preferences-detail" css={growStyle}>
            {t('preferencesBackupRestoreDescription', {brandName})}
          </p>
          <Button
            variant={ButtonVariant.SECONDARY}
            onClick={noop}
            disabled={!!run}
            data-uie-name="do-restore-from-file"
            type="button"
          >
            {t('preferencesBackupRestoreButton')}
          </Button>
        </div>
      </PreferencesSection>

      {isSaveKeyModalOpen && (
        <SaveBackupKeyModal
          credentialId={getBackupKeyCredentialId({email, username, name})}
          onClose={() => setIsSaveKeyModalOpen(false)}
        />
      )}
    </PreferencesPage>
  );
};
