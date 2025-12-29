// client/src/pages/Game.jsx - FIXED VERSION

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import { gameAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import socketService from '../services/socketService';
import ChessBoard from '../components/ChessBoard/ChessBoard';
import ChatPanel from '../components/game/ChatPanel';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Trophy, Clock, Target, Flag, Bot, User, AlertCircle, AlertTriangle, XCircle, Loader2, Wifi, WifiOff } from 'lucide-react';

// ============================================
// 🎯 ENHANCED GAME OVER MODAL
// ============================================
const GameOverModal = ({ show, winner, reason, onClose, onDismiss, gameStats }) => {
  if (!show) return null;

  const getModalStyle = () => {
    if (winner === 'You') {
      return {
        emoji: '🏆',
        title: 'Victory!',
        bgColor: 'bg-gradient-to-br from-yellow-500/20 to-green-500/20',
        borderColor: 'border-yellow-500',
        textColor: 'text-yellow-500',
        accentColor: 'bg-yellow-500 hover:bg-yellow-600'
      };
    } else if (winner === 'Draw') {
      return {
        emoji: '🤝',
        title: 'Draw!',
        bgColor: 'bg-gradient-to-br from-blue-500/20 to-purple-500/20',
        borderColor: 'border-blue-500',
        textColor: 'text-blue-500',
        accentColor: 'bg-blue-500 hover:bg-blue-600'
      };
    } else {
      return {
        emoji: '💔',
        title: 'Defeat',
        bgColor: 'bg-gradient-to-br from-red-500/20 to-pink-500/20',
        borderColor: 'border-red-500',
        textColor: 'text-red-500',
        accentColor: 'bg-red-500 hover:bg-red-600'
      };
    }
  };

  const style = getModalStyle();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className={`max-w-md w-full mx-4 rounded-xl border-2 ${style.borderColor} ${style.bgColor} shadow-2xl`}>
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="text-center">
            <div className="mb-4 text-6xl animate-bounce">{style.emoji}</div>
            <h2 className={`text-4xl font-bold ${style.textColor}`}>
              {style.title}
            </h2>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="text-center space-y-2">
            <p className="text-xl font-semibold text-white">
              {winner === 'Draw' ? 'Game ended in a draw' : `${winner} wins!`}
            </p>
            <p className="text-sm text-gray-300">
              {reason}
            </p>
          </div>

          {/* 🆕 Game Stats (Optional) */}
          {gameStats && (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 rounded-lg p-3 border border-white/10 text-center">
                <div className="text-2xl font-bold text-white">{gameStats.moves || 0}</div>
                <div className="text-xs text-gray-400">Moves</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3 border border-white/10 text-center">
                <div className="text-2xl font-bold text-white">{gameStats.duration || '--'}</div>
                <div className="text-xs text-gray-400">Duration</div>
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-white/5 rounded-lg p-3 border border-white/10">
            <p className="text-xs text-gray-400 text-center">
              💡 You can review the game board or return to the home page
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-6 pt-0 space-y-3">
          {/* Primary Button - Return Home */}
          <button
            onClick={onClose}
            className={`w-full ${style.accentColor} text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg`}
          >
            🏠 Return to Home
          </button>

          {/* Secondary Button - Dismiss (View Game) */}
          <button
            onClick={onDismiss}
            className="w-full bg-white/10 hover:bg-white/20 text-white font-medium py-3 px-4 rounded-lg border border-white/20 transition-all duration-200 hover:scale-105 active:scale-95"
          >
            👁️ Dismiss & Review Game
          </button>
        </div>

        {/* Footer Hint */}
        <div className="px-6 pb-4 text-center">
          <p className="text-xs text-gray-500">
            Press <kbd className="px-2 py-1 rounded bg-white/10">ESC</kbd> to dismiss
          </p>
        </div>
      </div>
    </div>
  );
};

const ResignationToast = ({ show, resignedPlayer, onComplete }) => {
  useEffect(() => {
    if (show) {
      // Auto-dismiss after 2 seconds
      const timer = setTimeout(() => {
        onComplete();
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none">
      <div className="animate-in zoom-in-50 duration-500">
        <div className="bg-gradient-to-r from-yellow-500/20 to-green-500/20 border-4 border-green-500 rounded-2xl p-8 shadow-2xl backdrop-blur-md">
          <div className="text-center space-y-3">
            <div className="text-7xl animate-bounce">🏳️</div>
            <div className="text-3xl font-bold text-green-500">
              {resignedPlayer} Resigned!
            </div>
            <div className="text-xl text-[hsl(var(--color-foreground))]">
              Victory is yours! 🎉
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// 🛠️ UTILITY FUNCTIONS
// ============================================
/**
 * Format game duration in human-readable format
 * @param {Date|string} startedAt - Game start time
 * @param {Date|string} endedAt - Game end time
 * @returns {string} - Formatted duration (e.g., "5m 32s")
 */
const formatDuration = (startedAt, endedAt) => {
  if (!startedAt || !endedAt) return '--';
  
  const start = new Date(startedAt);
  const end = new Date(endedAt);
  const diffMs = end - start;
  
  if (diffMs < 0) return '--';
  
  const diffSeconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(diffSeconds / 60);
  const seconds = diffSeconds % 60;
  
  if (minutes === 0) {
    return `${seconds}s`;
  } else if (minutes < 60) {
    return `${minutes}m ${seconds}s`;
  } else {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }
};

/**
 * Get game statistics for modal display
 * @param {Object} game - Game object
 * @returns {Object} - Stats object
 */
const getGameStats = (game) => {
  if (!game) return null;
  
  return {
    moves: game.moves?.length || 0,
    duration: formatDuration(game.startedAt, game.endedAt)
  };
};

const Game = () => { 
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [game, setGame] = useState(null);
  const [chess] = useState(new Chess());
  const [position, setPosition] = useState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [botThinking, setBotThinking] = useState(false);
  const [timeoutWarning, setTimeoutWarning] = useState(null);
  const [remainingTime, setRemainingTime] = useState(null);
  const [isResigning, setIsResigning] = useState(false);
  
  // ✅ CENTRALIZED GAME OVER STATE
  const [gameOverModal, setGameOverModal] = useState({
    show: false,
    winner: '',
    reason: ''
  });

  const [showResignationToast, setShowResignationToast] = useState(false);
  const [resignedPlayerName, setResignedPlayerName] = useState('');
  const [hasReviewedGame, setHasReviewedGame] = useState(false);

  // ============================================
  // 🆕 HANDLE DISMISS - Hide modal but stay on page
  // ============================================
  const handleDismissModal = () => {
    setGameOverModal({
      show: false,
      winner: '',
      reason: ''
    });
    setHasReviewedGame(true);
  };

  // ============================================
  // ✅ HANDLE CLOSE - Navigate to home
  // ============================================
  const handleCloseModal = () => {
    // if (!hasReviewedGame && game?.status === 'completed') {
    //   const confirmed = window.confirm(
    //     '❓ Leave without reviewing the game?\n\n' +
    //     'You can dismiss this modal to see the final board position.'
    //   );
    //   if (!confirmed) return;
    // }
    navigate('/');
  };

  // ALSO PREVENT BROWSER BACK BUTTON
  useEffect(() => {
    if (game?.status === 'completed' && !hasReviewedGame) {
      const handleBeforeUnload = (e) => {
        e.preventDefault();
        e.returnValue = ''; // Chrome requires returnValue to be set
      };

      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  }, [game?.status, hasReviewedGame]);

  // ============================================
  // 🆕 KEYBOARD SHORTCUT - ESC to dismiss
  // ============================================
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && gameOverModal.show) {
        handleDismissModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameOverModal.show]);

  // ============================================
  // 🎯 UNIFIED GAME OVER HANDLER
  // ============================================
  const showGameOverModal = (winner, reason) => {
    console.log('🏁 Showing Game Over Modal:', { winner, reason });
    
    // Force modal to show with a small delay to ensure state updates
    setTimeout(() => {
      setGameOverModal({
        show: true,
        winner,
        reason
      });
    }, 100);
  };

  // Socket initialization
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      if (!socketService.isConnected()) {
        socketService.connect(token);
      }

      const socket = socketService.getSocket();
      if (socket) {
        setSocketConnected(socket.connected);
        
        socket.on('connect', () => {
          setSocketConnected(true);
        });
        
        socket.on('disconnect', () => {
          setSocketConnected(false);
        });
      }
    } catch (err) {
      console.error('Socket initialization failed:', err);
    }

    return () => {
      const socket = socketService.getSocket();
      if (socket) {
        socket.off('connect');
        socket.off('disconnect');
      }
    };
  }, [navigate]);

  // Load game & join socket room
  useEffect(() => {
    if (gameId) {
      fetchGame();
      
      if (socketConnected) {
        try {
          socketService.joinGame(gameId);
          setupSocketListeners();
        } catch (err) {
          console.error('Failed to join socket room:', err);
        }
      }

      let pollInterval;
      if (game && !game.isBot && game.status === 'active') {
        pollInterval = setInterval(() => {
          if (!socketConnected) {
            fetchGame();
          }
        }, 5000);
      }

      return () => {
        if (pollInterval) clearInterval(pollInterval);
        if (socketConnected && gameId) {
          try {
            socketService.leaveGame(gameId);
          } catch (err) {
            console.error('Failed to leave socket room:', err);
          }
        }
      };
    }
  }, [gameId, socketConnected, game?.isBot]);

  // Socket event handlers
  const setupSocketListeners = () => {
    try {
      socketService.onMoveMade(({ playerId }) => {
        if (playerId !== user.id) {
          fetchGame();
          setTimeoutWarning(null);
          setRemainingTime(null);
        }
      });

      socketService.onGameStateUpdate((gameData) => {
        setGame(gameData);
        chess.load(gameData.fen);
        setPosition(gameData.fen);
      });

      socketService.getSocket().on('game:timeout', (data) => {
        console.log('⏰ Game timed out:', data);
        // ✅ NEW: Check if this is an early abandonment draw
        if (data.winner === 'Draw') {
          console.log('🤝 Early abandonment - ending as draw');
          showGameOverModal('Draw', data.message);
          return; // Exit early
        }
        
        const myColor = getPlayerColor();
        let winner;
        
        if (data.winner === myColor) {
          winner = 'You';
        } else if (game.isBot) {
          winner = 'Stockfish';
        } else {
          winner = data.winner === 'white' 
            ? game.players.white?.username 
            : game.players.black?.username;
        }
        
        showGameOverModal(winner, data.message);
      });

      socketService.getSocket().on('game:player-resigned', (data) => {
        console.log('🏳️ Player resigned:', data);

        const myColor = getPlayerColor();
  
        // ============================================
        // 🛡️ SAFETY CHECK: Ignore if I resigned
        // ============================================
        if (data.resignedPlayer === myColor) {
          console.warn('⚠️ Received my own resignation event - ignoring (this should not happen)');
          return; // Exit early - don't show modal
        }
        
        // Update local game state immediately
        setGame(prev => ({
          ...prev,
          status: 'completed',
          result: data.game.result,
          winner: data.game.winner,
          endedAt: data.game.endedAt
        }));

        // Clear any timeout warnings
        setTimeoutWarning(null);
        setRemainingTime(null);

        const winner = 'You';
        // ============================================
        // SHOW GAME OVER MODAL IMMEDIATELY
        // ============================================
        showGameOverModal(
          winner,
          `${data.resignedUsername} resigned. ${winner === 'You' ? 'You win!' : `${data.winnerUsername} wins!`}`
        );

        // Optional: Play victory sound
        // new Audio('/sounds/victory.mp3').play().catch(() => {});

        // Optional: Browser notification (if permission granted)
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Game Over!', {
            body: `${data.resignedUsername} resigned. You win!`,
            icon: '/chess-pawn.svg'
          });
        }
      });

      socketService.getSocket().on('game:timeout-warning', (data) => {
        const myColor = getPlayerColor();
        if (data.currentPlayer === myColor) {
          setTimeoutWarning(data.message);
          setRemainingTime(data.remainingTime);
          
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('⚠️ Your turn!', {
              body: `You have ${Math.ceil(data.remainingTime / 1000)} seconds to move!`,
              icon: '/chess-pawn.svg'
            });
          }
        }
      });

      socketService.getSocket().on('game:timeout-warning-cleared', () => {
        setTimeoutWarning(null);
        setRemainingTime(null);
      });

    } catch (err) {
      console.error('Failed to setup socket listeners:', err);
    }
  };

  // Cleanup timeout listeners
  useEffect(() => {
    if (gameId && socketConnected) {
      socketService.joinGame(gameId);
      setupSocketListeners();
    }
    return () => {
      const socket = socketService.getSocket();
      if (socket) {
        socket.off('game:timeout-warning');
        socket.off('game:timeout');
        socket.off('game:timeout-warning-cleared');
        socket.off('game:player-resigned');
      }
    };
  }, [gameId, socketConnected]);

  // Countdown timer
  useEffect(() => {
    if (remainingTime && timeoutWarning) {
      const interval = setInterval(() => {
        setRemainingTime(prev => {
          if (prev <= 1000) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1000;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [timeoutWarning, remainingTime]);

  const fetchGame = async () => {
    try {
      setError(null);
      const response = await gameAPI.getGame(gameId);
      const gameData = response.data.game;

      setGame(gameData);
      chess.load(gameData.fen);
      setPosition(gameData.fen);
      setLoading(false);

      // ✅ CHECK IF GAME IS ALREADY OVER WHEN LOADING
      if (gameData.status === 'completed') {
        setTimeout(() => {
          determineWinnerAndShowModal(gameData);
        }, 500);
      }
    } catch (error) {
      console.error('❌ Error fetching game:', error);
      setError(error.response?.data?.message || 'Failed to load game');
      setLoading(false);
      
      if (error.response?.status === 404) {
        setTimeout(() => navigate('/'), 2000);
      }
    }
  };

  // ✅ NEW: Helper to determine winner from completed game
  const determineWinnerAndShowModal = (gameData) => {
    let winner = 'Unknown';
    let reason = 'Game ended';

    if (gameData.result === '1/2-1/2') {
      winner = 'Draw';
      reason = 'Game ended in a draw';
    } else if (gameData.winner) {
      const winnerId = gameData.winner._id || gameData.winner;
      
      if (winnerId.toString() === user.id) {
        winner = 'You';
      } else if (gameData.isBot) {
        winner = 'Stockfish';
      } else {
        if (gameData.players.white?._id?.toString() === winnerId.toString()) {
          winner = gameData.players.white.username;
        } else if (gameData.players.black?._id?.toString() === winnerId.toString()) {
          winner = gameData.players.black.username;
        }
      }

      if (gameData.abandonedBy) {
        reason = `${gameData.abandonedBy.toUpperCase()} ran out of time!`;
      } else {
        reason = 'Checkmate! Game over.';
      }
    }

    showGameOverModal(winner, reason);
  };

  const isMyTurn = () => {
    if (!game || !user) return false;

    if (game.isBot) {
      const myColor = game.players.white?._id === user.id ? 'white' : 'black';
      return game.currentTurn === myColor && game.status === 'active';
    }

    const myColor = game.players.white._id === user.id ? 'white' : 'black';
    return game.currentTurn === myColor && game.status === 'active';
  };

  const getPlayerColor = () => {
    if (!game || !user) return 'white';
    if (game.isBot) {
      return game.players.white?._id === user.id ? 'white' : 'black';
    }
    return game.players.white._id === user.id ? 'white' : 'black';
  };

  // ============================================
  // 🎯 HANDLE MOVE - WITH MODAL INTEGRATION
  // ============================================
  const handleMove = async (from, to) => {
    const move = { from, to, promotion: 'q' };
    
    const testChess = new Chess(position);
    const testMove = testChess.move(move);
    
    if (!testMove) {
      console.error('❌ Invalid move locally:', move);
      return;
    }

    try {
      if (game.isBot) {
        setBotThinking(true);
      }

      let response;
      if (game.isBot) {
        response = await gameAPI.makeBotMove(gameId, move);
      } else {
        response = await gameAPI.makeMove(gameId, move);
        
        if (socketConnected) {
          socketService.notifyMove(gameId, move);
        }
      }
      
      const newGame = response.data.game;
      setGame(newGame);
      chess.load(newGame.fen);
      setPosition(newGame.fen);

      // ✅ CHECKMATE - USE MODAL
      if (response.data.gameStatus.isCheckmate) {
        console.log('🎯 Checkmate detected, showing modal...');
        
        let winnerName = 'Unknown';
        
        if (game.isBot) {
          const myColor = getPlayerColor();
          const winnerColor = newGame.currentTurn === 'white' ? 'black' : 'white';
          winnerName = myColor === winnerColor ? 'You' : 'Stockfish';
        } else {
          const winnerId = newGame.winner?._id || newGame.winner;
          
          if (winnerId) {
            if (winnerId.toString() === user.id) {
              winnerName = 'You';
            } else {
              if (newGame.players.white?._id?.toString() === winnerId.toString()) {
                winnerName = newGame.players.white.username;
              } else if (newGame.players.black?._id?.toString() === winnerId.toString()) {
                winnerName = newGame.players.black.username;
              }
            }
          }
        }
        
        // ✅ IMMEDIATE MODAL DISPLAY
        showGameOverModal(winnerName, 'Checkmate! Game over.');
      } 
      // ✅ DRAW - USE MODAL
      else if (response.data.gameStatus.isDraw) {
        console.log('🤝 Draw detected, showing modal...');
        
        let drawReason = 'Stalemate';
        if (chess.isInsufficientMaterial()) drawReason = 'Insufficient material';
        if (chess.isThreefoldRepetition()) drawReason = 'Threefold repetition';
        
        showGameOverModal('Draw', drawReason);
      }
    } catch (error) {
      console.error('❌ Error making move:', error);
      setError(error.response?.data?.message || 'Invalid move');
      setTimeout(() => setError(null), 3000);
      fetchGame();
    } finally {
      setBotThinking(false);
    }
  };

  // ============================================
  // 🎯 RESIGN - FIXED VERSION
  // ============================================
  const handleResign = async () => {
    if (!window.confirm('Are you sure you want to resign?')) return;

    setIsResigning(true);
    
    try {
      console.log('📤 Sending resign request...');
      
      const socket = socketService.getSocket();
      const socketId = socket?.id || null;
      
      const response = await gameAPI.resignGame(gameId, socketId);
      console.log('✅ Resign response:', response.data);
      
      // Update local game state
      const updatedGame = response.data.game;
      setGame(updatedGame);
      
      // ============================================
      // 🆕 SAFE WINNER DETERMINATION
      // ============================================
      let winnerName = 'Opponent'; // Safe fallback
      
      if (updatedGame.isBot) {
        winnerName = 'Stockfish';
      } else {
        const myColor = getPlayerColor();
        
        // ✅ Safely extract opponent's username with fallback
        const opponentPlayer = myColor === 'white' 
          ? updatedGame.players?.black 
          : updatedGame.players?.white;
        
        winnerName = opponentPlayer?.username || 'Your Opponent';
        
        // 🐛 Debug log to catch undefined cases
        if (!opponentPlayer?.username) {
          console.warn('⚠️ Opponent username not found:', {
            myColor,
            players: updatedGame.players,
            opponentPlayer
          });
        }
      }
      
      console.log('🏆 Winner:', winnerName);
      
      // ✅ Show modal with correct winner
      showGameOverModal(
        winnerName,
        'You resigned from the game.'
      );
      
    } catch (error) {
      console.error('❌ Error resigning:', error);
      setError(error.response?.data?.message || 'Failed to resign. Please try again.');
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsResigning(false);
    }
  };

  // ============================================
  // 🎯 ABORT - FIXED VERSION
  // ============================================
  const handleAbort = async () => {
    if (!window.confirm('Abort this game? (No rating change)')) return;
    
    try {
      console.log('📤 Sending abort request...');
      const response = await gameAPI.abortGame(gameId);
      console.log('✅ Abort response:', response.data);
      
      // Update local game state
      const updatedGame = response.data.game;
      setGame(updatedGame);
      
      // ✅ SHOW MODAL
      console.log('❌ Showing abort modal...');
      showGameOverModal('Draw', 'Game aborted (no rating change).');
      
    } catch (error) {
      console.error('❌ Error aborting:', error);
      setError(error.response?.data?.message || 'Cannot abort game');
    }
  };

  // Error state
  if (error && !gameOverModal.show) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertCircle className="h-16 w-16 mx-auto text-red-500" />
            <div>
              <h2 className="text-2xl font-bold mb-2">Error Loading Game</h2>
              <p className="text-[hsl(var(--color-muted-foreground))]">{error}</p>
            </div>
            <Button onClick={() => navigate('/')} className="w-full">
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 mx-auto border-[hsl(var(--color-primary))]"></div>
          <p className="mt-4 text-[hsl(var(--color-muted-foreground))]">Loading game...</p>
        </div>
      </div>
    );
  }

  const myColor = getPlayerColor();
  const myTurn = isMyTurn();
  const canAbort = game.moves.length < 2;

  return (
    <div className="min-h-screen py-8 px-4 text-[hsl(var(--color-foreground))] bg-[hsl(var(--color-background))]">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Timeout Warning Banner */}
        {timeoutWarning && remainingTime > 0 && (
          <div className="bg-red-500/10 border-2 border-red-500 rounded-lg p-4 animate-pulse">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-red-500" />
              <div className="flex-1">
                <p className="text-red-500 font-bold text-lg">
                  ⏰ TIME WARNING!
                </p>
                <p className="text-red-400 text-sm">
                  You have {Math.ceil(remainingTime / 1000)} seconds to make a move!
                </p>
              </div>
              <div className="text-3xl font-bold text-red-500 tabular-nums">
                {Math.ceil(remainingTime / 1000)}s
              </div>
            </div>
          </div>
        )}

        {/* Connection Status */}
        <div className="flex justify-between items-center flex-wrap gap-2">
          <div className="flex gap-2">
            <Badge variant={socketConnected ? 'default' : 'secondary'}>
              {socketConnected ? (
                <>
                  <Wifi className="mr-1 h-3 w-3" />
                  Real-time
                </>
              ) : (
                <>
                  <WifiOff className="mr-1 h-3 w-3" />
                  Polling
                </>
              )}
            </Badge>

            {game.isBot && (
              <Badge variant="outline">
                <Bot className="mr-1 h-3 w-3" />
                Bot Game
              </Badge>
            )}
          </div>

          {/* Turn Indicator */}
          {botThinking && (
            <Badge variant="outline" className="animate-pulse text-lg px-6 py-3">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Bot is thinking...
            </Badge>
          )}

          {!botThinking && game.status === 'active' && (
            <Badge
              variant={myTurn ? 'default' : 'secondary'}
              className="text-lg px-6 py-3"
            >
              {myTurn ? '🟢 YOUR TURN' : '🔴 OPPONENT\'S TURN'}
            </Badge>
          )}

          {game.status === 'completed' && (
            <Badge variant="secondary" className="text-lg px-6 py-3">
              ⚔️ Game Over
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chess Board */}
          <div className="lg:col-span-2 flex justify-center">
            <Card className="p-6">
              <ChessBoard
                position={position}
                onMove={handleMove}
                playerColor={myColor}
                isMyTurn={myTurn && !botThinking}
              />
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Players Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Players
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* White Player */}
                <div
                  className={`p-3 rounded-lg border-2 transition ${
                    game.currentTurn === 'white' && game.status === 'active' && !botThinking
                      ? 'border-green-500 bg-green-500/10'
                      : 'border-transparent bg-[hsl(var(--color-muted)/0.5)]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {game.isBot && !game.players.white ? (
                        <Bot className="h-4 w-4" />
                      ) : (
                        <User className="h-4 w-4" />
                      )}
                      <div>
                        <div className="font-bold">
                          ⚪ {game.players.white?.username || 'Stockfish'}
                        </div>
                        <div className="text-sm text-[hsl(var(--color-muted-foreground))]">
                          ⭐ {game.players.white?.rating || 'AI'}
                        </div>
                      </div>
                    </div>
                    {game.currentTurn === 'white' && game.status === 'active' && !botThinking && (
                      <div className="text-green-500 text-2xl animate-pulse">●</div>
                    )}
                  </div>
                </div>

                {/* Black Player */}
                <div
                  className={`p-3 rounded-lg border-2 transition ${
                    game.currentTurn === 'black' && game.status === 'active' && !botThinking
                      ? 'border-green-500 bg-green-500/10'
                      : 'border-transparent bg-[hsl(var(--color-muted)/0.5)]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {game.isBot && !game.players.black ? (
                        <Bot className="h-4 w-4" />
                      ) : (
                        <User className="h-4 w-4" />
                      )}
                      <div>
                        <div className="font-bold">
                          ⚫ {game.players.black?.username || 'Stockfish'}
                        </div>
                        <div className="text-sm text-[hsl(var(--color-muted-foreground))]">
                          ⭐ {game.players.black?.rating || 'AI'}
                        </div>
                      </div>
                    </div>
                    {game.currentTurn === 'black' && game.status === 'active' && !botThinking && (
                      <div className="text-green-500 text-2xl animate-pulse">●</div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Game Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Game Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="text-sm text-[hsl(var(--color-muted-foreground))]">Status</div>
                  <div className="font-semibold capitalize">{game.status}</div>
                </div>
                <div>
                  <div className="text-sm text-[hsl(var(--color-muted-foreground))]">Moves</div>
                  <div className="font-semibold">{game.moves.length}</div>
                </div>
                <div>
                  <div className="text-sm text-[hsl(var(--color-muted-foreground))]">You Play</div>
                  <div className="font-semibold">{myColor === 'white' ? '⚪ White' : '⚫ Black'}</div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            {game.status === 'active' && (
              <div className="space-y-2">
                {canAbort ? (
                  <Button onClick={handleAbort} variant="outline" className="w-full">
                    <XCircle className="mr-2 h-4 w-4" />
                    Abort Game
                  </Button>
                ) : (
                  <Button onClick={handleResign} variant="destructive" className="w-full">
                    <Flag className="mr-2 h-4 w-4" />
                    Resign Game
                  </Button>
                )}
              </div>
            )}

            {/* Move History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Moves
                </CardTitle>
              </CardHeader>
              <CardContent className="max-h-60 overflow-y-auto">
                {game.moves.length === 0 ? (
                  <p className="text-sm italic text-[hsl(var(--color-muted-foreground))]">
                    No moves yet...
                  </p>
                ) : (
                  <div className="space-y-1">
                    {game.moves.map((move, index) => (
                      <div key={index} className="flex items-center text-sm">
                        <span className="w-12 font-mono text-[hsl(var(--color-muted-foreground))]">
                          {index % 2 === 0 ? `${Math.floor(index / 2) + 1}.` : ''}
                        </span>
                        <span className="font-semibold">{move}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Chat Panel */}
            {socketConnected && !game.isBot && (
              <ChatPanel 
                gameId={gameId} 
                currentUser={user.username}
              />
            )}
          </div>
        </div>

        <ResignationToast 
          show={showResignationToast}
          resignedPlayer={resignedPlayerName}
          onComplete={() => setShowResignationToast(false)}
        />

        {/* ✅ GAME OVER MODAL */}
        <GameOverModal 
          show={gameOverModal.show}
          winner={gameOverModal.winner}
          reason={gameOverModal.reason}
          onClose={handleCloseModal}  // Navigate to home
          onDismiss={handleDismissModal}  // Just hide modal
          gameStats={getGameStats(game)}
        />
      </div>
    </div>
  );
};

export default Game;