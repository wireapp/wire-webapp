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

import {FormatButtons} from './FormatButtons/FormatButtons';
import {LinkDialog} from './LinkDialog/LinkDialog';
import {useLinkState} from './useLinkState/useLinkState';

interface FormatToolbarProps {
  isEditing: boolean;
  showFormatButtons: boolean;
}

export const FormatToolbar = ({isEditing, showFormatButtons}: FormatToolbarProps) => {
  const {formatLink, insertLink, isModalOpen, closeModal, selectedText, linkUrl, linkNode} = useLinkState();

  return (
    <>
      {showFormatButtons && <FormatButtons isEditing={isEditing} onLinkFormat={formatLink} />}
      <LinkDialog
        isOpen={isModalOpen}
        isEditing={!!linkNode}
        initialUrl={linkUrl}
        initialText={selectedText}
        onSubmit={insertLink}
        onClose={closeModal}
      />
    </>
  );
};
