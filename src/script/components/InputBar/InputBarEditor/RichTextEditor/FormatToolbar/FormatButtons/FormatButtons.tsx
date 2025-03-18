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

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {FORMAT_TEXT_COMMAND, TextFormatType} from 'lexical';

import {
  CodeBlockIcon,
  BlockquoteIcon,
  BoldIcon,
  CodeInlineIcon,
  ItalicIcon,
  StrikethroughIcon,
  BulletListIcon,
  NumberedListIcon,
  HeadingIcon,
  LinkIcon,
} from '@wireapp/react-ui-kit';

import {FormatSeparator} from 'Components/InputBar/common/FormatSeparator/FormatSeparator';
import {t} from 'Util/LocalizerUtil';

import {FormatButton} from './FormatButton/FormatButton';
import {wrapperStyles} from './FormatButtons.styles';
import {useBlockquoteState} from './useBlockquoteState/useBlockquoteState';
import {useCodeBlockState} from './useCodeBlockState/useCodeBlockState';
import {useFormatButtonsState} from './useFormatButtonsState/useFormatButtonsState';
import {useHeadingState} from './useHeadingState/useHeadingState';
import {useListState} from './useListState/useListState';

interface FormatButtonProps {
  isEditing: boolean;
  onLinkFormat: () => void;
}

export const FormatButtons = ({isEditing, onLinkFormat}: FormatButtonProps) => {
  const [editor] = useLexicalComposerContext();

  const {activeFormats} = useFormatButtonsState();

  const {formatHeading} = useHeadingState();

  const {formatList} = useListState();

  const {formatBlockquote} = useBlockquoteState();

  const {formatCodeBlock} = useCodeBlockState();

  const formatText = (format: Extract<TextFormatType, 'bold' | 'italic' | 'strikethrough' | 'code'>) => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
  };

  return (
    <div className="input-bar-format-buttons">
      <div css={wrapperStyles}>
        <FormatButton
          label={t('richTextFormatHeading')}
          icon={HeadingIcon}
          active={activeFormats.includes('heading')}
          onClick={formatHeading}
          isEditing={isEditing}
        />
        <FormatButton
          label={t('richTextFormatBold')}
          icon={BoldIcon}
          active={activeFormats.includes('bold')}
          onClick={() => formatText('bold')}
          isEditing={isEditing}
        />
        <FormatButton
          label={t('richTextFormatItalic')}
          icon={ItalicIcon}
          active={activeFormats.includes('italic')}
          onClick={() => formatText('italic')}
          isEditing={isEditing}
        />
        <FormatButton
          label={t('richTextFormatStrikethrough')}
          icon={StrikethroughIcon}
          active={activeFormats.includes('strikethrough')}
          onClick={() => formatText('strikethrough')}
          isEditing={isEditing}
        />
        <FormatSeparator isEditing={isEditing} />
        <FormatButton
          label={t('richTextFormatOrderedList')}
          icon={NumberedListIcon}
          active={activeFormats.includes('orderedList')}
          onClick={() => formatList('ordered')}
          isEditing={isEditing}
        />
        <FormatButton
          label={t('richTextFormatUnorderedList')}
          icon={BulletListIcon}
          active={activeFormats.includes('unorderedList')}
          onClick={() => formatList('unordered')}
          isEditing={isEditing}
        />
        <FormatButton
          label={t('richTextFormatBlockquote')}
          icon={BlockquoteIcon}
          active={activeFormats.includes('blockquote')}
          onClick={formatBlockquote}
          isEditing={isEditing}
        />
        <FormatSeparator isEditing={isEditing} />
        <FormatButton
          label={t('richTextFormatLink')}
          icon={LinkIcon}
          active={activeFormats.includes('link')}
          onClick={onLinkFormat}
          isEditing={isEditing}
        />
        <FormatButton
          label={t('richTextFormatCodeBlock')}
          icon={CodeBlockIcon}
          active={activeFormats.includes('codeBlock')}
          onClick={formatCodeBlock}
          isEditing={isEditing}
        />
        <FormatButton
          label={t('richTextFormatCodeInline')}
          icon={CodeInlineIcon}
          active={activeFormats.includes('code')}
          onClick={() => formatText('code')}
          isEditing={isEditing}
        />
      </div>
    </div>
  );
};
