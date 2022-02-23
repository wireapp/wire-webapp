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

import ko from 'knockout';
import TestPage from 'Util/test/TestPage';
import {TIME_IN_MILLIS} from 'Util/TimeUtil';
import MessageTimerButton, {MessageTimerButtonProps} from './MessageTimerButton';
import type {Conversation} from '../../entity/Conversation';
import * as Context from '../../ui/ContextMenu';
import {TeamState} from 'src/script/team/TeamState';

class MessageTimerButtonPage extends TestPage<MessageTimerButtonProps> {
  constructor(props?: MessageTimerButtonProps) {
    super(MessageTimerButton, props);
  }

  getMessageTimerElement = () => this.get('[data-uie-name="do-set-ephemeral-timer"]');
  clickMessageTimerElement = () => this.click(this.getMessageTimerElement());
  getMessageTimerButton = () => this.get('[data-uie-name="message-timer-button"]');
  getMessageTimerIcon = () => this.get('[data-uie-name="message-timer-icon"]');
  getMessageTimerButtonSymbol = () => this.get('[data-uie-name="message-timer-button-symbol"]');
  getMessageTimerButtonValue = () => this.get('[data-uie-name="message-timer-button-value"]');
}

describe('MessageTimerButton', () => {
  it('hides the timer button when the feature is disabled', () => {
    const conversation: Partial<Conversation> = {
      hasGlobalMessageTimer: ko.pureComputed(() => false),
      messageTimer: ko.pureComputed(() => 0),
    };

    const mockTeamState: Partial<TeamState> = {
      isSelfDeletingMessagesEnabled: ko.pureComputed(() => false),
    };

    const messageTimerButtonPage = new MessageTimerButtonPage({
      conversation: conversation as Conversation,
      teamState: mockTeamState as TeamState,
    });

    expect(messageTimerButtonPage.getMessageTimerButton().exists()).toBe(false);
    expect(messageTimerButtonPage.getMessageTimerIcon().exists()).toBe(false);
  });

  it('shows the inactive message timer button', () => {
    const conversation: Partial<Conversation> = {
      hasGlobalMessageTimer: ko.pureComputed(() => false),
      messageTimer: ko.pureComputed(() => 0),
    };

    const mockTeamState: Partial<TeamState> = {
      isSelfDeletingMessagesEnabled: ko.pureComputed(() => true),
    };

    const messageTimerButtonPage = new MessageTimerButtonPage({
      conversation: conversation as Conversation,
      teamState: mockTeamState as TeamState,
    });

    expect(messageTimerButtonPage.getMessageTimerButton().exists()).toBe(false);
    expect(messageTimerButtonPage.getMessageTimerIcon().exists()).toBe(true);
  });

  it('activates the context menu', () => {
    jest.spyOn(Context, 'showContextMenu').mockClear();

    const conversation: Partial<Conversation> = {
      hasGlobalMessageTimer: ko.pureComputed(() => false),
      messageTimer: ko.pureComputed(() => 0),
    };

    const mockTeamState: Partial<TeamState> = {
      isSelfDeletingMessagesEnabled: ko.pureComputed(() => true),
    };

    const messageTimerButtonPage = new MessageTimerButtonPage({
      conversation: conversation as Conversation,
      teamState: mockTeamState as TeamState,
    });

    expect(messageTimerButtonPage.getMessageTimerElement().prop('data-uie-value')).toBe('enabled');

    expect(Context.showContextMenu).toHaveBeenCalledTimes(0);
    messageTimerButtonPage.clickMessageTimerElement();
    expect(Context.showContextMenu).toHaveBeenCalledTimes(1);
  });

  it('shows the active message timer button', () => {
    const minutes = 5;
    const duration = TIME_IN_MILLIS.MINUTE * minutes;

    const conversation: Partial<Conversation> = {
      hasGlobalMessageTimer: ko.pureComputed(() => false),
      messageTimer: ko.pureComputed(() => duration),
    };

    const mockTeamState: Partial<TeamState> = {
      isSelfDeletingMessagesEnabled: ko.pureComputed(() => true),
    };

    const messageTimerButtonPage = new MessageTimerButtonPage({
      conversation: conversation as Conversation,
      teamState: mockTeamState as TeamState,
    });

    expect(messageTimerButtonPage.getMessageTimerButton().exists()).toBe(true);
    expect(messageTimerButtonPage.getMessageTimerIcon().exists()).toBe(false);
    expect(messageTimerButtonPage.getMessageTimerButtonValue().text()).toBe(minutes.toString());
    expect(messageTimerButtonPage.getMessageTimerButtonSymbol().text()).toBe('m');
    expect(messageTimerButtonPage.getMessageTimerElement().prop('data-uie-value')).toBe('enabled');
  });

  it('shows the disabled message timer button when conversation message timer is set', () => {
    const minutes = 10;
    const duration = TIME_IN_MILLIS.MINUTE * minutes;

    const conversation: Partial<Conversation> = {
      hasGlobalMessageTimer: ko.pureComputed(() => true),
      messageTimer: ko.pureComputed(() => duration),
    };

    const mockTeamState: Partial<TeamState> = {
      isSelfDeletingMessagesEnabled: ko.pureComputed(() => true),
    };

    const messageTimerButtonPage = new MessageTimerButtonPage({
      conversation: conversation as Conversation,
      teamState: mockTeamState as TeamState,
    });

    expect(messageTimerButtonPage.getMessageTimerButton().exists()).toBe(true);
    expect(messageTimerButtonPage.getMessageTimerIcon().exists()).toBe(false);
    expect(messageTimerButtonPage.getMessageTimerButtonValue().text()).toBe(minutes.toString());
    expect(messageTimerButtonPage.getMessageTimerButtonSymbol().text()).toBe('m');
    expect(messageTimerButtonPage.getMessageTimerElement().prop('data-uie-value')).toBe('disabled');
  });

  it('shows the disabled message timer button when team message timer is enforced', () => {
    const minutes = 10;
    const duration = TIME_IN_MILLIS.MINUTE * minutes;

    const conversation: Partial<Conversation> = {
      hasGlobalMessageTimer: ko.pureComputed(() => false),
      messageTimer: ko.pureComputed(() => duration),
    };

    const mockTeamState: Partial<TeamState> = {
      isSelfDeletingMessagesEnabled: ko.pureComputed(() => true),
      isSelfDeletingMessagesEnforced: ko.pureComputed(() => true),
    };

    const messageTimerButtonPage = new MessageTimerButtonPage({
      conversation: conversation as Conversation,
      teamState: mockTeamState as TeamState,
    });

    expect(messageTimerButtonPage.getMessageTimerButton().exists()).toBe(true);
    expect(messageTimerButtonPage.getMessageTimerIcon().exists()).toBe(false);
    expect(messageTimerButtonPage.getMessageTimerButtonValue().text()).toBe(minutes.toString());
    expect(messageTimerButtonPage.getMessageTimerButtonSymbol().text()).toBe('m');
    expect(messageTimerButtonPage.getMessageTimerElement().prop('data-uie-value')).toBe('disabled');
  });

  it(`doesn't activate the context menu on a disabled message timer button`, () => {
    jest.spyOn(Context, 'showContextMenu').mockClear();
    const minutes = 10;
    const duration = TIME_IN_MILLIS.MINUTE * minutes;

    const conversation: Partial<Conversation> = {
      hasGlobalMessageTimer: ko.pureComputed(() => true),
      messageTimer: ko.pureComputed(() => duration),
    };

    const mockTeamState: Partial<TeamState> = {
      isSelfDeletingMessagesEnabled: ko.pureComputed(() => true),
    };

    const messageTimerButtonPage = new MessageTimerButtonPage({
      conversation: conversation as Conversation,
      teamState: mockTeamState as TeamState,
    });

    expect(messageTimerButtonPage.getMessageTimerElement().prop('data-uie-value')).toBe('disabled');

    expect(Context.showContextMenu).toHaveBeenCalledTimes(0);
    messageTimerButtonPage.clickMessageTimerElement();
    expect(Context.showContextMenu).toHaveBeenCalledTimes(0);
  });
});
