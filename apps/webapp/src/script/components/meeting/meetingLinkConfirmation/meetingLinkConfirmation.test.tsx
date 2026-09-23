import {fireEvent, render, screen} from '@testing-library/react';
import {ThemeProvider} from '@wireapp/react-ui-kit';

import {MeetingLinkConfirmationMessage} from './meetingLinkConfirmation';

describe('MeetingLinkConfirmationMessage', () => {
  it('displays an existing link without a retry action', () => {
    const meetingLink = {meetingLink: 'https://wire.example/meeting-link', hasPassword: false};
    const translate = (key: string) => key;

    render(
      <ThemeProvider>
        <MeetingLinkConfirmationMessage meetingLink={meetingLink} translate={translate} />
      </ThemeProvider>,
    );

    expect(screen.getByText('meetings.meetingLink.description')).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'meetings.meetingLink.copyLink'})).toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'meetings.meetingLink.retry'})).not.toBeInTheDocument();
  });

  it('shows the unavailable state without a retry action', () => {
    const translate = (key: string) => key;

    render(
      <ThemeProvider>
        <MeetingLinkConfirmationMessage
          meetingLinkUnavailable
          meetingLinkUnavailableForHost
          translate={translate}
        />
      </ThemeProvider>,
    );

    expect(screen.getByText('meetings.meetingLink.unavailableForHost')).toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'meetings.meetingLink.retry'})).not.toBeInTheDocument();
  });

  it('offers hosts a generate action when the link is unavailable', () => {
    const onGenerateMeetingLink = jest.fn();
    const translate = (key: string) => key;

    render(
      <ThemeProvider>
        <MeetingLinkConfirmationMessage
          meetingLinkUnavailable
          meetingLinkUnavailableForHost
          onGenerateMeetingLink={onGenerateMeetingLink}
          translate={translate}
        />
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByRole('button', {name: 'meetings.meetingLink.generate'}));

    expect(onGenerateMeetingLink).toHaveBeenCalledTimes(1);
  });
});
