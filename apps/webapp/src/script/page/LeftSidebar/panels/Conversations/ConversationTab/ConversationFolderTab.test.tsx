/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import {render} from '@testing-library/react';
import * as Icon from 'Components/Icon';
import {createLabel, LabelType} from 'Repositories/conversation/ConversationLabelRepository';
import {Conversation} from 'Repositories/entity/Conversation';
import {TestFactory} from 'test/helper/TestFactory';

import {ConversationFolderTab} from './ConversationFolderTab';

import {SidebarTabs} from '../useSidebarStore';

const getProps = async (conversations: Conversation[] = []) => {
  const testFactory = new TestFactory();
  const conversationRepository = await testFactory.exposeConversationActors();

  conversationRepository['conversationState'].conversations(conversations);

  return {
    props: {
      title: 'title',
      label: 'label',
      type: SidebarTabs.FOLDER,
      conversationTabIndex: 0,
      onChangeTab: () => {},
      Icon: <Icon.FoldersOutline />,
      conversationRepository,
      unreadConversations: [] as Conversation[],
      dataUieName: 'dataUieName',
    },
    conversationRepository,
  };
};

describe('ConversationFolderTab', () => {
  it('should render empty folders list', async () => {
    const {props} = await getProps();
    const {getByText} = render(<ConversationFolderTab {...props} />);

    expect(getByText('conversationFoldersEmptyText')).toBeDefined();
  });

  it('should list custom folders only', async () => {
    const favoriteConversation = new Conversation('id', 'domain');
    favoriteConversation.name('favoriteConversation');

    const customFolderConversation = new Conversation('id2', 'domain2');
    customFolderConversation.name('customFolderConversation');

    const {props, conversationRepository} = await getProps([favoriteConversation, customFolderConversation]);
    conversationRepository['conversationLabelRepository'].addConversationToFavorites(favoriteConversation);

    const customFolderName = 'customFolder';
    const customFolder = createLabel(customFolderName, [customFolderConversation], 'id', LabelType.Custom);

    const customFolderName2 = 'customFolder2';
    const customFolder2 = createLabel(customFolderName2, [customFolderConversation], 'id', LabelType.Custom);

    const customFavoriteFolderName = 'customFavoriteFolder';
    const customFavoriteFolder = createLabel(
      customFavoriteFolderName,
      [favoriteConversation],
      'id',
      LabelType.Favorite,
    );

    conversationRepository['conversationLabelRepository'].labels([customFolder, customFolder2, customFavoriteFolder]);

    conversationRepository['conversationLabelRepository'].addConversationToLabel(
      customFolder,
      customFolderConversation,
    );
    const {queryByText} = render(<ConversationFolderTab {...props} />);

    expect(queryByText(customFolderName)).not.toBeNull();
    expect(queryByText(customFolderName2)).not.toBeNull();
    expect(queryByText(customFavoriteFolderName)).toBeNull();
  });
});
