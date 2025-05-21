/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import {com} from '@wireapp/kalium-backup';

// Importing classes from the Java library
/* eslint-disable */
import CPBackupImporter = com.wire.backup.ingest.MPBackupImporter;
import BackupImportResult = com.wire.backup.ingest.BackupImportResult;
import BackupPeekResult = com.wire.backup.ingest.BackupPeekResult;
import BackupExportResult = com.wire.backup.dump.BackupExportResult;
import CPBackupExporter = com.wire.backup.dump.MPBackupExporter;
import BackupQualifiedId = com.wire.backup.data.BackupQualifiedId;
import BackupMessage = com.wire.backup.data.BackupMessage;
import BackupUser = com.wire.backup.data.BackupUser;
import BackUpConversation = com.wire.backup.data.BackupConversation;
import BackupMessageContent = com.wire.backup.data.BackupMessageContent;
import BackupDateTime = com.wire.backup.data.BackupDateTime;
import EncryptionAlgorithm = BackupMessageContent.Asset.EncryptionAlgorithm;
import AssetMetaData = com.wire.backup.data.BackupMessageContent.Asset.AssetMetadata;

// Importing functions from the Java library
import isCreatedBySameUser = com.wire.backup.ingest.isCreatedBySameUser;
/* eslint-enable */

export {
  CPBackupImporter,
  BackupImportResult,
  BackupPeekResult,
  BackupExportResult,
  CPBackupExporter,
  BackupQualifiedId,
  BackupMessage,
  BackupUser,
  BackUpConversation,
  BackupMessageContent,
  BackupDateTime,
  EncryptionAlgorithm,
  AssetMetaData,
  isCreatedBySameUser,
};
