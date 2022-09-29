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

import {StyledApp, THEME_ID} from '@wireapp/react-ui-kit';
import React from 'react';
import {CSSTransition, SwitchTransition} from 'react-transition-group';
import {container} from 'tsyringe';

import Icon from 'Components/Icon';

import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';

import AboutPreferences from './panels/preferences/AboutPreferences';
import Collection from './panels/Collection';
import AccountPreferences from './panels/preferences/AccountPreferences';
import DevicesPreferences from './panels/preferences/devices/DevicesPreferences';
import OptionPreferences from './panels/preferences/OptionPreferences';
import AVPreferences from './panels/preferences/AVPreferences';

import {ClientState} from '../../client/ClientState';
import {ConversationState} from '../../conversation/ConversationState';
import {UserState} from '../../user/UserState';
import {ContentViewModel, ContentState} from '../../view_model/ContentViewModel';

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
  const {isFederated} = contentViewModel;

  const statesToRender = [
    ContentState.COLLECTION,
    ContentState.PREFERENCES_ABOUT,
    ContentState.PREFERENCES_ACCOUNT,
    ContentState.PREFERENCES_AV,
    ContentState.PREFERENCES_DEVICES,
    ContentState.PREFERENCES_OPTIONS,
    ContentState.WATERMARK,
  ];

  const stateTitles: Partial<Record<ContentState, string>> = {
    [ContentState.COLLECTION]: t('accessibility.headings.collection'),
    [ContentState.PREFERENCES_ABOUT]: t('accessibility.headings.preferencesAbout'),
    [ContentState.PREFERENCES_ACCOUNT]: t('accessibility.headings.preferencesAccount'),
    [ContentState.PREFERENCES_AV]: t('accessibility.headings.preferencesAV'),
    [ContentState.PREFERENCES_DEVICES]: t('accessibility.headings.preferencesDevices'),
    [ContentState.PREFERENCES_OPTIONS]: t('accessibility.headings.preferencesOptions'),
    [ContentState.WATERMARK]: t('accessibility.headings.noConversation'),
  };

  const title = stateTitles?.[state];

  if (!statesToRender.includes(state)) {
    return null;
  }

  return (
    <>
      {title && <h1 className="visually-hidden">{title}</h1>}

      <StyledApp themeId={THEME_ID.DEFAULT} css={{backgroundColor: 'unset', height: '100%'}}>
        <SwitchTransition>
          <Animated key={state}>
            <>
              {state === ContentState.COLLECTION && activeConversation && (
                <Collection
                  conversation={activeConversation}
                  conversationRepository={repositories.conversation}
                  assetRepository={repositories.asset}
                  messageRepository={repositories.message}
                />
              )}

              {state === ContentState.PREFERENCES_ABOUT && (
                <div id="preferences-about" className="preferences-page preferences-about">
                  <AboutPreferences />
                </div>
              )}

              {state === ContentState.PREFERENCES_ACCOUNT && (
                <div id="preferences-account" className="preferences-page preferences-account">
                  <AccountPreferences
                    showDomain={isFederated}
                    backupRepository={repositories.backup}
                    clientRepository={repositories.client}
                    conversationRepository={repositories.conversation}
                    propertiesRepository={repositories.properties}
                    userRepository={repositories.user}
                  />
                </div>
              )}

              {state === ContentState.PREFERENCES_AV && (
                <div id="preferences-av" className="preferences-page preferences-av">
                  <AVPreferences
                    callingRepository={repositories.calling}
                    mediaRepository={repositories.media}
                    propertiesRepository={repositories.properties}
                  />
                </div>
              )}

              {state === ContentState.PREFERENCES_DEVICES && (
                <DevicesPreferences
                  clientState={container.resolve(ClientState)}
                  conversationState={conversationState}
                  cryptographyRepository={repositories.cryptography}
                  removeDevice={contentViewModel.mainViewModel.actions.deleteClient}
                  resetSession={(userId, device, conversation) =>
                    repositories.message.resetSession(userId, device.id, conversation)
                  }
                  userState={container.resolve(UserState)}
                  verifyDevice={(userId, device, verified) =>
                    repositories.client.verifyClient(userId, device, verified)
                  }
                />
              )}

              {state === ContentState.PREFERENCES_OPTIONS && (
                <div id="preferences-options" className="preferences-page preferences-options">
                  <OptionPreferences propertiesRepository={repositories.properties} />
                </div>
              )}

              {state === ContentState.WATERMARK && (
                <div className="watermark">
                  <span className="absolute-center" aria-hidden="true" data-uie-name="no-conversation">
                    <Icon.Watermark />
                  </span>
                </div>
              )}
            </>
          </Animated>
        </SwitchTransition>
      </StyledApp>
    </>
  );
};

export default MainContent;
