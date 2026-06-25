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

import {FunctionComponent} from 'react';

import {
  fileHistoryContentCss,
  fileHistoryDateHeadingCss,
  fileHistoryListCss,
  fileHistoryTimelineContainerCss,
} from './filehistorymodal.styles';
import {FileVersionItem} from './fileversionitem';
import {FileVersion} from './types';

type FileHistoryContentProps = {
  readonly fileVersions: Record<string, FileVersion[]>;
  readonly handleDownload: (url: string) => Promise<void>;
  readonly handleRestore: (versionId: string) => void;
};

export const FileHistoryContent: FunctionComponent<FileHistoryContentProps> = properties => {
  const {fileVersions, handleDownload, handleRestore} = properties;

  return (
    <div css={fileHistoryContentCss}>
      <div css={fileHistoryListCss}>
        {Object.keys(fileVersions).map((date, groupIndex) => (
          <div key={date}>
            <h3 css={fileHistoryDateHeadingCss}>{date}</h3>
            <div css={fileHistoryTimelineContainerCss}>
              {fileVersions[date].map((version, versionIndex) => (
                <FileVersionItem
                  key={version.versionId}
                  version={version}
                  isCurrentVersion={versionIndex === 0 && groupIndex === 0}
                  showTimelineConnector={versionIndex < fileVersions[date].length - 1}
                  onDownload={handleDownload}
                  onRestore={handleRestore}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
