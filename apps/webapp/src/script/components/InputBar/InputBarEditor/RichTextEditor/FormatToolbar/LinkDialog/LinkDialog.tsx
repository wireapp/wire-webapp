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

import {useCallback, useEffect, useRef, useState, FormEvent} from 'react';

import is from '@sindresorhus/is';

import {Input, ErrorMessage, Button, ButtonVariant} from '@wireapp/react-ui-kit';

import * as Icon from 'Components/icon';
import {ModalComponent} from 'Components/Modals/ModalComponent';
import {RootContextValue, useApplicationContext} from 'src/script/page/rootProvider';

import {
  buttonGroupStyles,
  buttonStyles,
  closeButtonStyles,
  formStyles,
  headerStyles,
  titleStyles,
} from './LinkDialog.styles';

import {validateUrl} from '../../utils/url';

interface LinkDialogProps {
  isOpen: boolean;
  isEditing: boolean;
  onSubmit: (url: string, text?: string) => void;
  onClose: () => void;
  initialUrl?: string;
  initialText?: string;
}

interface FormData {
  url: string;
  text: string;
}

interface FormErrors {
  url?: string;
  text?: string;
}

export const LinkDialog = ({
  onSubmit,
  onClose,
  initialUrl = '',
  initialText = '',
  isOpen,
  isEditing,
}: LinkDialogProps) => {
  const {translate} = useApplicationContext();
  const [formData, setFormData] = useState<FormData>({
    url: initialUrl,
    text: initialText,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const textInputRef = useRef<HTMLInputElement>(null);
  const hasTextError = is.nonEmptyString(errors.text);
  const hasUrlError = is.nonEmptyString(errors.url);

  const resetForm = useCallback(() => {
    setFormData({url: initialUrl, text: initialText});
    setErrors({});
    setIsSubmitted(false);
  }, [initialUrl, initialText]);

  useEffect(() => {
    if (isOpen) {
      resetForm();
      // The setTimeout is needed here to ensure the input is mounted and visible in the DOM
      // This is necessary because the modal's animation needs to complete first.
      // The timeout does the trick.
      setTimeout(() => textInputRef.current?.focus());
    }
  }, [isOpen, initialUrl, initialText, resetForm]);

  const handleInputChange = ({event, field}: {event: FormEvent<HTMLInputElement>; field: keyof FormData}) => {
    const {value} = event.target as HTMLInputElement;
    setFormData(prev => ({...prev, [field]: value}));

    if (isSubmitted) {
      setErrors(prev => ({
        ...prev,
        [field]: !isFieldValid(field, value) ? getFieldError(field, translate) : undefined,
      }));
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsSubmitted(true);

    const isValid = validateForm(formData);

    if (isValid) {
      onSubmit(formData.url, formData.text);
    }
  };

  const validateForm = (data: FormData): boolean => {
    const newErrors: FormErrors = {
      url: !isFieldValid('url', data.url) ? getFieldError('url', translate) : undefined,
      text: !isFieldValid('text', data.text) ? getFieldError('text', translate) : undefined,
    };

    setErrors(newErrors);
    return !Object.values(newErrors).some(Boolean);
  };

  return (
    <ModalComponent isShown={isOpen} onBgClick={onClose}>
      <div css={headerStyles}>
        <h2 css={titleStyles}>
          {isEditing ? translate('richTextLinkDialogEditTitle') : translate('richTextLinkDialogNewTitle')}
        </h2>
        <button
          type="button"
          css={closeButtonStyles}
          onClick={onClose}
          aria-label={translate('modalCloseButton')}
          data-uie-name="do-close"
        >
          <Icon.CloseIcon aria-hidden="true" />
        </button>
      </div>
      <form css={formStyles} onSubmit={handleSubmit} noValidate>
        <Input
          ref={textInputRef}
          type="text"
          label={translate('richTextLinkDialogTextLabel')}
          value={formData.text}
          markInvalid={isSubmitted && hasTextError}
          onChange={event => handleInputChange({event, field: 'text'})}
          error={isSubmitted && hasTextError ? <ErrorMessage>{errors.text}</ErrorMessage> : undefined}
        />
        <Input
          type="text"
          label={translate('richTextLinkDialogLinkLabel')}
          value={formData.url}
          markInvalid={isSubmitted && hasUrlError}
          onChange={event => handleInputChange({event, field: 'url'})}
          error={isSubmitted && hasUrlError ? <ErrorMessage>{errors.url}</ErrorMessage> : undefined}
        />
        <div css={buttonGroupStyles}>
          <Button type="button" onClick={onClose} variant={ButtonVariant.SECONDARY} css={buttonStyles}>
            {translate('richTextLinkDialogCancelButton')}
          </Button>
          <Button type="submit" variant={ButtonVariant.PRIMARY} css={buttonStyles}>
            {isEditing ? translate('richTextLinkDialogEditButton') : translate('richTextLinkDialogNewButton')}
          </Button>
        </div>
      </form>
    </ModalComponent>
  );
};

const isFieldValid = (field: keyof FormData, value: string): boolean => {
  const fieldValidators = {
    url: validateUrl,
    text: (value: string) => value.length > 0,
  } as const;

  return fieldValidators[field](value) ?? true;
};

function getFieldError(field: keyof FormData, translate: RootContextValue['translate']): string {
  const fieldErrors = {
    url: translate('richTextLinkDialogLinkError'),
    text: translate('richTextLinkDialogTextError'),
  } as const;

  return fieldErrors?.[field] || '';
}
