/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {Locator, Page} from '@playwright/test';

import {User} from 'test/e2e_tests/data/user';
import {downloadAssetAndGetFilePath} from 'test/e2e_tests/utils/asset.util';
import {selectById, selectByClass, selectByDataAttribute} from 'test/e2e_tests/utils/selector.util';

type EmojiReaction = 'plus-one' | 'heart' | 'joy';

export class ConversationPage {
  readonly page: Page;

  readonly createGroupModal: Locator;
  readonly createGroupButton: Locator;
  readonly createGroupNameInput: Locator;
  readonly createGroupSubmitButton: Locator;
  readonly messageInput: Locator;
  readonly sendMessageButton: Locator;
  readonly conversationTitle: Locator;
  readonly watermark: Locator;
  readonly timerMessageButton: Locator;
  readonly timerTenSecondsButton: Locator;
  readonly openGroupInformationViaName: Locator;
  readonly membersList: Locator;
  readonly adminsList: Locator;
  readonly leaveConversationButton: Locator;
  readonly makeAdminToggle: Locator;
  readonly removeUserButton: Locator;
  readonly addMemberButton: Locator;
  readonly systemMessages: Locator;
  readonly callButton: Locator;
  readonly conversationInfoButton: Locator;
  readonly pingButton: Locator;
  readonly messages: Locator;
  readonly messageDetails: Locator;
  readonly messageItems: Locator;
  readonly filesTab: Locator;
  readonly isTypingIndicator: Locator;
  readonly itemPendingRequest: Locator;
  readonly ignoreButton: Locator;
  readonly cancelRequest: Locator;

  readonly getImageAltText = (user: User) => `Image from ${user.fullName}`;

  readonly emojiTitleMap: Record<EmojiReaction, string> = {
    'plus-one': '+1',
    heart: 'heart',
    joy: 'joy',
  };

  constructor(page: Page) {
    this.page = page;

    this.createGroupButton = page.locator(selectByDataAttribute('go-create-group'));
    this.createGroupModal = page.locator(selectByDataAttribute('group-creation-label'));
    this.createGroupNameInput = this.createGroupModal.locator(selectByDataAttribute('enter-group-name'));
    this.createGroupSubmitButton = this.createGroupModal.locator(selectByDataAttribute('submit'));
    this.messageInput = page.locator(selectByDataAttribute('input-message'));
    this.watermark = page.locator(`${selectByDataAttribute('no-conversation')} svg`);
    this.sendMessageButton = page.locator(selectByDataAttribute('do-send-message'));
    this.conversationTitle = page.locator('[data-uie-name="status-conversation-title-bar-label"]');
    this.openGroupInformationViaName = page.locator(selectByDataAttribute('status-conversation-title-bar-label'));
    this.timerMessageButton = page.locator(selectByDataAttribute('do-set-ephemeral-timer'));
    this.timerTenSecondsButton = page.locator(selectById('btn-10-seconds'));
    this.membersList = page.locator(selectByDataAttribute('list-members'));
    this.adminsList = page.locator(selectByDataAttribute('list-admins'));
    this.leaveConversationButton = page.locator(selectByDataAttribute('do-leave-item-text'));
    this.makeAdminToggle = page.locator(selectByDataAttribute('do-allow-admin'));
    this.removeUserButton = page.locator(selectByDataAttribute('do-remove-item-text'));
    this.addMemberButton = page.locator(selectByDataAttribute('go-add-people'));
    this.systemMessages = page.locator(
      `${selectByDataAttribute('item-message')}${selectByClass('system-message')} ${selectByClass('message-header')}`,
    );
    this.callButton = page.locator(selectByDataAttribute('do-call'));
    this.conversationInfoButton = page.locator(selectByDataAttribute('do-open-info'));
    this.pingButton = page.locator(selectByDataAttribute('do-ping'));
    this.messageItems = page.locator(selectByDataAttribute('item-message'));
    this.messages = page.locator(
      `${selectByDataAttribute('item-message')} ${selectByClass('message-body')}:not(:has(p${selectByClass('text-foreground')})):has(${selectByClass('text')})`,
    );
    this.messageDetails = page.locator('#message-details');
    this.filesTab = page.locator('#conversation-tab-files');
    this.isTypingIndicator = page.locator(selectByDataAttribute('typing-indicator-title'));
    this.itemPendingRequest = page.locator(selectByDataAttribute('item-pending-requests'));
    this.ignoreButton = page.getByTestId('do-ignore');
    this.cancelRequest = page.getByTestId('do-cancel-request');
  }

