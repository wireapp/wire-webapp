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

export enum BackupFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

export type BackupRunKind = 'backup' | 'restore';

export interface BackupRun {
  kind: BackupRunKind;
  /** Progress in percent, 0-100 */
  progress: number;
}

/**
 * View state of the "Back up & restore" preferences screen.
 * Static for now: automatic backups are not wired to any backend yet.
 */
export interface BackupPreferencesViewState {
  autoBackupEnabled: boolean;
  /** Team admin enforces automatic backups: toggle and schedule are locked */
  adminEnforced: boolean;
  /** Backup folder is no longer accessible */
  paused: boolean;
  run?: BackupRun;
  frequency: BackupFrequency;
  location: string;
  /** Preformatted date of the last successful backup, undefined if never */
  lastBackup?: string;
  /** Preformatted date of the next scheduled backup */
  nextBackup?: string;
}
