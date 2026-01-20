// 3D 배틀 애니메이션 시스템

class BattleAnimation {
    constructor() {
        this.container = document.getElementById('battle-container');
        this.overlay = document.getElementById('battle-overlay');
        this.countdownEl = document.getElementById('battle-countdown');
        this.resultEl = document.getElementById('battle-result');

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.leftHand = null;
        this.rightHand = null;
        this.animationId = null;

        this.isPlaying = false;

        // 손 모양 이모지 매핑
        this.handEmojis = {
            rock: '✊',
            scissors: '✌️',
            paper: '🖐️'
        };

        // 효과음 초기화
        this.initSounds();
    }

    initSounds() {
        // Howler.js로 효과음 설정
        this.sounds = {
            shake: new Howl({
                src: ['https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'],
                volume: 0.5
            }),
            countdown: new Howl({
                src: ['https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3'],
                volume: 0.6
            }),
            reveal: new Howl({
                src: ['https://assets.mixkit.co/active_storage/sfx/270/270-preview.mp3'],
                volume: 0.7
            }),
            win: new Howl({
                src: ['https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3'],
                volume: 0.6
            }),
            lose: new Howl({
                src: ['https://assets.mixkit.co/active_storage/sfx/2658/2658-preview.mp3'],
                volume: 0.5
            })
        };
    }

