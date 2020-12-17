import React from 'react';

import SVGProvider from '../auth/util/SVGProvider';

export interface NamedIconProps extends React.SVGProps<SVGSVGElement> {
  name: string;
}

const NamedIcon: React.FC<NamedIconProps> = ({name, children, ...otherProps}) => {
  const props = {
    viewBox: `0 0 ${otherProps.width || 16} ${otherProps.height || 16}`,
    ...otherProps,
  };

  return <svg {...props} dangerouslySetInnerHTML={{__html: SVGProvider[name]?.documentElement?.innerHTML}} />;
};

export default NamedIcon;
