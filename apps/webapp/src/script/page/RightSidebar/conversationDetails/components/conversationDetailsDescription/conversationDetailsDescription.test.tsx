/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {fireEvent, render, screen} from '@testing-library/react';
import {userEvent} from '@testing-library/user-event';

import {ConversationDetailsDescription} from './conversationDetailsDescription';

const MAX_DESCRIPTION_LENGTH = 200;

describe('ConversationDetailsDescription', () => {
  const onDescriptionChange = jest.fn();

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('filled state', () => {
    it('renders the description heading and text', () => {
      const description = 'This is the channel description';

      render(<ConversationDetailsDescription description={description} onDescriptionChange={onDescriptionChange} />);

      expect(screen.getByText('conversationDetailsDescription')).not.toBeNull();
      expect(screen.getByText(description)).not.toBeNull();
    });
  });

  describe('empty state', () => {
    it('renders the placeholder when description is empty', () => {
      render(<ConversationDetailsDescription description="" onDescriptionChange={onDescriptionChange} />);

      expect(screen.getByTestId('conversation-details-description')).not.toBeNull();
      expect(screen.getByText('conversationDetailsDescriptionPlaceholder')).not.toBeNull();
    });

    it('renders the placeholder when description is undefined', () => {
      render(<ConversationDetailsDescription onDescriptionChange={onDescriptionChange} />);

      expect(screen.getByText('conversationDetailsDescriptionPlaceholder')).not.toBeNull();
    });
  });

  describe('hover state', () => {
    it('shows the edit icon on hover when description exists and editing is allowed', async () => {
      const description = 'Some description';
      render(<ConversationDetailsDescription description={description} onDescriptionChange={onDescriptionChange} />);

      const section = screen.getByTestId('conversation-details-description');

      expect(screen.queryByTestId('description-edit-icon')).toBeNull();

      fireEvent.mouseEnter(section);

      expect(screen.getByTestId('description-edit-icon')).not.toBeNull();

      fireEvent.mouseLeave(section);

      expect(screen.queryByTestId('description-edit-icon')).toBeNull();
    });

    it('does not show the edit icon when editing is not allowed', () => {
      const description = 'Some description';
      render(
        <ConversationDetailsDescription
          canEdit={false}
          description={description}
          onDescriptionChange={onDescriptionChange}
        />,
      );

      fireEvent.mouseEnter(screen.getByTestId('conversation-details-description'));

      expect(screen.queryByTestId('description-edit-icon')).toBeNull();
    });

    it('enters edit mode when clicking the edit icon', async () => {
      const description = 'Some description';
      render(<ConversationDetailsDescription description={description} onDescriptionChange={onDescriptionChange} />);

      const section = screen.getByTestId('conversation-details-description');
      fireEvent.mouseEnter(section);

      const editIcon = screen.getByTestId('description-edit-icon');
      await userEvent.click(editIcon);

      expect(screen.getByTestId('description-textarea')).not.toBeNull();
    });
  });

  describe('rendered description', () => {
    it('renders line breaks and links like chat messages', () => {
      const description = 'First line\nhttps://wire.com';

      render(<ConversationDetailsDescription description={description} onDescriptionChange={onDescriptionChange} />);

      const link = screen.getByRole('link', {name: 'https://wire.com'});
      expect(link).toHaveAttribute('href', 'https://wire.com');
      expect(link).toHaveAttribute('target', '_blank');
      expect(screen.getByTestId('description-text').innerHTML).toContain('First line<br>');
    });

    it('escapes html when rendering the description', () => {
      render(
        <ConversationDetailsDescription
          description={'<img src=x onerror=alert(1)>\nhttps://wire.com'}
          onDescriptionChange={onDescriptionChange}
        />,
      );

      expect(screen.getByTestId('description-text').querySelector('img')).toBeNull();
      expect(screen.getByText('<img src=x onerror=alert(1)>')).not.toBeNull();
    });
  });

  describe('editing state', () => {
    it('enters edit mode when clicking the description text and editing is allowed', async () => {
      const description = 'Existing description';
      render(<ConversationDetailsDescription description={description} onDescriptionChange={onDescriptionChange} />);

      const descriptionText = screen.getByText(description);
      await userEvent.click(descriptionText);

      const textarea = screen.getByTestId('description-textarea');
      expect(textarea).not.toBeNull();
      expect(textarea).toHaveValue(description);
    });

    it('does not enter edit mode when clicking description text and editing is not allowed', async () => {
      const description = 'Existing description';
      render(
        <ConversationDetailsDescription
          canEdit={false}
          description={description}
          onDescriptionChange={onDescriptionChange}
        />,
      );

      await userEvent.click(screen.getByText(description));

      expect(screen.queryByTestId('description-textarea')).toBeNull();
    });

    it('enters edit mode when clicking the placeholder', async () => {
      render(<ConversationDetailsDescription description="" onDescriptionChange={onDescriptionChange} />);

      const placeholder = screen.getByText('conversationDetailsDescriptionPlaceholder');
      await userEvent.click(placeholder);

      expect(screen.getByTestId('description-textarea')).not.toBeNull();
    });

    it('saves on blur and calls onDescriptionChange', async () => {
      const description = 'Old description';
      render(<ConversationDetailsDescription description={description} onDescriptionChange={onDescriptionChange} />);

      await userEvent.click(screen.getByText(description));

      const textarea = screen.getByTestId('description-textarea');
      await userEvent.clear(textarea);
      await userEvent.type(textarea, 'New description');

      fireEvent.blur(textarea);

      expect(onDescriptionChange).toHaveBeenCalledWith('New description');
    });

    it('allows multiple lines and saves them on blur', async () => {
      const description = 'Old description';
      render(<ConversationDetailsDescription description={description} onDescriptionChange={onDescriptionChange} />);

      await userEvent.click(screen.getByText(description));

      const textarea = screen.getByTestId('description-textarea');
      await userEvent.clear(textarea);
      fireEvent.change(textarea, {target: {value: 'First line\nSecond line'}});

      expect(onDescriptionChange).not.toHaveBeenCalled();

      fireEvent.blur(textarea);

      expect(onDescriptionChange).toHaveBeenCalledWith('First line\nSecond line');
    });

    it('cancels editing on Escape key without saving', async () => {
      const description = 'Original text';
      render(<ConversationDetailsDescription description={description} onDescriptionChange={onDescriptionChange} />);

      await userEvent.click(screen.getByText(description));

      const textarea = screen.getByTestId('description-textarea');
      await userEvent.clear(textarea);
      await userEvent.type(textarea, 'Changed text');
      await userEvent.keyboard('{Escape}');

      expect(onDescriptionChange).not.toHaveBeenCalled();
      expect(screen.queryByTestId('description-textarea')).toBeNull();
      expect(screen.getByText(description)).not.toBeNull();
    });

    it('does not call onDescriptionChange when value is unchanged', async () => {
      const description = 'Same text';
      render(<ConversationDetailsDescription description={description} onDescriptionChange={onDescriptionChange} />);

      await userEvent.click(screen.getByText(description));

      const textarea = screen.getByTestId('description-textarea');
      fireEvent.blur(textarea);

      expect(onDescriptionChange).not.toHaveBeenCalled();
    });

    it('enforces the max character limit', async () => {
      render(<ConversationDetailsDescription description="" onDescriptionChange={onDescriptionChange} />);

      await userEvent.click(screen.getByText('conversationDetailsDescriptionPlaceholder'));

      const textarea = screen.getByTestId('description-textarea');
      expect(textarea).toHaveAttribute('maxLength', String(MAX_DESCRIPTION_LENGTH));
    });
  });
});
