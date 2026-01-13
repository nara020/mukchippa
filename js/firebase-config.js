// Firebase 설정
const firebaseConfig = {
    apiKey: "AIzaSyBkO0TJMsn8V1Mf9ZAWIWUE9oYIXmkQdIg",
    authDomain: "mukjjippa-30efe.firebaseapp.com",
    databaseURL: "https://mukjjippa-30efe-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "mukjjippa-30efe",
    storageBucket: "mukjjippa-30efe.firebasestorage.app",
    messagingSenderId: "989448448204",
    appId: "1:989448448204:web:8fe2a7fe64fb8f6197ba69"
};

// Firebase 초기화
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// 방 코드 생성 (6자리 영숫자)
function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// 방 생성
async function createRoom() {
    const roomCode = generateRoomCode();
    const roomRef = database.ref('rooms/' + roomCode);

    await roomRef.set({
        createdAt: Date.now(),
        state: 'waiting',
        players: {
            player1: {
                joined: true,
                ready: false,
                choice: null,
                score: 0
            }
        },
        currentRound: 0,
        attacker: null,
        bestOf3: false,
        proposal: {
            from: null,
            accepted: null
        }
    });

    return roomCode;
}

// 방 참가
async function joinRoom(roomCode) {
    const roomRef = database.ref('rooms/' + roomCode);
    const snapshot = await roomRef.get();

    if (!snapshot.exists()) {
        throw new Error('방을 찾을 수 없습니다');
    }

    const roomData = snapshot.val();

    if (roomData.players?.player2?.joined) {
        throw new Error('방이 가득 찼습니다');
    }

    await roomRef.child('players/player2').set({
        joined: true,
        ready: false,
        choice: null,
        score: 0
    });

    return roomData;
}

// 방 상태 구독
function subscribeToRoom(roomCode, callback) {
    const roomRef = database.ref('rooms/' + roomCode);
    roomRef.on('value', (snapshot) => {
        callback(snapshot.val());
    });

    return () => roomRef.off('value');
}

// 선택 전송
async function sendChoice(roomCode, playerNum, choice) {
    const playerRef = database.ref(`rooms/${roomCode}/players/${playerNum}`);
    await playerRef.update({
        choice: choice,
        ready: true
    });
}

// 게임 상태 업데이트
async function updateGameState(roomCode, updates) {
    const roomRef = database.ref('rooms/' + roomCode);
    await roomRef.update(updates);
}

// 게임 리셋
async function resetGame(roomCode) {
    const roomRef = database.ref('rooms/' + roomCode);
    await roomRef.update({
        state: 'waiting',
        currentRound: 0,
        attacker: null,
        bestOf3: false,
        'players/player1/choice': null,
        'players/player1/ready': false,
        'players/player2/choice': null,
        'players/player2/ready': false,
        'proposal/from': null,
        'proposal/accepted': null
    });
}

// 점수 리셋 (게임 계속할 때)
async function resetScores(roomCode) {
    const roomRef = database.ref('rooms/' + roomCode);
    await roomRef.update({
        state: 'playing',
        currentRound: 0,
        attacker: null,
        'players/player1/choice': null,
        'players/player1/ready': false,
        'players/player1/score': 0,
        'players/player2/choice': null,
        'players/player2/ready': false,
        'players/player2/score': 0,
        'proposal/from': null,
        'proposal/accepted': null
    });
}

// 3판 2선승 제안
async function proposeBestOf3(roomCode, playerNum) {
    await database.ref(`rooms/${roomCode}/proposal`).set({
        from: playerNum,
        accepted: null
    });
}

// 3판 2선승 수락/거절
async function respondToProposal(roomCode, accepted) {
    await database.ref(`rooms/${roomCode}/proposal/accepted`).set(accepted);
}

// ========== 채팅 기능 ==========

// 채팅 메시지 전송
async function sendChatMessage(roomCode, playerNum, message) {
    const chatRef = database.ref(`rooms/${roomCode}/chat`);
    await chatRef.push({
        from: playerNum,
        message: message,
        timestamp: Date.now()
    });
}

// 채팅 구독
function subscribeToChat(roomCode, callback) {
    const chatRef = database.ref(`rooms/${roomCode}/chat`);

    chatRef.orderByChild('timestamp').limitToLast(50).on('child_added', (snapshot) => {
        callback(snapshot.val());
    });

    return () => chatRef.off('child_added');
}

// 시스템 메시지 전송
async function sendSystemMessage(roomCode, message) {
    const chatRef = database.ref(`rooms/${roomCode}/chat`);
    await chatRef.push({
        from: 'system',
        message: message,
        timestamp: Date.now()
    });
}
