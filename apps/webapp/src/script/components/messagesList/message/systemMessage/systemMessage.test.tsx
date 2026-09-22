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

import {render, screen} from '@testing-library/react';

import {MemberRoleUpdateMessage} from 'Repositories/entity/message/memberRoleUpdateMessage';
import {MessageTimerUpdateMessage} from 'Repositories/entity/message/messageTimerUpdateMessage';
import {ReceiptModeUpdateMessage} from 'Repositories/entity/message/receiptModeUpdateMessage';
import {RenameMessage} from 'Repositories/entity/message/renameMessage';
import {SystemMessage as SystemMessageEntity} from 'Repositories/entity/message/systemMessage';
import {JoinedAfterMLSMigrationFinalisationMessage} from 'Repositories/entity/message/joinedAfterMlsMigrationFinalisationMessage';
import type {Translate} from 'Util/localizerUtil';
import {translateForTest} from 'Util/test/translateForTest';

import {SystemMessage} from './systemMessage';
import {SystemMessageBase} from './systemMessageBase';
import {Config} from 'src/script/Config';
import {withTheme} from 'src/script/auth/util/test/testUtil';

jest.mock('Components/icon', () => ({
  EditIcon: () => {
    return <span data-uie-name="editicon" className="editicon"></span>;
  },
  InfoIcon: () => {
    return <span data-uie-name="infoicon" className="infoicon"></span>;
  },
  ReadIcon: () => {
    return <span data-uie-name="readicon" className="readicon"></span>;
  },
  TimerIcon: () => {
    return <span data-uie-name="timericon" className="timericon"></span>;
  },
  __esModule: true,
}));

describe('SystemMessage', () => {
  it('shows edit icon for RenameMessage', async () => {
    const message = new RenameMessage('new name', undefined, undefined, translateForTest);

    render(<SystemMessage message={message} />);

    expect(screen.queryByTestId('element-message-system')).not.toBeNull();
    expect(screen.queryByTestId('editicon')).not.toBeNull();
  });

  it('shows timer icon for MessageTimerUpdateMessage', async () => {
    const message = new MessageTimerUpdateMessage(0, translateForTest);

    render(<SystemMessage message={message} />);

    expect(screen.queryByTestId('element-message-system')).not.toBeNull();
    expect(screen.queryByTestId('timericon')).not.toBeNull();
  });

  it('shows info icon and promotion caption for MemberRoleUpdateMessage', async () => {
    const message = new MemberRoleUpdateMessage(translateForTest);

    render(withTheme(<SystemMessage message={message} />));

    expect(screen.queryByTestId('element-message-system')).not.toBeNull();
  });

  it('renders the member role update bold caption as a React element', () => {
    const translatedCaption = '<strong>Sie</strong> wurden zum Gruppen-Admin ernannt';
    const translate: Translate = identifier => {
      if (identifier === 'conversationYouPromotedToAdmin') {
        return translatedCaption;
      }

      return identifier;
    };
    const message = new MemberRoleUpdateMessage(translate);

    render(withTheme(<SystemMessage message={message} />));

    expect(message.caption).toBe(translatedCaption);
    expect(screen.getByText('Sie', {selector: 'strong'})).toBeInTheDocument();
    expect(screen.queryByText(translatedCaption)).not.toBeInTheDocument();
  });

  it('keeps unsupported member role update markup as text', () => {
    const translatedCaption = '<img src="example">';
    const translate: Translate = identifier => {
      if (identifier === 'conversationYouPromotedToAdmin') {
        return translatedCaption;
      }

      return identifier;
    };
    const message = new MemberRoleUpdateMessage(translate);
    const {container} = render(withTheme(<SystemMessage message={message} />));
    const caption = container.querySelector('.system-message-caption');

    expect(caption).not.toBeNull();
    expect(caption?.textContent).toBe(translatedCaption);
    expect(caption?.querySelector('img')).toBeNull();
  });

  it('renders generic system message captions as React text', () => {
    const translatedCaption = '<strong>Generic caption</strong>';
    const message = new SystemMessageEntity(translateForTest);
    message.caption = translatedCaption;
    const {container} = render(<SystemMessageBase message={message} />);
    const caption = container.querySelector('.system-message-caption');

    expect(caption).not.toBeNull();
    expect(caption?.textContent).toBe(translatedCaption);
    expect(caption?.querySelector('strong')).toBeNull();
  });

  it('shows read icon for ReceiptModeUpdateMessage', async () => {
    const message = new ReceiptModeUpdateMessage(true, translateForTest);

    render(<SystemMessage message={message} />);

    expect(screen.queryByTestId('element-message-system')).not.toBeNull();
    expect(screen.queryByTestId('readicon')).not.toBeNull();
  });

  it('renders the MLS caption link with an application-controlled destination', () => {
    const mlsSupportUrl = 'https://support.example/mls';
    const originalConfig = Config.getConfig();
    const configSpy = jest.spyOn(Config, 'getConfig').mockReturnValue({
      ...originalConfig,
      URL: {
        ...originalConfig.URL,
        SUPPORT: {
          ...originalConfig.URL.SUPPORT,
          MLS_LEARN_MORE: mlsSupportUrl,
        },
      },
    });
    const translate: Translate = identifier => {
      if (identifier === 'conversationJoinedAfterMLSMigrationFinalisation') {
        return 'Before [link]Learn more[/link] after';
      }

      return identifier;
    };
    const message = new JoinedAfterMLSMigrationFinalisationMessage(translate);

    try {
      render(<SystemMessage message={message} />);

      const link = screen.getByRole('link', {name: 'Learn more'});
      expect(link).toHaveAttribute('href', mlsSupportUrl);
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'nofollow noopener noreferrer');
      expect(screen.getByTestId('element-message-system')).toHaveTextContent('Before Learn more after');
    } finally {
      configSpy.mockRestore();
    }
  });
});
