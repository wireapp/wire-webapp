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

import {ChangeEvent, useCallback, useEffect, useRef, useState} from 'react';

import {Input, ErrorMessage} from '@wireapp/react-ui-kit';

import * as Icon from 'Components/Icon';
import {ModalComponent} from 'Components/Modals/ModalComponent';

import {
  buttonGroupStyles,
  closeButtonStyles,
  formStyles,
  headerStyles,
  inputWrapperStyles,
  titleStyles,
} from './LinkDialog.styles';

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
  const urlInputRef = useRef<HTMLInputElement>(null);

  const resetForm = useCallback(() => {
    setFormData({url: initialUrl, text: initialText});
    setErrors({});
    setIsSubmitted(false);
  }, [initialUrl, initialText]);

  useEffect(() => {
    if (isOpen) {
      resetForm();
      setTimeout(() => urlInputRef.current?.focus(), 100);
    }
  }, [isOpen, initialUrl, initialText, resetForm]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    const {url, text} = formData;

    if (!url) {
      newErrors.url = 'URL is required';
    } else if (!/^https?:\/\//i.test(url)) {
      newErrors.url = 'URL must start with http:// or https://';
    }

    if (!text) {
      newErrors.text = 'Text is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof FormData) => (event: ChangeEvent<HTMLInputElement>) => {
    const {value} = event.target;
    setFormData(prev => ({...prev, [field]: value}));

    if (isSubmitted) {
      validateForm();
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitted(true);

    if (validateForm()) {
      onSubmit(formData.url, formData.text);
    }
  };

  return (
    <ModalComponent isShown={isOpen} onBgClick={onClose}>
      <div css={headerStyles}>
        <h2 css={titleStyles}>{isEditing ? 'Edit Link' : 'Add Link'}</h2>
        <button type="button" css={closeButtonStyles} onClick={onClose} aria-label="Close" data-uie-name="do-close">
          <Icon.CloseIcon className="modal__header__icon" aria-hidden="true" />
        </button>
      </div>
      <form css={formStyles} onSubmit={handleSubmit}>
        <div css={inputWrapperStyles}>
          <Input
            id="link-text"
            type="text"
            label="Text"
            value={formData.text}
            placeholder="Text"
            markInvalid={isSubmitted && !!errors.text}
            onChange={handleInputChange('text')}
          />
          {isSubmitted && errors.text && <ErrorMessage>{errors.text}</ErrorMessage>}
        </div>

        <div css={inputWrapperStyles}>
          <Input
            id="link-url"
            type="text"
            label="URL"
            value={formData.url}
            placeholder="Enter URL"
            markInvalid={isSubmitted && !!errors.url}
            onChange={handleInputChange('url')}
          />
          {isSubmitted && errors.url && <ErrorMessage>{errors.url}</ErrorMessage>}
        </div>
        <div css={buttonGroupStyles}>
          <button type="button" className="modal__button modal__button--secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="modal__button modal__button--primary">
            {isEditing ? 'Update Link' : 'Add Link'}
          </button>
        </div>
      </form>
    </ModalComponent>
  );
};
