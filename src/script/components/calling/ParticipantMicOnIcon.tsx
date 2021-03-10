import React from 'react';
import {keyframes} from '@emotion/core';
import {registerReactComponent} from 'Util/ComponentUtil';
import SVGProvider from '../../auth/util/SVGProvider';
import {UserState} from '../../user/UserState';
import {container} from 'tsyringe';

const fadeAnimation = keyframes`
  0%   { opacity: 0.2; }
  100% { opacity: 1; }
`;

interface ParticipantMicOnIconProps {
  className?: string;
  color?: string;
  isActive?: boolean;
}

const ParticipantMicOnIcon: React.FC<ParticipantMicOnIconProps> = ({
  className,
  isActive = false,
  color = '#fff',
  ...props
}) => {
  const userState = container.resolve(UserState);
  return (
    <span
      css={{animation: isActive ? `${fadeAnimation} 0.7s steps(7) infinite alternate` : 'initial'}}
      className={className}
      {...props}
    >
      <svg
        data-uie-name="mic-icon-on"
        data-uie-active={isActive ? 'active' : 'inactive'}
        css={{
          '> path': {
            fill: isActive ? `${userState.self().accent_color()} !important` : color,
          },
          width: 16,
        }}
        viewBox="0 0 16 16"
        dangerouslySetInnerHTML={{__html: SVGProvider['mic-on-icon']?.documentElement?.innerHTML}}
      ></svg>
    </span>
  );
};

export default ParticipantMicOnIcon;

registerReactComponent('participant-mic-on-icon', {
  component: ParticipantMicOnIcon,
  optionalParams: ['className', 'isActive', 'color'],
  template: '<span data-bind="react: {className, isActive: ko.unwrap(isActive), color}"></span>',
});
