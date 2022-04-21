import React from 'react';

export const FormattedId: React.FC<{idSlices: string[]}> = ({idSlices}) => {
  return (
    <>
      {idSlices.map((slice, index) => (
        <span className="device-id-part" key={slice + index}>
          {slice}
        </span>
      ))}
    </>
  );
};
