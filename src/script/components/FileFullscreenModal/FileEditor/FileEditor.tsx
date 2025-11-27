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

import {useCallback, useEffect, useState} from 'react';

import {Node} from '@wireapp/api-client/lib/cells';
import {container} from 'tsyringe';

import {CellsRepository} from 'Repositories/cells/CellsRepository';
import {t} from 'Util/LocalizerUtil';

import * as styles from './FileEditor.styles';

import {FileLoader} from '../FileLoader/FileLoader';

const MILLISECONDS_IN_SECOND = 1000;
const REFRESH_BUFFER_SECONDS = 10; // Refresh 10 seconds before expiry for safety

interface FileEditorProps {
  id: string;
}

export const FileEditor = ({id}: FileEditorProps) => {
  const cellsRepository = container.resolve(CellsRepository);
  const [node, setNode] = useState<Node | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  const fetchNode = useCallback(async () => {
    try {
      setIsLoading(true);
      setIsError(false);
      const fetchedNode = await cellsRepository.getNode({uuid: id, flags: ['WithEditorURLs']});
      setNode(fetchedNode);
    } catch (err) {
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, [id, cellsRepository]);

  // Initial fetch
  useEffect(() => {
    void fetchNode();
  }, [id, cellsRepository, fetchNode]);

  // Auto-refresh mechanism before expiry
  useEffect(() => {
    if (!node?.EditorURLs?.collabora.ExpiresAt) {
      return;
    }

    const expiresInSeconds = Number(node.EditorURLs.collabora.ExpiresAt);
    const refreshInSeconds = expiresInSeconds - REFRESH_BUFFER_SECONDS;

    // Set timeout to refresh before expiry
    const timeoutId = setTimeout(() => {
      void fetchNode();
    }, refreshInSeconds * MILLISECONDS_IN_SECOND);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [node, fetchNode]);

  if (isLoading) {
    return <FileLoader />;
  }

  if (isError || !node) {
    return <div>{t('fileFullscreenModal.editor.error')}</div>;
  }

  return (
    <iframe
      css={styles.editorIframe}
      src={node.EditorURLs?.collabora.Url}
      title={t('fileFullscreenModal.editor.iframeTitle')}
    />
  );
};
