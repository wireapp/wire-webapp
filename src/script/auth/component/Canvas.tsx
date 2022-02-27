import React, {MouseEvent, useRef, useEffect, CSSProperties} from 'react';

interface CanvasProps {
  draw: (context: CanvasRenderingContext2D) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onMouseMove: (event: MouseEvent<HTMLCanvasElement>) => void;
  style: CSSProperties;
}

const Canvas = (props: CanvasProps) => {
  const {draw, onMouseMove, onMouseEnter, onMouseLeave, style, ...rest} = props;
  const canvasRef = useRef(null);

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
        height: '255px',
        width: '255px',
        ...style,
      }}
      onMouseEnter={onMouseEnter}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      ref={canvasRef}
      {...rest}
    />
  );
};

export default Canvas;
