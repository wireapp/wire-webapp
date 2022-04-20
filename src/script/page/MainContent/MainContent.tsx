/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import React from 'react';
import {CSSTransition, SwitchTransition} from 'react-transition-group';
import {registerStaticReactComponent, useKoSubscribableChildren} from 'Util/ComponentUtil';

import {ContentViewModel, ContentState} from '../../view_model/ContentViewModel';
import {t} from 'Util/LocalizerUtil';
import Icon from 'Components/Icon';
import AboutPreferences from './panels/preferences/AboutPreferences';
import Collection from './panels/Collection';
import AccountPreferences from './panels/preferences/AccountPreferences';
import DevicesPreferences from './panels/preferences/devices/DevicesPreferences';
import OptionPreferences from './panels/preferences/OptionPreferences';
import {ConversationState} from '../../conversation/ConversationState';
import AVPreferences from './panels/preferences/AVPreferences';
import {container} from 'tsyringe';
import {ClientState} from '../../client/ClientState';
import {UserState} from '../../user/UserState';

type LeftSidebarProps = {
  contentViewModel: ContentViewModel;
  conversationState?: ConversationState;
};
const Animated: React.FC<{children: React.ReactNode}> = ({children, ...rest}) => {
  return (
    <CSSTransition classNames="slide-in-left" timeout={{enter: 500}} {...rest}>
      {children}
    </CSSTransition>
  );
};

const MainContent: React.FC<LeftSidebarProps> = ({
  contentViewModel,
  conversationState = container.resolve(ConversationState),
}) => {
  const {state} = useKoSubscribableChildren(contentViewModel, ['state']);
  const {activeConversation} = useKoSubscribableChildren(conversationState, ['activeConversation']);
  const repositories = contentViewModel.repositories;

  const isFederated = contentViewModel.isFederated;

  let title = '';
  let content = null;
  switch (state) {
    case ContentState.COLLECTION:
      title = t('accessibility.headings.collection');
      content = <Collection conversation={activeConversation} conversationRepository={repositories.conversation} />;
      break;

    case ContentState.PREFERENCES_ABOUT:
      title = t('accessibility.headings.preferencesAbout');
      content = (
        <div id="preferences-about" className="preferences-page preferences-about">
          <AboutPreferences />
        </div>
      );
      break;

    case ContentState.PREFERENCES_ACCOUNT:
      title = t('accessibility.headings.preferencesAccount');
      content = (
        <div id="preferences-account" className="preferences-page preferences-account">
          <AccountPreferences
            showDomain={isFederated}
            clientRepository={repositories.client}
            conversationRepository={repositories.conversation}
            propertiesRepository={repositories.properties}
            userRepository={repositories.user}
          />
        </div>
      );
      break;

    case ContentState.PREFERENCES_AV:
      title = t('accessibility.headings.preferencesAV');
      content = (
        <div id="preferences-av" className="preferences-page preferences-av">
          <AVPreferences
            callingRepository={repositories.calling}
            mediaRepository={repositories.media}
            propertiesRepository={repositories.properties}
          />
        </div>
      );
      break;

    case ContentState.PREFERENCES_DEVICES:
      title = t('accessibility.headings.preferencesDevices');
      content = (
        <DevicesPreferences
          clientState={container.resolve(ClientState)}
          conversationState={conversationState}
          cryptographyRepository={repositories.cryptography}
          removeDevice={contentViewModel.mainViewModel.actions.deleteClient}
          resetSession={(userId, device, conversation) =>
            repositories.message.resetSession(userId, device.id, conversation)
          }
          userState={container.resolve(UserState)}
          verifyDevice={(userId, device, verified) => repositories.client.verifyClient(userId, device, verified)}
        />
      );
      break;

    case ContentState.PREFERENCES_OPTIONS:
      title = t('accessibility.headings.preferencesOptions');
      content = (
        <div id="preferences-options" className="preferences-page preferences-options">
          <OptionPreferences propertiesRepository={repositories.properties} />
        </div>
      );
      break;

    case ContentState.WATERMARK:
      title = t('accessibility.headings.noConversation');
      content = (
        <div className="watermark">
          <span className="absolute-center" aria-hidden="true" data-uie-name="no-conversation">
            <Icon.Watermark />
          </span>
        </div>
      );
      break;
  }

  if (!content) {
    return null;
  }

  return (
    <>
      <h1 className="visually-hidden">{title}</h1>
      <SwitchTransition>
        <Animated key={state}>{content}</Animated>
      </SwitchTransition>
    </>
  );
};

export default MainContent;

registerStaticReactComponent('main-content', MainContent);