  protected getImageLocator(user: User): Locator {
    return this.page.locator(
      `${selectByDataAttribute('item-message')} ${selectByClass('message-body')} ${selectByDataAttribute('image-asset')} ${selectByDataAttribute('image-asset-img')}[alt^="${this.getImageAltText(user)}"]`,
    );
  }

  async isConversationOpen(conversationName: string) {
    return (
      (await this.page.locator(selectByDataAttribute('status-conversation-title-bar-label')).textContent()) ===
      conversationName
    );
  }

  async clickItemPendingRequest() {
    await this.itemPendingRequest.click();
  }

  async clickConversationTitle() {
    await this.conversationTitle.click();
  }

  async clickConversationInfoButton() {
    await this.conversationInfoButton.click();
  }

  async clickCallButton() {
    await this.callButton.click();
  }

  async clickFilesTab() {
    await this.filesTab.click();
  }

  async clickIgnoreButton() {
    await this.ignoreButton.click();
  }

  async clickCancelRequest() {
    await this.cancelRequest.click();
  }

  async isWatermarkVisible() {
    return await this.watermark.isVisible();
  }

  async sendMessage(message: string) {
    await this.messageInput.fill(message);
    await this.sendMessageButton.click();
    await this.isMessageVisible(message); // isMessageVisible not only checks for visibility but ensures the optimistic update was persisted
  }

  async typeMessage(message: string) {
    await this.messageInput.click();
    // Use pressSequentially which simulates realistic typing with built-in delays
    await this.messageInput.pressSequentially(message, {delay: 100});
  }

  async createGroup(groupName: string) {
    await this.createGroupButton.click();
    await this.createGroupNameInput.fill(groupName);
    await this.createGroupSubmitButton.click();
  }

  async sendMessageWithUserMention(userFullName: string, messageText?: string) {
    await this.messageInput.fill(`@`);
    await this.page
      .locator(`${selectByDataAttribute('item-mention-suggestion')} ${selectByDataAttribute('status-name')}`, {
        hasText: userFullName,
      })
      .click({timeout: 1000});

    if (messageText) {
      await this.messageInput.pressSequentially(messageText);
    }

    await this.messageInput.press('Enter');
  }

  async isMessageVisible(messageText: string, waitForVisibility = true) {
    if (waitForVisibility) {
      // Wait for the last message to be visible
      await this.messages.last().waitFor({state: 'visible', timeout: 20_000});
    }

    // Then get all matching elements
    const messages = await this.messages.all();

    for (const message of messages) {
      const messageTextContent = await message.locator(selectByClass('text')).textContent();
      if (messageTextContent?.trim() === messageText) {
        return true;
      }
    }
    return false;
  }

  getMessageByText(messageText: string): Locator {
    return this.messageItems.filter({hasText: messageText});
  }

  async isImageFromUserVisible(user: User) {
    // Trying multiple times for the image to appear
    const locator = this.getImageLocator(user);

    // Wait for at least one matching element to appear (optional timeout can be set)
    await locator.first().waitFor({state: 'visible'});

    return await locator.isVisible();
  }

  async getImageScreenshot(user: User): Promise<Buffer> {
    const locator = this.getImageLocator(user);

    // Wait for the image to be visible
    await locator.waitFor({state: 'visible'});

    // Take a screenshot of the image
    return await locator.screenshot();
  }

