import React, {MouseEvent, useRef, useEffect, CSSProperties} from 'react';

interface CanvasProps {
  'data-uie-name': string;
  entropy: [number, number][];
  frameCount: number;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  setEntropy: React.Dispatch<React.SetStateAction<[number, number][]>>;
  setFrameCount: React.Dispatch<React.SetStateAction<number>>;
  sizeX: number;
  sizeY: number;
  style: CSSProperties;
}

const EntropyCanvas = (props: CanvasProps) => {
  const {setEntropy, entropy, frameCount, setFrameCount, onMouseEnter, onMouseLeave, sizeX, sizeY, style, ...rest} =
    props;
  const canvasRef = useRef(null);

  const draw = (ctx: CanvasRenderingContext2D, entropy: [number, number][]) => {
    if (entropy.length > 2) {
      const previousPoint = entropy[entropy.length - 2];
      const lastPoint = entropy[entropy.length - 1];
      ctx.beginPath();
      if (!previousPoint) {
        ctx.moveTo(...lastPoint);
      } else {
        ctx.moveTo(...previousPoint);
      }
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'blue';
      if (!lastPoint) {
        ctx.lineTo(...previousPoint);
      } else {
        ctx.lineTo(...lastPoint);
      }
      ctx.stroke();
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    draw(context, entropy);
  }, [entropy]);

  const onMouseMove = (event: MouseEvent<HTMLCanvasElement>) => {
    setFrameCount(frameCount + 1);

    const newEntropy: [number, number] = [
      event.pageX - event.currentTarget?.getBoundingClientRect()?.x,
      event.pageY - event.currentTarget?.getBoundingClientRect()?.y,
    ];
    setEntropy(entropy => [...entropy, newEntropy]);
  };

  return (
    <canvas
      data-uie-name={props['data-uie-name'] ?? 'element-entropy-canvas'}
      height={sizeY}
      width={sizeX}
      css={{
        alignSelf: 'center',
        backgroundColor: 'white',
        borderRadius: '5px',
        height: `${sizeY}px`,
        transition: '0.5s ease-in',
        width: `${sizeX}px`,
        ...style,
      }}
      onMouseMove={onMouseMove}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      ref={canvasRef}
      {...rest}
    />
  );
};

export default EntropyCanvas;
