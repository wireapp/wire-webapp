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
import {FC, ReactNode, useState} from 'react';
import {CSSTransition, SwitchTransition} from 'react-transition-group';
import {container} from 'tsyringe';

import HistoryExport from 'Components/HistoryExport';
import ConnectRequests from 'Components/ConnectRequests';
import ConversationList from 'Components/Conversation';
import GroupCreationModal from 'Components/Modals/GroupCreation/GroupCreationModal';

import {registerReactComponent, useKoSubscribableChildren} from 'Util/ComponentUtil';
import Icon from 'Components/Icon';
import {t} from 'Util/LocalizerUtil';

import RootProvider from '../RootProvider';

import Collection from './panels/Collection';
import AccountPreferences from './panels/preferences/AccountPreferences';
import AboutPreferences from './panels/preferences/AboutPreferences';
import AVPreferences from './panels/preferences/AVPreferences';
import DevicesPreferences from './panels/preferences/devices/DevicesPreferences';
import OptionPreferences from './panels/preferences/OptionPreferences';

import {ClientState} from '../../client/ClientState';
import {ConversationState} from '../../conversation/ConversationState';
import {UserState} from '../../user/UserState';
import {TeamState} from '../../team/TeamState';
import {ContentState, ContentViewModel} from '../../view_model/ContentViewModel';
import HistoryImport from 'Components/HistoryImport';

const Animated: FC<{children: ReactNode}> = ({children, ...rest}) => {
  return (
    <CSSTransition classNames="slide-in-left" timeout={{enter: 500}} {...rest}>
      {children}
    </CSSTransition>
  );
};

interface MainContentProps {
  contentViewModel: ContentViewModel;
  conversationState?: ConversationState;
}

const MainContent: FC<MainContentProps> = ({
  contentViewModel,
  conversationState = container.resolve(ConversationState),
}) => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const {state} = useKoSubscribableChildren(contentViewModel, ['state']);
  const {activeConversation} = useKoSubscribableChildren(conversationState, ['activeConversation']);

  const {initialMessage, isFederated, repositories, switchContent} = contentViewModel;

  const teamState = container.resolve(TeamState);
  const userState = container.resolve(UserState);

  const statesTitle: Partial<Record<ContentState, string>> = {
    [ContentState.CONNECTION_REQUESTS]: t('accessibility.headings.connectionRequests'),
    [ContentState.CONVERSATION]: t('accessibility.headings.conversation'),
    [ContentState.HISTORY_EXPORT]: t('accessibility.headings.historyExport'),
    [ContentState.HISTORY_IMPORT]: t('accessibility.headings.historyImport'),
    [ContentState.COLLECTION]: t('accessibility.headings.collection'),
    [ContentState.PREFERENCES_ABOUT]: t('accessibility.headings.preferencesAbout'),
    [ContentState.PREFERENCES_ACCOUNT]: t('accessibility.headings.preferencesAccount'),
    [ContentState.PREFERENCES_AV]: t('accessibility.headings.preferencesAV'),
    [ContentState.PREFERENCES_DEVICES]: t('accessibility.headings.preferencesDevices'),
    [ContentState.PREFERENCES_OPTIONS]: t('accessibility.headings.preferencesOptions'),
    [ContentState.WATERMARK]: t('accessibility.headings.noConversation'),
  };

  const title = statesTitle[state];

  const onFileUpload = (file: File) => {
    switchContent(ContentState.HISTORY_IMPORT);
    setUploadedFile(file);
  };

  return (
    <RootProvider value={contentViewModel}>
      <StyledApp themeId={THEME_ID.DEFAULT} css={{backgroundColor: 'unset', height: '100%'}}>
        <h1 className="visually-hidden">{title}</h1>

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
                    importFile={onFileUpload}
                    showDomain={isFederated}
                    switchContent={switchContent}
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

              {state === ContentState.CONNECTION_REQUESTS && (
                <ConnectRequests teamState={teamState} userState={userState} />
              )}

              {state === ContentState.CONVERSATION && (
                <ConversationList initialMessage={initialMessage} teamState={teamState} userState={userState} />
              )}

              {state === ContentState.HISTORY_EXPORT && (
                <HistoryExport userState={userState} switchContent={switchContent} />
              )}

              {state === ContentState.HISTORY_IMPORT && uploadedFile && (
                <HistoryImport
                  file={uploadedFile}
                  backupRepository={repositories.backup}
                  switchContent={switchContent}
                />
              )}
            </>
          </Animated>
        </SwitchTransition>

        <GroupCreationModal userState={userState} teamState={teamState} />

        <div className="center-column__overlay" />
      </StyledApp>
    </RootProvider>
  );
};

export default MainContent;

registerReactComponent('main-content', MainContent);