  /**
   * Util to get a message in the conversation sent by a given user
   * @param messageContent Optional parameter to specify content the message should contain. If undefined the last message sent by the user will be returned.
   */
  getMessageFromUser(user: User, messageContent?: string) {
    const messagesFromUser = this.messageItems.filter({
      has: this.page.getByTestId('sender-name').getByText(user.fullName),
    });
    if (messageContent !== undefined) {
      return messagesFromUser.filter({hasText: messageContent});
    }
    return messagesFromUser.last();
  }

  /**
   * Open the options associated with a message
   * @returns the Locator of the now open context menu
   */
  async openMessageOptions(message: Locator) {
    await message.hover();
    await message.getByTestId('message-actions').getByTestId('go-options').click();
    // The context menu containing the edit button is positioned globally as an overlay
    return this.page.getByRole('menu');
  }

  /** Click the "Edit" option within a messages options putting it into the message input so it can be updated */
  async editMessage(message: Locator) {
    const menu = await this.openMessageOptions(message);
    await menu.getByRole('button', {name: 'Edit'}).click();
  }

  async openMessageDetails(message: Locator) {
    const menu = await this.openMessageOptions(message);
    await menu.getByRole('button', {name: 'Details'}).click();
  }

  async reactOnMessage(message: Locator, emojiType: EmojiReaction) {
    await message.hover();
    const reactionButton = message.getByRole('group').getByRole('button').first();
    await reactionButton.click();

    switch (emojiType) {
      case 'plus-one':
        // The first quick reaction button is +1 (thumbs up), so we just clicked it
        break;
      case 'heart':
        await this.page.getByTestId('reactwith-love-message').click();
        break;
      case 'joy':
        await this.page.getByTestId('reactwith-emoji-message').click();
        await this.page.getByRole('listitem', {name: 'Smileys & People'}).getByLabel('joy').first().click();
        break;
    }

    // Wait for the reaction to appear on the message
    const reactionPill = message
      .locator(selectByDataAttribute('message-reactions'))
      .locator(`${selectByDataAttribute('emoji-pill')}[title="${this.emojiTitleMap[emojiType]}"]`);
    await reactionPill.waitFor({state: 'visible', timeout: 5000});
  }

  getReactionOnMessage(message: Locator, emojiType: EmojiReaction): Locator {
    const emojiTitle = this.emojiTitleMap[emojiType];
    const messageReactions = message.locator(selectByDataAttribute('message-reactions'));
    return messageReactions.locator(`${selectByDataAttribute('emoji-pill')}[title="${emojiTitle}"]`);
  }

  async clickImage(user: User) {
    const locator = this.getImageLocator(user);

    // Wait for at least one matching element to appear (optional timeout can be set)
    await locator.first().waitFor({state: 'visible'});
    await locator.isVisible();
    await locator.click();
  }

  async isPlusOneReactionVisible() {
    const plusOneReactionIcon = this.page.locator(
      `${selectByDataAttribute('item-message')} ${selectByDataAttribute('message-reactions')} button${selectByDataAttribute('emoji-pill')}[aria-label="1 reaction, react with +1 emoji"]`,
    );

    // Wait for at least one matching element to appear (optional timeout can be set)
    await plusOneReactionIcon.first().waitFor({state: 'visible'});

    return await plusOneReactionIcon.isVisible();
  }

  async isVideoMessageVisible() {
    const videoMessageLocator = this.page.locator(
      `${selectByDataAttribute('item-message')} ${selectByDataAttribute('video-asset')}`,
    );

    // Wait for at least one matching element to appear (optional timeout can be set)
    await videoMessageLocator.first().waitFor({state: 'visible'});

    return await videoMessageLocator.isVisible();
  }

  async playVideo() {
    const videoPlayButton = this.page.locator(
      `${selectByDataAttribute('item-message')} ${selectByDataAttribute('video-asset')} ${selectByDataAttribute('do-play-media')}`,
    );

    await videoPlayButton.click();
  }

