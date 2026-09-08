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

import type {FunctionComponent, ReactNode} from 'react';

import {isNonEmptyString} from '@sindresorhus/is';

import {Button, ButtonVariant, Link, LinkVariant} from '@wireapp/react-ui-kit';

import {useMessageFocusedTabIndex} from 'Components/messagesList/message/util';
import {Config} from 'src/script/Config';
import {reactTranslationRenderingFeatureToggleName} from 'src/script/featureToggles/startupFeatureToggleNames';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {createReactTranslationMarker, renderReactTranslation} from 'Util/localizerUtil/reactLocalizerUtil';
import type {ReactTranslationValueReplacement} from 'Util/localizerUtil/reactLocalizerUtil';
import type {Translate} from 'Util/localizerUtil/translationTypes';

import {backendErrorLink, button, warning, wrapper} from '../warnings.styles';

type Props = {
  isMessageFocused: boolean;
  onRetry: () => void;
  unreachableDomain?: string;
};

type RenderCompleteFailureToSendWarningOptions = {
  readonly isReactTranslationRenderingEnabled: boolean;
  readonly messageFocusedTabIndex: number;
  readonly translate: Translate;
  readonly unreachableDomain?: string;
};

const config = Config.getConfig();
const unreachableDomainMarker = createReactTranslationMarker('complete-failure-to-send-domain');

function renderCompleteFailureToSendWarning(options: RenderCompleteFailureToSendWarningOptions): ReactNode {
  const {isReactTranslationRenderingEnabled, messageFocusedTabIndex, translate, unreachableDomain} = options;

  if (isNonEmptyString(unreachableDomain) === false) {
    return <p css={warning}>{translate('messageCouldNotBeSentConnectivityIssues')}</p>;
  }

  let warningContent: ReactNode;
  if (isReactTranslationRenderingEnabled) {
    const translatedText = translate('messageCouldNotBeSentBackEndOffline', {
      domain: unreachableDomainMarker.substitution,
    });
    const valueReplacements: ReactTranslationValueReplacement[] = [
      {marker: unreachableDomainMarker, runtimeText: unreachableDomain},
    ];

    warningContent = (
      <span css={warning}>
        {renderReactTranslation({
          translatedText,
          componentReplacements: [
            {
              start: '<strong>',
              end: '</strong>',
              render(children) {
                return <strong>{children}</strong>;
              },
            },
          ],
          valueReplacements,
        })}
      </span>
    );
  } else {
    warningContent = (
      <span
        css={warning}
        dangerouslySetInnerHTML={{
          __html: translate('messageCouldNotBeSentBackEndOffline', {domain: unreachableDomain}),
        }}
      />
    );
  }

  return (
    <p>
      {warningContent}{' '}
      <Link
        tabIndex={messageFocusedTabIndex}
        targetBlank
        variant={LinkVariant.PRIMARY}
        href={config.URL.SUPPORT.OFFLINE_BACKEND}
        data-uie-name="go-offline-backend"
        css={backendErrorLink}
      >
        {translate('offlineBackendLearnMore')}
      </Link>
    </p>
  );
}

export const CompleteFailureToSendWarning: FunctionComponent<Props> = ({
  isMessageFocused,
  onRetry,
  unreachableDomain,
}) => {
  const {isFeatureToggleEnabled, translate} = useApplicationContext();
  const messageFocusedTabIndex = useMessageFocusedTabIndex(isMessageFocused);
  const isReactTranslationRenderingEnabled = isFeatureToggleEnabled(reactTranslationRenderingFeatureToggleName);

  return (
    <div css={wrapper}>
      {renderCompleteFailureToSendWarning({
        isReactTranslationRenderingEnabled,
        messageFocusedTabIndex,
        translate,
        unreachableDomain,
      })}
      <div css={{display: 'flex'}}>
        <Button
          css={button}
          tabIndex={messageFocusedTabIndex}
          type="button"
          variant={ButtonVariant.TERTIARY}
          onClick={onRetry}
        >
          {translate('messageCouldNotBeSentRetry')}
        </Button>
      </div>
    </div>
  );
};
