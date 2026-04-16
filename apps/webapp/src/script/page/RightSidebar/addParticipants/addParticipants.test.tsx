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

import {render} from "@testing-library/react";
import {AddParticipants} from "./addParticipants";
import {Conversation} from "Repositories/entity/Conversation";
import {ConversationRepository} from "Repositories/conversation/ConversationRepository";
import {IntegrationRepository} from "Repositories/integration/IntegrationRepository";
import {SearchRepository} from "Repositories/search/SearchRepository";
import { PanelState, PanelEntity } from "..";

describe('addParticipants', () => {
  it('renders correctly', () => {
    // Arrange
    var conversation = new Conversation();

    // Act
    render(<AddParticipants
      activeConversation={conversation}
      onBack={() => {
      }}
      onClose={() => {
      }}
      conversationRepository={{} as ConversationRepository}
      integrationRepository={{} as IntegrationRepository}
      searchRepository={{} as SearchRepository}
      togglePanel={function (panel: PanelState, entity: PanelEntity, addMode?: boolean): void {
        throw new Error("Function not implemented.");
      }} teamRepository={undefined} teamState={undefined} userState={undefined} selfUser={undefined}    />);

    // Assert
  });
})
