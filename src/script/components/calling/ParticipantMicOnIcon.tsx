import React from 'react';
import {keyframes} from '@emotion/core';
import {registerReactComponent} from 'Util/ComponentUtil';
import SVGProvider from '../../auth/util/SVGProvider';
import {UserState} from '../../user/UserState';
import {container} from 'tsyringe';

const fadeAnimation = keyframes`
  0%   { opacity: 0; }
  100% { opacity: 1; }
`;

interface ParticipantMicOnIconProps {
  className?: string;
  isActive?: boolean;
}

const ParticipantMicOnIcon: React.FC<ParticipantMicOnIconProps> = ({className, isActive = false, ...props}) => {
  const userState = container.resolve(UserState);
  return (
    <span css={{animation: `${fadeAnimation} 1s ease infinite alternate`}} className={className} {...props}>
      <svg
        css={{
          '> path': {
            fill: isActive ? `${userState.self().accent_color()} !important` : '#fff',
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
  optionalParams: ['className', 'isActive'],
  template: '<span data-bind="react: {className, isActive}"></span>',
});
