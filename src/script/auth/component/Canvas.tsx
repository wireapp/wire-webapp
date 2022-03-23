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

  const draw = (ctx: CanvasRenderingContext2D) => {
    if (entropy.length > 1 && frameCount > 1) {
      ctx.beginPath();
      if (!entropy[frameCount - 2]) {
        ctx.moveTo(...entropy[frameCount - 1]);
      } else {
        ctx.moveTo(...entropy[frameCount - 2]);
      }
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'blue';
      if (!entropy[frameCount - 1]) {
        ctx.lineTo(...entropy[frameCount - 2]);
      } else {
        ctx.lineTo(...entropy[frameCount - 1]);
      }
      ctx.stroke();
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    draw(context);
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
