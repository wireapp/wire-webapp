/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import {keyframes} from '@emotion/react';

import {MicOnIcon} from 'Components/Icon';

const fadeAnimation = keyframes`
  0%   { opacity: 0.2; }
  100% { opacity: 1; }
`;

interface ParticipantMicOnIconProps {
  className?: string;
  color?: string;
  isActive?: boolean;
}

const ParticipantMicOnIcon = ({
  className,
  isActive = false,
  color = isActive ? 'var(--accent-color)' : 'currentColor',
  ...props
}: ParticipantMicOnIconProps) => {
  return (
    <span
      css={{
        animation: isActive ? `${fadeAnimation} 0.7s steps(7) infinite alternate` : 'initial',
        border: isActive ? '1px solid var(--accent-color)' : '1px solid transparent',
        borderRadius: '50%',
        padding: '2px',
      }}
      className={className}
      {...props}
    >
      <MicOnIcon
        data-uie-name="mic-icon-on"
        data-uie-active={isActive ? 'active' : 'inactive'}
        css={{
          '> path': {
            fill: color,
          },
        }}
        viewBox="0 0 16 16"
      />
    </span>
  );
};

export {ParticipantMicOnIcon};
