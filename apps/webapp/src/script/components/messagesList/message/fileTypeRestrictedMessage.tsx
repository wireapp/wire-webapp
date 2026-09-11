/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import type {ReactNode} from 'react';

import {FileTypeRestrictedMessage as FileTypeRestrictedMessageEntity} from 'Repositories/entity/message/fileTypeRestrictedMessage';
import {reactTranslationRenderingFeatureToggleName} from 'src/script/featureToggles/startupFeatureToggleNames';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {createReactTranslationMarker, renderReactTranslation} from 'Util/localizerUtil/reactLocalizerUtil';
import type {Translate} from 'Util/localizerUtil/translationTypes';

interface FileTypeRestrictedMessageProps {
  message: FileTypeRestrictedMessageEntity;
}

type FileTypeRestrictedTranslation =
  | {
      readonly kind: 'incoming';
      readonly name: string;
    }
  | {
      readonly kind: 'outgoing';
      readonly fileExt: string;
    };

type RenderFileTypeRestrictedMessageOptions = {
  readonly isReactTranslationRenderingEnabled: boolean;
  readonly translate: Translate;
  readonly translation: FileTypeRestrictedTranslation;
};

const fileTypeRestrictedBoldMarker = createReactTranslationMarker('file-type-restricted-bold');
const fileTypeRestrictedNameMarker = createReactTranslationMarker('file-type-restricted-name');
const fileTypeRestrictedFileExtMarker = createReactTranslationMarker('file-type-restricted-file-ext');
const fileTypeRestrictedNonBreakingSpaceMarker = createReactTranslationMarker(
  'file-type-restricted-non-breaking-space',
);

function translateFileTypeRestrictedMessage(translate: Translate, translation: FileTypeRestrictedTranslation): string {
  if (translation.kind === 'incoming') {
    return translate('fileTypeRestrictedIncoming', {name: translation.name});
  }

  return translate('fileTypeRestrictedOutgoing', {fileExt: translation.fileExt});
}

function translateFileTypeRestrictedMessageWithReactMarkers(
  translate: Translate,
  translation: FileTypeRestrictedTranslation,
): string {
  if (translation.kind === 'incoming') {
    return translate(
      'fileTypeRestrictedIncoming',
      {name: fileTypeRestrictedNameMarker.substitution},
      {
        '/bold': fileTypeRestrictedBoldMarker.end,
        bold: fileTypeRestrictedBoldMarker.start,
      },
    );
  }

  return translate('fileTypeRestrictedOutgoing', {fileExt: fileTypeRestrictedFileExtMarker.substitution});
}

function replaceFileTypeRestrictedNonBreakingSpaces(translatedText: string): string {
  return translatedText.replaceAll('&nbsp;', fileTypeRestrictedNonBreakingSpaceMarker.substitution);
}

function renderFileTypeRestrictedTranslation(
  translate: Translate,
  translation: FileTypeRestrictedTranslation,
): ReactNode[] {
  const translatedText = replaceFileTypeRestrictedNonBreakingSpaces(
    translateFileTypeRestrictedMessageWithReactMarkers(translate, translation),
  );
  const valueReplacements =
    translation.kind === 'incoming'
      ? [{marker: fileTypeRestrictedNameMarker, runtimeText: translation.name}]
      : [{marker: fileTypeRestrictedFileExtMarker, runtimeText: translation.fileExt}];

  return renderReactTranslation({
    translatedText,
    componentReplacements: [
      {
        start: fileTypeRestrictedBoldMarker.start,
        end: fileTypeRestrictedBoldMarker.end,
        render(children): ReactNode {
          return <strong>{children}</strong>;
        },
      },
    ],
    nodeReplacements: [
      {
        marker: fileTypeRestrictedNonBreakingSpaceMarker,
        render(): ReactNode {
          return '\u00A0';
        },
      },
    ],
    valueReplacements,
  });
}

function renderFileTypeRestrictedMessage(options: RenderFileTypeRestrictedMessageOptions): ReactNode {
  const {isReactTranslationRenderingEnabled, translate, translation} = options;
  const dataUieValue = translation.kind === 'incoming' ? 'incoming' : 'outgoing';

  if (isReactTranslationRenderingEnabled) {
    return (
      <p
        className="message-header-label"
        data-uie-name="filetype-restricted-message-text"
        data-uie-value={dataUieValue}
      >
        {renderFileTypeRestrictedTranslation(translate, translation)}
      </p>
    );
  }

  return (
    <p
      className="message-header-label"
      dangerouslySetInnerHTML={{__html: translateFileTypeRestrictedMessage(translate, translation)}}
      data-uie-name="filetype-restricted-message-text"
      data-uie-value={dataUieValue}
    />
  );
}

const FileTypeRestrictedMessage = ({message}: FileTypeRestrictedMessageProps) => {
  const {isFeatureToggleEnabled, translate} = useApplicationContext();
  const isReactTranslationRenderingEnabled = isFeatureToggleEnabled(reactTranslationRenderingFeatureToggleName);
  const translation = message.isIncoming
    ? {kind: 'incoming' as const, name: message.name}
    : {kind: 'outgoing' as const, fileExt: message.fileExt};

  return (
    <div className="message-header" data-uie-name="filetype-restricted-message">
      <div className="message-header-icon">
        <span className="icon-sysmsg-error text-red" />
      </div>
      {renderFileTypeRestrictedMessage({isReactTranslationRenderingEnabled, translate, translation})}
    </div>
  );
};

export {FileTypeRestrictedMessage};
