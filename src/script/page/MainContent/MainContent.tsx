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

import {FC, ReactNode, useContext, useEffect, useState} from 'react';

import cx from 'classnames';
import {CSSTransition, SwitchTransition} from 'react-transition-group';
import {container} from 'tsyringe';

import {ConnectRequests} from 'Components/ConnectRequests';
import {Conversation} from 'Components/Conversation';
import {HistoryExport} from 'Components/HistoryExport';
import {HistoryImport} from 'Components/HistoryImport';
import {Icon} from 'Components/Icon';
import {useLegalHoldModalState} from 'Components/Modals/LegalHoldModal/LegalHoldModal.state';
import {User} from 'src/script/entity/User';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';
import {incomingCssClass, removeAnimationsClass} from 'Util/util';

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
import {RightSidebarParams} from '../AppMain';
import {PanelState} from '../RightSidebar';
import {RootContext} from '../RootProvider';
import {ContentState, useAppState} from '../useAppState';

export const ANIMATED_PAGE_TRANSITION_DURATION = 500;

const Animated: FC<{children: ReactNode}> = ({children, ...rest}) => (
  <CSSTransition classNames="slide-in-left" timeout={{enter: ANIMATED_PAGE_TRANSITION_DURATION}} {...rest}>
    {children}
  </CSSTransition>
);

interface MainContentProps {
  openRightSidebar: (panelState: PanelState, params: RightSidebarParams, compareEntityId?: boolean) => void;
  isRightSidebarOpen?: boolean;
  selfUser: User;
  conversationState?: ConversationState;
}

const MainContent: FC<MainContentProps> = ({
  openRightSidebar,
  isRightSidebarOpen = false,
  selfUser,
  conversationState = container.resolve(ConversationState),
}) => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const mainViewModel = useContext(RootContext);

  const userState = container.resolve(UserState);
  const teamState = container.resolve(TeamState);
  const {showRequestModal} = useLegalHoldModalState();

  const {contentState, isShowingConversation} = useAppState();

  useEffect(() => {
    if (!isShowingConversation() && conversationState.activeConversation()) {
      // Reset active conversation for all states that do not require a loaded conversation
      conversationState.activeConversation(undefined);
    }
  }, [contentState, conversationState]);

  useEffect(() => {
    // Show legal hold on mount when legal hold is enabled for team
    if (teamState.supportsLegalHold()) {
      showRequestModal(true);
    }
  }, [teamState, showRequestModal]);

  if (!mainViewModel) {
    return null;
  }
  const {content: contentViewModel} = mainViewModel;
  const {initialMessage, isFederated, repositories, switchContent} = contentViewModel;

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const {activeConversation} = useKoSubscribableChildren(conversationState, ['activeConversation']);

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
                userState={userState}
              />
            )}

            {contentState === ContentState.PREFERENCES_ABOUT && (
              <div
                id="preferences-about"
                className={cx('preferences-page preferences-about', incomingCssClass)}
                ref={removeAnimationsClass}
              >
                <AboutPreferences />
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
                  userState={userState}
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
                <OptionPreferences propertiesRepository={repositories.properties} />
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
              <ConnectRequests teamState={teamState} userState={userState} />
            )}

            {contentState === ContentState.CONVERSATION && (
              <Conversation
                initialMessage={initialMessage}
                teamState={teamState}
                userState={userState}
                isRightSidebarOpen={isRightSidebarOpen}
                openRightSidebar={openRightSidebar}
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
          </>
        </Animated>
      </SwitchTransition>
      <div className="center-column__overlay" />
    </section>
  );
};

export {MainContent};
