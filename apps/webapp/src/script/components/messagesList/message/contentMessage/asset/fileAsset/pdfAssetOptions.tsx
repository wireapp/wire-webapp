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

import {useRef, type FunctionComponent} from 'react';

import {wrapperStyles, triggerStyles} from './pdfAssetOptions.styles';

import {useApplicationContext} from '../../../../../../page/rootProvider';
import {MoreIcon} from '../../../../../../uiKit/dataDisplay/icon/moreIcon';
import {DropdownMenu} from '../../../../../../uiKit/surface/dropdownMenu/dropdownMenu';

interface PdfAssetOptionsProps {
  canDownload: boolean;
  onOpen: (trigger: HTMLElement) => void;
  onDownload: () => Promise<void> | void;
}

export const PdfAssetOptions: FunctionComponent<PdfAssetOptionsProps> = ({
  canDownload,
  onOpen,
  onDownload,
}: PdfAssetOptionsProps) => {
  const {translate} = useApplicationContext();
  const triggerRef = useRef<HTMLButtonElement>(null);

  const openPreview = (): void => {
    const trigger = triggerRef.current;
    if (trigger === null) {
      return;
    }

    onOpen(trigger);
  };

  const download = (): void => {
    if (!canDownload) {
      return;
    }

    void onDownload();
  };

  return (
    <div css={wrapperStyles}>
      <DropdownMenu>
        <DropdownMenu.Trigger asChild>
          <button
            ref={triggerRef}
            type="button"
            aria-label={translate('cells.options.label')}
            css={triggerStyles}
            onClick={event => {
              return event.stopPropagation();
            }}
            onKeyDown={event => {
              return event.stopPropagation();
            }}
          >
            <MoreIcon aria-hidden="true" color="var(--main-color)" width={16} height={16} />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item onClick={openPreview}>{translate('cells.options.open')}</DropdownMenu.Item>
          <DropdownMenu.Item disabled={!canDownload} onClick={download}>
            {translate('cells.options.download')}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>
    </div>
  );
};
