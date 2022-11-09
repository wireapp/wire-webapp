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

import {FC, ReactNode, useState} from 'react';

import cx from 'classnames';
import {CSSTransition, SwitchTransition} from 'react-transition-group';
import {container} from 'tsyringe';

import {ConnectRequests} from 'Components/ConnectRequests';
import {ConversationList} from 'Components/Conversation';
import {HistoryExport} from 'Components/HistoryExport';
import {HistoryImport} from 'Components/HistoryImport';
import {Icon} from 'Components/Icon';
import {t} from 'Util/LocalizerUtil';
import {incomingCssClass, removeAnimationsClass} from 'Util/util';

import {Collection} from './panels/Collection';
import {AboutPreferences} from './panels/preferences/AboutPreferences';
import {AccountPreferences} from './panels/preferences/AccountPreferences';
import {AVPreferences} from './panels/preferences/AVPreferences';
import {DevicesPreferences} from './panels/preferences/devices/DevicesPreferences';
import {OptionPreferences} from './panels/preferences/OptionPreferences';

import {ClientEntity} from '../../client/ClientEntity';
import {ClientState} from '../../client/ClientState';
import {ConversationState} from '../../conversation/ConversationState';
import {Conversation} from '../../entity/Conversation';
import {Message} from '../../entity/message/Message';
import {TeamState} from '../../team/TeamState';
import {UserState} from '../../user/UserState';
import {ActionsViewModel} from '../../view_model/ActionsViewModel';
import {CallingViewModel} from '../../view_model/CallingViewModel';
import {ViewModelRepositories} from '../../view_model/MainViewModel';
import {RightSidebarParams, ShowConversationOptions} from '../AppMain';
import {PanelState} from '../RightSidebar';
import {ContentState, useAppState} from '../useAppState';

const Animated: FC<{children: ReactNode}> = ({children, ...rest}) => (
  <CSSTransition classNames="slide-in-left" timeout={{enter: 500}} {...rest}>
    {children}
  </CSSTransition>
);

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

interface MainContentProps {
  activeConversation: Conversation;
  actionsView: ActionsViewModel;
  callingView: CallingViewModel;
  openRightSidebar: (panelState: PanelState, params: RightSidebarParams, compareEntityId?: boolean) => void;
  switchPreviousContent: () => void;
  showConversation: (
    conversation: Conversation | string,
    options?: ShowConversationOptions,
    domain?: string | null,
  ) => void;
  repositories: ViewModelRepositories;
  switchContent: (contentState: ContentState) => void;
  isFederated: boolean;
  removeDevice: (clientEntity: ClientEntity) => Promise<ClientEntity[]> | Promise<void>;
  initialMessage?: Message;
  isRightSidebarOpen?: boolean;
  conversationState?: ConversationState;
}

const MainContent: FC<MainContentProps> = ({
  activeConversation,
  actionsView,
  callingView,
  openRightSidebar,
  switchPreviousContent,
  showConversation,
  repositories,
  switchContent,
  isFederated,
  removeDevice,
  initialMessage,
  isRightSidebarOpen = false,
  conversationState = container.resolve(ConversationState),
}) => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const {contentState} = useAppState();

  const teamState = container.resolve(TeamState);
  const userState = container.resolve(UserState);

  const title = statesTitle[contentState];

  const onFileUpload = (file: File) => {
    switchContent(ContentState.HISTORY_IMPORT);
    setUploadedFile(file);
  };

  return (
    <div id="center-column" className="center-column">
      <h1 className="visually-hidden">{title}</h1>

      <SwitchTransition>
        <Animated key={contentState}>
          <>
            {contentState === ContentState.COLLECTION && activeConversation && (
              <Collection
                assetRepository={repositories.asset}
                conversation={activeConversation}
                conversationRepository={repositories.conversation}
                messageRepository={repositories.message}
                showConversation={showConversation}
              />
            )}

            {contentState === ContentState.PREFERENCES_ABOUT && (
              <div
                id="preferences-about"
                className={cx('preferences-page preferences-about', incomingCssClass)}
                ref={removeAnimationsClass}
              >
                <AboutPreferences switchPreviousContent={switchPreviousContent} />
              </div>
            )}

            {contentState === ContentState.PREFERENCES_ACCOUNT && (
              <div
                id="preferences-account"
                className={cx('preferences-page preferences-account', incomingCssClass)}
                ref={removeAnimationsClass}
              >
                <AccountPreferences
                  switchPreviousContent={switchPreviousContent}
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

            {contentState === ContentState.PREFERENCES_AV && (
              <div
                id="preferences-av"
                className={cx('preferences-page preferences-av', incomingCssClass)}
                ref={removeAnimationsClass}
              >
                <AVPreferences
                  callingRepository={repositories.calling}
                  mediaRepository={repositories.media}
                  propertiesRepository={repositories.properties}
                  switchPreviousContent={switchPreviousContent}
                />
              </div>
            )}

            {contentState === ContentState.PREFERENCES_DEVICES && (
              <div
                id="preferences-devices"
                className={cx('preferences-page preferences-devices', incomingCssClass)}
                ref={removeAnimationsClass}
              >
                <DevicesPreferences
                  clientState={container.resolve(ClientState)}
                  conversationState={conversationState}
                  cryptographyRepository={repositories.cryptography}
                  removeDevice={removeDevice}
                  resetSession={(userId, device, conversation) =>
                    repositories.message.resetSession(userId, device.id, conversation)
                  }
                  switchPreviousContent={switchPreviousContent}
                  userState={container.resolve(UserState)}
                  verifyDevice={(userId, device, verified) =>
                    repositories.client.verifyClient(userId, device, verified)
                  }
                />
              </div>
            )}

            {contentState === ContentState.PREFERENCES_OPTIONS && (
              <div
                id="preferences-options"
                className={cx('preferences-page preferences-options', incomingCssClass)}
                ref={removeAnimationsClass}
              >
                <OptionPreferences
                  propertiesRepository={repositories.properties}
                  switchPreviousContent={switchPreviousContent}
                />
              </div>
            )}

            {contentState === ContentState.WATERMARK && (
              <div className="watermark">
                <span className="absolute-center" aria-hidden="true" data-uie-name="no-conversation">
                  <Icon.Watermark />
                </span>
              </div>
            )}

            {contentState === ContentState.CONNECTION_REQUESTS && (
              <ConnectRequests actionsView={actionsView} teamState={teamState} userState={userState} />
            )}

            {contentState === ContentState.CONVERSATION && activeConversation && (
              <ConversationList
                activeConversation={activeConversation}
                actionsView={actionsView}
                callingView={callingView}
                initialMessage={initialMessage}
                teamState={teamState}
                userState={userState}
                isRightSidebarOpen={isRightSidebarOpen}
                openRightSidebar={openRightSidebar}
                repositories={repositories}
              />
            )}

            {contentState === ContentState.HISTORY_EXPORT && (
              <HistoryExport
                backupRepository={repositories.backup}
                userState={userState}
                switchContent={switchContent}
              />
            )}

            {contentState === ContentState.HISTORY_IMPORT && uploadedFile && (
              <HistoryImport file={uploadedFile} backupRepository={repositories.backup} switchContent={switchContent} />
            )}
          </>
        </Animated>
      </SwitchTransition>
      <div className="center-column__overlay" />
    </div>
  );
};

export {MainContent};
