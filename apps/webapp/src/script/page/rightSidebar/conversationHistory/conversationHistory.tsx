/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import {useState, type FunctionComponent} from 'react';

import {isNan, isNullOrUndefined} from '@sindresorhus/is';

import {
  conversationHistoryContainerCss,
  conversationHistoryCustomCss,
  conversationHistoryParagraphCss,
} from './conversationHistory.styles';
import {TeamCreationBanner} from './teamCreationBanner';

import {FadingScrollbar} from '../../../components/fadingScrollbar';
import {customHistorySharingInputCss} from '../../../components/Modals/CreateConversation/CreateConversationSteps/CreateConversationSteps.styles';
import {ChatHistory, HistorySharingUnit} from '../../../components/Modals/CreateConversation/types';
import {
  getChatHistoryOptions,
  getChatHistorySharingUnitOptions,
} from '../../../components/Modals/CreateConversation/utils';
import {RadioGroup} from '../../../components/Radio';
import {User} from '../../../repositories/entity/User';
import {TeamState} from '../../../repositories/team/TeamState';
import {Input} from '../../../uiKit/inputs/input/input';
import {Select} from '../../../uiKit/inputs/select/select';
import {FlexBox} from '../../../uiKit/layout/flexBox/flexBox';
import {useKoSubscribableChildren} from '../../../util/componentUtil';
import {useApplicationContext} from '../../rootProvider';
import {PanelHeader} from '../panelHeader';

export interface AccessProps {
  onClose: () => void;
  onGoBack: () => void;
  selfUser: User;
  teamState: TeamState;
}

export const ConversationHistory: FunctionComponent<AccessProps> = ({
  onGoBack,
  onClose,
  selfUser,
  teamState,
}: AccessProps) => {
  const {translate} = useApplicationContext();
  const [chatHistory, setChatHistory] = useState<ChatHistory>(ChatHistory.OneDay);
  const [historySharingQuantity, setHistorySharingQuantity] = useState(1);
  const [historySharingUnit, setHistorySharingUnit] = useState<HistorySharingUnit>(HistorySharingUnit.Days);
  const chatHistorySharingUnitOptions = getChatHistorySharingUnitOptions(translate, historySharingQuantity);
  const chatHistoryOptions = getChatHistoryOptions(translate, chatHistory, historySharingQuantity, historySharingUnit);
  const {isTemporaryGuest} = useKoSubscribableChildren(selfUser, ['isTemporaryGuest']);

  return (
    <div id="access-settings" className="panel__page">
      <PanelHeader
        onGoBack={onGoBack}
        onClose={onClose}
        goBackUie="go-back-conversation-history-options"
        title={translate('conversationHistoryTitle')}
      />

      <FadingScrollbar className="panel__content" css={conversationHistoryContainerCss}>
        <p className="panel__info-text">{translate('conversationHistoryParagraph1')}</p>

        <p className="panel__info-text" css={conversationHistoryParagraphCss}>
          {translate('conversationHistoryParagraph2')}
        </p>

        <RadioGroup<ChatHistory>
          onChange={setChatHistory}
          selectedValue={chatHistory}
          options={chatHistoryOptions}
          ariaLabelledBy="chat-history"
          name="chat-history"
        />

        {chatHistory === ChatHistory.Custom && (
          <FlexBox css={conversationHistoryCustomCss}>
            <Input
              wrapperCSS={customHistorySharingInputCss}
              value={
                !isNullOrUndefined(historySharingQuantity) &&
                historySharingQuantity !== 0 &&
                !isNan(historySharingQuantity)
                  ? historySharingQuantity
                  : ''
              }
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                return setHistorySharingQuantity(Number(event.target.value));
              }}
            />

            <Select
              id="history-sharing-unit-select"
              dataUieName="history-sharing-unit-select"
              menuCSS={{position: 'sticky'}}
              options={chatHistorySharingUnitOptions}
              value={chatHistorySharingUnitOptions.find(option => {
                return option.value === historySharingUnit;
              })}
              onChange={option => {
                setHistorySharingUnit(option?.value as HistorySharingUnit);
              }}
            />
          </FlexBox>
        )}
        {!teamState.isConferenceCallingEnabled() && !isTemporaryGuest && <TeamCreationBanner />}
      </FadingScrollbar>
    </div>
  );
};
