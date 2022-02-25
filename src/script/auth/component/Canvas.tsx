import React, {MouseEvent, useRef, useEffect, CSSProperties, useState} from 'react';

interface CanvasProps {
  draw: (context: CanvasRenderingContext2D) => void;
  onMouseMove: (event: MouseEvent<HTMLCanvasElement>) => void;
  style: CSSProperties;
}

const Canvas = (props: CanvasProps) => {
  const {draw, onMouseMove, style, ...rest} = props;
  const canvasRef = useRef(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    let animationFrameId: number;

    const render = () => {
      draw(context);
      animationFrameId = window.requestAnimationFrame(render);
    };
    render();

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [draw]);

  return (
    <canvas
      css={{
        alignSelf: 'center',
        backgroundColor: 'white',
        border: error ? 'red 2px solid' : 'black 2px solid',
        height: '255px',
        width: '255px',
        ...style,
      }}
      onMouseMove={e => {
        setError(false);
        onMouseMove(e);
      }}
      onMouseLeave={() => setError(!error)}
      ref={canvasRef}
      {...rest}
    />
  );
};

export default Canvas;
