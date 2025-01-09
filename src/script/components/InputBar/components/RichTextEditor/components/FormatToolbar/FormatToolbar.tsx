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

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {FORMAT_TEXT_COMMAND, TextFormatType} from 'lexical';

import {
  BoldIcon,
  BulletListIcon,
  CodeIcon,
  HeadingIcon,
  ItalicIcon,
  NumberedListIcon,
  StrikethroughIcon,
} from '@wireapp/react-ui-kit';

import {t} from 'Util/LocalizerUtil';

import {FormatButton} from './FormatButton/FormatButton';
import {wrapperStyles} from './FormatToolbar.styles';
import {useHeadingState} from './useHeadingState/useHeadingState';
import {useListState} from './useListState/useListState';
import {useToolbarState} from './useToolbarState/useToolbarState';

export const FormatToolbar = () => {
  const [editor] = useLexicalComposerContext();

  const {activeFormats} = useToolbarState();

  const {toggleHeading} = useHeadingState();

  const {toggleList} = useListState();

  const formatText = (format: Extract<TextFormatType, 'bold' | 'italic' | 'strikethrough' | 'code'>) => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
  };

  return (
    <div css={wrapperStyles}>
      <FormatButton
        label={t('richTextHeading')}
        icon={HeadingIcon}
        active={activeFormats.includes('heading')}
        onClick={toggleHeading}
      />
      <FormatButton
        label={t('richTextBold')}
        icon={BoldIcon}
        active={activeFormats.includes('bold')}
        onClick={() => formatText('bold')}
      />
      <FormatButton
        label={t('richTextItalic')}
        icon={ItalicIcon}
        active={activeFormats.includes('italic')}
        onClick={() => formatText('italic')}
      />
      <FormatButton
        label={t('richTextStrikethrough')}
        icon={StrikethroughIcon}
        active={activeFormats.includes('strikethrough')}
        onClick={() => formatText('strikethrough')}
      />
      <FormatButton
        label={t('richTextOrderedList')}
        icon={NumberedListIcon}
        active={activeFormats.includes('orderedList')}
        onClick={() => toggleList('ordered')}
      />
      <FormatButton
        label={t('richTextUnorderedList')}
        icon={BulletListIcon}
        active={activeFormats.includes('unorderedList')}
        onClick={() => toggleList('unordered')}
      />
      <FormatButton
        label={t('richTextCode')}
        icon={CodeIcon}
        active={activeFormats.includes('code')}
        onClick={() => formatText('code')}
      />
    </div>
  );
};
