import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Joystick } from 'react-joystick-component';
import styled from 'styled-components';

import Canvas from '../components/Canvas';
import CanvasBackground from '../components/CanvasBackground';
import { Spacer } from '../components/Spacer';
import {
  BG_COLOR,
  CANVAS_SIZE,
  FLASH_COLOR,
  FRAME_RATE,
  GRID_SIZE,
  IS_MOBILE_OR_TABLET,
  PLAYER_1_COLOR,
  PLAYER_2_COLOR,
  PLAYER_3_COLOR,
  PLAYER_4_COLOR,
} from '../utils/constants';
import { Rect } from '../utils/rectangleModule';
import SQUARE_IMG from '../assets/square.png';
import CIRCLE_IMG from '../assets/circle.png';

const _ = require('lodash');

const ScoreText = styled.span`
  font-size: ${CANVAS_SIZE > 500 ? '40px' : '25px'};
`;

const SOLID_WALL_IMG = new Image();
const MOVABLE_WALL_IMG = new Image();
const HEALTH_IMG = new Image();
SOLID_WALL_IMG.src =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAADISURBVChTHY/LCkVQFIZ/23FLJIkBAyLKRDHxosoTeQHKZSRjmTHQxmnvNf3WfxPatv26roPjOBAEAdd1Yds2mKaJ+75B5nnGMAwcpGmKKIqgaRp0XUcQBCB5nsN1XTzPg3Ecsa4rf6yqCoZh4CeKIgfTNHG1LMuo6xpN0/AowsD3faCUwrZtFEWBvu+xLAve9wXZ9x1lWcL3fViWheM4uJuqqvA8D7/zPMFiGGQXhiHvE8cxsiwDkSSJ2yuKwtWsZJIkfCalFH8wHlog6tnoiAAAAABJRU5ErkJggg==';
MOVABLE_WALL_IMG.src =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAFmSURBVChTPY9LK0QBHMV/c+/MuGZwPRrDDEnNeOWVqIsiRbKQZqNsfQMrlvMFLJRPIAsL2dhISZJHxgzjVR6LixHCYF64jKu5Zc7mnFOnc/5/0+vcpP4sV6Oay8lgYydAb2eHwT6fj3RgCe/pAuJEf4M/+m1hZnEVdJ2T0zNub24pc7lxOp3cp9IUV3oQrit7Ua1u2lqaCIWPcRQX4fh6QL264DMW5eBc5bKwGVEqcfkPgwEKEnek3p7Jjd/Tp5/zKubzpAnGQk+XgjAyNEBVbSNKIkSX/R1NsBAxOw3/v5BMfSDYbbnIssxuXhvbSRnr7zcVP49G2J58wBw5IpMRvV6PPxgKMawFkK0CkbSNPCmHeN0ghVW1XEY/0TQNU/J4XV/bO2J+ZTP7UAb/enxsFIskIU55En7ZlsOLzZ29qa7Gm9VyTKW1VML0uDyr76pRHI0KW/thuttbDFYUxWg2r0xT7y7iD8aUkyyRVJCtAAAAAElFTkSuQmCC';
HEALTH_IMG.src =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsQAAA7EAZUrDhsAAACaSURBVChTVY/BCsIwEERf2kZNhSJa8SAeRPD/f60tKkrTddLUgwtDdpjZ3YkDzKigrmG9gsmECYYBxyh11yZDxjgK0cz5zLeNFdoAZQlNA04LC+HY5r7yOPPBePbZ9KsYMz+dKajDv5gqGRK6TgZlotrA5TrHnYXbHbwGQ9AJhZmn0s33I79JXEps+eZhD/2gkMqdTFPEfV58AS86O1tc/01yAAAAAElFTkSuQmCC';

const WALL_SIZE = 0.0425 * CANVAS_SIZE;
const PLAYER_SIZE = WALL_SIZE;
const wallDim = 4;
const playerStartingPositions = [
  { x: 1, y: 1 },
  { x: GRID_SIZE - wallDim - 1, y: GRID_SIZE - wallDim - 1 },
  { x: GRID_SIZE - wallDim - 1, y: 1 },
  { x: 1, y: GRID_SIZE - wallDim - 1 },
];
const DEFAULT_GAME_STATE = {
  players: [...Array(4)].map((_, id) => ({
    id: id + 1,
    fireRateDelay: 100,
    pos: playerStartingPositions[id],
    directionPreference: [],
    dxdy: {
      x: 0,
      y: 0,
    },
    dir: 'UP',
    bullets: [],
    reload: false,
    lives: 3,
    isDead: false,
    inventorySpace: 3,
    inventoryAction: false,
    inventoryCooldown: false,
  })),
  walls: {
    solid: [],
    movable: [],
  },
  food: {},
  scores: { P1: 0, P2: 0, P3: 0, P4: 0 },
  gridsize: GRID_SIZE,
};

