import { useRef, useEffect } from 'react';
import { CANVAS_SIZE } from '../utils/constants';

const CanvasBackground = (props: any) => {
  const { draw, ...rest } = props;
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    canvas.width = canvas.height = CANVAS_SIZE;
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
      ref={canvasRef}
      style={{
        zIndex: 1,
        position: 'absolute',
        top: 0,
        left: 0,
        borderRadius: '5px',
      }}
      {...rest}
    />
  );
};

export default CanvasBackground;
