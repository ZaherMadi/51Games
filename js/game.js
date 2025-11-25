// Game Modal and Snake Game Logic

// Polyfill for roundRect (for older browsers)
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, width, height, radii) {
        const radius = typeof radii === 'number' ? radii : (radii && radii[0]) || 0;
        this.moveTo(x + radius, y);
        this.lineTo(x + width - radius, y);
        this.quadraticCurveTo(x + width, y, x + width, y + radius);
        this.lineTo(x + width, y + height - radius);
        this.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        this.lineTo(x + radius, y + height);
        this.quadraticCurveTo(x, y + height, x, y + height - radius);
        this.lineTo(x, y + radius);
        this.quadraticCurveTo(x, y, x + radius, y);
        this.closePath();
    };
}

// Leaderboard functions
function getLeaderboard(gameType) {
    const data = localStorage.getItem(`51games_leaderboard_${gameType}`);
    return data ? JSON.parse(data) : [];
}

function saveToLeaderboard(gameType, gamertag, score) {
    const leaderboard = getLeaderboard(gameType);
    leaderboard.push({ gamertag, score, date: new Date().toISOString() });
    leaderboard.sort((a, b) => b.score - a.score);
    const top10 = leaderboard.slice(0, 10);
    localStorage.setItem(`51games_leaderboard_${gameType}`, JSON.stringify(top10));
    return top10;
}

function renderLeaderboard(gameType, containerId) {
    const leaderboard = getLeaderboard(gameType);
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (leaderboard.length === 0) {
        container.innerHTML = '<li class="leaderboard-empty">Aucun score enregistré. Soyez le premier !</li>';
        return;
    }
    
    container.innerHTML = leaderboard.map((entry, index) => `
        <li class="leaderboard-item">
            <span class="leaderboard-rank">${index + 1}.</span>
            <span class="leaderboard-name">${escapeHtml(entry.gamertag)}</span>
            <span class="leaderboard-score">${entry.score} pts</span>
        </li>
    `).join('');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Modal Functions
function openGame(gameType) {
    const modal = document.getElementById('gameModal');
    const container = document.getElementById('gameContainer');
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    if (gameType === 'snake') {
        initSnakeGame(container);
    }
}

function closeGame() {
    const modal = document.getElementById('gameModal');
    const container = document.getElementById('gameContainer');
    
    modal.classList.remove('active');
    document.body.style.overflow = '';
    container.innerHTML = '';
    
    // Stop any running game
    if (window.gameInterval) {
        clearInterval(window.gameInterval);
        window.gameInterval = null;
    }
}

// Close modal on escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeGame();
    }
});

// Close modal when clicking outside
document.getElementById('gameModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'gameModal') {
        closeGame();
    }
});

