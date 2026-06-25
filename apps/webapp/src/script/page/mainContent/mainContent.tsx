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

import {ReactNode, useEffect, useState} from 'react';

import cx from 'classnames';
import {CSSTransition, SwitchTransition} from 'react-transition-group';
import {container} from 'tsyringe';

import {CellsGlobalView} from 'Components/cellsGlobalView/cellsGlobalView';
import {ConnectRequests} from 'Components/connectRequests';
import {Conversation} from 'Components/conversation';
import {HistoryExport} from 'Components/historyExport';
import {HistoryImport} from 'Components/historyImport';
import * as Icon from 'Components/icon';
import {Meetings} from 'Components/meeting/meetings';
import {useLegalHoldModalState} from 'Components/modals/legalHoldModal/legalHoldModal.state';
import {ClientState} from 'Repositories/client/ClientState';
import {ConversationState} from 'Repositories/conversation/ConversationState';
import {User} from 'Repositories/entity/User';
import {MediaDeviceType} from 'Repositories/media/MediaDeviceType';
import {useMediaDevicesStore} from 'Repositories/media/useMediaDevicesStore';
import {TeamState} from 'Repositories/team/TeamState';
import {AppLockRepository} from 'Repositories/user/appLockRepository';
import {UserState} from 'Repositories/user/userState';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {useKoSubscribableChildren} from 'Util/componentUtil';
import {useMeetingsFeatureFlag} from 'Util/useMeetingsFeatureFlag';
import {incomingCssClass, removeAnimationsClass} from 'Util/util';

import {Collection} from './panels/collection';
import {AboutPreferences} from './panels/preferences/aboutPreferences';
import {AccountPreferences} from './panels/preferences/accountPreferences';
import {AVPreferences} from './panels/preferences/avPreferences';
import {DevicesPreferences} from './panels/preferences/devicesPreferences';
import {OptionPreferences} from './panels/preferences/optionPreferences';

import {RightSidebarParams} from '../appMain';
import {PanelState} from '../rightSidebar';
import {ContentState, useAppState} from '../useAppState';

export const ANIMATED_PAGE_TRANSITION_DURATION = 500;

const Animated = ({children, ...rest}: {children: ReactNode}) => (
  <CSSTransition classNames="slide-in-left" timeout={{enter: ANIMATED_PAGE_TRANSITION_DURATION}} {...rest}>
    {children}
  </CSSTransition>
);

interface MainContentProps {
  appLockRepository: AppLockRepository;
  openRightSidebar: (panelState: PanelState, params: RightSidebarParams, compareEntityId?: boolean) => void;
  isRightSidebarOpen?: boolean;
  selfUser: User;
  conversationState?: ConversationState;
  reloadApp: () => void;
}

