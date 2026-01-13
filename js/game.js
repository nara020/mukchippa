// 게임 로직

const CHOICES = {
    rock: { emoji: '✊', name: '묵', beats: 'scissors' },
    scissors: { emoji: '✌️', name: '찌', beats: 'paper' },
    paper: { emoji: '🖐️', name: '빠', beats: 'rock' }
};

// 가위바위보 승자 판정
function getWinner(choice1, choice2) {
    if (choice1 === choice2) return 'draw';
    if (CHOICES[choice1].beats === choice2) return 'player1';
    return 'player2';
}

// 묵찌빠 라운드 처리
function processMukchippa(attackerChoice, defenderChoice, currentAttacker) {
    // 같은 것을 내면 공격자 승리!
    if (attackerChoice === defenderChoice) {
        return {
            winner: currentAttacker,
            newAttacker: currentAttacker,
            isFinal: true
        };
    }

    // 다르면 가위바위보 규칙으로 공격권 결정
    const rpsResult = CHOICES[attackerChoice].beats === defenderChoice ? 'attacker' : 'defender';

    if (rpsResult === 'attacker') {
        return {
            winner: null,
            newAttacker: currentAttacker,
            isFinal: false
        };
    } else {
        const newAttacker = currentAttacker === 'player1' ? 'player2' : 'player1';
        return {
            winner: null,
            newAttacker: newAttacker,
            isFinal: false
        };
    }
}

// 라운드 결과 처리
function processRound(roomData, myPlayerNum) {
    const player1Choice = roomData.players.player1.choice;
    const player2Choice = roomData.players.player2.choice;

    if (!player1Choice || !player2Choice) {
        return null;
    }

    const currentRound = roomData.currentRound || 0;
    const attacker = roomData.attacker;

    // 첫 라운드: 가위바위보로 공격권 결정
    if (currentRound === 0 || !attacker) {
        const winner = getWinner(player1Choice, player2Choice);

        if (winner === 'draw') {
            return {
                type: 'draw',
                message: '무승부! 다시!',
                nextAttacker: null,
                gameOver: false
            };
        }

        return {
            type: 'attacker_decided',
            message: winner === myPlayerNum ? '공격권 획득!' : '수비로 시작!',
            nextAttacker: winner,
            gameOver: false
        };
    }

    // 묵찌빠 라운드
    const attackerChoice = attacker === 'player1' ? player1Choice : player2Choice;
    const defenderChoice = attacker === 'player1' ? player2Choice : player1Choice;

    const result = processMukchippa(attackerChoice, defenderChoice, attacker);

    if (result.isFinal) {
        return {
            type: 'game_over',
            winner: result.winner,
            message: result.winner === myPlayerNum ? '승리!' : '패배...',
            gameOver: true
        };
    }

    const attackerChanged = result.newAttacker !== attacker;
    return {
        type: 'continue',
        message: attackerChanged
            ? (result.newAttacker === myPlayerNum ? '공격권 획득!' : '공격권 빼앗김!')
            : '공격권 유지!',
        nextAttacker: result.newAttacker,
        gameOver: false
    };
}

// 3판 2선승 체크
function checkBestOf3Winner(player1Score, player2Score) {
    if (player1Score >= 2) return 'player1';
    if (player2Score >= 2) return 'player2';
    return null;
}

// 게임 상태 관리 클래스
class GameManager {
    constructor() {
        this.roomCode = null;
        this.playerNum = null;
        this.unsubscribe = null;
        this.unsubscribeChat = null;
        this.currentRoomData = null;
    }

    async createGame() {
        this.roomCode = await createRoom();
        this.playerNum = 'player1';
        return this.roomCode;
    }

    async joinGame(roomCode) {
        this.roomCode = roomCode.toUpperCase();
        await joinRoom(this.roomCode);
        this.playerNum = 'player2';
        return this.roomCode;
    }

