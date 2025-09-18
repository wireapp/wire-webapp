/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {useState} from 'react';

import {Button, ButtonVariant} from '@wireapp/react-ui-kit';

import * as Icon from 'Components/Icon';
import {copyText} from 'Util/ClipboardUtil';

interface CopyToClipboardButtonProps {
  textToCopy: string;
  displayText: string;
  copySuccessText: string;
  onCopySuccess?: () => void;
  disabled?: boolean;
}

const COPY_CONFIRM_DURATION = 1500;

export const CopyToClipboardButton = ({
  disabled,
  textToCopy,
  displayText,
  copySuccessText,
  onCopySuccess,
}: CopyToClipboardButtonProps) => {
  const [isCopying, setIsCopying] = useState<boolean>(false);

  const copyToClipboard = async () => {
    if (disabled) {
      return;
    }
    if (!isCopying) {
      await copyText(textToCopy);
      onCopySuccess?.();
      setIsCopying(true);
      window.setTimeout(() => setIsCopying(false), COPY_CONFIRM_DURATION);
    }
  };

  return (
    <Button
      disabled={disabled}
      onClick={copyToClipboard}
      variant={ButtonVariant.TERTIARY}
      data-uie-name="do-copy-to-clipboard"
    >
      <Icon.CopyIcon data-uie-name="copy-to-clipboard-icon" width="16" height="16" css={{marginRight: '10px'}} />
      {isCopying ? copySuccessText : displayText}
    </Button>
  );
};
