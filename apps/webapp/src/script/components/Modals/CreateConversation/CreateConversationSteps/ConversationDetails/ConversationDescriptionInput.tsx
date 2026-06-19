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

import {$convertToMarkdownString} from '@lexical/markdown';
import {LexicalComposer} from '@lexical/react/LexicalComposer';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {LexicalErrorBoundary} from '@lexical/react/LexicalErrorBoundary';
import {ListPlugin} from '@lexical/react/LexicalListPlugin';
import {MarkdownShortcutPlugin} from '@lexical/react/LexicalMarkdownShortcutPlugin';
import {OnChangePlugin} from '@lexical/react/LexicalOnChangePlugin';
import {RichTextPlugin} from '@lexical/react/LexicalRichTextPlugin';
import {EditorState} from 'lexical';

import {editorConfig} from 'Components/InputBar/InputBarEditor/RichTextEditor/editorConfig';
import {LinkPlugin} from 'Components/InputBar/InputBarEditor/RichTextEditor/plugins/LinkPlugin/LinkPlugin';
import {ListMaxIndentLevelPlugin} from 'Components/InputBar/InputBarEditor/RichTextEditor/plugins/ListMaxIndentLevelPlugin/ListMaxIndentLevelPlugin';
import {markdownTransformers} from 'Components/InputBar/InputBarEditor/RichTextEditor/utils/markdownTransformers';
import {t} from 'Util/localizerUtil';

import {
  conversationDescriptionInputCss,
  conversationDescriptionInputWrapperCss,
  conversationDescriptionLabelCss,
} from './ConversationDetails.styles';

interface ConversationDescriptionInputProps {
  onChange: (description: string) => void;
}

export const ConversationDescriptionInput = ({onChange}: ConversationDescriptionInputProps) => {
  const handleChange = (editorState: EditorState) => {
    editorState.read(() => {
      onChange($convertToMarkdownString(markdownTransformers, undefined, true).trim());
    });
  };

  return (
    <div css={conversationDescriptionInputWrapperCss}>
      <label css={conversationDescriptionLabelCss} htmlFor="enter-group-description">
        {t('conversationDescriptionOptionalLabel')}
      </label>
      <LexicalComposer initialConfig={{...editorConfig, namespace: 'GroupDescriptionEditor'}}>
        <RichTextPlugin
          contentEditable={
            <ContentEditable
              css={conversationDescriptionInputCss}
              id="enter-group-description"
              data-uie-name="enter-group-description"
              aria-label={t('conversationDescriptionOptionalLabel')}
            />
          }
          placeholder={null}
          ErrorBoundary={LexicalErrorBoundary}
        />
        <ListPlugin />
        <ListMaxIndentLevelPlugin maxDepth={3} />
        <MarkdownShortcutPlugin transformers={markdownTransformers} />
        <LinkPlugin />
        <OnChangePlugin onChange={handleChange} ignoreSelectionChange />
      </LexicalComposer>
    </div>
  );
};
