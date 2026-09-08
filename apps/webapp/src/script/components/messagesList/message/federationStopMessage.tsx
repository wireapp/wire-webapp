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

import {isNonEmptyArray} from '@sindresorhus/is';

import {Link, LinkVariant} from '@wireapp/react-ui-kit';

import * as Icon from 'Components/icon';
import {FederationStopMessage as FederationStopMessageEntity} from 'Repositories/entity/message/federationStopMessage';
import {Config} from 'src/script/Config';
import {reactTranslationRenderingFeatureToggleName} from 'src/script/featureToggles/startupFeatureToggleNames';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {useKoSubscribableChildren} from 'Util/componentUtil';
import {createReactTranslationMarker, renderReactTranslation} from 'Util/localizerUtil/reactLocalizerUtil';
import type {ReactTranslationValueReplacement} from 'Util/localizerUtil/reactLocalizerUtil';
import type {Translate} from 'Util/localizerUtil/translationTypes';

import {MessageTime} from './messageTime';
import {useMessageFocusedTabIndex} from './util';

interface FederationStopMessageProps {
  message: FederationStopMessageEntity;
  isMessageFocused: boolean;
}

type RenderFederationStopMessageOptions = {
  readonly domains: string[];
  readonly isReactTranslationRenderingEnabled: boolean;
  readonly translate: Translate;
};

const config = Config.getConfig();
const backendUrlMarker = createReactTranslationMarker('federation-stop-backend-url');
const backendUrlOneMarker = createReactTranslationMarker('federation-stop-backend-url-one');
const backendUrlTwoMarker = createReactTranslationMarker('federation-stop-backend-url-two');

function renderFederationStopMessage(options: RenderFederationStopMessageOptions): ReactNode {
  const {domains, isReactTranslationRenderingEnabled, translate} = options;

  if (isReactTranslationRenderingEnabled === true) {
    if (isNonEmptyArray(domains) === false) {
      return <span />;
    }

    let translatedText: string;
    let valueReplacements: ReactTranslationValueReplacement[];
    if (domains.length === 1) {
      translatedText = translate('federationDelete', {backendUrl: backendUrlMarker.substitution});
      valueReplacements = [{marker: backendUrlMarker, runtimeText: domains[0]}];
    } else {
      translatedText = translate('federationConnectionRemove', {
        backendUrlOne: backendUrlOneMarker.substitution,
        backendUrlTwo: backendUrlTwoMarker.substitution,
      });
      valueReplacements = [
        {marker: backendUrlOneMarker, runtimeText: domains[0]},
        {marker: backendUrlTwoMarker, runtimeText: domains[1]},
      ];
    }

    return (
      <span>
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
  }

  let legacyTranslation: string;
  if (domains.length === 1) {
    legacyTranslation = translate('federationDelete', {backendUrl: domains[0]});
  } else {
    legacyTranslation = translate('federationConnectionRemove', {backendUrlOne: domains[0], backendUrlTwo: domains[1]});
  }

  return (
    <span
      dangerouslySetInnerHTML={{
        __html: legacyTranslation,
      }}
    />
  );
}

const FederationStopMessage: FunctionComponent<FederationStopMessageProps> = ({message, isMessageFocused}) => {
  const {isFeatureToggleEnabled, translate} = useApplicationContext();
  const {timestamp} = useKoSubscribableChildren(message, ['timestamp']);
  const {id, domains} = message;
  const messageFocusedTabIndex = useMessageFocusedTabIndex(isMessageFocused);
  const isReactTranslationRenderingEnabled = isFeatureToggleEnabled(reactTranslationRenderingFeatureToggleName);
  const federationStopMessage = renderFederationStopMessage({
    domains,
    isReactTranslationRenderingEnabled,
    translate,
  });

  return (
    <div className="message-header">
      <div className="message-header-icon message-header-icon--svg">
        <div>
          <Icon.InfoIcon />
        </div>
      </div>
      <div
        className="message-header-label"
        data-uie-name="element-message-failed-to-add-users"
        data-uie-value={`domains-${domains.join('_')}`}
      >
        {federationStopMessage}
        <Link
          css={{fontSize: 'var(--font-size-small)', marginLeft: 2}}
          tabIndex={messageFocusedTabIndex}
          targetBlank
          variant={LinkVariant.PRIMARY}
          href={config.URL.SUPPORT.FEDERATION_STOP}
          data-uie-name="go-stop-federation"
        >
          {translate('offlineBackendLearnMore')}
        </Link>
      </div>
      <p className="message-body-actions">
        <MessageTime
          timestamp={timestamp}
          data-uie-uid={id}
          data-uie-name="item-message-failed-to-add-users-timestamp"
        />
      </p>
    </div>
  );
};

export {FederationStopMessage};