// ===== Snake Game =====
function initSnakeGame(container) {
    container.innerHTML = `
        <div class="game-score">
            <span class="score-label">Score</span>
            <span class="score-value" id="snakeScore">0</span>
        </div>
        <div style="position: relative;">
            <canvas id="snakeCanvas"></canvas>
            <div id="gamertagOverlay" class="gamertag-overlay" style="display: none;"></div>
        </div>
        <div class="leaderboard-section">
            <h3 class="leaderboard-title">🏆 Meilleurs Scores</h3>
            <ul class="leaderboard-list" id="snakeLeaderboard"></ul>
        </div>
        <div class="game-controls">
            <p>Utilisez les flèches ← ↑ → ↓ pour déplacer le serpent. Appuyez sur ESPACE pour pause.</p>
        </div>
    `;

    const canvas = document.getElementById('snakeCanvas');
    const ctx = canvas.getContext('2d');
    const scoreElement = document.getElementById('snakeScore');
    const gamertagOverlay = document.getElementById('gamertagOverlay');

    // Render initial leaderboard
    renderLeaderboard('snake', 'snakeLeaderboard');

    // Set canvas size
    const containerRect = container.getBoundingClientRect();
    canvas.width = containerRect.width;
    canvas.height = containerRect.width * 0.6; // Adjusted for leaderboard

    // Game settings
    const gridSize = 20;
    const tileCountX = Math.floor(canvas.width / gridSize);
    const tileCountY = Math.floor(canvas.height / gridSize);

    // Game state
    let snake = [
        { x: Math.floor(tileCountX / 2), y: Math.floor(tileCountY / 2) }
    ];
    let direction = { x: 1, y: 0 };
    let nextDirection = { x: 1, y: 0 };
    let food = spawnFood();
    let score = 0;
    let isPaused = false;
    let gameOver = false;
    let showingGamertagInput = false;
    let particles = [];
    let foodPulse = 0;
    const gameSpeed = 100;

    // Colors (Gold & Black theme)
    const colors = {
        background: '#0a0a0a',
        snake: '#ffd700',
        snakeHead: '#ffffff',
        snakeGlow: 'rgba(255, 215, 0, 0.5)',
        food: '#ff6b00',
        foodGlow: 'rgba(255, 107, 0, 0.6)',
        grid: '#151515',
        particle: '#ffd700'
    };

    function spawnFood() {
        let newFood;
        do {
            newFood = {
                x: Math.floor(Math.random() * tileCountX),
                y: Math.floor(Math.random() * tileCountY)
            };
        } while (snake.some(segment => segment.x === newFood.x && segment.y === newFood.y));
        return newFood;
    }

    function createParticles(x, y) {
        for (let i = 0; i < 8; i++) {
            particles.push({
                x: x * gridSize + gridSize / 2,
                y: y * gridSize + gridSize / 2,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                life: 1,
                size: Math.random() * 4 + 2
            });
        }
    }

    function updateParticles() {
        particles = particles.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.03;
            p.vx *= 0.98;
            p.vy *= 0.98;
            return p.life > 0;
        });
    }

    function drawParticles() {
        particles.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 215, 0, ${p.life})`;
            ctx.shadowColor = colors.snakeGlow;
            ctx.shadowBlur = 10;
            ctx.fill();
        });
        ctx.shadowBlur = 0;
    }

    function draw() {
        // Clear canvas
        ctx.fillStyle = colors.background;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw grid (subtle)
        ctx.strokeStyle = colors.grid;
        ctx.lineWidth = 0.5;
        for (let x = 0; x < canvas.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }

        // Draw food with pulsing glow effect
        foodPulse += 0.1;
        const pulseSize = Math.sin(foodPulse) * 3;
        ctx.shadowColor = colors.foodGlow;
        ctx.shadowBlur = 20 + pulseSize * 2;
        ctx.fillStyle = colors.food;
        ctx.beginPath();
        ctx.arc(
            food.x * gridSize + gridSize / 2,
            food.y * gridSize + gridSize / 2,
            gridSize / 2 - 2 + pulseSize,
            0,
            Math.PI * 2
        );
        ctx.fill();
        ctx.shadowBlur = 0;

        // Draw particles
        drawParticles();

        // Draw snake with enhanced effects
        snake.forEach((segment, index) => {
            const isHead = index === 0;
            const segmentProgress = index / snake.length;
            
            // Calculate segment size (head is bigger, tail is smaller)
            const sizeReduction = segmentProgress * 4;
            const segmentSize = gridSize - 2 - sizeReduction;
            const offset = (gridSize - segmentSize) / 2;
            
            // Gradient from head to tail
            const gradient = ctx.createRadialGradient(
                segment.x * gridSize + gridSize / 2,
                segment.y * gridSize + gridSize / 2,
                0,
                segment.x * gridSize + gridSize / 2,
                segment.y * gridSize + gridSize / 2,
                segmentSize / 2
            );
            
            if (isHead) {
                gradient.addColorStop(0, colors.snakeHead);
                gradient.addColorStop(0.5, colors.snake);
                gradient.addColorStop(1, colors.snake);
                ctx.shadowColor = colors.snakeGlow;
                ctx.shadowBlur = 15;
            } else {
                const alpha = 1 - segmentProgress * 0.6;
                gradient.addColorStop(0, colors.snake);
                gradient.addColorStop(1, `rgba(255, 215, 0, ${alpha})`);
                ctx.shadowColor = colors.snakeGlow;
                ctx.shadowBlur = 5;
            }
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.roundRect(
                segment.x * gridSize + offset,
                segment.y * gridSize + offset,
                segmentSize,
                segmentSize,
                isHead ? 8 : 6
            );
            ctx.fill();

            // Draw eyes on head
            if (isHead) {
                ctx.shadowBlur = 0;
                ctx.fillStyle = '#000';
                const eyeSize = 3;
                const eyeOffset = 5;
                
                // Position eyes based on direction
                let eyeX1, eyeY1, eyeX2, eyeY2;
                if (direction.x === 1) { // Right
                    eyeX1 = eyeX2 = segment.x * gridSize + gridSize - 6;
                    eyeY1 = segment.y * gridSize + 6;
                    eyeY2 = segment.y * gridSize + gridSize - 6;
                } else if (direction.x === -1) { // Left
                    eyeX1 = eyeX2 = segment.x * gridSize + 6;
                    eyeY1 = segment.y * gridSize + 6;
                    eyeY2 = segment.y * gridSize + gridSize - 6;
                } else if (direction.y === -1) { // Up
                    eyeX1 = segment.x * gridSize + 6;
                    eyeX2 = segment.x * gridSize + gridSize - 6;
                    eyeY1 = eyeY2 = segment.y * gridSize + 6;
                } else { // Down
                    eyeX1 = segment.x * gridSize + 6;
                    eyeX2 = segment.x * gridSize + gridSize - 6;
                    eyeY1 = eyeY2 = segment.y * gridSize + gridSize - 6;
                }
                
                ctx.beginPath();
                ctx.arc(eyeX1, eyeY1, eyeSize, 0, Math.PI * 2);
                ctx.arc(eyeX2, eyeY2, eyeSize, 0, Math.PI * 2);
                ctx.fill();
            }
        });
        
        ctx.shadowBlur = 0;

        // Draw game over or pause overlay
        if ((gameOver && !showingGamertagInput) || isPaused) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.textAlign = 'center';
            
            if (gameOver) {
                // Gold gradient text for Game Over
                const gradient = ctx.createLinearGradient(
                    canvas.width / 2 - 100, canvas.height / 2 - 40,
                    canvas.width / 2 + 100, canvas.height / 2 - 40
                );
                gradient.addColorStop(0, '#ffd700');
                gradient.addColorStop(0.5, '#ffec8b');
                gradient.addColorStop(1, '#ffd700');
                
                ctx.fillStyle = gradient;
                ctx.font = 'bold 36px Inter, sans-serif';
                ctx.fillText('Game Over!', canvas.width / 2, canvas.height / 2 - 20);
                
                ctx.font = '20px Inter, sans-serif';
                ctx.fillStyle = '#888888';
                ctx.fillText(`Score final: ${score}`, canvas.width / 2, canvas.height / 2 + 25);
                ctx.fillText('Appuyez sur ESPACE pour rejouer', canvas.width / 2, canvas.height / 2 + 55);
            } else {
                ctx.fillStyle = '#ffd700';
                ctx.font = 'bold 36px Inter, sans-serif';
                ctx.fillText('⏸ Pause', canvas.width / 2, canvas.height / 2);
                ctx.font = '18px Inter, sans-serif';
                ctx.fillStyle = '#888888';
                ctx.fillText('Appuyez sur ESPACE pour continuer', canvas.width / 2, canvas.height / 2 + 35);
            }
        }
    }

    function showGamertagInput(finalScore) {
        showingGamertagInput = true;
        gamertagOverlay.style.display = 'flex';
        gamertagOverlay.innerHTML = `
            <h2 class="gamertag-title">🏆 Nouveau Score !</h2>
            <p class="gamertag-score">Vous avez obtenu ${finalScore} points</p>
            <input type="text" id="gamertagInput" class="gamertag-input" placeholder="Votre gamertag" maxlength="20" autocomplete="off">
            <button id="gamertagSubmit" class="gamertag-submit">Enregistrer</button>
            <button id="gamertagSkip" class="gamertag-skip">Passer</button>
        `;
        
        const input = document.getElementById('gamertagInput');
        const submitBtn = document.getElementById('gamertagSubmit');
        const skipBtn = document.getElementById('gamertagSkip');
        
        // Get last used gamertag
        const lastGamertag = localStorage.getItem('51games_last_gamertag');
        if (lastGamertag) {
            input.value = lastGamertag;
        }
        
        input.focus();
        
        function submitScore() {
            const gamertag = input.value.trim() || 'Anonyme';
            localStorage.setItem('51games_last_gamertag', gamertag);
            saveToLeaderboard('snake', gamertag, finalScore);
            renderLeaderboard('snake', 'snakeLeaderboard');
            hideGamertagInput();
        }
        
        submitBtn.onclick = submitScore;
        input.onkeydown = (e) => {
            if (e.key === 'Enter') submitScore();
        };
        skipBtn.onclick = hideGamertagInput;
    }

    function hideGamertagInput() {
        showingGamertagInput = false;
        gamertagOverlay.style.display = 'none';
        draw();
    }

    function update() {
        if (isPaused || gameOver || showingGamertagInput) return;

        // Apply next direction
        direction = { ...nextDirection };

        // Calculate new head position
        const newHead = {
            x: snake[0].x + direction.x,
            y: snake[0].y + direction.y
        };

        // Check wall collision
        if (newHead.x < 0 || newHead.x >= tileCountX || 
            newHead.y < 0 || newHead.y >= tileCountY) {
            gameOver = true;
            if (score > 0) {
                setTimeout(() => showGamertagInput(score), 500);
            }
            return;
        }

        // Check self collision
        if (snake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
            gameOver = true;
            if (score > 0) {
                setTimeout(() => showGamertagInput(score), 500);
            }
            return;
        }

        // Add new head
        snake.unshift(newHead);

        // Check food collision
        if (newHead.x === food.x && newHead.y === food.y) {
            score += 10;
            scoreElement.textContent = score;
            createParticles(food.x, food.y);
            food = spawnFood();
        } else {
            // Remove tail if no food eaten
            snake.pop();
        }

        // Update particles
        updateParticles();
    }

    function gameLoop() {
        update();
        draw();
    }

    // Input handling
    function handleKeyDown(e) {
        const key = e.key;
        
        // Prevent default for arrow keys to avoid scrolling
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(key)) {
            e.preventDefault();
        }

        if (showingGamertagInput) return;

        switch (key) {
            case 'ArrowUp':
                if (direction.y !== 1) nextDirection = { x: 0, y: -1 };
                break;
            case 'ArrowDown':
                if (direction.y !== -1) nextDirection = { x: 0, y: 1 };
                break;
            case 'ArrowLeft':
                if (direction.x !== 1) nextDirection = { x: -1, y: 0 };
                break;
            case 'ArrowRight':
                if (direction.x !== -1) nextDirection = { x: 1, y: 0 };
                break;
            case ' ':
                if (gameOver) {
                    // Restart game
                    snake = [{ x: Math.floor(tileCountX / 2), y: Math.floor(tileCountY / 2) }];
                    direction = { x: 1, y: 0 };
                    nextDirection = { x: 1, y: 0 };
                    food = spawnFood();
                    score = 0;
                    scoreElement.textContent = score;
                    gameOver = false;
                    particles = [];
                } else {
                    isPaused = !isPaused;
                }
                break;
        }
    }

    // Add keyboard listener
    document.addEventListener('keydown', handleKeyDown);

    // Start game loop
    window.gameInterval = setInterval(gameLoop, gameSpeed);

    // Initial draw
    draw();

    // Clean up on modal close
    const modal = document.getElementById('gameModal');
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (!modal.classList.contains('active')) {
                document.removeEventListener('keydown', handleKeyDown);
                observer.disconnect();
            }
        });
    });
    
    observer.observe(modal, { attributes: true, attributeFilter: ['class'] });
}
