/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import UUID from 'uuidjs';
import {instantiateComponent} from '../../api/knockoutHelpers';

import Conversation from 'src/script/entity/Conversation';
import ContentMessage from 'src/script/entity/message/ContentMessage';
import LinkPreview from 'src/script/entity/message/LinkPreview';
import Text from 'src/script/entity/message/Text';
import User from 'src/script/entity/User';
import 'src/script/components/message';

describe('message', () => {
  const testFactory = new TestFactory();
  const textValue = 'hello there';
  let defaultParams;

  beforeEach(() => {
    return testFactory.exposeConversationActors().then(conversationRepository => {
      spyOn(conversationRepository, 'expectReadReceipt').and.returnValue(false);
      const message = new ContentMessage();

      message.user(new User());
      const textAsset = new Text('', textValue);
      spyOn(textAsset, 'render').and.returnValue(`<span>${textValue}</span>`);
      message.assets.push(textAsset);

      defaultParams = {
        actionsViewModel: {},
        conversation: () => new Conversation(),
        conversationRepository: conversationRepository,
        isLastDeliveredMessage: () => false,
        isSelfTemporaryGuest: false,
        message,
        onClickAvatar: () => {},
        onClickCancelRequest: () => {},
        onClickInvitePeople: () => {},
        onClickLikes: () => {},
        onClickMessage: () => {},
        onClickParticipants: () => {},
        onClickReceipts: () => {},
        onClickTimestamp: () => {},
        onLike: () => {},
        selfId: () => UUID.genV4().hexString,
        shouldShowAvatar: true,
        shouldShowInvitePeople: true,
      };
    });
  });

  it('displays a message', () => {
    return instantiateComponent('message', defaultParams).then(domContainer => {
      expect(domContainer.querySelector('.text').innerText).toBe(textValue);
    });
  });

  it('displays the contextual menu', () => {
    spyOn(defaultParams, 'onLike');
    return instantiateComponent('message', defaultParams).then(domContainer => {
      expect(document.querySelector('.ctx-menu')).toBe(null);
      domContainer.querySelector('.context-menu').click();

      const menu = document.querySelector('.ctx-menu');

      expect(menu).toBeDefined();
      menu.querySelector('[title=conversationContextMenuLike]').click();

      expect(defaultParams.onLike).toHaveBeenCalled();
    });
  });

  it('displays a link preview', () => {
    const linkPreview = new LinkPreview();
    defaultParams.message.get_first_asset().previews([linkPreview]);
    return instantiateComponent('message', defaultParams).then(domContainer => {
      expect(domContainer.querySelector('link-preview-asset')).not.toBe(null);
    });
  });
});
