import * as React from 'react';

interface ProgressProps {
  error: boolean;
  percent: number;
  style?: React.CSSProperties;
  width: number;
}
export const ProgressBar = ({width, percent, error, style}: ProgressProps) => {
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => setProgress(Math.floor((percent / 100) * width)), [percent, width]);

  return (
    <div
      style={{
        alignSelf: 'center',
        backgroundColor: 'white',
        borderRadius: '5px',
        height: '8px',
        marginTop: '8px',
        width: width,
        ...style,
      }}
    >
      <div
        style={{
          backgroundColor: error ? 'red' : 'blue',
          borderRadius: '5px',
          height: 'inherit',
          transition: '0.5s ease-in',
          width: `${progress}px`,
        }}
      />
    </div>
  );
};
