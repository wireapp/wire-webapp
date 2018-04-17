/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

'use strict';

window.z = window.z || {};
window.z.backup = z.backup || {};

z.backup.BackupRepository = class BackupRepository {
  /**
   * Construct a new Backup repository.
   * @class z.backup.BackupRepository
   * @param {z.backup.BackupService} backupService - Backup service implementation
   * @param {z.client.ClientRepository} clientRepository - Repository for all client interactions
   * @param {z.user.UserRepository} userRepository - Repository for all user and connection interactions
   */
  constructor(backupService, clientRepository, userRepository) {
    this.backupService = backupService;
    this.clientRepository = clientRepository;
    this.userRepository = userRepository;
  }

  createMetaDescription() {
    return {
      client_id: this.clientRepository.currentClient().id,
      creation_time: new Date().toISOString(),
      platform: 'Desktop',
      user_id: this.userRepository.self().id,
      version: this.backupService.getDatabaseVersion(),
    };
  }

  cancelBackup() {
    amplify.publish(z.event.WebApp.BACKUP.EXPORT.CANCEL);
  }

  exportBackup() {
    return this.backupService.getHistoryCount().then(numberOfRecords => {
      const userName = this.userRepository.self().username();
      return {
        numberOfRecords,
        userName,
      };
    });
  }

  getUserData() {
    const clientId = this.clientRepository.currentClient().id;
    const userId = this.userRepository.self().id;

    return {
      clientId,
      userId,
    };
  }

  onError(error) {
    const isBackupImportError = error.constructor.name === 'BackupImportError';

    amplify.publish(z.event.WebApp.WARNING.MODAL, z.viewModel.ModalsViewModel.TYPE.CONFIRM, {
      action: () => this.exportBackup(),
      preventClose: true,
      text: {
        action: z.l10n.text(z.string.backupErrorAction),
        message: isBackupImportError ? z.l10n.text(z.string.backupImportGenericErrorSecondary) : error.message,
        title: isBackupImportError
          ? z.l10n.text(z.string.backupImportGenericErrorHeadline)
          : z.l10n.text(z.string.backupExportGenericErrorHeadline),
      },
    });
  }

  importTable(tableName, entities) {
    entities.forEach(entity => this.backupService.importEntity(tableName, entity));
  }

  getTables() {
    return this.backupService.getTables();
  }

  exportHistory(table, onProgress) {
    return this.backupService.getHistory(table, onProgress);
  }
};
