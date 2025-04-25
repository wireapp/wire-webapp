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

import {Button} from '@wireapp/react-ui-kit';

import {forcedDownloadFile} from 'Util/util';

import {FilePlaceholder} from '../common/FilePlaceholder/FilePlaceholder';

interface NoPreviewAvailableProps {
  fileUrl?: string;
  fileName: string;
}

export const NoPreviewAvailable = ({fileUrl, fileName}: NoPreviewAvailableProps) => {
  return (
    <FilePlaceholder
      title="File has no preview"
      description="There is no preview available for this file. Download the fle instead."
      callToAction={<Button onClick={() => forcedDownloadFile({url: fileUrl || '', name: fileName})}>Download</Button>}
    />
  );
};
