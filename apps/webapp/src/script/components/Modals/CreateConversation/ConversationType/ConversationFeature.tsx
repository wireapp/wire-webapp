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

import type {ReactNode} from 'react';

import {ShieldIcon} from '@wireapp/react-ui-kit';

import {CheckIcon} from 'Components/icon';
import {reactTranslationRenderingFeatureToggleName} from 'src/script/featureToggles/startupFeatureToggleNames';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {createReactTranslationMarker, renderReactTranslation} from 'Util/localizerUtil/reactLocalizerUtil';
import type {
  ReactTranslationComponentReplacement,
  ReactTranslationValueReplacement,
} from 'Util/localizerUtil/reactLocalizerUtil';
import type {Translate} from 'Util/localizerUtil/translationTypes';

import {
  conversationFeatureContainerCss,
  conversationFeatureCss,
  conversationFeatureIconCss,
  conversationFeatureVerifiedIconCss,
} from './ConversationType.styles';

import {ConversationType} from '../types';

interface ConversationFeatureProps {
  conversationType: ConversationType;
}

type ConversationFeatureTranslationKey =
  | 'conversationCommonFeature1'
  | 'conversationCommonFeature2'
  | 'conversationCommonFeature3'
  | 'channelConversationFeature1'
  | 'channelConversationFeature2';

type ConversationFeatureTranslationValue = {
  readonly placeholder: 'capacity';
  readonly marker: ReturnType<typeof createReactTranslationMarker>;
  readonly runtimeText: string;
};

type ConversationFeatureDescriptor = {
  readonly translationKey: ConversationFeatureTranslationKey;
  readonly values: readonly ConversationFeatureTranslationValue[];
};

type RenderConversationFeatureItemOptions = {
  readonly descriptor: ConversationFeatureDescriptor;
  readonly isLastFeature: boolean;
  readonly isReactTranslationRenderingEnabled: boolean;
  readonly translate: Translate;
};

const CHANNEL_CAPACITY = 2000;
const GROUP_CAPACITY = 500;

const conversationFeatureBoldMarker = createReactTranslationMarker('conversation-feature-bold');
const conversationFeatureCapacityMarker = createReactTranslationMarker('conversation-feature-capacity');

const conversationFeatureComponentReplacements: readonly ReactTranslationComponentReplacement[] = [
  {
    start: conversationFeatureBoldMarker.start,
    end: conversationFeatureBoldMarker.end,
    render(children): ReactNode {
      return <strong>{children}</strong>;
    },
  },
];

const conversationFeatureDangerousSubstitutions = {
  bold: conversationFeatureBoldMarker.start,
  '/bold': conversationFeatureBoldMarker.end,
};

function getConversationFeatureCapacity(conversationType: ConversationType): string {
  if (conversationType === ConversationType.Channel) {
    return CHANNEL_CAPACITY.toString();
  }

  return GROUP_CAPACITY.toString();
}

function createConversationFeatureValue(runtimeText: string): ConversationFeatureTranslationValue {
  return {
    placeholder: 'capacity',
    marker: conversationFeatureCapacityMarker,
    runtimeText,
  };
}

function getConversationFeatureDescriptors(
  conversationType: ConversationType,
): readonly ConversationFeatureDescriptor[] {
  const generalFeatures: readonly ConversationFeatureDescriptor[] = [
    {
      translationKey: 'conversationCommonFeature1',
      values: [createConversationFeatureValue(getConversationFeatureCapacity(conversationType))],
    },
    {
      translationKey: 'conversationCommonFeature2',
      values: [],
    },
    {
      translationKey: 'conversationCommonFeature3',
      values: [],
    },
  ];

  if (conversationType === ConversationType.Channel) {
    const channelFeatures: readonly ConversationFeatureDescriptor[] = [
      {
        translationKey: 'channelConversationFeature1',
        values: [],
      },
      {
        translationKey: 'channelConversationFeature2',
        values: [],
      },
    ];

    return generalFeatures.toSpliced(1, 0, ...channelFeatures);
  }

  return generalFeatures;
}

function getConversationFeatureMarkerSubstitutions(
  values: readonly ConversationFeatureTranslationValue[],
): Record<string, string> {
  return Object.fromEntries(
    values.map(value => {
      return [value.placeholder, value.marker.substitution];
    }),
  );
}

function getConversationFeatureRuntimeSubstitutions(
  values: readonly ConversationFeatureTranslationValue[],
): Record<string, string> {
  return Object.fromEntries(
    values.map(value => {
      return [value.placeholder, value.runtimeText];
    }),
  );
}

function renderConversationFeatureReactTranslation(
  descriptor: ConversationFeatureDescriptor,
  translate: Translate,
): ReactNode[] {
  const translatedText = translate(
    descriptor.translationKey,
    getConversationFeatureMarkerSubstitutions(descriptor.values),
    conversationFeatureDangerousSubstitutions,
  );
  const valueReplacements: readonly ReactTranslationValueReplacement[] = descriptor.values.map(value => {
    return {
      marker: value.marker,
      runtimeText: value.runtimeText,
    };
  });

  return renderReactTranslation({
    translatedText,
    componentReplacements: conversationFeatureComponentReplacements,
    nodeReplacements: [],
    valueReplacements,
  });
}

function renderConversationFeatureIcon(isLastFeature: boolean): ReactNode {
  if (isLastFeature) {
    return <ShieldIcon css={conversationFeatureVerifiedIconCss} />;
  }

  return <CheckIcon css={conversationFeatureIconCss} />;
}

function renderConversationFeatureItem(options: RenderConversationFeatureItemOptions): ReactNode {
  const {descriptor, isLastFeature, isReactTranslationRenderingEnabled, translate} = options;

  if (isReactTranslationRenderingEnabled) {
    return (
      <div css={conversationFeatureCss} key={descriptor.translationKey}>
        {renderConversationFeatureIcon(isLastFeature)}
        <span className="subline" data-uie-name="team-creation-intro-list-item">
          {renderConversationFeatureReactTranslation(descriptor, translate)}
        </span>
      </div>
    );
  }

  return (
    <div css={conversationFeatureCss} key={descriptor.translationKey}>
      {renderConversationFeatureIcon(isLastFeature)}
      <span
        dangerouslySetInnerHTML={{
          __html: translate(descriptor.translationKey, getConversationFeatureRuntimeSubstitutions(descriptor.values)),
        }}
        className="subline"
        data-uie-name="team-creation-intro-list-item"
      />
    </div>
  );
}

export function ConversationFeature({conversationType}: ConversationFeatureProps): ReactNode {
  const {isFeatureToggleEnabled, translate} = useApplicationContext();
  const isReactTranslationRenderingEnabled = isFeatureToggleEnabled(reactTranslationRenderingFeatureToggleName);
  const featureDescriptors = getConversationFeatureDescriptors(conversationType);

  return (
    <div css={conversationFeatureContainerCss}>
      {featureDescriptors.map((descriptor, featureIndex): ReactNode => {
        return renderConversationFeatureItem({
          descriptor,
          isLastFeature: featureIndex === featureDescriptors.length - 1,
          isReactTranslationRenderingEnabled,
          translate,
        });
      })}
    </div>
  );
}
