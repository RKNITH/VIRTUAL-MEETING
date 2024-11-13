import { useEffect } from 'react';
import { Button } from './Button';
import { Input } from './Input';
import { Spacer } from './Spacer';

export const Instructions = (props: {
  activateWebcam: () => void;
  startCall: () => void;
  answerCall: () => void;
  callInput: any;
  handleSetCallInput: (input: string) => void;
  localStream: any;
  remoteStream: any;
  isCallActive: boolean;
  setIsCallActive: React.Dispatch<React.SetStateAction<boolean>>;
  toggleMic: () => void;
  micEnabled: boolean;
  toggleCam: () => void;
  camEnabled: boolean;
  endCall: () => void;
}) => {
  const hangUp = () => {
    props.endCall();
    window.location.reload();
  };

  const webcamInstruction = (
    <>
      <Button id="webcamButton" onClick={props.activateWebcam}>
        Start webcam 🎥
      </Button>
    </>
  );

  const callInstruction = (
    <>
      <Button id="callButton" onClick={props.startCall}>
        Create Call 🤙
      </Button>
      <Spacer height={35} />
      <Input
        id="callInput"
        placeholder="Code..."
        value={props.callInput ?? ''}
        onChange={(event) => props.handleSetCallInput(event.target.value)}
      />
      <Button id="answerButton" onClick={props.answerCall}>
        Join Call 📲
      </Button>
      <p>(Join from another browser or device)</p>
      <Spacer height={10} />
      <Button onClick={props.toggleMic}>
        {props.micEnabled ? 'Mute Mic 🎙️' : 'Unmute Mic 🎙️'}
      </Button>
      <Spacer height={10} />
      <Button onClick={props.toggleCam}>{props.camEnabled ? 'Cam Off 📷' : 'Cam On 📷'}</Button>
    </>
  );

  const hangupInstruction = (
    <>
      <Button id="hangupButton" onClick={hangUp}>
        Hangup 📴
      </Button>
      <Spacer height={10} />
      <Button onClick={props.toggleMic}>
        {props.micEnabled ? 'Mute Mic 🎙️' : 'Unmute Mic 🎙️'}
      </Button>
      <Spacer height={10} />
      <Button onClick={props.toggleCam}>{props.camEnabled ? 'Cam Off 📷' : 'Cam On 📷'}</Button>
    </>
  );

  let currentInstruction = null;
  if (!props.localStream) {
    currentInstruction = webcamInstruction;
  } else if (props.localStream && !props.isCallActive) {
    currentInstruction = callInstruction;
  } else if (props.remoteStream) {
    currentInstruction = hangupInstruction;
  }
  return currentInstruction;
};
