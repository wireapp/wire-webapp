import React, {MouseEvent, useRef, useEffect, useState} from 'react';
import {usePausableInterval} from 'src/script/hooks/usePausableInterval';
import {usePausableTimeout} from 'src/script/hooks/usePausableTimeout';

interface CanvasProps {
  'data-uie-name': string;
  entropy: [number, number][];
  onSetEntropy: () => void;
  setEntropy: React.Dispatch<React.SetStateAction<[number, number][]>>;
  sizeX: number;
  sizeY: number;
}
const [percent, setPercent] = useState(0);
const [frameCount, setFrameCount] = useState(0);
const [pause, setPause] = useState(false);

const EntropyCanvas = (props: CanvasProps) => {
  const {setEntropy, entropy, sizeX, sizeY, onSetEntropy, ...rest} = props;
  const canvasRef = useRef(null);

  const {startTimeout, pauseTimeout} = usePausableTimeout(onSetEntropy, 35000);
  const {clearInterval, startInterval, pauseInterval} = usePausableInterval(
    () => setPercent(percent => percent + 1),
    300,
  );

  useEffect(() => {
    if (frameCount <= 300 && percent > 95) {
      setPercent(95);
      pauseInterval();
      pauseTimeout();
    }
    if (frameCount > 300) {
      startInterval();
      startTimeout();
    }
    if (percent >= 100) {
      clearInterval();
    }
  }, [frameCount, percent]);

  const onMouseEnter = () => {
    setPause(false);
    startInterval();
    startTimeout();
  };

  const onMouseLeave = () => {
    pauseInterval();
    pauseTimeout();
    setPause(!pause);
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
        border: pause ? 'red 2px solid' : 'black 2px solid',
        borderRadius: '5px',
        height: `${sizeY}px`,
        transition: '0.5s ease-in',
        width: `${sizeX}px`,
      }}
      onMouseMove={onMouseMove}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      ref={canvasRef}
      {...rest}
    />
  );
};

export {EntropyCanvas, percent, frameCount, pause};
