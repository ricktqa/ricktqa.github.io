import React, { useState, useEffect, useCallback, useRef } from 'react';

// SECTION 1: GAME CONSTANTS
const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const PLAYER_WIDTH = 40;
const PLAYER_HEIGHT = 40;
const PLAYER_SPEED = 5;
const JUMP_FORCE = -12;
const GRAVITY = 0.5;
const FRICTION = 0.9;

// SECTION 2: TYPE DEFINITIONS
interface PlayerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  onGround: boolean;
}

interface PlatformData {
  x: number;
  y: number;
  width: number;
  height: number;
  isGoal?: boolean;
}

interface KeysState {
  ArrowLeft: boolean;
  ArrowRight: boolean;
  ArrowUp: boolean;
  ' ': boolean;
  w: boolean;
  a: boolean;
  d: boolean;
}

type GameStatus = 'start' | 'playing' | 'won' | 'lost';

// SECTION 3: LEVEL DATA
const platforms: PlatformData[] = [
  { x: 100, y: 550, width: 200, height: 20 },
  { x: 400, y: 450, width: 150, height: 20 },
  { x: 200, y: 350, width: 100, height: 20 },
  { x: 500, y: 250, width: 250, height: 20 },
  { x: 150, y: 150, width: 120, height: 20 },
  { x: 400, y: 80, width: 80, height: 20, isGoal: true },
];

const INITIAL_PLAYER_STATE: PlayerState = {
  x: platforms[0].x + platforms[0].width / 2 - PLAYER_WIDTH / 2,
  y: platforms[0].y - PLAYER_HEIGHT - 50,
  vx: 0,
  vy: 0,
  onGround: false,
};

// SECTION 4: HELPER COMPONENTS (Defined outside the main App component)

interface PlayerProps {
  playerState: PlayerState;
}

const Player: React.FC<PlayerProps> = ({ playerState }) => (
  <div
    className="bg-cyan-400 rounded shadow-lg shadow-cyan-400/50"
    style={{
      position: 'absolute',
      left: playerState.x,
      top: playerState.y,
      width: PLAYER_WIDTH,
      height: PLAYER_HEIGHT,
      transition: 'box-shadow 0.2s ease-in-out',
    }}
  />
);

interface PlatformProps {
  platform: PlatformData;
}

const Platform: React.FC<PlatformProps> = ({ platform }) => (
  <div
    className={`${
      platform.isGoal ? 'bg-emerald-500 shadow-emerald-500/50' : 'bg-indigo-600 shadow-indigo-600/50'
    } rounded shadow-lg`}
    style={{
      position: 'absolute',
      left: platform.x,
      top: platform.y,
      width: platform.width,
      height: platform.height,
    }}
  />
);

interface UIOverlayProps {
  status: GameStatus;
  onStart: () => void;
}

const UIOverlay: React.FC<UIOverlayProps> = ({ status, onStart }) => {
  if (status === 'playing') return null;

  const messages = {
    start: { title: "React Platformer", button: "Start Game" },
    won: { title: "You Win!", button: "Play Again" },
    lost: { title: "Game Over", button: "Try Again" },
  };

  const currentMessage = messages[status];

  return (
    <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col justify-center items-center text-white z-10">
      <h1 className="text-6xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
        {currentMessage.title}
      </h1>
      {status === 'start' && <p className="mb-8 text-gray-300">Use Arrow Keys or W/A/D to move and jump. Reach the green platform!</p>}
      <button
        onClick={onStart}
        className="px-8 py-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold rounded-lg shadow-lg hover:scale-105 transform transition-transform duration-200"
      >
        {currentMessage.button}
      </button>
    </div>
  );
};

// SECTION 5: MAIN APP COMPONENT

export default function App() {
  const [playerState, setPlayerState] = useState<PlayerState>(INITIAL_PLAYER_STATE);
  const [keys, setKeys] = useState<KeysState>({
    ArrowLeft: false, ArrowRight: false, ArrowUp: false, ' ': false, w: false, a: false, d: false,
  });
  const [gameStatus, setGameStatus] = useState<GameStatus>('start');
  const gameLoopRef = useRef<number | null>(null);

  const resetGame = useCallback(() => {
    setPlayerState(INITIAL_PLAYER_STATE);
    setGameStatus('playing');
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key in keys) {
        setKeys((prev) => ({ ...prev, [e.key]: true }));
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key in keys) {
        setKeys((prev) => ({ ...prev, [e.key]: false }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [keys]);
  
  const updateGame = useCallback(() => {
    setPlayerState(p => {
        let newVx = p.vx;
        let newVy = p.vy;
        let newX = p.x;
        let newY = p.y;
        let newOnGround = false;

        // Horizontal movement
        if (keys.ArrowLeft || keys.a) {
            newVx = -PLAYER_SPEED;
        } else if (keys.ArrowRight || keys.d) {
            newVx = PLAYER_SPEED;
        } else {
            newVx *= FRICTION;
        }

        // Jumping
        if ((keys.ArrowUp || keys[' '] || keys.w) && p.onGround) {
            newVy = JUMP_FORCE;
        }
        
        // Apply gravity
        newVy += GRAVITY;

        // Update position
        newX += newVx;
        newY += newVy;
        
        // Collision with platforms
        for (const platform of platforms) {
            if (
                newX < platform.x + platform.width &&
                newX + PLAYER_WIDTH > platform.x &&
                newY < platform.y + platform.height &&
                newY + PLAYER_HEIGHT > platform.y &&
                p.y + PLAYER_HEIGHT <= platform.y // Was above the platform in previous frame
            ) {
                newVy = 0;
                newY = platform.y - PLAYER_HEIGHT;
                newOnGround = true;

                if (platform.isGoal) {
                    setGameStatus('won');
                }
            }
        }

        // World boundaries
        if (newX < 0) newX = 0;
        if (newX + PLAYER_WIDTH > GAME_WIDTH) newX = GAME_WIDTH - PLAYER_WIDTH;
        if (newY > GAME_HEIGHT) {
            setGameStatus('lost');
        }
        
        return { x: newX, y: newY, vx: newVx, vy: newVy, onGround: newOnGround };
    });

  }, [keys]);


  useEffect(() => {
    if (gameStatus === 'playing') {
      const loop = () => {
        updateGame();
        gameLoopRef.current = requestAnimationFrame(loop);
      };
      gameLoopRef.current = requestAnimationFrame(loop);
    } else {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    }

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameStatus, updateGame]);


  return (
    <div className="flex justify-center items-center h-screen font-sans">
      <div
        className="bg-gradient-to-b from-gray-800 to-black rounded-xl shadow-2xl overflow-hidden"
        style={{ width: GAME_WIDTH, height: GAME_HEIGHT, position: 'relative' }}
      >
        <UIOverlay status={gameStatus} onStart={resetGame} />
        <Player playerState={playerState} />
        {platforms.map((platform, i) => (
          <Platform key={i} platform={platform} />
        ))}
      </div>
    </div>
  );
}