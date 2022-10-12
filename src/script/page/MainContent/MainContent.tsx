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

import {FC, ReactNode, useContext, useState} from 'react';

import {CSSTransition, SwitchTransition} from 'react-transition-group';
import {container} from 'tsyringe';

import {ConnectRequests} from 'Components/ConnectRequests';
import {ConversationList} from 'Components/Conversation';
import {HistoryExport} from 'Components/HistoryExport';
import {HistoryImport} from 'Components/HistoryImport';
import Icon from 'Components/Icon';
import {GroupCreationModal} from 'Components/Modals/GroupCreation/GroupCreationModal';
import {LegalHoldModal} from 'Components/Modals/LegalHoldModal/LegalHoldModal';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';

import {Collection} from './panels/Collection';
import {AboutPreferences} from './panels/preferences/AboutPreferences';
import {AccountPreferences} from './panels/preferences/AccountPreferences';
import {AVPreferences} from './panels/preferences/AVPreferences';
import {DevicesPreferences} from './panels/preferences/devices/DevicesPreferences';
import {OptionPreferences} from './panels/preferences/OptionPreferences';

import {ClientState} from '../../client/ClientState';
import {ConversationState} from '../../conversation/ConversationState';
import {TeamState} from '../../team/TeamState';
import {UserState} from '../../user/UserState';
import {ContentState} from '../../view_model/ContentViewModel';
import {RightSidebarParams} from '../AppMain';
import {PanelState} from '../RightSidebar/RightSidebar';
import {RootContext} from '../RootProvider';

const Animated: FC<{children: ReactNode}> = ({children, ...rest}) => {
  return (
    <CSSTransition classNames="slide-in-left" timeout={{enter: 500}} {...rest}>
      {children}
    </CSSTransition>
  );
};

interface MainContentProps {
  openRightSidebar: (panelState: PanelState, params: RightSidebarParams) => void;
  isRightSidebarOpen?: boolean;
  conversationState?: ConversationState;
}

const MainContent: FC<MainContentProps> = ({
  openRightSidebar,
  isRightSidebarOpen = false,
  conversationState = container.resolve(ConversationState),
}) => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const mainViewModel = useContext(RootContext);

  if (!mainViewModel) {
    return null;
  }
  const {content: contentViewModel} = mainViewModel;
  const {initialMessage, isFederated, repositories, switchContent} = contentViewModel;

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const {state} = useKoSubscribableChildren(contentViewModel, ['state']);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const {activeConversation} = useKoSubscribableChildren(conversationState, ['activeConversation']);

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
    <div id="center-column" className="center-column">
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
                verifyDevice={(userId, device, verified) => repositories.client.verifyClient(userId, device, verified)}
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
              <ConversationList
                initialMessage={initialMessage}
                teamState={teamState}
                userState={userState}
                isRightSidebarOpen={isRightSidebarOpen}
                openRightSidebar={openRightSidebar}
              />
            )}

            {state === ContentState.HISTORY_EXPORT && (
              <HistoryExport userState={userState} switchContent={switchContent} />
            )}

            {state === ContentState.HISTORY_IMPORT && uploadedFile && (
              <HistoryImport file={uploadedFile} backupRepository={repositories.backup} switchContent={switchContent} />
            )}
          </>
        </Animated>
      </SwitchTransition>

      <GroupCreationModal userState={userState} teamState={teamState} />

      <div className="center-column__overlay" />

      <LegalHoldModal
        userState={userState}
        conversationRepository={repositories.conversation}
        searchRepository={repositories.search}
        teamRepository={repositories.team}
        clientRepository={repositories.client}
        messageRepository={repositories.message}
        cryptographyRepository={repositories.cryptography}
      />
    </div>
  );
};

export {MainContent};