    subscribe(callback) {
        if (!this.roomCode) return;

        this.unsubscribe = subscribeToRoom(this.roomCode, (data) => {
            this.currentRoomData = data;
            callback(data);
        });
    }

    subscribeChat(callback) {
        if (!this.roomCode) return;
        this.unsubscribeChat = subscribeToChat(this.roomCode, callback);
    }

    async sendChat(message) {
        if (!this.roomCode || !this.playerNum || !message.trim()) return;
        await sendChatMessage(this.roomCode, this.playerNum, message.trim());
    }

    async makeChoice(choice) {
        if (!this.roomCode || !this.playerNum) return;
        await sendChoice(this.roomCode, this.playerNum, choice);
    }

    async startGame() {
        if (!this.roomCode) return;
        await updateGameState(this.roomCode, {
            state: 'playing',
            currentRound: 0
        });
        await sendSystemMessage(this.roomCode, '게임이 시작되었습니다!');
    }

    async nextRound(newAttacker, incrementRound = true) {
        if (!this.roomCode) return;

        const updates = {
            'players/player1/choice': null,
            'players/player1/ready': false,
            'players/player2/choice': null,
            'players/player2/ready': false
        };

        if (newAttacker) {
            updates.attacker = newAttacker;
        }

        if (incrementRound) {
            updates.currentRound = (this.currentRoomData?.currentRound || 0) + 1;
        }

        await updateGameState(this.roomCode, updates);
    }

    async recordWin(winnerNum) {
        if (!this.roomCode) return;

        const currentScore = this.currentRoomData?.players?.[winnerNum]?.score || 0;
        await updateGameState(this.roomCode, {
            [`players/${winnerNum}/score`]: currentScore + 1
        });
    }

    async endGame(winnerNum) {
        if (!this.roomCode) return;
        await updateGameState(this.roomCode, {
            state: 'finished',
            winner: winnerNum
        });

        const winnerName = winnerNum === 'player1' ? 'Player 1' : 'Player 2';
        await sendSystemMessage(this.roomCode, `${winnerName} 승리! 🎉`);
    }

    async proposeBestOf3() {
        if (!this.roomCode || !this.playerNum) return;
        await proposeBestOf3(this.roomCode, this.playerNum);
        await sendSystemMessage(this.roomCode, `${this.playerNum === 'player1' ? 'Player 1' : 'Player 2'}이 3판 2선승을 제안했습니다!`);
    }

    async respondToProposal(accepted) {
        if (!this.roomCode) return;
        await respondToProposal(this.roomCode, accepted);

        if (accepted) {
            await sendSystemMessage(this.roomCode, '3판 2선승이 시작됩니다!');
            // 3판 2선승 모드로 게임 시작
            await updateGameState(this.roomCode, { bestOf3: true });
            await resetScores(this.roomCode);
        } else {
            await sendSystemMessage(this.roomCode, '제안이 거절되었습니다.');
            await updateGameState(this.roomCode, {
                'proposal/from': null,
                'proposal/accepted': null
            });
        }
    }

    async resetGame() {
        if (!this.roomCode) return;
        await resetGame(this.roomCode);
    }

    async playAgain() {
        if (!this.roomCode) return;
        await updateGameState(this.roomCode, {
            state: 'playing',
            currentRound: 0,
            attacker: null,
            winner: null,
            'players/player1/choice': null,
            'players/player1/ready': false,
            'players/player2/choice': null,
            'players/player2/ready': false,
            'proposal/from': null,
            'proposal/accepted': null
        });
        await sendSystemMessage(this.roomCode, '새 게임이 시작됩니다!');
    }

    getOpponentNum() {
        return this.playerNum === 'player1' ? 'player2' : 'player1';
    }

    isHost() {
        return this.playerNum === 'player1';
    }

    cleanup() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
        if (this.unsubscribeChat) {
            this.unsubscribeChat();
        }
    }
}

// 전역 게임 매니저
const gameManager = new GameManager();
