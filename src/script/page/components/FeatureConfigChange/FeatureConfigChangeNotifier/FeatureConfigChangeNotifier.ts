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
  FEATURE_KEY,
  FeatureStatus,
  SelfDeletingTimeout,
} from '@wireapp/api-client/lib/team/feature/';
import {amplify} from 'amplify';

import {Runtime} from '@wireapp/commons';
import {WebAppEvents} from '@wireapp/webapp-events';

import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {ButtonAction} from 'Components/Modals/PrimaryModal/PrimaryModalTypes';
import {TeamState} from 'Repositories/team/TeamState';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {replaceLink, t} from 'Util/LocalizerUtil';
import {getLogger} from 'Util/Logger';
import {formatDuration} from 'Util/TimeUtil';

import {loadFeatureConfig, saveFeatureConfig} from './FeatureConfigChangeNotifier.store';

import {Config} from '../../../../Config';

type Features =
  | 'FileSharing'
  | 'AudioVideo'
  | 'Applock'
  | 'DownloadPath'
  | 'SelfDeletingMessages'
  | 'ConferenceCalling'
  | 'ConversationGuestLinks';

type Title = `featureConfigChangeModal${Features}Headline`;

type FeatureMessageGenerator = {
  [K in keyof FeatureList]: (
    oldConfig?: FeatureList[K],
    newConfig?: FeatureList[K],
  ) =>
    | undefined
    | {
        htmlMessage: string;
        title: Title;
        primaryAction?: ButtonAction;
      };
};

const featureNotifications: FeatureMessageGenerator = {
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

  [FEATURE_KEY.APPLOCK]: (oldConfig, newConfig) => {
    const shouldWarn = oldConfig?.config.enforceAppLock === true && newConfig?.config.enforceAppLock === false;
    if (!shouldWarn) {
      return undefined;
    }
    return {
      htmlMessage: t('featureConfigChangeModalApplock'),
      title: 'featureConfigChangeModalApplockHeadline',
    };
  },

  [FEATURE_KEY.ENFORCE_DOWNLOAD_PATH]: (oldConfig, newConfig) => {
    const handleDlPathChange: (
      status: FeatureStatus | boolean,
    ) => undefined | {htmlMessage: string; title: Title; primaryAction?: ButtonAction} = status => {
      if (newConfig && 'config' in newConfig) {
        localStorage.setItem('enforcedDownloadLocation', newConfig.config.enforcedDownloadLocation);
        amplify.publish(
          WebAppEvents.TEAM.DOWNLOAD_PATH_UPDATE,
          newConfig.status === FeatureStatus.ENABLED ? newConfig.config.enforcedDownloadLocation : undefined,
        );
      }

      return {
        htmlMessage:
          status === FeatureStatus.ENABLED
            ? t('featureConfigChangeModalDownloadPathEnabled')
            : status === FeatureStatus.DISABLED
              ? t('featureConfigChangeModalDownloadPathDisabled')
              : t('featureConfigChangeModalDownloadPathChanged'),
        title: 'featureConfigChangeModalDownloadPathHeadline',
        primaryAction: {
          action: () => {
            if (Runtime.isDesktopApp() && status !== FeatureStatus.DISABLED) {
              amplify.publish(WebAppEvents.LIFECYCLE.RESTART);
            }
          },
        },
      };
    };

    if (!oldConfig && newConfig?.status === FeatureStatus.ENABLED && 'config' in newConfig) {
      return handleDlPathChange(FeatureStatus.ENABLED);
    }

    if (
      newConfig &&
      'config' in newConfig &&
      oldConfig &&
      'config' in oldConfig &&
      Runtime.isDesktopApp() &&
      Runtime.isWindows()
    ) {
      const status = wasTurnedOnOrOff(oldConfig, newConfig);
      const configStatus = newConfig?.config?.enforcedDownloadLocation !== oldConfig?.config?.enforcedDownloadLocation;
      if (!status && !configStatus) {
        return undefined;
      }
      localStorage.setItem('enforcedDownloadLocation', newConfig.config.enforcedDownloadLocation);
      return handleDlPathChange(status);
    }
    return undefined;
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
      title: 'featureConfigChangeModalConferenceCallingHeadline',
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
} as const;

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
        const message = getMessage(previous?.[featureKey] as any, config[featureKey] as any);
        const isEnforceDownloadPath = featureKey === FEATURE_KEY.ENFORCE_DOWNLOAD_PATH;

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
          primaryAction: message.primaryAction,
          hideCloseBtn: isEnforceDownloadPath,
          preventClose: isEnforceDownloadPath,
          close: isEnforceDownloadPath
            ? () => {
                if (Runtime.isDesktopApp() && config[featureKey]?.status !== FeatureStatus.DISABLED) {
                  amplify.publish(WebAppEvents.LIFECYCLE.RESTART);
                }
              }
            : undefined,
        });
      });
    }
  }, [config, selfUserId]);

  return null;
}
