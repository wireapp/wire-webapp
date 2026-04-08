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

import {useCallback, useEffect, useRef, useState} from 'react';

import {Node} from '@wireapp/api-client/lib/cells';
import {Maybe, result} from 'true-myth';
import {container} from 'tsyringe';

import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {removeCurrentModal} from 'Components/Modals/PrimaryModal/PrimaryModalState';
import {CellsRepository} from 'Repositories/cells/cellsRepository';
import {Config} from 'src/script/Config';
import {t} from 'Util/localizerUtil';
import {TIME_IN_MILLIS} from 'Util/timeUtil';

import * as styles from './FileEditor.styles';
import {validateCollaboraUrl} from './validateCollaboraUrl';

import {FileLoader} from '../FileLoader/FileLoader';

const REFRESH_BUFFER_SECONDS = 10; // Refresh 10 seconds before expiry for safety

interface FileEditorProps {
  id: string;
}

export const FileEditor = ({id}: FileEditorProps) => {
  const cellsRepository = container.resolve(CellsRepository);
  const [node, setNode] = useState<Node | null>(null);
  const [isRecycled, setIsRecycled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const hasShownErrorModal = useRef(false);

  const fetchNode = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      setIsError(false);
      const fetchedNode = await cellsRepository.getNode({uuid: id, flags: ['WithEditorURLs']});

      if (fetchedNode.IsRecycled) {
        setIsRecycled(true);
        setNode(null);
        return false;
      }

      setIsRecycled(false);
      setNode(fetchedNode);
      return true;
    } catch (err: unknown) {
      setIsError(true);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [id, cellsRepository]);

  const handleRetry = useCallback(() => {
    hasShownErrorModal.current = false;
    void (async () => {
      const isSuccessful = await fetchNode();
      if (isSuccessful) {
        removeCurrentModal();
      }
    })();
  }, [fetchNode]);

  // Initial fetch
  useEffect(() => {
    void fetchNode();
  }, [id, cellsRepository, fetchNode]);

  // Auto-refresh mechanism before expiry
  useEffect(() => {
    if (!node?.EditorURLs?.collabora.ExpiresAt) {
      return undefined;
    }

    const expiresInSeconds = Number(node.EditorURLs.collabora.ExpiresAt);
    const refreshInSeconds = expiresInSeconds - REFRESH_BUFFER_SECONDS;

    // Set timeout to refresh before expiry
    const timeoutId = setTimeout(() => {
      void fetchNode();
    }, refreshInSeconds * TIME_IN_MILLIS.SECOND);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [node, fetchNode]);

  useEffect(() => {
    if (isLoading || isRecycled || (!isError && node)) {
      return;
    }

    if (hasShownErrorModal.current) {
      return;
    }

    hasShownErrorModal.current = true;

    PrimaryModal.show(PrimaryModal.type.CONFIRM, {
      closeOnConfirm: false,
      secondaryAction: {
        text: t('modalConfirmSecondary'),
      },
      primaryAction: {
        action: handleRetry,
        text: t('unknownApplicationErrorTryAgain'),
      },
      text: {
        message: t('fileFullscreenModal.editor.errorDescription'),
        title: t('fileFullscreenModal.editor.errorTitle'),
      },
    });
  }, [handleRetry, isError, isLoading, isRecycled, node]);

  useEffect(() => {
    if (!isLoading && !isError && node && !isRecycled) {
      hasShownErrorModal.current = false;
    }
  }, [isError, isLoading, isRecycled, node]);

  if (isLoading) {
    return <FileLoader />;
  }

  if (isRecycled) {
    return null;
  }

  const urlValidation = validateCollaboraUrl(
    Maybe.of(node?.EditorURLs?.collabora?.Url),
    Config.getConfig().CELLS_PYDIO_URL,
  );

  if (result.isErr(urlValidation)) {
    return null;
  }

  return (
    <iframe
      allow="clipboard-read; clipboard-write"
      css={styles.editorIframe}
      src={urlValidation.value}
      title={t('fileFullscreenModal.editor.iframeTitle')}
    />
  );
};
