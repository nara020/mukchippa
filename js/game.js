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

// 묵찌빠 규칙:
// 1. 먼저 가위바위보로 공격권 결정
// 2. 같은 것을 내면 공격자 승리
// 3. 다르면 가위바위보 규칙으로 이긴 쪽이 공격권

function processMukchippa(attackerChoice, defenderChoice, currentAttacker) {
    // 같은 것을 내면 공격자 승리!
    if (attackerChoice === defenderChoice) {
        return {
            winner: currentAttacker,
            newAttacker: currentAttacker,
            isFinal: true
        };
    }

    // 다르면 가위바위보 규칙 적용
    const rpsWinner = getWinner(attackerChoice, defenderChoice);

    if (rpsWinner === 'player1') {
        // player1이 이김
        const newAttacker = currentAttacker === 'player1' ? 'player1' : 'player1';
        return {
            winner: null,
            newAttacker: 'player1',
            isFinal: false
        };
    } else {
        // player2가 이김
        return {
            winner: null,
            newAttacker: 'player2',
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
        // 게임 종료!
        const winnerNum = result.winner;
        return {
            type: 'game_over',
            winner: winnerNum,
            message: winnerNum === myPlayerNum ? '승리!' : '패배...',
            gameOver: true
        };
    }

    // 공격권 변경
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

    async makeChoice(choice) {
        if (!this.roomCode || !this.playerNum) return;
        await sendChoice(this.roomCode, this.playerNum, choice);
    }

    async vote(value) {
        if (!this.roomCode || !this.playerNum) return;
        await sendVote(this.roomCode, this.playerNum, value);
    }

    async startGame() {
        if (!this.roomCode) return;
        await updateGameState(this.roomCode, {
            state: 'playing',
            currentRound: 0
        });
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
    }

    async resetGame() {
        if (!this.roomCode) return;
        await resetGame(this.roomCode);
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
    }
}

// 전역 게임 매니저
const gameManager = new GameManager();