    initThree() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x121212);

        // Camera
        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.z = 5;

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 5, 5);
        this.scene.add(directionalLight);

        const pointLight = new THREE.PointLight(0xbb86fc, 1, 100);
        pointLight.position.set(0, 0, 3);
        this.scene.add(pointLight);

        // 윈도우 리사이즈 핸들러
        window.addEventListener('resize', () => this.onResize());
    }

    onResize() {
        if (!this.camera || !this.renderer) return;
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    createHandSprite(emoji, position) {
        // 캔버스에 이모지 그리기
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        ctx.font = '180px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(emoji, 128, 128);

        // 텍스처 생성
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true
        });

        const sprite = new THREE.Sprite(material);
        sprite.scale.set(2, 2, 1);
        sprite.position.copy(position);

        return sprite;
    }

    async play(myChoice, opponentChoice, result) {
        if (this.isPlaying) return;
        this.isPlaying = true;

        // Three.js 초기화
        if (!this.scene) {
            this.initThree();
        }

        // 오버레이 표시
        this.overlay.classList.add('active');
        this.resultEl.className = 'battle-result';
        this.resultEl.textContent = '';
        this.countdownEl.className = 'battle-countdown';
        this.countdownEl.textContent = '';

        // 기존 손 제거
        if (this.leftHand) this.scene.remove(this.leftHand);
        if (this.rightHand) this.scene.remove(this.rightHand);

        // 초기 주먹 생성 (흔들기용)
        this.leftHand = this.createHandSprite('✊', new THREE.Vector3(-2, 0, 0));
        this.rightHand = this.createHandSprite('✊', new THREE.Vector3(2, 0, 0));
        this.rightHand.material.rotation = Math.PI; // 오른쪽 손 뒤집기

        this.scene.add(this.leftHand);
        this.scene.add(this.rightHand);

        // 렌더링 시작
        this.startRenderLoop();

        // 애니메이션 시퀀스
        await this.shakeAnimation();
        await this.countdownAnimation();
        await this.revealAnimation(myChoice, opponentChoice);
        await this.showResult(result);

        // 잠시 대기 후 종료
        await this.delay(1500);
        this.close();
    }

    startRenderLoop() {
        const animate = () => {
            if (!this.isPlaying) return;
            this.animationId = requestAnimationFrame(animate);
            this.renderer.render(this.scene, this.camera);
        };
        animate();
    }

    async shakeAnimation() {
        const duration = 1500;
        const shakeCount = 6;
        const shakeInterval = duration / shakeCount;

        this.sounds.shake.play();

        for (let i = 0; i < shakeCount; i++) {
            const up = i % 2 === 0;
            const y = up ? 0.5 : -0.3;

            // GSAP 없이 간단한 애니메이션
            await this.animatePosition(this.leftHand, { y }, shakeInterval / 2);
            await this.animatePosition(this.rightHand, { y }, 0);
        }

        // 원위치
        this.leftHand.position.y = 0;
        this.rightHand.position.y = 0;
    }

    async countdownAnimation() {
        const counts = ['3', '2', '1', '승부!'];

        for (const count of counts) {
            this.sounds.countdown.play();

            this.countdownEl.textContent = count;
            this.countdownEl.className = 'battle-countdown show';

            await this.delay(600);
            this.countdownEl.className = 'battle-countdown';
            await this.delay(200);
        }

        this.countdownEl.textContent = '';
    }

    async revealAnimation(myChoice, opponentChoice) {
        this.sounds.reveal.play();

        // 손 모양 변경
        this.scene.remove(this.leftHand);
        this.scene.remove(this.rightHand);

        // 새로운 손 모양 생성 (화면 밖에서 시작)
        this.leftHand = this.createHandSprite(
            this.handEmojis[myChoice],
            new THREE.Vector3(-5, 0, 0)
        );
        this.rightHand = this.createHandSprite(
            this.handEmojis[opponentChoice],
            new THREE.Vector3(5, 0, 0)
        );

        this.scene.add(this.leftHand);
        this.scene.add(this.rightHand);

        // 슥~ 하고 등장
        await Promise.all([
            this.animatePosition(this.leftHand, { x: -1.5 }, 300),
            this.animatePosition(this.rightHand, { x: 1.5 }, 300)
        ]);

        // 충돌 효과 (약간 확대)
        await Promise.all([
            this.animateScale(this.leftHand, 2.5, 150),
            this.animateScale(this.rightHand, 2.5, 150)
        ]);

        await Promise.all([
            this.animateScale(this.leftHand, 2, 150),
            this.animateScale(this.rightHand, 2, 150)
        ]);
    }

    async showResult(result) {
        let text = '';
        let className = 'battle-result show ';

        if (result.gameOver) {
            if (result.type === 'game_over') {
                const isWin = result.message.includes('승리');
                text = isWin ? '🎉 승리!' : '😢 패배...';
                className += isWin ? 'win' : 'lose';

                if (isWin) {
                    this.sounds.win.play();
                    this.createConfetti();
                } else {
                    this.sounds.lose.play();
                }
            }
        } else {
            text = result.message;
            className += 'continue';
        }

        this.resultEl.textContent = text;
        this.resultEl.className = className;
    }

    createConfetti() {
        // 파티클 효과
        const colors = [0xbb86fc, 0x03dac6, 0xffd700, 0xff6b6b];
        const particles = [];

        for (let i = 0; i < 50; i++) {
            const geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
            const material = new THREE.MeshBasicMaterial({
                color: colors[Math.floor(Math.random() * colors.length)]
            });
            const particle = new THREE.Mesh(geometry, material);

            particle.position.set(
                (Math.random() - 0.5) * 8,
                5,
                (Math.random() - 0.5) * 2
            );

            particle.userData.velocity = {
                x: (Math.random() - 0.5) * 0.1,
                y: -0.1 - Math.random() * 0.1,
                rotX: Math.random() * 0.2,
                rotY: Math.random() * 0.2
            };

            this.scene.add(particle);
            particles.push(particle);
        }

        // 파티클 애니메이션
        const animateParticles = () => {
            particles.forEach(p => {
                p.position.x += p.userData.velocity.x;
                p.position.y += p.userData.velocity.y;
                p.rotation.x += p.userData.velocity.rotX;
                p.rotation.y += p.userData.velocity.rotY;
            });

            if (particles[0] && particles[0].position.y > -5) {
                requestAnimationFrame(animateParticles);
            } else {
                particles.forEach(p => this.scene.remove(p));
            }
        };

        animateParticles();
    }

    close() {
        this.isPlaying = false;
        this.overlay.classList.remove('active');

        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }

        // 씬 정리
        if (this.leftHand) this.scene.remove(this.leftHand);
        if (this.rightHand) this.scene.remove(this.rightHand);
    }

    // 유틸리티 함수들
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    animatePosition(object, target, duration) {
        return new Promise(resolve => {
            const start = { ...object.position };
            const startTime = Date.now();

            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const eased = this.easeOutCubic(progress);

                if (target.x !== undefined) {
                    object.position.x = start.x + (target.x - start.x) * eased;
                }
                if (target.y !== undefined) {
                    object.position.y = start.y + (target.y - start.y) * eased;
                }
                if (target.z !== undefined) {
                    object.position.z = start.z + (target.z - start.z) * eased;
                }

                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    resolve();
                }
            };

            animate();
        });
    }

    animateScale(object, targetScale, duration) {
        return new Promise(resolve => {
            const startScale = object.scale.x;
            const startTime = Date.now();

            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const eased = this.easeOutCubic(progress);

                const scale = startScale + (targetScale - startScale) * eased;
                object.scale.set(scale, scale, 1);

                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    resolve();
                }
            };

            animate();
        });
    }

    easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }
}

// 전역 배틀 애니메이션 인스턴스
const battleAnimation = new BattleAnimation();
