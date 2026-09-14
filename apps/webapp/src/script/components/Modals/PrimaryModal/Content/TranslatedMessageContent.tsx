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

import {Fragment, ReactNode} from 'react';

import {isNonEmptyString, isUndefined} from '@sindresorhus/is';

import type {Translate} from 'Util/localizerUtil';
import {
  createReactTranslationMarker,
  ReactTranslationComponentReplacement,
  ReactTranslationMarker,
  ReactTranslationNodeReplacement,
  ReactTranslationValueReplacement,
  renderReactTranslation,
} from 'Util/localizerUtil/reactLocalizerUtil';

import type {
  PrimaryModalTranslatedComponent,
  PrimaryModalTranslatedMessage,
  PrimaryModalTranslatedTranslation,
  PrimaryModalTranslatedValue,
} from '../PrimaryModalTranslatedMessage';

type TranslationMarkers = {
  readonly components: ReadonlyMap<string, ReactTranslationMarker>;
  readonly values: ReadonlyMap<string, ReactTranslationMarker>;
};

type RenderTranslatedMessageOptions = {
  readonly message: PrimaryModalTranslatedMessage;
  readonly translate: Translate;
};

type RenderTranslatedTranslationOptions = {
  readonly translate: Translate;
  readonly translation: PrimaryModalTranslatedTranslation;
};

function replacePlaceholdersWithMarkers(
  text: string,
  values: readonly PrimaryModalTranslatedValue[],
  valueMarkers: ReadonlyMap<string, ReactTranslationMarker>,
): string {
  let replacedText = text;

  for (const value of values) {
    const marker = valueMarkers.get(value.placeholder);
    if (isUndefined(marker)) {
      continue;
    }

    replacedText = replacedText.replaceAll(`{${value.placeholder}}`, marker.substitution);

    for (const alternatePlaceholder of value.alternatePlaceholders) {
      replacedText = replacedText.replaceAll(`{${alternatePlaceholder}}`, marker.substitution);
    }
  }

  return replacedText;
}

function replaceLegacyComponentTokens(
  translatedText: string,
  translation: PrimaryModalTranslatedTranslation,
  markers: TranslationMarkers,
): string {
  let replacedText = translatedText;

  for (const component of translation.components) {
    const marker = markers.components.get(component.markerName);
    if (isUndefined(marker)) {
      continue;
    }

    if (component.kind === 'line-break') {
      for (const legacyToken of component.legacyTokens) {
        replacedText = replacedText.replaceAll(legacyToken, marker.substitution);
      }
      continue;
    }

    if (component.kind === 'link') {
      for (const legacyToken of component.legacyOpeningTokens) {
        const translatedLegacyToken = replacePlaceholdersWithMarkers(legacyToken, translation.values, markers.values);
        replacedText = replacedText.replaceAll(translatedLegacyToken, marker.start);
      }
      for (const legacyToken of component.legacyClosingTokens) {
        replacedText = replacedText.replaceAll(legacyToken, marker.end);
      }
    }
  }

  return replacedText;
}

function replaceCompatibilityTokens(
  translatedText: string,
  translation: PrimaryModalTranslatedTranslation,
  markers: TranslationMarkers,
): string {
  let replacedText = translatedText;

  for (const compatibilityReplacement of translation.compatibilityReplacements) {
    let source = replacePlaceholdersWithMarkers(compatibilityReplacement.source, translation.values, markers.values);

    for (const component of translation.components) {
      const marker = markers.components.get(component.markerName);
      if (isUndefined(marker)) {
        continue;
      }

      if (component.kind === 'line-break') {
        source = source.replaceAll(`[${component.markerName}]`, marker.substitution);
        continue;
      }

      source = source.replaceAll(`[${component.markerName}]`, marker.start);
      source = source.replaceAll(`[/${component.markerName}]`, marker.end);
    }

    const valueMarker = markers.values.get(compatibilityReplacement.replacementMarkerName);
    if (!isUndefined(valueMarker)) {
      replacedText = replacedText.replaceAll(source, valueMarker.substitution);
      continue;
    }

    const componentMarker = markers.components.get(compatibilityReplacement.replacementMarkerName);
    if (!isUndefined(componentMarker)) {
      replacedText = replacedText.replaceAll(source, componentMarker.substitution);
    }
  }

  return replacedText;
}

function createTranslationMarkers(translation: PrimaryModalTranslatedTranslation): {
  dangerousSubstitutions: Record<string, string>;
  markers: TranslationMarkers;
  substitutions: Record<string, string>;
} {
  const valueMarkers = new Map<string, ReactTranslationMarker>();
  const substitutions: Record<string, string> = {};

  for (const value of translation.values) {
    const marker = createReactTranslationMarker(`${translation.translationKey}-${value.placeholder}`);
    valueMarkers.set(value.placeholder, marker);
    substitutions[value.placeholder] = marker.substitution;

    for (const alternatePlaceholder of value.alternatePlaceholders) {
      substitutions[alternatePlaceholder] = marker.substitution;
    }
  }

  const componentMarkers = new Map<string, ReactTranslationMarker>();
  const dangerousSubstitutions: Record<string, string> = {};

  for (const component of translation.components) {
    const marker = createReactTranslationMarker(`${translation.translationKey}-${component.markerName}`);
    componentMarkers.set(component.markerName, marker);

    if (component.kind === 'line-break') {
      dangerousSubstitutions[component.markerName] = marker.substitution;
      continue;
    }

    dangerousSubstitutions[component.markerName] = marker.start;
    dangerousSubstitutions[`/${component.markerName}`] = marker.end;
  }

  return {
    dangerousSubstitutions,
    markers: {components: componentMarkers, values: valueMarkers},
    substitutions,
  };
}

