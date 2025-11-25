// Game Modal and Snake Game Logic

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
        <canvas id="snakeCanvas"></canvas>
        <div class="game-controls">
            <p>Utilisez les flèches ← ↑ → ↓ pour déplacer le serpent. Appuyez sur ESPACE pour pause.</p>
        </div>
    `;

    const canvas = document.getElementById('snakeCanvas');
    const ctx = canvas.getContext('2d');
    const scoreElement = document.getElementById('snakeScore');

    // Set canvas size
    const containerRect = container.getBoundingClientRect();
    canvas.width = containerRect.width;
    canvas.height = containerRect.width * 0.75; // 4:3 aspect ratio

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
    const gameSpeed = 100;

    // Colors (Vercel-inspired)
    const colors = {
        background: '#0a0a0a',
        snake: '#0070f3',
        snakeHead: '#ffffff',
        food: '#ff0080',
        grid: '#111111'
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

        // Draw food with glow effect
        ctx.shadowColor = colors.food;
        ctx.shadowBlur = 15;
        ctx.fillStyle = colors.food;
        ctx.beginPath();
        ctx.arc(
            food.x * gridSize + gridSize / 2,
            food.y * gridSize + gridSize / 2,
            gridSize / 2 - 2,
            0,
            Math.PI * 2
        );
        ctx.fill();
        ctx.shadowBlur = 0;

        // Draw snake
        snake.forEach((segment, index) => {
            const isHead = index === 0;
            
            // Gradient from head to tail
            const gradient = ctx.createRadialGradient(
                segment.x * gridSize + gridSize / 2,
                segment.y * gridSize + gridSize / 2,
                0,
                segment.x * gridSize + gridSize / 2,
                segment.y * gridSize + gridSize / 2,
                gridSize / 2
            );
            
            if (isHead) {
                gradient.addColorStop(0, colors.snakeHead);
                gradient.addColorStop(1, colors.snake);
                ctx.shadowColor = colors.snake;
                ctx.shadowBlur = 10;
            } else {
                const alpha = 1 - (index / snake.length) * 0.5;
                gradient.addColorStop(0, colors.snake);
                gradient.addColorStop(1, `rgba(0, 112, 243, ${alpha})`);
                ctx.shadowBlur = 0;
            }
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.roundRect(
                segment.x * gridSize + 1,
                segment.y * gridSize + 1,
                gridSize - 2,
                gridSize - 2,
                isHead ? 6 : 4
            );
            ctx.fill();
        });
        
        ctx.shadowBlur = 0;

        // Draw game over or pause overlay
        if (gameOver || isPaused) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 32px Inter, sans-serif';
            ctx.textAlign = 'center';
            
            if (gameOver) {
                ctx.fillText('Game Over!', canvas.width / 2, canvas.height / 2 - 20);
                ctx.font = '18px Inter, sans-serif';
                ctx.fillStyle = '#888888';
                ctx.fillText(`Score final: ${score}`, canvas.width / 2, canvas.height / 2 + 20);
                ctx.fillText('Appuyez sur ESPACE pour rejouer', canvas.width / 2, canvas.height / 2 + 50);
            } else {
                ctx.fillText('Pause', canvas.width / 2, canvas.height / 2);
                ctx.font = '18px Inter, sans-serif';
                ctx.fillStyle = '#888888';
                ctx.fillText('Appuyez sur ESPACE pour continuer', canvas.width / 2, canvas.height / 2 + 35);
            }
        }
    }

    function update() {
        if (isPaused || gameOver) return;

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
            return;
        }

        // Check self collision
        if (snake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
            gameOver = true;
            return;
        }

        // Add new head
        snake.unshift(newHead);

        // Check food collision
        if (newHead.x === food.x && newHead.y === food.y) {
            score += 10;
            scoreElement.textContent = score;
            food = spawnFood();
        } else {
            // Remove tail if no food eaten
            snake.pop();
        }
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
