/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {useCallback, useState} from 'react';

import {useAppNotification} from 'Components/AppNotification';
import {FileWithPreview} from 'Components/Conversation/useFilesUploadState/useFilesUploadState';
import {CellsRepository} from 'Repositories/cells/CellsRepository';
import {t} from 'Util/LocalizerUtil';

export type SendFilesStatus = 'idle' | 'loading' | 'success' | 'error';

interface UseSendFilesProps {
  files: FileWithPreview[];
  cellsRepository: CellsRepository;
  clearAllFiles: ({conversationId}: {conversationId: string}) => void;
  conversationId: string;
}

export const useSendFiles = ({files, clearAllFiles, cellsRepository, conversationId}: UseSendFilesProps) => {
  const [status, setStatus] = useState<SendFilesStatus>('idle');

  const errorNotification = useAppNotification({
    message: t('conversationSendFilesError'),
  });

  const sendFile = useCallback(async (file: FileWithPreview) => {
    return cellsRepository.promoteNodeDraft({uuid: file.remoteUuid, versionId: file.remoteVersionId});
    // cellsRepository is not a dependency because it's a singleton
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendFiles = useCallback(async () => {
    try {
      setStatus('loading');
      await Promise.all(files.map(sendFile));
      files.map(file => file.preview && URL.revokeObjectURL(file.preview));
      setStatus('success');
    } catch (error) {
      errorNotification.show();
      setStatus('error');
      throw error;
    }
    // cellsRepository is not a dependency because it's a singleton
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

  const clearFiles = useCallback(() => {
    clearAllFiles({conversationId});
    setStatus('idle');
  }, [clearAllFiles, conversationId]);

  return {
    sendFiles,
    clearFiles,
    isLoading: status === 'loading',
  };
};