function renderLink(
  component: Extract<PrimaryModalTranslatedComponent, {kind: 'link'}>,
  children: ReactNode[],
): ReactNode {
  const linkProperties: {
    className?: string;
    'data-uie-name'?: string;
    href: string;
    rel: string;
    target: string;
  } = {
    href: component.href,
    rel: component.rel,
    target: component.target,
  };

  if (isNonEmptyString(component.className)) {
    linkProperties.className = component.className;
  }
  if (isNonEmptyString(component.dataUieName)) {
    linkProperties['data-uie-name'] = component.dataUieName;
  }

  return <a {...linkProperties}>{children}</a>;
}

function createComponentReplacements(
  translation: PrimaryModalTranslatedTranslation,
  markers: TranslationMarkers,
): ReactTranslationComponentReplacement[] {
  const replacements: ReactTranslationComponentReplacement[] = [];

  for (const component of translation.components) {
    const marker = markers.components.get(component.markerName);
    if (isUndefined(marker) || component.kind === 'line-break') {
      continue;
    }

    if (component.kind === 'bold') {
      replacements.push({
        start: marker.start,
        end: marker.end,
        render(children): ReactNode {
          return <strong>{children}</strong>;
        },
      });
      continue;
    }

    replacements.push({
      start: marker.start,
      end: marker.end,
      render(children): ReactNode {
        return renderLink(component, children);
      },
    });
  }

  return replacements;
}

function createNodeReplacements(
  translation: PrimaryModalTranslatedTranslation,
  markers: TranslationMarkers,
): ReactTranslationNodeReplacement[] {
  const replacements: ReactTranslationNodeReplacement[] = [];

  for (const component of translation.components) {
    if (component.kind !== 'line-break') {
      continue;
    }

    const marker = markers.components.get(component.markerName);
    if (isUndefined(marker)) {
      continue;
    }

    replacements.push({
      marker,
      render(): ReactNode {
        return <br />;
      },
    });
  }

  return replacements;
}

function createValueReplacements(
  translation: PrimaryModalTranslatedTranslation,
  markers: TranslationMarkers,
): ReactTranslationValueReplacement[] {
  const replacements: ReactTranslationValueReplacement[] = [];

  for (const value of translation.values) {
    const marker = markers.values.get(value.placeholder);
    if (isUndefined(marker)) {
      continue;
    }

    replacements.push({marker, runtimeText: value.runtimeText});
  }

  return replacements;
}

function renderTranslatedTranslation(options: RenderTranslatedTranslationOptions): ReactNode[] {
  const {translate, translation} = options;
  const {dangerousSubstitutions, markers, substitutions} = createTranslationMarkers(translation);
  const translatedText = translate(translation.translationKey, substitutions, dangerousSubstitutions);
  const compatibleTranslatedText = replaceLegacyComponentTokens(
    replaceCompatibilityTokens(translatedText, translation, markers),
    translation,
    markers,
  );

  return renderReactTranslation({
    componentReplacements: createComponentReplacements(translation, markers),
    nodeReplacements: createNodeReplacements(translation, markers),
    translatedText: compatibleTranslatedText,
    valueReplacements: createValueReplacements(translation, markers),
  });
}

function renderE2EISuccessMessage(children: ReactNode[]): ReactNode {
  return (
    <div style={{textAlign: 'center'}}>
      <div style={{marginBottom: 24}}>
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" fill="none">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M60 32V7.48786L32 0L4 8V32C4 48 16.0287 60.3908 32 64C48.1374 60.3908 60 48 60 32ZM52 21.3829L27.4086 48L12 31.3842L16.9238 26.0013L27.4086 37.2342L47.0762 16L52 21.3829Z"
            fill="#1D7833"
          />
        </svg>
      </div>
      {children}
    </div>
  );
}

function renderTranslatedTranslationWithLayout(
  translation: PrimaryModalTranslatedTranslation,
  children: ReactNode[],
): ReactNode {
  if (translation.layout === 'e2ei-success') {
    return renderE2EISuccessMessage(children);
  }

  if (translation.layout === 'group-call-description') {
    return (
      <div id="modal-description-html" className="modal-description">
        {children}
      </div>
    );
  }

  return <p id="modal-description-html">{children}</p>;
}

function renderTranslatedMessage(options: RenderTranslatedMessageOptions): ReactNode {
  const {message, translate} = options;

  if (message.kind === 'sequence') {
    const renderedMessages: ReactNode[] = [];

    for (const [index, translation] of message.messages.entries()) {
      if (index > 0) {
        renderedMessages.push(<br key={`separator-${index}`} />);
      }

      renderedMessages.push(
        <Fragment key={`${translation.translationKey}-${index}`}>
          {renderTranslatedTranslation({translate, translation})}
        </Fragment>,
      );
    }

    return <p id="modal-description-html">{renderedMessages}</p>;
  }

  return renderTranslatedTranslationWithLayout(message, renderTranslatedTranslation({translate, translation: message}));
}

export function TranslatedMessageContent({
  message,
  translate,
}: {
  readonly message: PrimaryModalTranslatedMessage;
  readonly translate: Translate;
}): ReactNode {
  return renderTranslatedMessage({message, translate});
}
