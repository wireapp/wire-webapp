import React from 'react';
import NamedIcon from './NamedIcon';

export interface VerifiedIconProps {
  className?: string;
  dataUieName?: string;
  height?: number;
  isVerified: boolean;
  width?: number;
}

const VerifiedIcon: React.FC<VerifiedIconProps> = ({isVerified, dataUieName, className, width = 14, height = 16}) => {
  return (
    <NamedIcon
      width={width}
      height={height}
      className={className || isVerified ? 'verified-icon' : 'not-verified-icon'}
      name={isVerified ? 'verified-icon' : 'not-verified-icon'}
      data-uie-name={dataUieName || isVerified ? 'user-device-verified' : 'user-device-not-verified'}
    />
  );
};

export default VerifiedIcon;
