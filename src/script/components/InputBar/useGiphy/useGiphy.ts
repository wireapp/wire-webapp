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

import {useMemo} from 'react';

interface UseGiphyProps {
  text: string;
  maxLength: number;
  isMessageFormatButtonsFlagEnabled: boolean;
  openGiphy: (inputValue: string) => void;
}

export const useGiphy = ({text, maxLength, isMessageFormatButtonsFlagEnabled, openGiphy}: UseGiphyProps) => {
  const showGiphyButton = useMemo(() => {
    if (isMessageFormatButtonsFlagEnabled) {
      return text.length > 0;
    }
    return text.length > 0 && text.length <= maxLength;
  }, [text.length, maxLength, isMessageFormatButtonsFlagEnabled]);

  const handleGifClick = () => openGiphy(text);

  return {
    showGiphyButton,
    handleGifClick,
  };
};
