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

import {Button, ButtonVariant, DownloadIcon, ReloadIcon} from '@wireapp/react-ui-kit';

import {useApplicationContext} from 'src/script/page/RootProvider';

import {
  fileVersionItemWrapperCss,
  iconMarginRightCss,
  restoreIconCss,
  versionActionsWrapperCss,
  versionButtonCss,
  versionDotCurrentCss,
  versionDotOldCss,
  versionInfoContainerCss,
  versionMetaTextCss,
  versionOwnerSpanCss,
  versionTimeTextCss,
} from './FileHistoryModal.styles';

interface FileVersionItemProps {
  version: {
    versionId: string;
    time: string;
    ownerName: string;
    size: string;
    downloadUrl: string;
  };
  isCurrentVersion: boolean;
  onDownload: (downloadUrl: string) => void | Promise<void>;
  onRestore: (versionId: string) => void;
}

export const FileVersionItem = ({version, isCurrentVersion, onDownload, onRestore}: FileVersionItemProps) => {
  const {translate} = useApplicationContext();

  return (
    <div key={version.versionId} css={fileVersionItemWrapperCss}>
      <div css={isCurrentVersion ? versionDotCurrentCss : versionDotOldCss} aria-hidden="true" />
      <div css={versionInfoContainerCss}>
        <p css={versionTimeTextCss}>
          {version.time} {isCurrentVersion && translate('cells.versionHistory.current')}
        </p>
        <p css={versionMetaTextCss}>
          <span css={versionOwnerSpanCss}>{version.ownerName}</span>
          {version.size}
        </p>
      </div>
      <div css={versionActionsWrapperCss}>
        <Button
          variant={ButtonVariant.SECONDARY}
          css={versionButtonCss}
          onClick={() => void onDownload(version.downloadUrl)}
          aria-label={translate('cells.versionHistory.downloadAriaLabel', {time: version.time})}
        >
          <DownloadIcon css={iconMarginRightCss} /> {translate('cells.versionHistory.download')}
        </Button>
        {!isCurrentVersion && (
          <Button
            css={versionButtonCss}
            onClick={() => onRestore(version.versionId)}
            variant={ButtonVariant.SECONDARY}
            aria-label={translate('cells.versionHistory.restoreAriaLabel', {time: version.time})}
          >
            <ReloadIcon css={restoreIconCss} /> {translate('cells.versionHistory.restore')}
          </Button>
        )}
      </div>
    </div>
  );
};
