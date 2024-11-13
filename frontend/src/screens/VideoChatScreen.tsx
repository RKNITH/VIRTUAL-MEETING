import { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';

import { firestore } from '../firebase';
import waitingForWebcam from '../assets/waitingForUser2.png';
import waitingForFriend from '../assets/waitingForUser3.png';
import { WebcamVideo } from '../components/WebcamVideo';
import { Instructions } from '../components/Instructions';
import { Spacer } from '../components/Spacer';
import { Button } from '../components/Button';
import { Container } from '../components/Container';
import { ModalOverlay } from '../components/ModalOverlay';

const { v4: uuidv4 } = require('uuid');

const Title = styled.h1``;

const Subtitle = styled.h3`
  display: flex;
  justify-content: center;
`;

const VideoContainer = styled.div`
  display: grid;
  width: 100%;
  grid-template-columns: repeat(auto-fit, minmax(240px, 2fr));
  grid-gap: 1rem;
`;

interface IPeripheral {
  isMicEnabled: boolean;
  isCamEnabled: boolean;
}

export const VideoChatScreen = () => {
  const [localStream, setLocalStream] = useState<any>(null);
  const [remoteStream, setRemoteStream] = useState<any>(new MediaStream());
  const [callInput, setCallInput] = useState<any>(null);
  const [isCreateCallModalActive, setIsCreateCallModalActive] = useState<boolean>(false);
  const [peripheralStatus, setPeripheralStatus] = useState<IPeripheral>({
    isMicEnabled: false,
    isCamEnabled: true,
  });
  const [isCallActive, setIsCallActive] = useState<boolean>(false);

  const servers = useMemo(
    () => ({
      iceServers: [
        {
          urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
        },
      ],
      iceCandidatePoolSize: 10,
    }),
    [],
  );

  const pc = useMemo(() => new RTCPeerConnection(servers), [servers]);

  useEffect(() => {
    if (!localStream) return;
    // Push tracks from local stream to peer connection
    localStream.getTracks().forEach((track: any) => {
      pc.addTrack(track, localStream);
    });
    // Pull tracks from remote stream, add to video stream
    pc.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        const tempRemoteStream = remoteStream;
        tempRemoteStream.addTrack(track);
        setRemoteStream(tempRemoteStream);
      });
    };
  }, [localStream, pc, remoteStream]);

  const activateWebcam = async () => {
    try {
      const videoAudioStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      videoAudioStream.getAudioTracks()[0].enabled = false;
      setLocalStream(videoAudioStream);
    } catch {
      console.log('Webcam was not found for device.');
      setPeripheralStatus((prevState) => ({ ...prevState, isCamEnabled: false }));
    }
  };

  const startCall = async () => {
    // Reference Firestore collections for signaling
    const callCode = uuidv4().slice(0, 3);
    const callDoc = firestore.collection('calls').doc(callCode);
    const offerCandidates = callDoc.collection('offerCandidates');
    const answerCandidates = callDoc.collection('answerCandidates');

    setCallInput(callDoc.id);
    setIsCreateCallModalActive(true);

    // Get candidates for caller, save to db
    pc.onicecandidate = (event) => {
      console.log('GET CANDIDATES');
      event.candidate && offerCandidates.add(event.candidate.toJSON());
    };

    // Create offer
    const offerDescription = await pc.createOffer();
    await pc.setLocalDescription(offerDescription);

    const offer = {
      sdp: offerDescription.sdp,
      type: offerDescription.type,
    };

    await callDoc.set({ offer, id: callCode });

    // Listen for remote answer
    callDoc.onSnapshot((snapshot) => {
      const data = snapshot.data();
      console.log('REMOTE ANSWER');
      if (!pc.currentRemoteDescription && data?.answer) {
        const answerDescription = new RTCSessionDescription(data.answer);
        pc.setRemoteDescription(answerDescription);
      }
    });

    // Listen for remote ICE candidates
    answerCandidates.onSnapshot((snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          console.log('ANSWER ADDED');
          const candidate = new RTCIceCandidate(change.doc.data());
          pc.addIceCandidate(candidate);
        }
        setIsCallActive(true);
      });
    });
  };

  const answerCall = async () => {
    const callId = callInput;
    if (!callId) return;
    const callDoc = firestore.collection('calls').doc(callId);
    const offerCandidates = callDoc.collection('offerCandidates');
    const answerCandidates = callDoc.collection('answerCandidates');

    pc.onicecandidate = (event) => {
      console.log('ONICECANDIDATE');
      event.candidate && answerCandidates.add(event.candidate.toJSON());
    };

    // Fetch data, then set the offer & answer
    const callData = (await callDoc.get()).data();
    if (!callData) return;

    const offerDescription = callData.offer;
    await pc.setRemoteDescription(new RTCSessionDescription(offerDescription));

    const answerDescription = await pc.createAnswer();
    await pc.setLocalDescription(answerDescription);

    const answer = {
      type: answerDescription.type,
      sdp: answerDescription.sdp,
    };

    await callDoc.update({ answer });

    // Listen to offer candidates
    offerCandidates.onSnapshot((snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          console.log('ADDED');
          let data = change.doc.data();
          pc.addIceCandidate(new RTCIceCandidate(data));
        }
        setIsCallActive(true);
      });
    });
  };

  const toggleMic = useCallback(async () => {
    if (!localStream) return;
    const newMicState = !localStream.getAudioTracks()[0].enabled;
    setPeripheralStatus((prevState) => ({ ...prevState, isMicEnabled: newMicState }));
    localStream.getAudioTracks()[0].enabled = newMicState;
  }, [localStream]);

  useEffect(() => {
    if (isCallActive) toggleMic();
  }, [isCallActive, toggleMic]);

  const toggleCam = async () => {
    const newCamState = !localStream.getVideoTracks()[0].enabled;
    setPeripheralStatus((prevState) => ({ ...prevState, isCamEnabled: newCamState }));
    localStream.getVideoTracks()[0].enabled = newCamState;
  };

  const handleSetCallInput = (input: string) => {
    setCallInput(input);
  };

  const closeCreateCallModal = () => {
    setIsCreateCallModalActive(false);
  };

  const endCall = async () => {
    const callId = callInput;
    await firestore.collection('calls').doc(callId).delete();
  };

  return (
    <Container>
      <ModalOverlay style={{ display: isCreateCallModalActive ? 'flex' : 'none' }}>
        <Title style={{ textAlign: 'center' }}>
          Share call code with friend: <br />
          {callInput}
        </Title>
        <Button onClick={closeCreateCallModal}>Done</Button>
      </ModalOverlay>
      <Spacer height={25} />
      <Instructions
        activateWebcam={activateWebcam}
        startCall={startCall}
        answerCall={answerCall}
        callInput={callInput}
        handleSetCallInput={handleSetCallInput}
        localStream={localStream}
        remoteStream={remoteStream}
        isCallActive={isCallActive}
        setIsCallActive={setIsCallActive}
        toggleMic={toggleMic}
        micEnabled={peripheralStatus?.isMicEnabled}
        toggleCam={toggleCam}
        camEnabled={peripheralStatus?.isCamEnabled}
        endCall={endCall}
      />

      <VideoContainer className="videos">
        <Container>
          <Subtitle>Friend</Subtitle>
          {remoteStream?.active ? (
            <WebcamVideo srcObject={remoteStream} id="remoteVideo" />
          ) : (
            <img src={waitingForFriend} alt={'Waiting for friend..'} width={240} />
          )}
        </Container>
        <Container>
          <Subtitle>You</Subtitle>
          {localStream ? (
            <WebcamVideo srcObject={localStream} id="webcamVideo" />
          ) : (
            <img src={waitingForWebcam} alt={'Waiting for webcam..'} width={240} />
          )}
        </Container>
      </VideoContainer>
    </Container>
  );
};
