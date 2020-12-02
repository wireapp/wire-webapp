import React from 'react';
import {keyframes} from '@emotion/core';
import {registerReactComponent} from 'Util/ComponentUtil';
import SVGProvider from '../../auth/util/SVGProvider';

const fadeAnimation = keyframes`
  0%   { opacity: 0; }
  100% { opacity: 1; }
`;

interface ParticipantMicOnIconProps {
  activeColor?: string;
  className?: string;
  isActive?: boolean;
}

const ParticipantMicOnIcon: React.FC<ParticipantMicOnIconProps> = ({
  className,
  isActive = false,
  activeColor = '#fff',
  ...props
}) => {
  return (
    <span css={{animation: `${fadeAnimation} 1s ease infinite alternate`}} className={className} {...props}>
      <svg
        css={{
          '> path': {
            fill: isActive ? `${activeColor} !important` : '#fff',
          },
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
  optionalParams: ['activeColor', 'className', 'isActive'],
  template: '<span data-bind="react: {activeColor: ko.unwrap(activeColor), className, isActive}"></span>',
});
