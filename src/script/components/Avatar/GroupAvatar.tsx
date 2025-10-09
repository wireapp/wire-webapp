/*
 * Wire
 * Copyright (C) 2020 Wire Swiss GmbH
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

import {getGroupAvatarColors} from 'Util/avatarUtil';
import {CSS_SQUARE} from 'Util/CSSMixin';

interface GroupAvatarProps {
  size?: 'small' | 'large';
  className?: string;
  conversationID?: string;
}

export const GroupAvatar = ({conversationID, className, size = 'large'}: GroupAvatarProps) => {
  const colors = getGroupAvatarColors(conversationID);

  return (
    <div
      className={className}
      css={{
        ...CSS_SQUARE(size === 'small' ? 16 : 32),
        border: `${size === 'small' ? 0.5 : 1}px solid var(--border-color)`,
        borderRadius: size === 'small' ? 4 : 8,
      }}
    >
      <div
        css={{
          ...CSS_SQUARE(size === 'small' ? '100%' : 28),
          backgroundColor: 'var(--group-icon-bg)',
          display: 'flex',
          flexWrap: 'wrap',
          margin: size === 'small' ? 0 : 1,
          overflow: 'hidden',
          borderRadius: size === 'small' ? 4 : 7,
        }}
        data-uie-name="group-avatar-box-wrapper"
      >
        <svg
          css={{margin: 'auto'}}
          width={size === 'small' ? 12 : 20}
          height={size === 'small' ? 'auto' : 28}
          viewBox="0 0 20 10"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M4.12305 4.98438C3.18555 4.98438 2.39941 4.14941 2.39941 3.09473C2.39453 2.05957 3.19043 1.23926 4.12305 1.23926C5.05566 1.23926 5.85156 2.04492 5.85156 3.08984C5.85156 4.14941 5.06055 4.98438 4.12305 4.98438ZM1.45215 9.43262C0.768555 9.43262 0.519531 9.13965 0.519531 8.62695C0.519531 7.32324 1.95508 5.72656 4.12305 5.72656C4.98242 5.72656 5.68555 5.97559 6.21777 6.3125C5.08496 7.21094 4.54785 8.68066 5.0752 9.43262H1.45215Z"
            fill={colors[0]}
          />
          <path
            d="M9.92285 4.87402C8.84375 4.87402 7.94531 3.91699 7.94043 2.70117C7.94043 1.51465 8.84863 0.567383 9.92285 0.567383C10.9971 0.567383 11.9053 1.5 11.9053 2.69141C11.9053 3.91699 11.002 4.87402 9.92285 4.87402ZM6.89551 9.42969C6.06543 9.42969 5.78223 9.1709 5.78223 8.70703C5.78223 7.45215 7.38867 5.7334 9.92285 5.7334C12.4521 5.7334 14.0586 7.45215 14.0586 8.70703C14.0586 9.1709 13.7754 9.42969 12.9453 9.42969H6.89551Z"
            fill={colors[1]}
          />
          <path
            d="M15.877 4.98438C14.9346 4.98438 14.1484 4.14941 14.1484 3.08984C14.1484 2.04492 14.9443 1.23926 15.877 1.23926C16.8096 1.23926 17.6055 2.05957 17.6006 3.09473C17.6006 4.14941 16.8145 4.98438 15.877 4.98438ZM18.5479 9.43262H14.9248C15.4521 8.68066 14.915 7.21094 13.7822 6.3125C14.3145 5.97559 15.0176 5.72656 15.877 5.72656C18.0449 5.72656 19.4805 7.32324 19.4805 8.62695C19.4805 9.13965 19.2314 9.43262 18.5479 9.43262Z"
            fill={colors[2]}
          />
        </svg>
      </div>
    </div>
  );
};