const MainContent = ({
  appLockRepository,
  openRightSidebar,
  isRightSidebarOpen = false,
  selfUser,
  conversationState = container.resolve(ConversationState),
  reloadApp,
}: MainContentProps) => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const {mainViewModel, translate} = useApplicationContext();

  const userState = container.resolve(UserState);
  const teamState = container.resolve(TeamState);
  const {showRequestModal} = useLegalHoldModalState();
  const {isMeetingsEnabled} = useMeetingsFeatureFlag();

  const {isActivatedAccount} = useKoSubscribableChildren(selfUser, ['isActivatedAccount']);

  const contentState = useAppState(state => state.contentState);
  const isShowingConversation = useAppState(state => state.isShowingConversation);

  useEffect(() => {
    if (!isShowingConversation() && conversationState.activeConversation()) {
      // Reset active conversation for all states that do not require a loaded conversation
      conversationState.activeConversation(undefined);
    }
  }, [contentState, conversationState, isShowingConversation]);

  useEffect(() => {
    // Show legal hold on mount when legal hold is enabled for team
    if (teamState.supportsLegalHold()) {
      showRequestModal(true);
    }
  }, [teamState, showRequestModal]);

  const contentViewModel = mainViewModel.content;
  const {isFederated, repositories, switchContent} = contentViewModel;

  const {audioInputSupported, audioOutputSupported, videoInputSupported} = useMediaDevicesStore(state => ({
    audioInputSupported: state.audio.input.supported,
    audioOutputSupported: state.audio.output.supported,
    videoInputSupported: state.video.input.supported,
  }));
  const deviceSupport = {
    [MediaDeviceType.AUDIO_INPUT]: audioInputSupported,
    [MediaDeviceType.AUDIO_OUTPUT]: audioOutputSupported,
    [MediaDeviceType.VIDEO_INPUT]: videoInputSupported,
  };
  const {activeConversation} = useKoSubscribableChildren(conversationState, ['activeConversation']);

  const statesTitle: Partial<Record<ContentState, string>> = {
    [ContentState.CONNECTION_REQUESTS]: translate('accessibility.headings.connectionRequests'),
    [ContentState.CONVERSATION]: translate('accessibility.headings.conversation'),
    [ContentState.HISTORY_EXPORT]: translate('accessibility.headings.historyExport'),
    [ContentState.HISTORY_IMPORT]: translate('accessibility.headings.historyImport'),
    [ContentState.COLLECTION]: translate('accessibility.headings.collection'),
    [ContentState.PREFERENCES_ABOUT]: translate('accessibility.headings.preferencesAbout'),
    [ContentState.PREFERENCES_ACCOUNT]: translate('accessibility.headings.preferencesAccount'),
    [ContentState.PREFERENCES_AV]: translate('accessibility.headings.preferencesAV'),
    [ContentState.PREFERENCES_DEVICES]: translate('accessibility.headings.preferencesDevices'),
    [ContentState.PREFERENCES_OPTIONS]: translate('accessibility.headings.preferencesOptions'),
    [ContentState.WATERMARK]: translate('accessibility.headings.noConversation'),
  };

  const title = statesTitle[contentState];

  const onFileUpload = (file: File) => {
    switchContent(ContentState.HISTORY_IMPORT);
    setUploadedFile(file);
  };

  return (
    <section id="center-column" className="center-column">
      <h1 className="visually-hidden">{title}</h1>

      <SwitchTransition>
        <Animated key={contentState}>
          <>
            {contentState === ContentState.COLLECTION && activeConversation && (
              <Collection
                conversation={activeConversation}
                conversationRepository={repositories.conversation}
                assetRepository={repositories.asset}
                messageRepository={repositories.message}
                selfUser={selfUser}
              />
            )}

            {contentState === ContentState.PREFERENCES_ABOUT && (
              <div
                id="preferences-about"
                className={cx('preferences-page preferences-about', incomingCssClass)}
                ref={removeAnimationsClass}
              >
                <AboutPreferences selfUser={selfUser} />
              </div>
            )}

            {contentState === ContentState.PREFERENCES_ACCOUNT && (
              <div
                id="preferences-account"
                className={cx('preferences-page preferences-account', incomingCssClass)}
                ref={removeAnimationsClass}
              >
                <AccountPreferences
                  importFile={onFileUpload}
                  showDomain={isFederated}
                  switchContent={switchContent}
                  clientRepository={repositories.client}
                  conversationRepository={repositories.conversation}
                  propertiesRepository={repositories.properties}
                  userRepository={repositories.user}
                  selfUser={selfUser}
                  isActivatedAccount={isActivatedAccount}
                  appLockRepository={appLockRepository}
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
                  propertiesRepository={repositories.properties}
                  deviceSupport={deviceSupport}
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
                  removeDevice={contentViewModel.mainViewModel.actions.deleteClient}
                  resetSession={(userId, device, conversation) =>
                    repositories.message.resetSession(userId, device.id, conversation)
                  }
                  selfUser={selfUser}
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
                <OptionPreferences selfUser={selfUser} propertiesRepository={repositories.properties} />
              </div>
            )}

            {contentState === ContentState.WATERMARK && (
              <div className="watermark">
                <span className="absolute-center" aria-hidden="true" data-uie-name="no-conversation">
                  <Icon.WatermarkIcon />
                </span>
              </div>
            )}

            {contentState === ContentState.CONNECTION_REQUESTS && (
              <ConnectRequests teamState={teamState} userState={userState} />
            )}

            {contentState === ContentState.CONVERSATION && (
              <Conversation
                teamState={teamState}
                selfUser={selfUser}
                isRightSidebarOpen={isRightSidebarOpen}
                openRightSidebar={openRightSidebar}
                reloadApp={reloadApp}
              />
            )}

            {contentState === ContentState.HISTORY_EXPORT && (
              <HistoryExport user={selfUser} switchContent={switchContent} />
            )}

            {contentState === ContentState.HISTORY_IMPORT && uploadedFile && (
              <HistoryImport
                user={selfUser}
                file={uploadedFile}
                backupRepository={repositories.backup}
                switchContent={switchContent}
              />
            )}

            {contentState === ContentState.CELLS && (
              <CellsGlobalView
                cellsRepository={repositories.cells}
                userRepository={repositories.user}
                conversationRepository={repositories.conversation}
              />
            )}

            {contentState === ContentState.MEETINGS && isMeetingsEnabled && <Meetings />}
          </>
        </Animated>
      </SwitchTransition>
      <div className="center-column__overlay" />
    </section>
  );
};

export {MainContent};
