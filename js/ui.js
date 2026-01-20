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
    const choiceBtns = document.querySelectorAll('.choice-btn');
    const playAgainBtn = document.getElementById('play-again-btn');
    const newRoomBtn = document.getElementById('new-room-btn');
    const proposeBtn = document.getElementById('propose-btn');

    // 상태 표시 요소들
    const displayRoomCode = document.getElementById('display-room-code');
    const player1Slot = document.getElementById('player1-slot');
    const player2Slot = document.getElementById('player2-slot');
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
    const finalEmoji = document.getElementById('final-emoji');
    const finalText = document.getElementById('final-text');
    const finalScore = document.getElementById('final-score');
    const finalMessage = document.getElementById('final-message');
    const proposalSection = document.getElementById('proposal-section');
    const proposalStatus = document.getElementById('proposal-status');

    // 채팅 요소들
    const chatMessages = document.getElementById('chat-messages');
    const chatWaiting = document.getElementById('chat-waiting');
    const chatInput = document.getElementById('chat-input');
    const chatSendBtn = document.getElementById('chat-send-btn');

    // 현재 상태
    let isProcessingResult = false;
    let chatInitialized = false;

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
        createRoomBtn.innerHTML = '<span class="loading"></span>';

        try {
            const roomCode = await gameManager.createGame();
            setupRoomSubscription();
            setupChatSubscription();
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
        joinForm.classList.toggle('show');
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
            setupChatSubscription();
            showWaitingRoom(code);
        } catch (error) {
            alert('참가 실패: ' + error.message);
        }
    }

    // 대기실 표시
    function showWaitingRoom(roomCode) {
        displayRoomCode.textContent = roomCode;
        showScreen('waiting');

        const url = new URL(window.location);
        url.searchParams.set('room', roomCode);
        window.history.pushState({}, '', url);
    }

    // 링크 복사
    copyLinkBtn.addEventListener('click', () => {
        const url = window.location.href;
        navigator.clipboard.writeText(url).then(() => {
            copyLinkBtn.textContent = '복사됨!';
            setTimeout(() => {
                copyLinkBtn.textContent = '링크 복사';
            }, 2000);
        });
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

            choiceBtns.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');

            await gameManager.makeChoice(choice);
        });
    });

    // 한판 더
    playAgainBtn.addEventListener('click', async () => {
        await gameManager.playAgain();
    });

    // 나가기
    newRoomBtn.addEventListener('click', () => {
        gameManager.cleanup();
        window.location.href = window.location.pathname;
    });

    // 3판 2선승 제안
    proposeBtn.addEventListener('click', async () => {
        await gameManager.proposeBestOf3();
        proposeBtn.disabled = true;
        proposeBtn.textContent = '제안함';
    });

    // 채팅 전송
    function sendChatMessage() {
        const message = chatInput.value.trim();
        if (message) {
            gameManager.sendChat(message);
            chatInput.value = '';
        }
    }

    chatSendBtn.addEventListener('click', sendChatMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendChatMessage();
        }
    });

    // 채팅 구독 설정
    function setupChatSubscription() {
        gameManager.subscribeChat((msg) => {
            if (!chatInitialized) {
                chatWaiting.classList.add('hidden');
                chatInitialized = true;
            }
            addChatMessage(msg);
        });
    }

    // 채팅 메시지 추가
    function addChatMessage(msg) {
        const div = document.createElement('div');
        div.className = 'chat-message';

        if (msg.from === 'system') {
            div.classList.add('system');
        } else if (msg.from === gameManager.playerNum) {
            div.classList.add('mine');
        } else {
            div.classList.add('theirs');
        }

        div.textContent = msg.message;
        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

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

            // 채팅 대기 메시지 숨기기
            chatWaiting.classList.add('hidden');
        }

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

        // 내가 아직 선택 안했고 결과 처리 중이 아니면 버튼 활성화
        if (!myData?.ready && !isProcessingResult) {
            choiceBtns.forEach(btn => {
                btn.classList.remove('selected', 'disabled');
            });
            resultDisplay.classList.add('hidden');
        }

        // 점수 표시
        myScore.textContent = myData?.score || 0;
        opponentScore.textContent = oppData?.score || 0;

        // 라운드 정보
        if (currentRound === 0 || !attacker) {
            roundInfo.textContent = '가위바위보';
            attackerIndicator.classList.add('hidden');
        } else {
            roundInfo.textContent = `묵찌빠 ${currentRound}R`;
            attackerIndicator.classList.remove('hidden');

            if (attacker === myNum) {
                attackerIndicator.textContent = '🔥 공격';
                attackerIndicator.className = 'attacker-indicator attack';
            } else {
                attackerIndicator.textContent = '🛡️ 수비';
                attackerIndicator.className = 'attacker-indicator defense';
            }
        }

        // 선택 상태
        if (myData?.ready) {
            myStatus.classList.add('selected');
            myStatus.querySelector('.status-text').textContent = '완료';
        } else {
            myStatus.classList.remove('selected');
            myStatus.querySelector('.status-text').textContent = '선택하세요';
        }

        if (oppData?.ready) {
            opponentStatus.classList.add('selected');
            opponentStatus.querySelector('.status-text').textContent = '완료';
        } else {
            opponentStatus.classList.remove('selected');
            opponentStatus.querySelector('.status-text').textContent = '대기중';
        }

        // 둘 다 선택했으면 결과 처리
        if (myData?.ready && oppData?.ready && !isProcessingResult) {
            processResult(roomData);
        }
    }

    // 결과 처리
    async function processResult(roomData) {
        isProcessingResult = true;

        const myNum = gameManager.playerNum;
        const oppNum = gameManager.getOpponentNum();
        const myChoice = roomData.players[myNum].choice;
        const oppChoice = roomData.players[oppNum].choice;

        choiceBtns.forEach(btn => btn.classList.add('disabled'));

        const result = processRound(roomData, myNum);

        if (!result) {
            isProcessingResult = false;
            return;
        }

        // 3D 배틀 애니메이션 실행!
        try {
            await battleAnimation.play(myChoice, oppChoice, result);
        } catch (e) {
            console.error('Battle animation error:', e);
            // 애니메이션 실패 시 기존 방식으로 폴백
            resultDisplay.classList.remove('hidden');
            myChoiceDisplay.querySelector('.result-emoji').textContent = CHOICES[myChoice].emoji;
            opponentChoiceDisplay.querySelector('.result-emoji').textContent = CHOICES[oppChoice].emoji;
            resultText.textContent = result.message;
            resultText.className = 'result-text';
            if (result.type === 'draw') {
                resultText.classList.add('draw');
            } else if (result.gameOver) {
                resultText.classList.add(result.winner === myNum ? 'win' : 'lose');
            }
            await new Promise(resolve => setTimeout(resolve, 1500));
        }

        if (gameManager.isHost()) {
            if (result.gameOver) {
                await gameManager.recordWin(result.winner);

                // 3판 2선승 모드 체크
                if (roomData.bestOf3) {
                    const player1Score = (roomData.players.player1.score || 0) + (result.winner === 'player1' ? 1 : 0);
                    const player2Score = (roomData.players.player2.score || 0) + (result.winner === 'player2' ? 1 : 0);
                    const finalWinner = checkBestOf3Winner(player1Score, player2Score);

                    if (finalWinner) {
                        await gameManager.endGame(finalWinner);
                    } else {
                        // 다음 라운드
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
                await gameManager.nextRound(null, false);
            } else {
                await gameManager.nextRound(result.nextAttacker, result.type === 'attacker_decided');
            }
        }

        isProcessingResult = false;
    }

    // 최종 결과 화면
    function showFinalScreen(roomData) {
        showScreen('final');

        const myNum = gameManager.playerNum;
        const oppNum = gameManager.getOpponentNum();
        const winner = roomData.winner;
        const isWinner = winner === myNum;

        const myScoreVal = roomData.players[myNum]?.score || 0;
        const oppScoreVal = roomData.players[oppNum]?.score || 0;

        finalEmoji.textContent = isWinner ? '🎉' : '😢';
        finalText.textContent = isWinner ? '승리!' : '패배...';
        finalText.className = 'final-text ' + (isWinner ? 'win' : 'lose');
        finalScore.textContent = `${myScoreVal} : ${oppScoreVal}`;

        finalMessage.textContent = isWinner
            ? '상대방이 음료수 사는 거예요 🥤'
            : '음료수 사세요~ 🥤';

        // 3판 2선승 제안 처리
        updateProposalSection(roomData);
    }

    // 제안 섹션 업데이트
    function updateProposalSection(roomData) {
        const proposal = roomData.proposal;
        const myNum = gameManager.playerNum;
        const oppNum = gameManager.getOpponentNum();

        // 이미 3판 2선승이었으면 제안 숨기기
        if (roomData.bestOf3) {
            proposalSection.classList.add('hidden');
            return;
        }

        proposalSection.classList.remove('hidden');

        if (!proposal?.from) {
            // 제안 없음 - 제안 버튼 표시
            proposeBtn.classList.remove('hidden');
            proposeBtn.disabled = false;
            proposeBtn.textContent = '제안하기';
            proposalStatus.textContent = '';
            proposalSection.classList.remove('received');

            // 수락/거절 버튼 제거
            const existingBtns = proposalSection.querySelectorAll('.response-btn');
            existingBtns.forEach(btn => btn.remove());
        } else if (proposal.from === myNum) {
            // 내가 제안함
            proposeBtn.classList.remove('hidden');
            proposeBtn.disabled = true;
            proposeBtn.textContent = '제안함';
            proposalStatus.textContent = '상대방 응답 대기 중...';
            proposalSection.classList.remove('received');
        } else {
            // 상대방이 제안함
            proposeBtn.classList.add('hidden');
            proposalSection.classList.add('received');
            proposalStatus.textContent = '';

            // 수락/거절 버튼이 없으면 추가
            if (!proposalSection.querySelector('.response-btn')) {
                const btnRow = document.createElement('div');
                btnRow.className = 'button-row';

                const acceptBtn = document.createElement('button');
                acceptBtn.className = 'btn btn-primary response-btn';
                acceptBtn.textContent = '수락';
                acceptBtn.onclick = () => gameManager.respondToProposal(true);

                const rejectBtn = document.createElement('button');
                rejectBtn.className = 'btn btn-secondary response-btn';
                rejectBtn.textContent = '거절';
                rejectBtn.onclick = () => gameManager.respondToProposal(false);

                btnRow.appendChild(acceptBtn);
                btnRow.appendChild(rejectBtn);
                proposalSection.querySelector('.button-row')?.remove();
                proposalSection.insertBefore(btnRow, proposalStatus);
            }
        }
    }

    // 초기화
    checkUrlForRoom();
});
