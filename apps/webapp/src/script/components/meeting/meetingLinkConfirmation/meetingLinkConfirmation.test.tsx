import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {ThemeProvider} from '@wireapp/react-ui-kit';
import {toast} from 'sonner';
import {task} from 'true-myth';

import {MeetingLinkConfirmationMessage} from './meetingLinkConfirmation';

describe('MeetingLinkConfirmationMessage', () => {
  it('switches from unavailable text to the link actions after a successful retry', async () => {
    const meetingLink = {meetingLink: 'https://wire.example/meeting-link', hasPassword: false};
    const translate = (key: string) => key;

    render(
      <ThemeProvider>
        <MeetingLinkConfirmationMessage
          meetingLinkUnavailable
          meetingLinkUnavailableForHost
          retryMeetingLink={() => task.resolve(meetingLink)}
          translate={translate}
        />
      </ThemeProvider>,
    );

    expect(screen.getByText('meetings.meetingLink.unavailableForHost')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name: 'meetings.meetingLink.retry'}));

    await waitFor(() => {
      expect(screen.getByText('meetings.meetingLink.description')).toBeInTheDocument();
      expect(screen.getByRole('button', {name: 'meetings.meetingLink.copyLink'})).toBeInTheDocument();
    });
  });

  it('shows a load error and keeps the retry state when retry fails', async () => {
    const toastError = jest.spyOn(toast, 'error').mockImplementation(jest.fn());
    const translate = (key: string) => key;

    render(
      <ThemeProvider>
        <MeetingLinkConfirmationMessage
          meetingLinkUnavailable
          meetingLinkUnavailableForHost
          retryMeetingLink={() => task.reject(new Error('request failed'))}
          translate={translate}
        />
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByRole('button', {name: 'meetings.meetingLink.retry'}));

    await waitFor(() => expect(toastError).toHaveBeenCalledWith('meetings.meetingLink.loadFailed'));
    expect(screen.getByText('meetings.meetingLink.unavailableForHost')).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'meetings.meetingLink.retry'})).toBeInTheDocument();
  });
});
