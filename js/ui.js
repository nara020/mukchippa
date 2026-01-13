// UI 컨트롤러

document.addEventListener('DOMContentLoaded', () => {
    // 화면 요소들
    const screens = {
        main: document.getElementById('main-screen'),
        waiting: document.getElementById('waiting-screen'),
        game: document.getElementById('game-screen'),
        final: document.getElementById('final-screen')
    };

    // 버튼들
    const createRoomBtn = document.getElementById('create-room-btn');
    const joinRoomBtn = document.getElementById('join-room-btn');
    const joinForm = document.getElementById('join-form');
    const roomCodeInput = document.getElementById('room-code-input');
    const joinSubmitBtn = document.getElementById('join-submit-btn');
    const copyLinkBtn = document.getElementById('copy-link-btn');
    const startGameBtn = document.getElementById('start-game-btn');
    const voteYesBtn = document.getElementById('vote-yes');
    const voteNoBtn = document.getElementById('vote-no');
    const choiceBtns = document.querySelectorAll('.choice-btn');
    const playAgainBtn = document.getElementById('play-again-btn');
    const newRoomBtn = document.getElementById('new-room-btn');

    // 상태 표시 요소들
    const displayRoomCode = document.getElementById('display-room-code');
    const player1Slot = document.getElementById('player1-slot');
    const player2Slot = document.getElementById('player2-slot');
    const voteStatus = document.getElementById('vote-status');
    const voteSection = document.getElementById('vote-section');
    const roundInfo = document.getElementById('round-info');
    const myScore = document.getElementById('my-score');
    const opponentScore = document.getElementById('opponent-score');
    const myStatus = document.getElementById('my-status');
    const opponentStatus = document.getElementById('opponent-status');
    const attackerIndicator = document.getElementById('attacker-indicator');
    const resultDisplay = document.getElementById('result-display');
    const myChoiceDisplay = document.getElementById('my-choice-display');
    const opponentChoiceDisplay = document.getElementById('opponent-choice-display');
    const resultText = document.getElementById('result-text');
    const finalResult = document.getElementById('final-result');
    const finalScore = document.getElementById('final-score');
    const finalMessage = document.getElementById('final-message');

    // 현재 상태
    let isProcessingResult = false;

    // 화면 전환
    function showScreen(screenName) {
        Object.values(screens).forEach(screen => screen.classList.remove('active'));
        screens[screenName].classList.add('active');
    }

    // URL에서 방 코드 확인
    function checkUrlForRoom() {
        const params = new URLSearchParams(window.location.search);
        const roomCode = params.get('room');
        if (roomCode) {
            joinGameWithCode(roomCode);
        }
    }

    // 방 만들기
    createRoomBtn.addEventListener('click', async () => {
        createRoomBtn.disabled = true;
        createRoomBtn.innerHTML = '<span class="loading"></span> 생성 중...';

        try {
            const roomCode = await gameManager.createGame();
            setupRoomSubscription();
            showWaitingRoom(roomCode);
        } catch (error) {
            alert('방 생성 실패: ' + error.message);
        } finally {
            createRoomBtn.disabled = false;
            createRoomBtn.innerHTML = '<span class="btn-icon">🎮</span> 방 만들기';
        }
    });

    // 방 참가 폼 표시
    joinRoomBtn.addEventListener('click', () => {
        joinForm.classList.toggle('hidden');
        roomCodeInput.focus();
    });

    // 방 참가
    joinSubmitBtn.addEventListener('click', () => {
        const code = roomCodeInput.value.trim();
        if (code.length === 6) {
            joinGameWithCode(code);
        } else {
            alert('6자리 방 코드를 입력해주세요');
        }
    });

    roomCodeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            joinSubmitBtn.click();
        }
    });

    async function joinGameWithCode(code) {
        try {
            await gameManager.joinGame(code);
            setupRoomSubscription();
            showWaitingRoom(code);
        } catch (error) {
            alert('참가 실패: ' + error.message);
        }
    }

    // 대기실 표시
    function showWaitingRoom(roomCode) {
        displayRoomCode.textContent = roomCode;
        showScreen('waiting');

        // URL 업데이트
        const url = new URL(window.location);
        url.searchParams.set('room', roomCode);
        window.history.pushState({}, '', url);
    }

    // 링크 복사
    copyLinkBtn.addEventListener('click', () => {
        const url = window.location.href;
        navigator.clipboard.writeText(url).then(() => {
            copyLinkBtn.textContent = '복사됨! ✅';
            setTimeout(() => {
                copyLinkBtn.textContent = '링크 복사 📋';
            }, 2000);
        });
    });

    // 투표
    voteYesBtn.addEventListener('click', () => {
        gameManager.vote(true);
        voteYesBtn.classList.add('selected');
        voteNoBtn.classList.remove('selected');
    });

    voteNoBtn.addEventListener('click', () => {
        gameManager.vote(false);
        voteNoBtn.classList.add('selected');
        voteYesBtn.classList.remove('selected');
    });

    // 게임 시작
    startGameBtn.addEventListener('click', async () => {
        await gameManager.startGame();
    });

    // 선택 버튼
    choiceBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            if (btn.classList.contains('disabled')) return;

            const choice = btn.dataset.choice;

            // UI 업데이트
            choiceBtns.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');

            // 선택 전송
            await gameManager.makeChoice(choice);
        });
    });

    // 다시하기
    playAgainBtn.addEventListener('click', async () => {
        await gameManager.resetGame();
    });

    // 새 방 만들기
    newRoomBtn.addEventListener('click', () => {
        gameManager.cleanup();
        window.location.href = window.location.pathname;
    });

    // 방 구독 설정
    function setupRoomSubscription() {
        gameManager.subscribe(handleRoomUpdate);
    }

    // 방 상태 업데이트 처리
    function handleRoomUpdate(roomData) {
        if (!roomData) {
            alert('방이 사라졌습니다');
            window.location.href = window.location.pathname;
            return;
        }

        const state = roomData.state;

        if (state === 'waiting') {
            updateWaitingRoom(roomData);
        } else if (state === 'playing') {
            updateGameScreen(roomData);
        } else if (state === 'finished') {
            showFinalScreen(roomData);
        }
    }

    // 대기실 업데이트
    function updateWaitingRoom(roomData) {
        showScreen('waiting');

        const player1 = roomData.players?.player1;
        const player2 = roomData.players?.player2;

        // 플레이어 상태 표시
        if (player1?.joined) {
            player1Slot.querySelector('.player-emoji').textContent = '🙋';
            player1Slot.querySelector('.player-name').textContent =
                gameManager.playerNum === 'player1' ? '나' : '상대방';
            player1Slot.classList.add('ready');
        }

        if (player2?.joined) {
            player2Slot.querySelector('.player-emoji').textContent = '🙆';
            player2Slot.querySelector('.player-name').textContent =
                gameManager.playerNum === 'player2' ? '나' : '상대방';
            player2Slot.classList.add('ready');
        }

        // 투표 상태
        const votes = roomData.votes || {};
        let voteText = '';
        if (votes.player1 !== null && votes.player1 !== undefined) {
            voteText += `Player 1: ${votes.player1 ? '👍' : '👎'} `;
        }
        if (votes.player2 !== null && votes.player2 !== undefined) {
            voteText += `Player 2: ${votes.player2 ? '👍' : '👎'}`;
        }
        voteStatus.textContent = voteText;

        // 둘 다 접속하면 시작 버튼 표시 (호스트만)
        if (player1?.joined && player2?.joined && gameManager.isHost()) {
            startGameBtn.classList.remove('hidden');
        }
    }

    // 게임 화면 업데이트
    function updateGameScreen(roomData) {
        showScreen('game');

        const myNum = gameManager.playerNum;
        const oppNum = gameManager.getOpponentNum();
        const myData = roomData.players?.[myNum];
        const oppData = roomData.players?.[oppNum];
        const currentRound = roomData.currentRound || 0;
        const attacker = roomData.attacker;

        // 점수 표시
        myScore.textContent = myData?.score || 0;
        opponentScore.textContent = oppData?.score || 0;

        // 라운드 정보
        if (currentRound === 0 || !attacker) {
            roundInfo.textContent = '가위바위보! (공격권 결정)';
            attackerIndicator.textContent = '';
            attackerIndicator.className = 'attacker-indicator';
        } else {
            roundInfo.textContent = `묵찌빠 ${currentRound}라운드`;

            if (attacker === myNum) {
                attackerIndicator.textContent = '🔥 내가 공격!';
                attackerIndicator.className = 'attacker-indicator attack';
            } else {
                attackerIndicator.textContent = '🛡️ 내가 수비!';
                attackerIndicator.className = 'attacker-indicator defense';
            }
        }

        // 선택 상태
        if (myData?.ready) {
            myStatus.classList.add('selected');
            myStatus.querySelector('.status-text').textContent = '선택 완료!';
        } else {
            myStatus.classList.remove('selected');
            myStatus.querySelector('.status-text').textContent = '선택하세요';
        }

        if (oppData?.ready) {
            opponentStatus.classList.add('selected');
            opponentStatus.querySelector('.status-text').textContent = '선택 완료!';
        } else {
            opponentStatus.classList.remove('selected');
            opponentStatus.querySelector('.status-text').textContent = '선택 중...';
        }

        // 둘 다 선택했으면 결과 처리
        if (myData?.ready && oppData?.ready && !isProcessingResult) {
            processResult(roomData);
        }

        // 결과 표시 중이 아니면 버튼 초기화
        if (!isProcessingResult && !myData?.ready) {
            resultDisplay.classList.add('hidden');
            choiceBtns.forEach(btn => {
                btn.classList.remove('selected', 'disabled');
            });
        }
    }

    // 결과 처리
    async function processResult(roomData) {
        isProcessingResult = true;

        const myNum = gameManager.playerNum;
        const oppNum = gameManager.getOpponentNum();
        const myChoice = roomData.players[myNum].choice;
        const oppChoice = roomData.players[oppNum].choice;

        // 버튼 비활성화
        choiceBtns.forEach(btn => btn.classList.add('disabled'));

        // 결과 표시
        resultDisplay.classList.remove('hidden');
        myChoiceDisplay.querySelector('.result-emoji').textContent = CHOICES[myChoice].emoji;
        opponentChoiceDisplay.querySelector('.result-emoji').textContent = CHOICES[oppChoice].emoji;

        // 결과 계산
        const result = processRound(roomData, myNum);

        if (!result) {
            isProcessingResult = false;
            return;
        }

        resultText.textContent = result.message;
        resultText.className = 'result-text';

        if (result.type === 'draw') {
            resultText.classList.add('draw');
        } else if (result.gameOver) {
            resultText.classList.add(result.winner === myNum ? 'win' : 'lose');
        }

        // 잠시 대기 후 다음 단계
        await new Promise(resolve => setTimeout(resolve, 2000));

        // 호스트만 상태 업데이트
        if (gameManager.isHost()) {
            if (result.gameOver) {
                // 점수 기록
                await gameManager.recordWin(result.winner);

                // 3판 2선승 체크
                const player1Score = (roomData.players.player1.score || 0) + (result.winner === 'player1' ? 1 : 0);
                const player2Score = (roomData.players.player2.score || 0) + (result.winner === 'player2' ? 1 : 0);

                const bestOf3 = roomData.votes?.player1 && roomData.votes?.player2;

                if (bestOf3) {
                    const finalWinner = checkBestOf3Winner(player1Score, player2Score);
                    if (finalWinner) {
                        await gameManager.endGame(finalWinner);
                    } else {
                        // 다음 게임
                        await gameManager.nextRound(null, false);
                        await updateGameState(gameManager.roomCode, {
                            attacker: null,
                            currentRound: 0
                        });
                    }
                } else {
                    await gameManager.endGame(result.winner);
                }
            } else if (result.type === 'draw') {
                // 무승부 - 다시
                await gameManager.nextRound(null, false);
            } else {
                // 계속
                await gameManager.nextRound(result.nextAttacker, result.type === 'attacker_decided');
            }
        }

        isProcessingResult = false;
    }

    // 최종 결과 화면
    function showFinalScreen(roomData) {
        showScreen('final');

        const myNum = gameManager.playerNum;
        const winner = roomData.winner;
        const isWinner = winner === myNum;

        const myScoreVal = roomData.players[myNum]?.score || 0;
        const oppScoreVal = roomData.players[gameManager.getOpponentNum()]?.score || 0;

        finalResult.querySelector('.final-emoji').textContent = isWinner ? '🎉' : '😢';
        finalResult.querySelector('.final-text').textContent = isWinner ? '승리!' : '패배...';
        finalScore.textContent = `${myScoreVal} : ${oppScoreVal}`;

        finalMessage.textContent = isWinner
            ? '상대방이 음료수 사는 거예요~ 🥤'
            : '음료수 사세요~ 🥤';
    }

    // 초기화
    checkUrlForRoom();
});
