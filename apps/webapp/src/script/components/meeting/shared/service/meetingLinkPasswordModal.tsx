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

import {useRef, useState} from 'react';

import {isNonEmptyString} from '@sindresorhus/is';

import {MeetingLinkForm} from 'Components/meeting/shared/meetingLinkForm/meetingLinkForm';
import {
  getMeetingPasswordErrors,
  type MeetingPasswordErrorKey,
} from 'Components/meeting/shared/validation/meetingPasswordValidation';
import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import type {Translate} from 'Util/localizerUtil';
import {createUuid} from 'Util/uuid';

type MeetingLinkPasswordModalHandle = {
  submit: () => Promise<void>;
};

type MeetingLinkPasswordFormProps = {
  handle: MeetingLinkPasswordModalHandle;
  onCreate: (password: string) => Promise<void>;
  translate: Translate;
};

const MeetingLinkPasswordForm = ({handle, onCreate, translate}: MeetingLinkPasswordFormProps) => {
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [errors, setErrors] = useState<{
    password?: MeetingPasswordErrorKey;
    passwordConfirmation?: MeetingPasswordErrorKey;
  }>({});
  const passwordInputRef = useRef<HTMLInputElement>(null);

  handle.submit = async () => {
    const nextErrors = getMeetingPasswordErrors(password, passwordConfirmation);
    setErrors(nextErrors);
    if (nextErrors.password !== undefined || nextErrors.passwordConfirmation !== undefined) {
      return;
    }
    await onCreate(password);
  };

  return (
    <MeetingLinkForm
      translate={translate}
      onGeneratePassword={generatedPassword => {
        setPassword(generatedPassword);
        setPasswordConfirmation(generatedPassword);
        setErrors({});
      }}
      passwordValue={password}
      passwordValueRef={passwordInputRef}
      passwordError={errors.password === undefined ? undefined : translate(errors.password)}
      passwordConfirmationError={
        errors.passwordConfirmation === undefined ? undefined : translate(errors.passwordConfirmation)
      }
      onPasswordValueChange={nextPassword => {
        setPassword(nextPassword);
        setErrors(getMeetingPasswordErrors(nextPassword, passwordConfirmation));
      }}
      isPasswordInputMarkInvalid={isNonEmptyString(errors.password)}
      passwordConfirmationValue={passwordConfirmation}
      onPasswordConfirmationChange={nextConfirmation => {
        setPasswordConfirmation(nextConfirmation);
        setErrors(getMeetingPasswordErrors(password, nextConfirmation));
      }}
      isPasswordConfirmationMarkInvalid={isNonEmptyString(errors.passwordConfirmation)}
      copyDisabled={!isNonEmptyString(password) || errors.password !== undefined}
    />
  );
};

type ShowMeetingLinkPasswordFormParams = {
  onCreate: (password: string) => Promise<void>;
  rotate?: boolean;
  translate: Translate;
};

export const showMeetingLinkPasswordForm = ({
  onCreate,
  rotate = false,
  translate,
}: ShowMeetingLinkPasswordFormParams): string => {
  const handle: MeetingLinkPasswordModalHandle = {
    submit: async () => undefined,
  };
  const modalId = createUuid();

  PrimaryModal.show(
    PrimaryModal.type.CONFIRM,
    {
      closeOnConfirm: false,
      preventClose: true,
      primaryAction: {
        action: () => handle.submit(),
        text: translate(rotate ? 'meetings.meetingLink.rotate' : 'meetings.meetingLink.generate'),
      },
      secondaryAction: {text: translate('meetings.meetingLink.close')},
      text: {
        closeBtnLabel: translate('meetings.meetingLink.close'),
        message: <MeetingLinkPasswordForm handle={handle} onCreate={onCreate} translate={translate} />,
        title: translate('meetings.meetingLink.title'),
      },
    },
    modalId,
    translate,
  );

  return modalId;
};
