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

import {ConfirmModal} from '../modals/confirm.modal';

type EmojiReaction = 'plus-one' | 'heart' | 'joy';

export class ConversationPage {
  private readonly page: Page;

  /** The back button is shown on narrow screens e.g. phones to navigate back to the conversation list */
  readonly backButton: Locator;
  readonly messageInput: Locator;
  readonly sendMessageButton: Locator;
  readonly searchButton: Locator;
  readonly conversationTitle: Locator;
  readonly watermark: Locator;
  readonly timerMessageButton: Locator;
  readonly timerOffButton: Locator;
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
  /** Messages in conversation, only contains message items which have been sent successfully */
  readonly messages: Locator;
  readonly messageDetails: Locator;
  readonly messageItems: Locator;
  readonly filesTab: Locator;
  readonly typingIndicator: Locator;
  readonly itemPendingRequest: Locator;
  readonly ignoreButton: Locator;
  readonly cancelRequest: Locator;
  readonly mentionSuggestions: Locator;

  readonly getImageAltText = (user: User) => `Image from ${user.fullName}`;

  readonly emojiTitleMap: Record<EmojiReaction, string> = {
    'plus-one': '+1',
    heart: 'heart',
    joy: 'joy',
  };

  constructor(page: Page) {
    this.page = page;

    this.backButton = page.getByRole('button', {name: 'Go Back'});
    this.messageInput = page.getByTestId('input-message');
    this.watermark = page.getByTestId('no-conversation').locator('svg');
    this.sendMessageButton = page.getByTestId('do-send-message');
    this.searchButton = page.getByRole('button', {name: 'Search'});
    this.conversationTitle = page.locator('[data-uie-name="status-conversation-title-bar-label"]');
    this.openGroupInformationViaName = page.getByTestId('status-conversation-title-bar-label');
    this.timerMessageButton = page.getByTestId('do-set-ephemeral-timer');
    this.timerOffButton = page.getByRole('button', {name: 'Off'});
    this.timerTenSecondsButton = page.getByRole('button', {name: '10 seconds'});
    this.membersList = page.getByTestId('list-members');
    this.adminsList = page.getByTestId('list-admins');
    this.leaveConversationButton = page.getByTestId('do-leave-item-text');
    this.makeAdminToggle = page.getByTestId('do-allow-admin');
    this.removeUserButton = page.getByTestId('do-remove-item-text');
    this.addMemberButton = page.getByTestId('go-add-people');
    this.systemMessages = page.locator('[data-uie-name="item-message"].system-message:not([data-uie-send-status="1"])');
    this.callButton = page.getByTestId('do-call');
    this.conversationInfoButton = page.getByTestId('do-open-info');
    this.pingButton = page.getByTestId('do-ping');
    this.messageItems = page.getByTestId('item-message');
    /** The attribute 'send-status' will be 1 while the message is being sent, since we only want to assert on sent messages these messages will be excluded. See: {@see StatusTypes}
     * Status type -1 ensures that system messages do NOT count as sent messages
     */
    this.messages = page.locator(
      `[data-uie-name="item-message"]:not([data-uie-send-status="1"]):not([data-uie-send-status="-1"]):not(.system-message)`,
    );
    this.messageDetails = page.locator('#message-details');
    this.filesTab = page.locator('#conversation-tab-files');
    this.typingIndicator = page.getByTestId('typing-indicator-title');
    this.itemPendingRequest = page.getByTestId('item-pending-requests');
    this.ignoreButton = page.getByRole('button', {name: 'Ignore'});
    this.cancelRequest = page.getByRole('button', {name: 'Cancel connection request'});
    this.mentionSuggestions = page.getByRole('listbox').getByTestId('item-mention-suggestion');
  }

  getImageLocator(user: User): Locator {
    return this.page
      .getByTestId('item-message')
      .locator('.message-body')
      .getByTestId('image-asset')
      .getByTestId('image-asset-img')
      .and(this.page.locator(`[alt^="${this.getImageAltText(user)}"]`));
  }

