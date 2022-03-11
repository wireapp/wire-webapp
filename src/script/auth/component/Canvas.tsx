import React, {MouseEvent, useRef, useEffect, CSSProperties} from 'react';

interface CanvasProps {
  'data-uie-name': string;
  draw: (context: CanvasRenderingContext2D) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onMouseMove: (event: MouseEvent<HTMLCanvasElement>) => void;
  sizeX: number;
  sizeY: number;
  style: CSSProperties;
}

const Canvas = (props: CanvasProps) => {
  const {draw, onMouseMove, onMouseEnter, onMouseLeave, sizeX, sizeY, style, ...rest} = props;
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
      data-uie-name={props['data-uie-name']}
      height={sizeY}
      width={sizeX}
      css={{
        alignSelf: 'center',
        backgroundColor: 'white',
        height: `${sizeY}px`,
        transition: '0.5s ease-in',
        width: `${sizeX}px`,
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