  async playAudio() {
    const audioPlayButton = this.page.locator(
      `${selectByDataAttribute('item-message')} ${selectByDataAttribute('audio-asset')} ${selectByDataAttribute('do-play-media')}`,
    );
    await audioPlayButton.click();
  }

  async isAudioPlaying() {
    const audioTimeLocator = this.page.locator(
      `${selectByDataAttribute('item-message')} ${selectByDataAttribute('audio-asset')} ${selectByDataAttribute('status-audio-time')}`,
    );

    const audioTimeText = (await audioTimeLocator.textContent())?.trim();
    if (!audioTimeText) {
      throw new Error('Audio time text is empty or undefined');
    }
    const seconds = parseInt(audioTimeText.split(':')[1], 10);
    return seconds > 0;
  }

  async isAudioMessageVisible() {
    const audioMessageLocator = this.page.locator(
      `${selectByDataAttribute('item-message')} ${selectByDataAttribute('audio-asset')}`,
    );

    // Wait for at least one matching element to appear (optional timeout can be set)
    await audioMessageLocator.first().waitFor({state: 'visible'});

    return await audioMessageLocator.isVisible();
  }

  async isFileMessageVisible() {
    const fileMessageLocator = this.page.locator(
      `${selectByDataAttribute('item-message')} ${selectByDataAttribute('file-asset')}`,
    );

    // Wait for at least one matching element to appear (optional timeout can be set)
    await fileMessageLocator.first().waitFor({state: 'visible'});

    return await fileMessageLocator.isVisible();
  }

  async downloadFile() {
    const downloadButton = this.page.locator(
      `${selectByDataAttribute('item-message')} ${selectByDataAttribute('file-asset')}`,
    );

    const filePath = await downloadAssetAndGetFilePath(this.page, downloadButton);
    return filePath;
  }

  async startCall() {
    const startCallButton = this.page.locator('[data-uie-name="do-call"]');
    await startCallButton.click();
  }

  async isSystemMessageVisible(messageText: string) {
    await this.systemMessages.filter({hasText: messageText}).first().waitFor({state: 'visible'});
    return true;
  }

  async isConversationReadonly() {
    await this.messageInput.waitFor({state: 'detached'});
  }

  async isMessageInputVisible() {
    return await this.messageInput.isVisible();
  }

  async toggleGroupInformation() {
    await this.openGroupInformationViaName.click();
  }

  async isUserGroupMember(name: string) {
    return this.membersList
      .locator(`${selectByDataAttribute('item-user')}${selectByDataAttribute(name, 'value')}`)
      .isVisible();
  }

  async isUserGroupAdmin(name: string) {
    await this.adminsList
      .locator(`${selectByDataAttribute('item-user')}${selectByDataAttribute(name, 'value')}`)
      .waitFor({state: 'visible'});
    return true;
  }

  async makeUserAdmin(name: string) {
    await this.membersList.locator(selectByDataAttribute(name, 'value')).click();
    return this.makeAdminToggle.click();
  }

  async removeMemberFromGroup(name: string) {
    await this.membersList.locator(selectByDataAttribute(name, 'value')).click();
    return this.removeUserButton.click();
  }

  async removeAdminFromGroup(name: string) {
    await this.adminsList.locator(selectByDataAttribute(name, 'value')).click();
    return this.removeUserButton.click();
  }

  async leaveConversation() {
    await this.leaveConversationButton.click();
  }

  async clickAddMemberButton() {
    await this.addMemberButton.click();
  }

  async messageCount() {
    return await this.messages.count();
  }

  async getTitle() {
    return await this.conversationTitle.innerText();
  }

  async sendPing() {
    await this.pingButton.click();
  }

  async getCurrentFocusedToolTip(message: Locator) {
    await message.getByTestId('emoji-pill').first().hover();
    return this.page.locator('[data-testid="tooltip-content"]');
  }
}
