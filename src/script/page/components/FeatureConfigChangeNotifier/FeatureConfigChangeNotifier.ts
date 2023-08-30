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

import {useEffect, useRef} from 'react';

import {
  FeatureList,
  FeatureWithoutConfig,
  Feature,
  FEATURE_KEY,
  FeatureStatus,
  SelfDeletingTimeout,
} from '@wireapp/api-client/lib/team/feature/';

import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {StringIdentifer, replaceLink, t} from 'Util/LocalizerUtil';
import {getLogger} from 'Util/Logger';
import {formatDuration} from 'Util/TimeUtil';

import {loadFeatureConfig, saveFeatureConfig} from './FeatureConfigChangeNotifier.store';

import {Config} from '../../../Config';
import {TeamState} from '../../../team/TeamState';

const featureNotifications: Partial<
  Record<
    FEATURE_KEY,
    (
      oldConfig?: Feature<any> | FeatureWithoutConfig,
      newConfig?: Feature<any> | FeatureWithoutConfig,
    ) => undefined | {htmlMessage: string; title: StringIdentifer}
  >
> = {
  [FEATURE_KEY.FILE_SHARING]: (oldConfig, newConfig) => {
    const status = wasTurnedOnOrOff(oldConfig, newConfig);
    if (!status) {
      return undefined;
    }
    return {
      htmlMessage:
        status === FeatureStatus.ENABLED
          ? t('featureConfigChangeModalFileSharingDescriptionItemFileSharingEnabled')
          : t('featureConfigChangeModalFileSharingDescriptionItemFileSharingDisabled'),
      title: 'featureConfigChangeModalFileSharingHeadline',
    };
  },
  [FEATURE_KEY.VIDEO_CALLING]: (oldConfig, newConfig) => {
    const status = wasTurnedOnOrOff(oldConfig, newConfig);
    if (!status) {
      return undefined;
    }
    return {
      htmlMessage:
        status === FeatureStatus.ENABLED
          ? t('featureConfigChangeModalAudioVideoDescriptionItemCameraEnabled')
          : t('featureConfigChangeModalAudioVideoDescriptionItemCameraDisabled'),
      title: 'featureConfigChangeModalAudioVideoHeadline',
    };
  },
  [FEATURE_KEY.SELF_DELETING_MESSAGES]: (oldConfig, newConfig) => {
    if (!oldConfig || !('config' in oldConfig) || !newConfig || !('config' in newConfig)) {
      return undefined;
    }
    const previousTimeout = oldConfig?.config?.enforcedTimeoutSeconds * 1000;
    const newTimeout = (newConfig?.config?.enforcedTimeoutSeconds ?? 0) * 1000;
    const previousStatus = oldConfig?.status;
    const newStatus = newConfig?.status;

    const hasTimeoutChanged = previousTimeout !== newTimeout;
    const isEnforced = newTimeout > SelfDeletingTimeout.OFF;
    const hasStatusChanged = previousStatus !== newStatus;
    const hasFeatureChanged = hasStatusChanged || hasTimeoutChanged;
    const isFeatureEnabled = newStatus === FeatureStatus.ENABLED;

    if (!hasFeatureChanged) {
      return undefined;
    }
    return {
      htmlMessage: isFeatureEnabled
        ? isEnforced
          ? t('featureConfigChangeModalSelfDeletingMessagesDescriptionItemEnforced', {
              timeout: formatDuration(newTimeout).text,
            })
          : t('featureConfigChangeModalSelfDeletingMessagesDescriptionItemEnabled')
        : t('featureConfigChangeModalSelfDeletingMessagesDescriptionItemDisabled'),
      title: 'featureConfigChangeModalSelfDeletingMessagesHeadline',
    };
  },
  [FEATURE_KEY.CONFERENCE_CALLING]: (oldConfig, newConfig) => {
    const status = wasTurnedOnOrOff(oldConfig, newConfig);
    if (!status || status === FeatureStatus.DISABLED) {
      return undefined;
    }
    const replaceEnterprise = replaceLink(
      Config.getConfig().URL.PRICING,
      'modal__text__read-more',
      'read-more-pricing',
    );

    return {
      htmlMessage: t(
        'featureConfigChangeModalConferenceCallingEnabled',
        {brandName: Config.getConfig().BRAND_NAME},
        replaceEnterprise,
      ),
      title: 'featureConfigChangeModalConferenceCallingTitle',
    };
  },
  [FEATURE_KEY.CONVERSATION_GUEST_LINKS]: (oldConfig, newConfig) => {
    const status = wasTurnedOnOrOff(oldConfig, newConfig);
    if (!status) {
      return undefined;
    }
    return {
      htmlMessage:
        status === FeatureStatus.ENABLED
          ? t('featureConfigChangeModalConversationGuestLinksDescriptionItemConversationGuestLinksEnabled')
          : t('featureConfigChangeModalConversationGuestLinksDescriptionItemConversationGuestLinksDisabled'),
      title: 'featureConfigChangeModalConversationGuestLinksHeadline',
    };
  },
};

function wasTurnedOnOrOff(oldConfig?: FeatureWithoutConfig, newConfig?: FeatureWithoutConfig): boolean | FeatureStatus {
  if (oldConfig?.status && newConfig?.status && oldConfig.status !== newConfig.status) {
    return newConfig.status;
  }
  return false;
}

const logger = getLogger('FeatureConfigChangeNotifier');
type Props = {
  teamState: TeamState;
  selfUserId: string;
};

export function FeatureConfigChangeNotifier({teamState, selfUserId}: Props): null {
  const {teamFeatures: config} = useKoSubscribableChildren(teamState, ['teamFeatures']);
  const previousConfig = useRef<FeatureList | undefined>(loadFeatureConfig(selfUserId));

  useEffect(() => {
    const previous = previousConfig.current;
    if (config) {
      previousConfig.current = config;
      saveFeatureConfig(selfUserId, config);
    }

    if (previous && config) {
      Object.entries(featureNotifications).forEach(([feature, getMessage]) => {
        const featureKey = feature as FEATURE_KEY;
        const message = getMessage(previous?.[featureKey], config[featureKey]);
        if (!message) {
          return;
        }
        logger.info(
          `Detected feature config change for "${feature}" from "${JSON.stringify(
            previous?.[featureKey],
          )}" to "${JSON.stringify(config[featureKey])}"`,
        );
        PrimaryModal.show(PrimaryModal.type.ACKNOWLEDGE, {
          text: {
            htmlMessage: message.htmlMessage,
            title: t(message.title, {
              brandName: Config.getConfig().BRAND_NAME,
            }),
          },
        });
      });
    }
  }, [config, selfUserId]);

  return null;
}
