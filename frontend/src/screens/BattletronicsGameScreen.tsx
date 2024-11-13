import { useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import adapter from 'webrtc-adapter';

import { firestore } from '../firebase';
import { Spacer } from '../components/Spacer';
import { Button } from '../components/Button';
import { Container } from '../components/Container';
import { Input } from '../components/Input';
import { ModalOverlay } from '../components/ModalOverlay';
import { Game } from './Game';

const Title = styled.span`
  text-align: center;
  font-size: 36px;
  margin-top: 20px;
  margin-bottom: 10px;
  font-size: 36px;
  font-weight: 500;
  line-height: 1.1;
`;
const Subtitle = styled.h3`
  display: flex;
  justify-content: center;
  text-align: center;
`;
const PlayerHeading = styled.span`
  font-size: 25px;
  width: 230px;
  height: 45px;
  text-align: center;
`;
const PlayersContainer = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
`;
const PlayerSection = styled.div`
  display: flex;
  flex-direction: column;
`;

const GAMES_COLLECTION_KEY = 'games';
const OFFER_CANDIDATES_KEY = 'offerCandidates';
const ANSWER_CANDIDATES_KEY = 'answerCandidates';

const makeId = (length: number) => {
  var result = '';
  var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};

interface IModal {
  open: boolean;
  playerCodeId: number;
  waitingPlayers: boolean;
}

interface IGameInfo {
  isNPlayerSelection: boolean;
  nPlayers: number;
  playersJoined: boolean[];
  active: boolean;
}

export const BattletronicsGameScreen = () => {
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
  const peerConnections = useMemo<RTCPeerConnection[]>(
    () => [
      new RTCPeerConnection(servers),
      new RTCPeerConnection(servers),
      new RTCPeerConnection(servers),
    ],
    [servers],
  );
  const dataChannels = useMemo<(RTCDataChannel | null)[]>(() => [null, null, null], []);

  const playerID = useRef<number>(0);
  const [gameInfo, setGameInfo] = useState<IGameInfo>({
    isNPlayerSelection: true,
    nPlayers: 1,
    playersJoined: [false, false, false],
    active: false,
  });
  const [connectionCodes, setConnectionCodes] = useState<string[]>(['', '', '']);
  const [isModalActive, setIsModalActive] = useState<IModal>({
    open: false,
    playerCodeId: 0,
    waitingPlayers: false,
  });
  const gameRef = useRef<any>();

  const dataChannelOne = dataChannels[0];
  const dataChannelTwo = dataChannels[1];
  const dataChannelThree = dataChannels[2];

  /* 1st connection */
  useEffect(() => {
    if (!dataChannelOne) return;
    console.log('Data Channel 1 set', dataChannelOne);
    dataChannelOne.onmessage = (event: any) => {
      const parsedData = JSON.parse(event.data);
      if (!parsedData.gameState) return;
      if (!gameRef.current) return;
      gameRef.current.getGameStatePeer(parsedData.gameState, parsedData.playerID);
    };
    dataChannelOne.onopen = () => {
      setIsModalActive((prevState) => ({ ...prevState, open: false }));
      console.log("Receive channel's status has changed to OPEN");
    };
    dataChannelOne.onclose = () => console.log("Receive channel's status has changed to CLOSE");
    dataChannelOne.onerror = (error: any) => {
      console.log('Data Channel Error:', error);
    };
    return () => {
      console.log('dataChannelOne teardown');
      dataChannelOne?.close();
    };
  }, [dataChannelOne]);

  /* 2nd connection */
  useEffect(() => {
    if (!dataChannelTwo) return;
    console.log('Data Channel 2 set', dataChannelTwo);
    dataChannelTwo.onmessage = (event: any) => {
      const parsedData = JSON.parse(event.data);
      if (!parsedData.gameState) return;
      gameRef.current.getGameStatePeer(parsedData.gameState, parsedData.playerID);
    };
    dataChannelTwo.onopen = () => {
      setIsModalActive((prevState) => ({ ...prevState, open: false }));
      console.log("Receive channel's status has changed to OPEN");
    };
    dataChannelTwo.onclose = () => console.log("Receive channel's status has changed to CLOSE");
    dataChannelTwo.onerror = (error: any) => {
      console.log('Data Channel Error:', error);
    };
    return () => {
      console.log('dataChannelTwo teardown');
      dataChannelTwo?.close();
    };
  }, [dataChannelTwo]);

  /* 3rd connection */
  useEffect(() => {
    if (!dataChannelThree) return;
    console.log('Data Channel 3 set', dataChannelThree);
    dataChannelThree.onmessage = (event: any) => {
      const parsedData = JSON.parse(event.data);
      if (!parsedData.gameState) return;
      gameRef.current.getGameStatePeer(parsedData.gameState, parsedData.playerID);
    };
    dataChannelThree.onopen = () => {
      setIsModalActive((prevState) => ({ ...prevState, open: false }));
      console.log("Receive channel's status has changed to OPEN");
    };
    dataChannelThree.onclose = () => console.log("Receive channel's status has changed to CLOSE");
    dataChannelThree.onerror = (error: any) => {
      console.log('Data Channel Error:', error);
    };
    return () => {
      console.log('dataChannelThree teardown');
      dataChannelThree?.close();
    };
  }, [dataChannelThree]);

  const invite = async (id: number) => {
    const gameCode = makeId(3);
    dataChannels[id] = peerConnections[id].createDataChannel(`Battletronics-${gameCode}`);
    console.log('GAMECODE: ', gameCode);
    setConnectionCodes((prevState) => ({ ...prevState, [id]: gameCode }));
    setIsModalActive({ open: true, playerCodeId: id, waitingPlayers: false });
    const gameDoc = firestore.collection(GAMES_COLLECTION_KEY).doc(gameCode);
    const offerCandidates = gameDoc.collection(OFFER_CANDIDATES_KEY);
    const answerCandidates = gameDoc.collection(ANSWER_CANDIDATES_KEY);
    // Get candidates for caller, save to db
    peerConnections[id].onicecandidate = (event) => {
      event.candidate && offerCandidates.add(event.candidate.toJSON());
    };
    // Create offer
    const offerDescription = await peerConnections[id].createOffer();
    await peerConnections[id].setLocalDescription(offerDescription);
    const offer = {
      sdp: offerDescription.sdp,
      type: offerDescription.type,
    };
    await gameDoc.set({ offer, id: gameCode });
    // Listen for remote answer
    gameDoc.onSnapshot((snapshot) => {
      const data = snapshot.data();
      if (!peerConnections[id].currentRemoteDescription && data?.answer) {
        const answerDescription = new RTCSessionDescription(data.answer);
        peerConnections[id].setRemoteDescription(answerDescription);
        playerID.current++;
        setGameInfo((prevState: IGameInfo) => {
          const data = [...prevState.playersJoined];
          data[id] = true;
          return {
            ...prevState,
            playersJoined: data,
          };
        });
      }
    });
    // Listen for remote ICE candidates
    answerCandidates.onSnapshot((snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const candidate = new RTCIceCandidate(change.doc.data());
          peerConnections[id].addIceCandidate(candidate);
        }
      });
    });
  };

  const connect = async (id: number) => {
    if (!connectionCodes[id]) return;
    peerConnections[id].ondatachannel = (event: any) => {
      const receiveChannel = event.channel;
      console.log('Recieve channel: ', receiveChannel);
      dataChannels[id] = receiveChannel;
      setGameInfo((prevState: IGameInfo) => {
        const data = [...prevState.playersJoined];
        data[id] = true;
        return {
          ...prevState,
          playersJoined: data,
        };
      });
    };
    const callDoc = firestore.collection(GAMES_COLLECTION_KEY).doc(connectionCodes[id]);
    const offerCandidates = callDoc.collection(OFFER_CANDIDATES_KEY);
    const answerCandidates = callDoc.collection(ANSWER_CANDIDATES_KEY);
    peerConnections[id].onicecandidate = (event) => {
      event.candidate && answerCandidates.add(event.candidate.toJSON());
    };
    // Fetch data, then set the offer & answer
    const callData = (await callDoc.get()).data();
    if (!callData) return;
    const offerDescription = callData.offer;
    await peerConnections[id].setRemoteDescription(new RTCSessionDescription(offerDescription));
    const answerDescription = await peerConnections[id].createAnswer();
    await peerConnections[id].setLocalDescription(answerDescription);
    const answer = {
      type: answerDescription.type,
      sdp: answerDescription.sdp,
    };
    await callDoc.update({ answer });
    // Listen to offer candidates
    offerCandidates.onSnapshot((snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          let data = change.doc.data();
          peerConnections[id].addIceCandidate(new RTCIceCandidate(data));
        }
      });
    });
  };

  const closeCreateCallModal = () => {
    setIsModalActive({
      open: false,
      playerCodeId: 0,
      waitingPlayers: false,
    });
  };

  const emitGameState = (gameState: any) => {
    dataChannels.forEach((dataChannel) => {
      switch (dataChannel?.readyState) {
        case 'connecting':
          console.log('[CONNECTING] Attempted to send during channel connecting.');
          break;
        case 'open':
          const state = JSON.stringify({ playerID: playerID.current, gameState: gameState });
          dataChannel?.send(state);
          break;
        case 'closing':
          console.log('[CLOSING] Attempted to send during channel closing.');
          break;
        case 'closed':
          console.log('[CLOSED] Attempted to send during channel closed.');
          break;
      }
    });
  };

  const emitGameOver = (roomName: string, winner: number, gameState: any) => {
    // dataChannel?.send(JSON.stringify({ type: 'gameOver' }));
  };

  const selectPlayers = (nPlayers: number) => {
    setIsModalActive((prevState: IModal) => ({
      ...prevState,
      waitingPlayers: true,
    }));
    setGameInfo((prevState: IGameInfo) => ({ ...prevState, nPlayers, isNPlayerSelection: false }));
  };
  const backToMenu = () => {
    setGameInfo((prevState: IGameInfo) => ({
      ...prevState,
      nPlayers: 1,
      isNPlayerSelection: true,
    }));
  };

  useEffect(() => {
    const nDefinedDataChannels = dataChannels.filter((dataChannel) => dataChannel !== null);
    const areDataChannelsDefined =
      gameInfo.nPlayers === dataChannels.filter((dataChannel) => dataChannel !== null).length + 1;
    const hasAllPlayersJoined =
      gameInfo.nPlayers ===
      gameInfo.playersJoined.filter((playerJoined) => playerJoined).length + 1;
    if (hasAllPlayersJoined && areDataChannelsDefined && nDefinedDataChannels.length > 0) {
      console.log('PLAYER ID ', playerID.current);
      setGameInfo((prevState) => ({ ...prevState, active: true }));
    }
  }, [dataChannels, gameInfo.nPlayers, gameInfo.playersJoined]);

  return (
    <Container style={{ overflow: 'hidden' }}>
      {gameInfo.active ? (
        <Game
          emitGameState={emitGameState}
          emitGameOver={emitGameOver}
          playerN={playerID.current}
          playerCount={gameInfo.nPlayers}
          ref={gameRef}
        />
      ) : (
        <>
          <ModalOverlay style={{ display: isModalActive.open ? 'flex' : 'none' }}>
            {isModalActive.open ? (
              <>
                <Title style={{ textAlign: 'center' }}>
                  Share game code with friends: <br />
                  {connectionCodes[isModalActive.playerCodeId]}
                </Title>
                <Button onClick={closeCreateCallModal}>Done</Button>
              </>
            ) : null}
          </ModalOverlay>
          <Title>BATTLETRONICS BRAWL</Title>
          {gameInfo.isNPlayerSelection && (
            <>
              <Button onClick={() => selectPlayers(2)}>2 Player</Button>
              <Spacer height={15} />
              <Button onClick={() => selectPlayers(3)}>3 Player</Button>
              <Spacer height={15} />
              <Button onClick={() => selectPlayers(4)}>4 Player</Button>
              <Spacer height={15} />
            </>
          )}
          {!gameInfo.isNPlayerSelection && (
            <>
              <PlayersContainer>
                {[...Array(gameInfo.nPlayers - 1)].map((_, key: number) => (
                  <div key={key} style={{ display: 'flex', flexDirection: 'row' }}>
                    <Spacer width={15} />
                    <PlayerSection>
                      <PlayerHeading>Player {key + 2}</PlayerHeading>

                      {!gameInfo.playersJoined[key] && (
                        <>
                          <Button onClick={() => invite(key)}>Invite</Button>
                          <Spacer height={15} />
                          <Input
                            placeholder="Code..."
                            value={connectionCodes[key] ?? null}
                            onChange={(event) =>
                              setConnectionCodes((prevState) => ({
                                ...prevState,
                                [key]: event.target.value,
                              }))
                            }
                          ></Input>
                          <Button onClick={() => connect(key)}>Connect</Button>
                        </>
                      )}
                      {gameInfo.playersJoined[key] && (
                        <PlayerHeading
                          style={{
                            color: '#7fa650',
                            fontSize: '2.4rem',
                            fontWeight: 600,
                            lineHeight: 1.2,
                          }}
                        >
                          DONE
                        </PlayerHeading>
                      )}
                    </PlayerSection>
                    <Spacer width={15} />
                  </div>
                ))}
              </PlayersContainer>
              <Subtitle>[Controls]: Arrows to move, G to fire, H to pick up.</Subtitle>
              <Button style={{ background: '#7F7F7F' }} onClick={backToMenu}>
                Back
              </Button>
            </>
          )}
        </>
      )}
    </Container>
  );
};
