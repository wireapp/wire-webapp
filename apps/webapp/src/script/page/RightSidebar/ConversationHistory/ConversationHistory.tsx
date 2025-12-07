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

import {useState} from 'react';

import {FadingScrollbar} from 'Components/FadingScrollbar';
import {customHistorySharingInputCss} from 'Components/Modals/CreateConversation/CreateConversationSteps/CreateConversationSteps.styles';
import {ChatHistory, HistorySharingUnit} from 'Components/Modals/CreateConversation/types';
import {getChatHistoryOptions, getChatHistorySharingUnitOptions} from 'Components/Modals/CreateConversation/utils';
import {RadioGroup} from 'Components/Radio';
import {TeamState} from 'Repositories/team/TeamState';
import {container} from 'tsyringe';
import {t} from 'Util/LocalizerUtil';

import {FlexBox, Input, Select} from '@wireapp/react-ui-kit';

import {
  conversationHistoryContainerCss,
  conversationHistoryCustomCss,
  conversationHistoryParagraphCss,
} from './ConversationHistory.styles';
import {TeamCreationBanner} from './TeamCreationBanner';

import {PanelHeader} from '../PanelHeader';

export interface AccessProps {
  onClose: () => void;
  onGoBack: () => void;
}

export const ConversationHistory = ({onGoBack, onClose}: AccessProps) => {
  const [chatHistory, setChatHistory] = useState<ChatHistory>(ChatHistory.OneDay);
  const [historySharingQuantity, setHistorySharingQuantity] = useState(1);
  const [historySharingUnit, setHistorySharingUnit] = useState<HistorySharingUnit>(HistorySharingUnit.Days);
  const chatHistorySharingUnitOptions = getChatHistorySharingUnitOptions(historySharingQuantity);
  const chatHistoryOptions = getChatHistoryOptions(chatHistory, historySharingQuantity, historySharingUnit);
  const teamState = container.resolve(TeamState);

  return (
    <div id="access-settings" className="panel__page">
      <PanelHeader
        onGoBack={onGoBack}
        onClose={onClose}
        goBackUie="go-back-conversation-history-options"
        title={t('conversationHistoryTitle')}
      />

      <FadingScrollbar className="panel__content" css={conversationHistoryContainerCss}>
        <p className="panel__info-text">{t('conversationHistoryParagraph1')}</p>

        <p className="panel__info-text" css={conversationHistoryParagraphCss}>
          {t('conversationHistoryParagraph2')}
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
              value={historySharingQuantity || ''}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                setHistorySharingQuantity(Number(event.target.value))
              }
            />

            <Select
              id="history-sharing-unit-select"
              dataUieName="history-sharing-unit-select"
              menuCSS={{position: 'sticky'}}
              options={chatHistorySharingUnitOptions}
              value={chatHistorySharingUnitOptions.find(option => option.value === historySharingUnit)}
              onChange={option => {
                setHistorySharingUnit(option?.value as HistorySharingUnit);
              }}
            />
          </FlexBox>
        )}
        {!teamState.isConferenceCallingEnabled() && <TeamCreationBanner />}
      </FadingScrollbar>
    </div>
  );
};
