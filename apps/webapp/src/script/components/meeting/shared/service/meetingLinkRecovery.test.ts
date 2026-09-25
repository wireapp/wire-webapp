import {StatusCodes as HTTP_STATUS} from 'http-status-codes';
import {task} from 'true-myth';

import * as MeetingLinkConfirmation from '../../meetingLinkConfirmation/meetingLinkConfirmation';
import * as MeetingLinkPasswordModal from './meetingLinkPasswordModal';
import {PrimaryModal, usePrimaryModalState} from 'Components/Modals/PrimaryModal';
import {translateForTest} from 'Util/test/translateForTest';

import {
  classifyMeetingLinkError,
  generateMeetingConversationCode,
  recoverMeetingConversationCode,
  rotateMeetingConversationCode,
  showMeetingLinkPasswordModal,
} from './meetingLinkRecovery';

const conversationId = {id: 'conversation-id', domain: 'example.com'};
const existingLink = {meetingLink: 'https://wire.example/existing', hasPassword: true};

describe('classifyMeetingLinkError', () => {
  it.each([
    [{isAxiosError: true, response: {status: HTTP_STATUS.NOT_FOUND}}, 'missing'],
    [{code: HTTP_STATUS.NOT_FOUND}, 'missing'],
    [{isAxiosError: true, response: {status: HTTP_STATUS.INTERNAL_SERVER_ERROR}}, 'unavailable'],
    [{request: {}}, 'unavailable'],
    [new Error('unknown'), 'unavailable'],
  ])('classifies %j as %s', (error, expected) => {
    expect(classifyMeetingLinkError(error)).toBe(expected);
  });
});

