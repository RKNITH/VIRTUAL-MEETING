import { useEffect, useRef } from 'react';

import styled from 'styled-components';

const Video = styled.video`
  max-width: 100%;
  transform: rotateY(180deg);
`;

type WebcamVideoProps = {
  srcObject: MediaStream;
  id: string;
};

export const WebcamVideo = ({ srcObject, id, ...props }: WebcamVideoProps) => {
  const refVideo = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!refVideo.current) return;
    refVideo.current.srcObject = srcObject;
  }, [srcObject]);

  return <Video autoPlay playsInline ref={refVideo} id={id} />;
};
