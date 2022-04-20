import {MouseEvent, useRef, useEffect, useState} from 'react';
import {usePausableInterval} from '../../hooks/usePausableInterval';

interface CanvasProps {
  'data-uie-name'?: string;
  onProgress: (entropyData: [number, number][], percent: number, pause: boolean) => void;
  onSetEntropy: (entropyData: [number, number][]) => void;
  sizeX: number;
  sizeY: number;
}

const EntropyCanvas = (props: CanvasProps) => {
  const {sizeX, sizeY, onSetEntropy, onProgress, ...rest} = props;
  const canvasRef = useRef(null);
  const [percent, setPercent] = useState(0);
  const [entropy, setEntropy] = useState<[number, number][]>([]);
  const frames = entropy.filter(Boolean).length;

  const {clearInterval, startInterval, pauseInterval} = usePausableInterval(() => {
    setPercent(percent => percent + 1);
    onProgress(entropy, percent, false);
  }, 300);

  useEffect(() => {
    if (frames <= 300 && percent > 95) {
      setPercent(95);
      pauseInterval();
    }
    if (frames > 300) {
      startInterval();
    }
    if (frames >= 100) {
      clearInterval();
    }
  }, [percent, percent]);

  const onMouseLeave = () => {
    onProgress(entropy, percent, true);
    pauseInterval();

    setEntropy([...entropy, null]);
  };

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
    startInterval();
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
      }}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      ref={canvasRef}
      {...rest}
    />
  );
};

export default EntropyCanvas;
