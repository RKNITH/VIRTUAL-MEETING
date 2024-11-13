import { useRef, useEffect } from 'react';
import { CANVAS_SIZE } from '../utils/constants';

const Canvas = (props: any) => {
  const { draw, state, ...rest } = props;
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    canvas.width = canvas.height = CANVAS_SIZE;
    let animationFrameId: number;

    const render = () => {
      draw(context, state);
      animationFrameId = window.requestAnimationFrame(render);
    };
    render();

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [draw, state]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        zIndex: 2,
        position: 'absolute',
        top: 0,
        left: 0,
        borderRadius: '10px',
      }}
      {...rest}
    />
  );
};

export default Canvas;
