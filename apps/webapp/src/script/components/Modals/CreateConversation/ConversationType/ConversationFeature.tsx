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

import {ShieldIcon} from '@wireapp/react-ui-kit';

import {CheckIcon} from 'Components/icon';
import {useApplicationContext} from 'src/script/page/RootProvider';

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

const CHANNEL_CAPACITY = 2000;
const GROUP_CAPACITY = 500;

export const ConversationFeature = ({conversationType}: ConversationFeatureProps) => {
  const {translate} = useApplicationContext();
  const generalFeatures = [
    translate('conversationCommonFeature1', {
      capacity: conversationType === ConversationType.Channel ? CHANNEL_CAPACITY : GROUP_CAPACITY,
    }),
    translate('conversationCommonFeature2'),
    translate('conversationCommonFeature3'),
  ];
  const channelFeatures = [translate('channelConversationFeature1'), translate('channelConversationFeature2')];

  const features =
    conversationType === ConversationType.Channel
      ? generalFeatures.toSpliced(1, 0, ...channelFeatures)
      : generalFeatures;

  return (
    <div css={conversationFeatureContainerCss}>
      {features.map((feature, index) => (
        <div css={conversationFeatureCss} key={feature}>
          {index < features.length - 1 ? (
            <CheckIcon css={conversationFeatureIconCss} />
          ) : (
            <ShieldIcon css={conversationFeatureVerifiedIconCss} />
          )}

          <span
            dangerouslySetInnerHTML={{
              __html: feature,
            }}
            className="subline"
            data-uie-name="team-creation-intro-list-item"
          />
        </div>
      ))}
    </div>
  );
};