  async isConversationOpen(conversationName: string) {
    return (await this.page.getByTestId('status-conversation-title-bar-label').textContent()) === conversationName;
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

  async sendMessage(message: string) {
    await this.messageInput.fill(message);
    await this.sendMessageButton.click();
  }

  async typeMessage(message: string) {
    await this.messageInput.click();
    // Use pressSequentially which simulates realistic typing with built-in delays
    await this.messageInput.pressSequentially(message, {delay: 100});
  }

  async sendTypedMessage(message: string) {
    await this.messageInput.clear();
    await this.typeMessage(message);
    await this.sendMessageButton.click();
  }

  async mentionUser(userFullName: string, searchQuery?: string) {
    const textToType = searchQuery ? `@${searchQuery}` : `@${userFullName.slice(0, 3)}`;
    await this.messageInput.pressSequentially(textToType);
    await this.mentionSuggestions.filter({hasText: userFullName}).click({timeout: 5000});
  }

  async replyToMessage(message: Locator) {
    await message.hover();
    await message.getByRole('group').getByTestId('do-reply-message').click();
  }

  async enableSelfDeletingMessages() {
    await this.timerMessageButton.click();
    await this.timerTenSecondsButton.click();
  }

  async disableSelfDeletingMessages() {
    await this.timerMessageButton.click();
    await this.timerOffButton.click();
  }

  async sendMessageWithUserMention(userFullName: string, messageText?: string) {
    await this.messageInput.fill(''); // Clear the input initially
    await this.mentionUser(userFullName);

    if (messageText) {
      await this.messageInput.pressSequentially(messageText);
    }

    await this.messageInput.press('Enter');
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
   * Util to get a message in the conversation
   * @param options.content Only match messages containing this text
   * @param options.sender Only match messages send by this user
   * @returns a Locator to the matching message(s)
   */
  getMessage(options?: {content?: string | RegExp; sender?: User}): Locator {
    let message = this.messages;

    if (options?.content) {
      message = message.filter({hasText: options.content});
    }

    if (options?.sender?.fullName) {
      message = message.filter({
        // Using getByLabel doesn't work here as the aria label is just placed on a div with no input inside which could be located
        has: this.page.locator(`.content-message-wrapper[aria-label*="${options.sender.fullName}"]`),
      });
    }

    return message;
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

  async deleteMessage(message: Locator, deleteFor: 'Me' | 'Everyone') {
    const menu = await this.openMessageOptions(message);
    await menu.getByRole('button', {name: `Delete for ${deleteFor}…`}).click();
    await new ConfirmModal(this.page).clickAction();
  }

  async reactOnMessage(message: Locator, emojiType: EmojiReaction) {
    await message.hover();

    switch (emojiType) {
      case 'plus-one':
        await message.getByRole('group').getByRole('button').first().click();
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
      .getByTestId('message-reactions')
      .getByTestId('emoji-pill')
      .and(this.page.locator(`[title="${this.emojiTitleMap[emojiType]}"]`));
    await reactionPill.waitFor({state: 'visible', timeout: 5000});
  }

  getReactionOnMessage(message: Locator, emojiType: EmojiReaction): Locator {
    const emojiTitle = this.emojiTitleMap[emojiType];
    const messageReactions = message.getByTestId('message-reactions');
    return messageReactions.getByTestId('emoji-pill').and(this.page.locator(`[title="${emojiTitle}"]`));
  }

  async clickImage(user: User) {
    const locator = this.getImageLocator(user);

    // Wait for at least one matching element to appear (optional timeout can be set)
    await locator.first().waitFor({state: 'visible'});
    await locator.isVisible();
    await locator.click();
  }

  async isPlusOneReactionVisible() {
    const plusOneReactionIcon = this.page
      .getByTestId('item-message')
      .getByTestId('message-reactions')
      .getByTestId('emoji-pill')
      .and(this.page.locator('button[aria-label="1 reaction, react with +1 emoji"]'));

    // Wait for at least one matching element to appear (optional timeout can be set)
    await plusOneReactionIcon.first().waitFor({state: 'visible'});

    return await plusOneReactionIcon.isVisible();
  }

  async playVideo() {
    const videoPlayButton = this.page
      .getByTestId('item-message')
      .getByTestId('video-asset')
      .getByTestId('do-play-media');

    await videoPlayButton.click();
  }

  async playAudio() {
    const audioPlayButton = this.page
      .getByTestId('item-message')
      .getByTestId('audio-asset')
      .getByTestId('do-play-media');
    await audioPlayButton.click();
  }

  async downloadFile(outputDir: string) {
    const downloadButton = this.page.getByTestId('item-message').getByTestId('file-asset');

    const filePath = await downloadAssetAndGetFilePath(this.page, downloadButton, outputDir);
    return filePath;
  }

  async startCall() {
    const startCallButton = this.page.locator('[data-uie-name="do-call"]');
    await startCallButton.click();
  }

  async toggleGroupInformation() {
    await this.openGroupInformationViaName.click();
  }

  async isUserGroupMember(name: string) {
    return this.membersList
      .getByTestId('item-user')
      .and(this.page.locator(`[data-uie-value="${name}"]`))
      .isVisible();
  }

  async isUserGroupAdmin(name: string) {
    await this.adminsList
      .getByTestId('item-user')
      .and(this.page.locator(`[data-uie-value="${name}"]`))
      .waitFor({state: 'visible'});
    return true;
  }

  async makeUserAdmin(name: string) {
    await this.membersList
      .getByTestId('item-user')
      .and(this.page.locator(`[data-uie-value="${name}"]`))
      .click();
    return this.makeAdminToggle.click();
  }

  async removeMemberFromGroup(name: string) {
    await this.membersList
      .getByTestId('item-user')
      .and(this.page.locator(`[data-uie-value="${name}"]`))
      .click();
    await this.removeUserButton.click();
    await new ConfirmModal(this.page).clickAction();
  }

  async removeAdminFromGroup(name: string) {
    await this.adminsList
      .getByTestId('item-user')
      .and(this.page.locator(`[data-uie-value="${name}"]`))
      .click();
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

  /**
   * Returns the locator for the ping element within the message list.
   */
  getPing(): Locator {
    return this.messageItems.getByTestId('element-message-ping');
  }
}