describe('recoverMeetingConversationCode', () => {
  it('returns an existing link without posting', async () => {
    const getMeetingConversationCode = jest.fn().mockReturnValue(task.resolve(existingLink));
    const requestMeetingConversationCode = jest.fn();

    const result = await recoverMeetingConversationCode(
      {getMeetingConversationCode, requestMeetingConversationCode},
      conversationId,
      'modal-password',
    ).toPromise();

    expect(result.match({Ok: value => value, Err: () => undefined})).toEqual(existingLink);
    expect(requestMeetingConversationCode).not.toHaveBeenCalled();
  });

  it('posts the entered password only after a 404', async () => {
    const getMeetingConversationCode = jest
      .fn()
      .mockReturnValue(task.reject({isAxiosError: true, response: {status: HTTP_STATUS.NOT_FOUND}}));
    const requestMeetingConversationCode = jest.fn().mockReturnValue(task.resolve(existingLink));

    const result = await recoverMeetingConversationCode(
      {getMeetingConversationCode, requestMeetingConversationCode},
      conversationId,
      'modal-password',
    ).toPromise();

    expect(result.match({Ok: value => value, Err: () => undefined})).toEqual(existingLink);
    expect(requestMeetingConversationCode).toHaveBeenCalledWith(conversationId, 'modal-password');
  });

  it('can generate directly without checking for an existing link', async () => {
    const getMeetingConversationCode = jest.fn();
    const requestMeetingConversationCode = jest.fn().mockReturnValue(task.resolve(existingLink));

    const result = await generateMeetingConversationCode(
      {getMeetingConversationCode, requestMeetingConversationCode},
      conversationId,
      'modal-password',
    ).toPromise();

    expect(result.match({Ok: value => value, Err: () => undefined})).toEqual(existingLink);
    expect(getMeetingConversationCode).not.toHaveBeenCalled();
  });

  it.each([
    {isAxiosError: true, response: {status: HTTP_STATUS.INTERNAL_SERVER_ERROR}},
    new Error('network failure'),
  ])('does not post for unavailable GET errors', async error => {
    const getMeetingConversationCode = jest.fn().mockReturnValue(task.reject(error));
    const requestMeetingConversationCode = jest.fn();

    const result = await recoverMeetingConversationCode(
      {getMeetingConversationCode, requestMeetingConversationCode},
      conversationId,
      'modal-password',
    ).toPromise();

    expect(result.isErr).toBe(true);
    expect(requestMeetingConversationCode).not.toHaveBeenCalled();
  });

  it('surfaces a POST failure and uses a later GET result without posting again', async () => {
    const getMeetingConversationCode = jest
      .fn()
      .mockReturnValueOnce(task.reject({isAxiosError: true, response: {status: HTTP_STATUS.NOT_FOUND}}))
      .mockReturnValueOnce(task.resolve(existingLink));
    const requestMeetingConversationCode = jest.fn().mockReturnValue(task.reject(new Error('post failed')));
    const operations = {getMeetingConversationCode, requestMeetingConversationCode};

    const firstResult = await recoverMeetingConversationCode(operations, conversationId, 'modal-password').toPromise();
    const secondResult = await recoverMeetingConversationCode(operations, conversationId, 'modal-password').toPromise();

    expect(firstResult.isErr).toBe(true);
    expect(secondResult.match({Ok: value => value, Err: () => undefined})).toEqual(existingLink);
    expect(requestMeetingConversationCode).toHaveBeenCalledTimes(1);
  });

  it('revokes before posting a rotated link', async () => {
    const revokeMeetingConversationCode = jest.fn().mockReturnValue(task.resolve(undefined));
    const getMeetingConversationCode = jest.fn();
    const requestMeetingConversationCode = jest.fn().mockReturnValue(task.resolve(existingLink));

    const result = await rotateMeetingConversationCode(
      {
        getMeetingConversationCode,
        revokeMeetingConversationCode,
        requestMeetingConversationCode,
      },
      conversationId,
      'modal-password',
    ).toPromise();

    expect(result.match({Ok: value => value, Err: () => undefined})).toEqual(existingLink);
    expect(revokeMeetingConversationCode).toHaveBeenCalledWith(conversationId);
    expect(requestMeetingConversationCode).toHaveBeenCalledWith(conversationId, 'modal-password');
    expect(revokeMeetingConversationCode.mock.invocationCallOrder[0]).toBeLessThan(
      requestMeetingConversationCode.mock.invocationCallOrder[0],
    );
  });

  it('uses the rotate label for the rotation password form', () => {
    const originalShow = PrimaryModal.show;
    PrimaryModal.show = jest.fn();

    try {
      MeetingLinkPasswordModal.showMeetingLinkPasswordForm({
        onCreate: jest.fn(),
        rotate: true,
        translate: translateForTest,
      });

      const options = (PrimaryModal.show as jest.Mock).mock.calls[0][1];
      expect(options.primaryAction.text).toBe('meetings.meetingLink.rotate');
    } finally {
      PrimaryModal.show = originalShow;
    }
  });

  it('ignores a recovery completion after its password modal is replaced', async () => {
    const modalId = 'meeting-link-password-modal';
    let submit: ((password: string) => Promise<void>) | undefined;
    let resolveRequest!: (meetingLink: typeof existingLink) => void;
    const requestPromise = new Promise<typeof existingLink>(resolve => {
      resolveRequest = resolve;
    });
    const showPasswordForm = jest.spyOn(MeetingLinkPasswordModal, 'showMeetingLinkPasswordForm').mockImplementation(
      ({onCreate}) => {
        submit = onCreate;
        return modalId;
      },
    );
    const showConfirmation = jest.spyOn(MeetingLinkConfirmation, 'showMeetingLinkConfirmation');

    usePrimaryModalState.setState({currentModalId: modalId});

    try {
      showMeetingLinkPasswordModal({
        conversationId,
        conversationRepository: {
          getMeetingConversationCode: jest.fn(),
          requestMeetingConversationCode: jest.fn().mockReturnValue(task.fromPromise(requestPromise)),
          revokeMeetingConversationCode: jest.fn(),
        },
        generate: true,
        translate: translateForTest,
      });

      const recovery = submit?.('modal-password');
      usePrimaryModalState.getState().updateCurrentModalId('replacement-modal');
      resolveRequest(existingLink);
      await recovery;

      expect(usePrimaryModalState.getState().currentModalId).toBe('replacement-modal');
      expect(showConfirmation).not.toHaveBeenCalled();
    } finally {
      showPasswordForm.mockRestore();
      showConfirmation.mockRestore();
      usePrimaryModalState.setState({currentModalId: null});
    }
  });
});
