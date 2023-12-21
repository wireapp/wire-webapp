/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {useRef} from 'react';

import {TabIndex} from '@wireapp/react-ui-kit/lib/types/enums';

import {Icon} from 'Components/Icon';
import {t} from 'Util/LocalizerUtil';

interface ImageUploadButtonProps {
  onSelectImages: (files: File[]) => void;
  acceptedImageTypes: ReadonlyArray<string>;
}

export const ImageUploadButton = ({onSelectImages, acceptedImageTypes}: ImageUploadButtonProps) => {
  const imageRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const handleImageFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const {files} = event.target;

    if (!files) {
      return;
    }

    onSelectImages(Array.from(files));
    formRef.current?.reset();
  };

  return (
    <form ref={formRef}>
      <button
        type="button"
        aria-label={t('tooltipConversationAddImage')}
        title={t('tooltipConversationAddImage')}
        className="conversation-button controls-right-button no-radius file-button"
        onClick={() => imageRef.current?.click()}
        data-uie-name="do-share-image"
      >
        <Icon.Image />

        <input
          ref={imageRef}
          accept={acceptedImageTypes.join(',')}
          tabIndex={TabIndex.UNFOCUSABLE}
          id="conversation-input-bar-photo"
          onChange={handleImageFileChange}
          type="file"
          multiple
        />
      </button>
    </form>
  );
};
