/*
 * Wire
 * Copyright (C) 2020 Wire Swiss GmbH
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

import {MessageHandler} from '@wireapp/bot-api';
import {PayloadBundle, PayloadBundleSource, PayloadBundleType} from '@wireapp/core/lib/conversation/';
import {Prompt, Wizardy} from 'wizardy';
import {QuotableMessage} from '@wireapp/core/lib/conversation/message/OtrMessage';
import {TextContent} from '@wireapp/core/lib/conversation/content';

export {Prompt};

export class WizardHandler<P> extends MessageHandler {
  private wizards: {[id: string]: Wizardy} = {};

  constructor(
    private readonly startCommand: string,
    private readonly questionnaire: Prompt<any>[],
    private readonly onFinish: (answers: P, conversationId: string, userId: string) => any,
  ) {
    super();
  }

  private getId(conversationId: string, userId: string): string {
    return `${conversationId}@${userId}`;
  }

  private getWizard(conversationId: string, userId: string): Wizardy {
    const id = this.getId(conversationId, userId);
    if (this.wizards[id]) {
      return this.wizards[id];
    }
    const wizard = new Wizardy();
    wizard.on(Wizardy.TOPIC.END, (answers: any) => {
      this.onFinish(answers, conversationId, userId);
      const id = this.getId(conversationId, userId);
      delete this.wizards[id];
    });
    this.initWizard(wizard);
    this.wizards[id] = wizard;
    return this.wizards[id];
  }

  private initWizard(wizard: Wizardy) {
    wizard.reset();
    wizard.addQuestions(this.questionnaire);
  }

  async handleEvent(payload: PayloadBundle): Promise<void> {
    if (payload.source === PayloadBundleSource.NOTIFICATION_STREAM) {
      return;
    }

    if (payload.type !== PayloadBundleType.TEXT) {
      return;
    }

    const text = (payload.content as TextContent).text.trim();
    if (text.length === 0) {
      return;
    }

    const {conversation: conversationId, from: userId} = payload;
    const wizard = this.getWizard(conversationId, userId);

    let reply = '';

    if (!wizard.inConversation && text === this.startCommand) {
      reply = wizard.ask();
    } else if (wizard.inConversation) {
      reply = wizard.answer(text);

      if (!wizard.inConversation) {
        this.initWizard(wizard);
      } else {
        reply += ` ${wizard.ask()}`;
      }
    }

    if (reply.length > 0) {
      return this.sendReply(conversationId, payload as QuotableMessage, reply);
    }
  }
}
