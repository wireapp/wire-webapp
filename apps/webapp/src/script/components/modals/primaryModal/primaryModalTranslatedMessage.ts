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

import type {TranslationKey} from 'Util/localizerUtil';

export type PrimaryModalTranslatedValue = {
  readonly alternatePlaceholders: readonly string[];
  readonly placeholder: string;
  readonly runtimeText: string;
};

export type PrimaryModalTranslatedCompatibilityReplacement = {
  readonly replacementMarkerName: string;
  readonly source: string;
};

export type PrimaryModalTranslatedComponent =
  | {
      readonly kind: 'bold';
      readonly markerName: string;
    }
  | {
      readonly kind: 'line-break';
      readonly legacyTokens: readonly string[];
      readonly markerName: string;
    }
  | {
      readonly className: string;
      readonly dataUieName: string;
      readonly href: string;
      readonly kind: 'link';
      readonly legacyClosingTokens: readonly string[];
      readonly legacyOpeningTokens: readonly string[];
      readonly markerName: string;
      readonly rel: string;
      readonly target: string;
    };

export type PrimaryModalTranslatedLayout = 'default' | 'e2ei-success' | 'group-call-description';

export type PrimaryModalTranslatedTranslation = {
  readonly compatibilityReplacements: readonly PrimaryModalTranslatedCompatibilityReplacement[];
  readonly components: readonly PrimaryModalTranslatedComponent[];
  readonly kind: 'translation';
  readonly layout: PrimaryModalTranslatedLayout;
  readonly translationKey: TranslationKey;
  readonly values: readonly PrimaryModalTranslatedValue[];
};

export type PrimaryModalTranslatedMessage =
  | PrimaryModalTranslatedTranslation
  | {
      readonly kind: 'sequence';
      readonly messages: readonly PrimaryModalTranslatedTranslation[];
    };