interface IGame {
  emitGameState: (state: any) => void;
  emitGameOver: (roomName: string, winner: number, state: any) => void;
  playerN: number;
  playerCount: number;
}

export const Game = forwardRef(
  ({ emitGameState, emitGameOver, playerN, playerCount }: IGame, ref) => {
    const [gameState, setGameState] = useState<any>(DEFAULT_GAME_STATE);
    const refState = useRef<any>(DEFAULT_GAME_STATE);
    const flashRef = useRef<number[]>([0, 0, 0, 0]);

    useImperativeHandle(ref, () => ({
      getGameStatePeer(state: any, playerID: number) {
        const opponentPlayer = state.players[playerID];
        setGameState((prevState: any) => ({
          ...prevState,
          players: prevState.players.map((p: any) => {
            if (p.id === playerID + 1) return opponentPlayer;
            else return p;
          }),
          walls: state.walls,
          food: state.food.x ? state.food : prevState.food,
        }));
        refState.current.players[playerID] = opponentPlayer;
        refState.current.walls = state.walls;
        refState.current.food = state.food.x ? state.food : gameState.food;
      },
    }));

    // FROM LEFT TO RIGHT. TOP TO BOTTOM.
    const initializePlayingField = useCallback(() => {
      const gameStateTemp = gameState;
      for (let i = 16; i < 36; i += wallDim) {
        gameStateTemp.walls.solid.push({ x: 10, y: i });
      }
      for (let i = 56; i < 76; i += wallDim) {
        gameStateTemp.walls.solid.push({ x: 10, y: i });
      }
      for (let i = 10; i < 32; i += wallDim) {
        gameStateTemp.walls.solid.push({ x: i, y: 87 });
      }
      for (let i = 26; i < 34; i += wallDim) {
        gameStateTemp.walls.solid.push({ x: i, y: 8 });
      }
      for (let i = 24; i < 52; i += wallDim) {
        gameStateTemp.walls.solid.push({ x: 26, y: i });
      }
      for (let i = 0; i < 8; i += wallDim) {
        gameStateTemp.walls.solid.push({ x: 64, y: i });
      }
      for (let i = 60; i < 80; i += wallDim) {
        gameStateTemp.walls.solid.push({ x: i, y: 87 });
      }
      for (let i = 40; i < 64; i += wallDim) {
        gameStateTemp.walls.solid.push({ x: 71, y: i });
      }
      for (let i = 20; i < 36; i += wallDim) {
        gameStateTemp.walls.solid.push({ x: 86, y: i });
      }
      for (let i = 52; i < 72; i += wallDim) {
        gameStateTemp.walls.solid.push({ x: 86, y: i });
      }
      // Movable walls
      gameStateTemp.walls.movable.push({ x: 3, y: 32 });
      gameStateTemp.walls.movable.push({ x: 3, y: 56 });
      gameStateTemp.walls.movable.push({ x: 93, y: 32 });
      gameStateTemp.walls.movable.push({ x: 93, y: 52 });
      gameStateTemp.walls.movable.push({ x: 45, y: 96 });
      for (let i = 44; i < 58; i += wallDim + 1) {
        gameStateTemp.walls.movable.push({ x: i, y: 4 });
      }
      for (let i = 20; i < 32; i += wallDim + 1) {
        gameStateTemp.walls.movable.push({ x: i, y: 76 });
      }
      for (let i = 72; i < 84; i += wallDim + 1) {
        gameStateTemp.walls.movable.push({ x: 60, y: i });
      }
      for (let i = 12; i < 20; i += wallDim + 1) {
        gameStateTemp.walls.movable.push({ x: 72, y: i });
      }
      gameStateTemp.walls.movable.push({ x: 77, y: 17 });
      const generatedWalls = {
        solid: gameStateTemp.walls.solid,
        movable: gameStateTemp.walls.movable,
      };
      setGameState((prevState: any) => ({
        ...prevState,
        walls: generatedWalls,
      }));
      refState.current.walls = generatedWalls;
    }, [gameState]);

    const resetGameState = useCallback(
      (scoreInput: number[]) => {
        const TEMP_DEFAULT_STATE = DEFAULT_GAME_STATE;
        TEMP_DEFAULT_STATE.scores.P1 = scoreInput[0];
        TEMP_DEFAULT_STATE.scores.P2 = scoreInput[1];
        TEMP_DEFAULT_STATE.scores.P3 = scoreInput[2];
        TEMP_DEFAULT_STATE.scores.P4 = scoreInput[3];

        TEMP_DEFAULT_STATE.players[0].pos.x = 1;
        TEMP_DEFAULT_STATE.players[0].pos.y = 1;
        TEMP_DEFAULT_STATE.players[0].lives = 3;
        TEMP_DEFAULT_STATE.players[0].isDead = false;

        TEMP_DEFAULT_STATE.players[1].pos.x = GRID_SIZE - wallDim - 1;
        TEMP_DEFAULT_STATE.players[1].pos.y = GRID_SIZE - wallDim - 1;
        TEMP_DEFAULT_STATE.players[1].lives = 3;
        TEMP_DEFAULT_STATE.players[1].isDead = false;

        TEMP_DEFAULT_STATE.players[2].pos.x = GRID_SIZE - wallDim - 1;
        TEMP_DEFAULT_STATE.players[2].pos.y = 1;
        TEMP_DEFAULT_STATE.players[2].lives = 3;
        TEMP_DEFAULT_STATE.players[2].isDead = false;

        TEMP_DEFAULT_STATE.players[3].pos.x = 1;
        TEMP_DEFAULT_STATE.players[3].pos.y = GRID_SIZE - wallDim - 1;
        TEMP_DEFAULT_STATE.players[3].lives = 3;
        TEMP_DEFAULT_STATE.players[3].isDead = false;

        TEMP_DEFAULT_STATE.walls = { solid: [], movable: [] };
        initializePlayingField();
        return TEMP_DEFAULT_STATE;
      },
      [initializePlayingField],
    );

    const randomFood = useCallback(() => {
      if (playerN !== 0) return;
      const food = {
        x: Math.floor(GRID_SIZE / 4 + Math.random() * (GRID_SIZE / 2)),
        y: Math.floor(GRID_SIZE / 4 + Math.random() * (GRID_SIZE / 2)),
      };
      setGameState((prevState: any) => ({ ...prevState, food: food }));
      refState.current.food = food;
    }, [playerN]);

    const collision = useCallback((player: any, checkForMovableWall: boolean, gameState: any) => {
      if (!gameState) return false;
      let x1 = 0;
      // let x2 = 0;
      let y1 = 0;
      // let y2 = 0;
      // Check one step ahead
      if (player.dir === 'LEFT') {
        x1 = player.pos.x - 1;
        y1 = player.pos.y;
        // x2 = player.pos.x - 1;
        // y2 = player.pos.y;
      } else if (player.dir === 'UP') {
        x1 = player.pos.x;
        y1 = player.pos.y - 1;
        // x2 = player.pos.x;
        // y2 = player.pos.y - 1;
      } else if (player.dir === 'RIGHT') {
        x1 = player.pos.x + 1;
        y1 = player.pos.y;
        // x2 = player.pos.x + 1;
        // y2 = player.pos.y;
      } else if (player.dir === 'DOWN') {
        x1 = player.pos.x;
        y1 = player.pos.y + 1;
        // x2 = player.pos.x;
        // y2 = player.pos.y + 1;
      }
      const playerSize = 4;
      const wallSize = 4;
      let playerRect = new Rect(x1, y1, playerSize, playerSize);
      const border1 = new Rect(GRID_SIZE, 0, wallSize, GRID_SIZE); // right |
      const border2 = new Rect(-4, 0, wallSize, GRID_SIZE); // left |
      const border3 = new Rect(-4, -4, GRID_SIZE + 4, wallSize); // upper ---
      const border4 = new Rect(-4, GRID_SIZE, GRID_SIZE + 4, wallSize); // lower ---
      if (
        (playerRect.intersects(border1) ||
          playerRect.intersects(border2) ||
          playerRect.intersects(border3) ||
          playerRect.intersects(border4)) &&
        checkForMovableWall === false
      ) {
        return true;
      }
      let wx1, wy1;
      let wall, wallRect;
      // Solid walls
      for (let i = 0; i < gameState.walls.solid.length; i++) {
        wall = gameState.walls.solid[i];
        wx1 = wall.x;
        wy1 = wall.y;
        wallRect = new Rect(wx1, wy1, wallSize, wallSize);
        if (wallRect.intersects(playerRect) && checkForMovableWall === false) {
          return true;
        }
      }
      // Movable walls
      for (let i = 0; i < gameState.walls.movable.length; i++) {
        wall = gameState.walls.movable[i];
        wx1 = wall.x;
        wy1 = wall.y;
        wallRect = new Rect(wx1, wy1, wallSize, wallSize);
        if (wallRect.intersects(playerRect)) {
          if (checkForMovableWall) {
            gameState.walls.movable.splice(i, 1);
          }
          return true;
        }
      }
      return false;
    }, []);

    const livesUpdate = useCallback((playerID, player) => {
      setGameState((prevState: any) => ({
        ...prevState,
        players: prevState.players.map((p: any) => {
          if (p.id === playerID + 1) return player;
          else return p;
        }),
        food: {},
      }));
      refState.current.players[playerID] = player;
      refState.current.food = {};
    }, []);

    const playerUpdate = useCallback(
      (player: any) => {
        setGameState((prevState: any) => ({
          ...prevState,
          players: prevState.players.map((p: any) => {
            if (p.id === playerN + 1) return player;
            else return p;
          }),
        }));
        refState.current.players[playerN] = player;
      },
      [playerN],
    );

    const updateBullets = useCallback(
      (state: any, players: any, playerRects: any) => {
        // Move
        for (let i = 0; i < players.length; i++) {
          const player = players[i];
          const isPlayerInGame = i < playerCount;
          if (!isPlayerInGame) break;
          for (let j = 0; j < player.bullets.length; j++) {
            const bullet = player.bullets[j];
            if (bullet.dir === 'UP') {
              bullet.y -= 3;
            } else if (bullet.dir === 'DOWN') {
              bullet.y += 3;
            } else if (bullet.dir === 'LEFT') {
              bullet.x -= 3;
            } else if (bullet.dir === 'RIGHT') {
              bullet.x += 3;
            }
          }
        }
        // Collision check
        for (let id = 0; id < players.length; id++) {
          const player = players[id];
          const isPlayerInGame = id < playerCount;
          if (!isPlayerInGame) break;
          for (let i = 0; i < player.bullets.length; i++) {
            const bulletRect = new Rect(player.bullets[i].x, player.bullets[i].y, 1, 1);
            let isBulletHit = false;
            playerRects.forEach((playerRect: any, playerRectId: number) => {
              if (playerRect.intersects(bulletRect)) {
                players[playerRectId].lives--;
                flashRef.current[playerRectId] = 5;
                player.bullets.splice(i, 1);
                isBulletHit = true;
              }
            });
            if (isBulletHit) break;
            for (let k = 0; k < state.walls.solid.length; k++) {
              if (
                bulletRect.intersects(
                  new Rect(state.walls.solid[k].x, state.walls.solid[k].y, 4, 4),
                )
              ) {
                player.bullets.splice(i, 1);
                break;
              }
            }
            for (let k = 0; k < state.walls.movable.length; k++) {
              if (
                bulletRect.intersects(
                  new Rect(state.walls.movable[k].x, state.walls.movable[k].y, 4, 4),
                )
              ) {
                player.bullets.splice(i, 1);
                break;
              }
            }
          }
        }
      },
      [playerCount],
    );

    const hasClientMoved = useCallback(
      (gameState: any, prevGameState: any) => {
        const { x: p1NowX, y: p1NowY } = gameState.players[0].pos;
        const { x: p2NowX, y: p2NowY } = gameState.players[1].pos;
        const { x: p3NowX, y: p3NowY } = gameState.players[2].pos;
        const { x: p4NowX, y: p4NowY } = gameState.players[3].pos;
        const { x: p1HistoryX, y: p1HistoryY } = prevGameState.players[0].pos;
        const { x: p2HistoryX, y: p2HistoryY } = prevGameState.players[1].pos;
        const { x: p3HistoryX, y: p3HistoryY } = prevGameState.players[2].pos;
        const { x: p4HistoryX, y: p4HistoryY } = prevGameState.players[3].pos;
        const clientMoved =
          (playerN === 0 && (p1NowX !== p1HistoryX || p1NowY !== p1HistoryY)) ||
          (playerN === 1 && (p2NowX !== p2HistoryX || p2NowY !== p2HistoryY)) ||
          (playerN === 2 && (p3NowX !== p3HistoryX || p3NowY !== p3HistoryY)) ||
          (playerN === 3 && (p4NowX !== p4HistoryX || p4NowY !== p4HistoryY));
        return clientMoved;
      },
      [playerN],
    );

    /* ### [GameLoop]: Loops until game over. ### */
    const gameLoop = useCallback(
      (state: any, prevGameState: any) => {
        if (!state) return;
        const playerOne = state.players[0];
        const playerTwo = state.players[1];
        const playerThree = state.players[2];
        const playerFour = state.players[3];
        const players = [playerOne, playerTwo, playerThree, playerFour];
        const playerRects = [
          new Rect(playerOne.pos.x, playerOne.pos.y, 4, 4),
          new Rect(playerTwo.pos.x, playerTwo.pos.y, 4, 4),
          new Rect(playerThree.pos.x, playerThree.pos.y, 4, 4),
          new Rect(playerFour.pos.x, playerFour.pos.y, 4, 4),
        ];
        // [Players Movement]
        for (let i = 0; i < players.length; i++) {
          const player = players[i];
          const isPlayerInGame = i < playerCount;
          if (!isPlayerInGame) break;
          if (!collision(player, false, state)) {
            player.pos.x += player.dxdy.x;
            player.pos.y += player.dxdy.y;
            if (playerN === i && hasClientMoved(state, prevGameState)) playerUpdate(player);
          }
        }
        updateBullets(state, players, playerRects);
        /* [Food eaten] */
        if (state.food !== null) {
          const food = new Rect(state.food.x, state.food.y, 2, 2);
          for (let i = 0; i < players.length; i++) {
            const player = players[i];
            const playerRect = playerRects[i];
            const isPlayerInGame = i < playerCount;
            if (!isPlayerInGame) break;
            if (food.intersects(playerRect)) {
              if (player.lives < 3) player.lives++;
              livesUpdate(i, player);
              setTimeout(() => {
                randomFood();
              }, 10000);
            }
          }
        }
        // [Winner]
        for (let i = 0; i < players.length; i++) {
          const player = players[i];
          const isPlayerInGame = i < playerCount;
          if (!isPlayerInGame) break;
          if (player.lives <= 0) player.isDead = true;
        }
        return;
        // ## !IDEA: Make it so that gold can be collected, and upgrade some feature in-game. ##
      },
      [
        collision,
        hasClientMoved,
        livesUpdate,
        playerCount,
        playerN,
        playerUpdate,
        randomFood,
        updateBullets,
      ],
    );

    const paintBackground = useCallback(
      (context: CanvasRenderingContext2D) => {
        const gridsize = gameState.gridsize;
        const gridRatio = CANVAS_SIZE / gridsize;
        // CANVAS
        context.fillStyle = BG_COLOR;
        context.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        // WALLS SOLID
        if (gameState.walls.solid.length !== 0) {
          for (let i = 0; i < gameState.walls.solid.length; i++) {
            const wall = gameState.walls.solid[i];
            context.drawImage(
              SOLID_WALL_IMG,
              wall.x * gridRatio,
              wall.y * gridRatio,
              WALL_SIZE,
              WALL_SIZE,
            );
          }
        }
      },
      [gameState.gridsize, gameState.walls.solid],
    );

    const paintGame = useCallback(
      (context: CanvasRenderingContext2D, state: any) => {
        // ACTIVATE
        // scangamepads();
        // _.throttle(scangamepads, 500);
        if (!state) return;
        const food = state.food;
        const gridsize = state.gridsize;
        const gridRatio = CANVAS_SIZE / gridsize;
        const players = [state.players[0], state.players[1], state.players[2], state.players[3]];
        // CANVAS
        context.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        // POWERUPS
        context.drawImage(
          HEALTH_IMG,
          food.x * gridRatio,
          food.y * gridRatio,
          gridRatio * 2,
          gridRatio * 2,
        );
        // BULLETS
        context.fillStyle = '#ff6600';
        for (let i = 0; i < players.length; i++) {
          const player = players[i];
          for (let i = 0; i < player.bullets.length; i++) {
            context.fillRect(
              player.bullets[i].x * gridRatio,
              player.bullets[i].y * gridRatio,
              gridRatio,
              gridRatio,
            );
          }
        }
        // WALLS MOVABLE
        if (state.walls.movable.length !== 0) {
          for (let i = 0; i < state.walls.movable.length; i++) {
            const wall = state.walls.movable[i];
            context.drawImage(
              MOVABLE_WALL_IMG,
              wall.x * gridRatio,
              wall.y * gridRatio,
              WALL_SIZE,
              WALL_SIZE,
            );
          }
        }
        // PLAYERS
        const PLAYER_COLORS = [PLAYER_1_COLOR, PLAYER_2_COLOR, PLAYER_3_COLOR, PLAYER_4_COLOR];
        for (let i = 0; i < players.length; i++) {
          const player = players[i];
          const isPlayerInGame = i < playerCount;
          if (player.isDead) continue;
          if (!isPlayerInGame) break;
          // Flashes
          context.fillStyle = flashRef.current[i] ? FLASH_COLOR : PLAYER_COLORS[i];
          if (flashRef.current[i]) flashRef.current[i]--;
          context.fillRect(
            player.pos.x * gridRatio,
            player.pos.y * gridRatio,
            PLAYER_SIZE,
            PLAYER_SIZE,
          );
          // Lives
          if (player.lives > 0)
            for (let i = 0; i < player.lives; i++) {
              context.fillRect(
                player.pos.x * gridRatio + i * 7,
                player.pos.y * gridRatio - 6,
                5,
                5,
              );
            }
          // Inventory
          context.fillStyle = '#66ffff';
          for (let i = 3; i > player.inventorySpace; i--) {
            context.fillRect(
              player.pos.x * gridRatio + PLAYER_SIZE + 2,
              player.pos.y * gridRatio + 18 - 6 * i,
              4,
              4,
            );
          }
          // Reload
          context.fillStyle = '#ffff00';
          if (player.reload === false)
            context.fillRect(player.pos.x * gridRatio - 5, player.pos.y * gridRatio + 1, 3, 12);
        }
      },
      [playerCount],
    );

    const gameOver = useCallback(() => {
      if (!gameState.players[0].isDead) return 1;
      if (!gameState.players[1].isDead) return 2;
      if (!gameState.players[2].isDead) return 3;
      if (!gameState.players[3].isDead) return 4;
    }, [gameState.players]);

    const startGameInterval = useCallback(() => {
      let prevGameState = gameState;
      setInterval(() => intervalIdProcedure(refState.current), 1000 / FRAME_RATE);
      const intervalIdProcedure = (gameState: any) => {
        gameLoop(gameState, prevGameState);
        let winner;
        const isP1Dead = gameState.players[0].isDead;
        const isP2Dead = gameState.players[1].isDead;
        const isP3Dead = gameState.players[2].isDead;
        const isP4Dead = gameState.players[3].isDead;
        if (playerCount === 2 && (isP1Dead || isP2Dead)) winner = gameOver();
        else if (playerCount === 3) {
          if ((isP1Dead && isP2Dead) || (isP1Dead && isP3Dead) || (isP2Dead && isP3Dead))
            winner = gameOver();
        } else if (playerCount === 4) {
          const p1Counter = isP1Dead ? 0 : 1;
          const p2Counter = isP2Dead ? 0 : 1;
          const p3Counter = isP3Dead ? 0 : 1;
          const p4Counter = isP4Dead ? 0 : 1;
          if (p1Counter + p2Counter + p3Counter + p4Counter <= 1) winner = gameOver();
        }
        if (!winner) {
          if (!hasClientMoved(gameState, prevGameState)) return;
          prevGameState = gameState;
          emitGameState(gameState);
        } else {
          let p1Score = gameState.scores.P1;
          let p2Score = gameState.scores.P2;
          let p3Score = gameState.scores.P3;
          let p4Score = gameState.scores.P4;
          if (winner === 1 || winner === -1) p1Score++;
          if (winner === 2 || winner === -1) p2Score++;
          if (winner === 3 || winner === -1) p3Score++;
          if (winner === 4 || winner === -1) p4Score++;
          const state = resetGameState([p1Score, p2Score, p3Score, p4Score]);
          setGameState(state);
          refState.current = state;
        }
      };
    }, [
      gameState,
      gameLoop,
      playerCount,
      gameOver,
      hasClientMoved,
      emitGameState,
      resetGameState,
    ]);

    const wallDropAllowed = useCallback(
      (player: any) => {
        const playerSize = 4;
        const wallSize = 4;
        let space;
        if (player.dir === 'UP') {
          space = new Rect(player.pos.x, player.pos.y - wallSize, wallSize, wallSize);
        } else if (player.dir === 'DOWN') {
          space = new Rect(player.pos.x, player.pos.y + playerSize, wallSize, wallSize);
        } else if (player.dir === 'LEFT') {
          space = new Rect(player.pos.x - wallSize, player.pos.y, wallSize, wallSize);
        } else if (player.dir === 'RIGHT') {
          space = new Rect(player.pos.x + playerSize, player.pos.y, wallSize, wallSize);
        }
        gameState.walls.movable.push({ x: space?.x, y: space?.y });
        return true;
      },
      [gameState.walls.movable],
    );

    const joystickMovedUpdate = useCallback(
      (event: any) => {
        const direction = event.direction;
        const player = refState.current.players[playerN];
        if (!player) return;
        if (player.isDead) return;
        player.directionPreference = [direction];
        const dxdy = calculateDirection(player);
        player.dxdy.x = dxdy[0];
        player.dxdy.y = dxdy[1];
        setGameState((prevState: any) => ({
          ...prevState,
          players: prevState.players.map((p: any) => {
            if (p.id === playerN + 1) {
              return player;
            } else return p;
          }),
        }));
        refState.current.players[playerN] = player;
        emitGameState(refState.current);
      },
      [emitGameState, playerN],
    );

    const joystickReleasedUpdate = useCallback(
      (event: any) => {
        const player = refState.current.players[playerN];
        if (!player) return;
        if (player.isDead) return;
        if (event.type === 'stop') player.directionPreference = [];
        const dxdy = calculateDirection(player);
        player.dxdy.x = dxdy[0];
        player.dxdy.y = dxdy[1];
        setGameState((prevState: any) => ({
          ...prevState,
          players: prevState.players.map((p: any) => {
            if (p.id === playerN + 1) {
              return player;
            } else return p;
          }),
        }));
        refState.current.players[playerN] = player;
        emitGameState(refState.current);
      },
      [emitGameState, playerN],
    );

    const joystickShoot = useCallback(
      (event) => {
        const player = refState.current.players[playerN];
        if (player.reload === false) {
          if (player.dir === 'UP') {
            player.bullets.push({ x: player.pos.x + 1, y: player.pos.y, dir: 'UP' });
          } else if (player.dir === 'DOWN') {
            player.bullets.push({ x: player.pos.x + 1, y: player.pos.y + 4, dir: 'DOWN' });
          } else if (player.dir === 'LEFT') {
            player.bullets.push({ x: player.pos.x, y: player.pos.y + 1, dir: 'LEFT' });
          } else if (player.dir === 'RIGHT') {
            player.bullets.push({ x: player.pos.x + 4, y: player.pos.y + 1, dir: 'RIGHT' });
          }
          player.reload = true;
          setTimeout(() => {
            player.reload = false;
          }, 500);
        }
      },
      [playerN],
    );

    const joystickPickup = useCallback(
      (event) => {
        const player = refState.current.players[playerN];
        if (player.inventoryCooldown === false) {
          // Pick up wall
          if (player.inventorySpace - 1 >= 0 && collision(player, true, gameState)) {
            player.inventoryCooldown = true;
            player.inventorySpace--;
          }
          // Drop wall
          else if (player.inventorySpace !== 3 && wallDropAllowed(player)) {
            player.inventorySpace++;
          }
          setTimeout(() => {
            player.inventoryCooldown = false;
          }, 500);
        }
      },
      [collision, gameState, playerN, wallDropAllowed],
    );

    const keyPressedUpdate = useCallback(
      (keyCode: number) => {
        const player = refState.current.players[playerN];
        if (!player) return;
        if (player.isDead) return;
        if (keyCode === 71) {
          if (player.reload === false) {
            if (player.dir === 'UP') {
              player.bullets.push({ x: player.pos.x + 1, y: player.pos.y, dir: 'UP' });
            } else if (player.dir === 'DOWN') {
              player.bullets.push({ x: player.pos.x + 1, y: player.pos.y + 4, dir: 'DOWN' });
            } else if (player.dir === 'LEFT') {
              player.bullets.push({ x: player.pos.x, y: player.pos.y + 1, dir: 'LEFT' });
            } else if (player.dir === 'RIGHT') {
              player.bullets.push({ x: player.pos.x + 4, y: player.pos.y + 1, dir: 'RIGHT' });
            }
            player.reload = true;
            setTimeout(() => {
              player.reload = false;
            }, 500);
          }
        } else if (keyCode === 72) {
          if (player.inventoryCooldown === false) {
            // Pick up wall
            if (player.inventorySpace - 1 >= 0 && collision(player, true, gameState)) {
              player.inventoryCooldown = true;
              player.inventorySpace--;
            }
            // Drop wall
            else if (player.inventorySpace !== 3 && wallDropAllowed(player)) {
              player.inventorySpace++;
            }
            setTimeout(() => {
              player.inventoryCooldown = false;
            }, 500);
          }
        } else {
          if (!player.directionPreference.includes(keyCode)) {
            player.directionPreference.push(keyCode);
          }
          const dxdy = calculateDirection(player);
          player.dxdy.x = dxdy[0];
          player.dxdy.y = dxdy[1];
        }
        setGameState((prevState: any) => ({
          ...prevState,
          players: prevState.players.map((p: any) => {
            if (p.id === playerN + 1) {
              return player;
            } else return p;
          }),
        }));
        refState.current.players[playerN] = player;
        emitGameState(refState.current);
      },
      [collision, emitGameState, gameState, playerN, wallDropAllowed],
    );

    const keyReleasedUpdate = useCallback(
      (keyCode: any) => {
        const player = refState.current.players[playerN];
        if (!player) return;
        if (player.isDead) return;
        if (player.directionPreference.includes(keyCode)) {
          const newDirectionPreference = [];
          const searchValue = keyCode;
          for (let i = 0; i < player.directionPreference.length; i++) {
            if (player.directionPreference[i] !== searchValue) {
              newDirectionPreference.push(player.directionPreference[i]);
            }
          }
          player.directionPreference = newDirectionPreference;
        }
        const dxdy = calculateDirection(player);
        player.dxdy.x = dxdy[0];
        player.dxdy.y = dxdy[1];
        setGameState((prevState: any) => ({
          ...prevState,
          players: prevState.players.map((p: any) => {
            if (p.id === playerN + 1) {
              return player;
            } else return p;
          }),
        }));
        refState.current.players[playerN] = player;
        emitGameState(refState.current);
      },
      [emitGameState, playerN],
    );

    useEffect(() => {
      initializePlayingField();
      randomFood();
      startGameInterval();
      window.addEventListener(
        'keydown',
        (e: KeyboardEvent) => {
          keyPressedUpdate(e.keyCode);
        },
        false,
      );
      window.addEventListener(
        'keyup',
        (e: KeyboardEvent) => {
          keyReleasedUpdate(e.keyCode);
        },
        false,
      );
      return () => {
        window.removeEventListener('keydown', (e: KeyboardEvent) => keyPressedUpdate(e.keyCode));
        window.removeEventListener('keyup', (e: KeyboardEvent) => keyReleasedUpdate(e.keyCode));
      };
    }, []);

    const calculateDirection = (player: any) => {
      let dx = 0;
      let dy = 0;
      if (player.directionPreference.length > 0) {
        switch (player.directionPreference[player.directionPreference.length - 1]) {
          case 37:
          case 'LEFT': {
            dx = -1;
            player.dir = 'LEFT';
            return [dx, dy];
          }
          case 38:
          case 'FORWARD': {
            dy = -1;
            player.dir = 'UP';
            return [dx, dy];
          }
          case 39:
          case 'RIGHT': {
            dx = 1;
            player.dir = 'RIGHT';
            return [dx, dy];
          }
          case 40:
          case 'BACKWARD': {
            dy = 1;
            player.dir = 'DOWN';
            return [dx, dy];
          }
        }
      }
      return [0, 0];
    };

    // ACTIVATE
    /* const scangamepads = () => {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      const gamepad = gamepads[0];
      if (gamepad?.buttons[0].pressed) {
        keyPressedUpdate(72);
        console.log('X HIT!');
      }
      if (gamepad?.buttons[2].pressed) {
        keyPressedUpdate(71);
        console.log('SQUARE HIT!');
      }
      if (gamepad?.axes[0] === -1) {
        keyPressedUpdate(37);
        console.log('WALK LEFT!');
      } else if (gamepad?.axes[0] === 0) keyReleasedUpdate(37);
      if (gamepad?.axes[1] === -1) {
        keyPressedUpdate(38);
        console.log('WALK UP!');
      } else if (gamepad?.axes[1] === 0) keyReleasedUpdate(38);
      if (gamepad?.axes[0] === 1) {
        keyPressedUpdate(39);
        console.log('WALK RIGHT!');
      } else if (gamepad?.axes[0] === 0) keyReleasedUpdate(39);
      if (gamepad?.axes[1] === 1) {
        keyPressedUpdate(40);
        console.log('WALK DOWN!');
      } else if (gamepad?.axes[1] === 0) keyReleasedUpdate(40);
    }; */

    // const rAF = window.requestAnimationFrame;
    /* const updateStatus = () => {
      scangamepads();
      rAF(updateStatus);
    }; */

    // ACTIVATE
    /* window.addEventListener('gamepadconnected', (e) => {
      // rAF(updateStatus);
      // setTimeout(() => {
      //  rAF(updateStatus);
      // }, 1000 / FRAME_RATE);
    }); */

    return (
      <>
        <div
          style={{
            width: '99.5vw',
            userSelect: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            overflow: 'hidden',
          }}
        >
          <Spacer height={5} />
          <div
            id="gameScreen"
            style={{ position: 'relative', height: CANVAS_SIZE, width: CANVAS_SIZE }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                height: '80vh',
              }}
            >
              <CanvasBackground draw={paintBackground} size={CANVAS_SIZE} />
              <Canvas draw={paintGame} state={gameState} size={CANVAS_SIZE} />
            </div>
          </div>

          <span style={{ display: 'flex', flexDirection: 'row' }}>
            <ScoreText style={{ color: 'red' }}>P1: </ScoreText>
            <ScoreText>{gameState.scores.P1} Pts.</ScoreText>
            <Spacer width={15} />
            <ScoreText style={{ color: 'green' }}>P2: </ScoreText>
            <ScoreText>{gameState.scores.P2} Pts.</ScoreText>
            <Spacer width={15} />
            {playerCount >= 3 && (
              <>
                <ScoreText style={{ color: PLAYER_3_COLOR }}>P3: </ScoreText>
                <ScoreText>{gameState.scores.P3} Pts.</ScoreText>
              </>
            )}
            <Spacer width={15} />
            {playerCount >= 4 && (
              <>
                <ScoreText style={{ color: PLAYER_4_COLOR }}>P4: </ScoreText>
                <ScoreText>{gameState.scores.P4} Pts.</ScoreText>
              </>
            )}
          </span>
        </div>
        {IS_MOBILE_OR_TABLET ? (
          <div
            style={{
              width: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                width: CANVAS_SIZE,
                display: 'grid',
                gridTemplateColumns: 'auto auto auto',
                justifyContent: 'space-evenly',
              }}
            >
              <div style={{ cursor: 'move', zIndex: 100 }}>
                <Joystick size={105} move={joystickMovedUpdate} stop={joystickReleasedUpdate} />
              </div>
              <img
                src={SQUARE_IMG}
                alt="squareBTN"
                width={90}
                height={90}
                onTouchStart={joystickShoot}
                onTouchEnd={(e) => e.stopPropagation()}
                style={{ cursor: 'pointer', zIndex: 100 }}
              />
              <img
                src={CIRCLE_IMG}
                alt="circleBTN"
                width={90}
                height={90}
                onTouchStart={joystickPickup}
                onTouchEnd={(e) => e.stopPropagation()}
                style={{ cursor: 'pointer', zIndex: 100 }}
              />
            </div>
          </div>
        ) : null}
      </>
    );
  },
);
