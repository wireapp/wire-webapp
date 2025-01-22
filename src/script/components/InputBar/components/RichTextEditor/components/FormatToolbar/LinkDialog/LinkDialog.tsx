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

import {Input, ErrorMessage, Button, ButtonVariant} from '@wireapp/react-ui-kit';

import * as Icon from 'Components/Icon';
import {ModalComponent} from 'Components/Modals/ModalComponent';
import {t} from 'Util/LocalizerUtil';

import {
  buttonGroupStyles,
  buttonStyles,
  closeButtonStyles,
  formStyles,
  headerStyles,
  titleStyles,
} from './LinkDialog.styles';

import {validateUrl} from '../../../utils/url';

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
  const [formData, setFormData] = useState<FormData>({
    url: initialUrl,
    text: initialText,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const textInputRef = useRef<HTMLInputElement>(null);

  const resetForm = useCallback(() => {
    setFormData({url: initialUrl, text: initialText});
    setErrors({});
    setIsSubmitted(false);
  }, [initialUrl, initialText]);

  useEffect(() => {
    if (isOpen) {
      resetForm();
      setTimeout(() => textInputRef.current?.focus());
    }
  }, [isOpen, initialUrl, initialText, resetForm]);

  const handleInputChange = ({event, field}: {event: FormEvent<HTMLInputElement>; field: keyof FormData}) => {
    const {value} = event.target as HTMLInputElement;
    setFormData(prev => ({...prev, [field]: value}));

    if (isSubmitted) {
      setErrors(prev => ({
        ...prev,
        [field]: !isFieldValid(field, value) ? getFieldError(field) : undefined,
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {
      url: !isFieldValid('url', formData.url) ? getFieldError('url') : undefined,
      text: !isFieldValid('text', formData.text) ? getFieldError('text') : undefined,
    };

    setErrors(newErrors);
    return !Object.values(newErrors).some(Boolean);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitted(true);

    const isValid = validateForm();

    if (isValid) {
      onSubmit(formData.url, formData.text);
    }
  };

  return (
    <ModalComponent isShown={isOpen} onBgClick={onClose}>
      <div css={headerStyles}>
        <h2 css={titleStyles}>{isEditing ? t('richTextLinkDialogEditTitle') : t('richTextLinkDialogNewTitle')}</h2>
        <button
          type="button"
          css={closeButtonStyles}
          onClick={onClose}
          aria-label={t('modalCloseButton')}
          data-uie-name="do-close"
        >
          <Icon.CloseIcon aria-hidden="true" />
        </button>
      </div>
      <form css={formStyles} onSubmit={handleSubmit}>
        <Input
          ref={textInputRef}
          id="link-text"
          type="text"
          label={t('richTextLinkDialogTextLabel')}
          value={formData.text}
          markInvalid={isSubmitted && !!errors.text}
          onChange={event => handleInputChange({event, field: 'text'})}
          error={!!isSubmitted && !!errors.text ? <ErrorMessage>{errors.text}</ErrorMessage> : undefined}
        />
        <Input
          id="link-url"
          type="text"
          label={t('richTextLinkDialogLinkLabel')}
          value={formData.url}
          markInvalid={isSubmitted && !!errors.url}
          onChange={event => handleInputChange({event, field: 'url'})}
          error={!!isSubmitted && !!errors.url ? <ErrorMessage>{errors.url}</ErrorMessage> : undefined}
        />
        <div css={buttonGroupStyles}>
          <Button onClick={onClose} variant={ButtonVariant.SECONDARY} css={buttonStyles}>
            {t('richTextLinkDialogCancelButton')}
          </Button>
          <Button type="submit" variant={ButtonVariant.PRIMARY} css={buttonStyles}>
            {isEditing ? t('richTextLinkDialogEditButton') : t('richTextLinkDialogNewButton')}
          </Button>
        </div>
      </form>
    </ModalComponent>
  );
};

const isFieldValid = (field: keyof FormData, value: string): boolean => {
  switch (field) {
    case 'url':
      return validateUrl(value);
    case 'text':
      return value.length > 0;
    default:
      return true;
  }
};

const getFieldError = (field: keyof FormData): string => {
  switch (field) {
    case 'url':
      return t('richTextLinkDialogLinkError');
    case 'text':
      return t('richTextLinkDialogTextError');
    default:
      return '';
  }
};
