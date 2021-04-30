import React from 'react';
import Icon from './Icon';

export interface VerifiedIconProps {
  className?: string;
  dataUieName?: string;
  isVerified: boolean;
}

const VerifiedIcon: React.FC<VerifiedIconProps> = ({isVerified, dataUieName, className}) => {
  return isVerified ? (
    <Icon.Verified className={className ?? 'verified-icon'} data-uie-name={dataUieName ?? 'user-device-verified'} />
  ) : (
    <Icon.NotVerified
      className={className ?? 'not-verified-icon'}
      data-uie-name={dataUieName ?? 'user-device-not-verified'}
    />
  );
};

export default VerifiedIcon;
