const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('bestScore');
const healthEl = document.getElementById('health');
const levelEl = document.getElementById('level');
const timeEl = document.getElementById('time');
const chargeBar = document.getElementById('chargeBar');
const overlay = document.getElementById('overlay');

const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const restartBtn = document.getElementById('restartBtn');

const GAME_TIME = 90;
const STORAGE_KEY = 'cursor_snake_best';

const state = {
    running: false,
    paused: false,
    gameOver: false,
    score: 0,
    best: Number(localStorage.getItem(STORAGE_KEY) || 0),
    health: 5,
    level: 1,
    secondsLeft: GAME_TIME,
    snakes: [],
    particles: [],
    netCharge: 100,
    netActive: false,
    spawnTimer: 0,
    elapsed: 0,
    invincible: 0,
    pointer: { x: canvas.width / 2, y: canvas.height / 2 },
    player: { x: canvas.width / 2, y: canvas.height / 2, r: 13 },
    mouseInCanvas: false,
    pulse: 0,
    lastTime: 0,
    secondTicker: 0
};

bestEl.textContent = String(state.best);

function random(min, max) {
    return Math.random() * (max - min) + min;
}

function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
}

function spawnSnake(forceGold = false) {
    const side = Math.floor(Math.random() * 4);
    let x = 0;
    let y = 0;

    if (side === 0) { x = random(0, canvas.width); y = -20; }
    if (side === 1) { x = canvas.width + 20; y = random(0, canvas.height); }
    if (side === 2) { x = random(0, canvas.width); y = canvas.height + 20; }
    if (side === 3) { x = -20; y = random(0, canvas.height); }

    const isGold = forceGold || Math.random() < 0.1;
    const snake = {
        x,
        y,
        headR: isGold ? random(30, 34) : random(24, 30),
        speed: isGold ? random(60, 72) : random(50, 64),
        turnRate: random(1.1, 1.9),
        wave: random(1.0, 2.0),
        angle: random(0, Math.PI * 2),
        hue: isGold ? 40 : random(175, 245),
        value: isGold ? 140 : 80,
        wingPhase: random(0, Math.PI * 2),
        wingScale: random(1.18, 1.38),
        bodySway: random(0, Math.PI * 2),
        tail: Array.from({ length: isGold ? 34 : 28 }, () => ({ x, y }))
    };

    state.snakes = [snake];
}

function spawnBurst(x, y, color, amount = 14) {
    for (let i = 0; i < amount; i++) {
        state.particles.push({
            x,
            y,
            vx: random(-120, 120),
            vy: random(-120, 120),
            life: random(0.35, 0.95),
            maxLife: 1,
            size: random(2, 5),
            color
        });
    }
}

function resetGame() {
    state.running = false;
    state.paused = false;
    state.gameOver = false;
    state.score = 0;
    state.health = 5;
    state.level = 1;
    state.secondsLeft = GAME_TIME;
    state.snakes = [];
    state.particles = [];
    state.netCharge = 100;
    state.netActive = false;
    state.spawnTimer = 0;
    state.elapsed = 0;
    state.invincible = 0;
    state.secondTicker = 0;

    state.player.x = canvas.width / 2;
    state.player.y = canvas.height / 2;
    state.pointer.x = state.player.x;
    state.pointer.y = state.player.y;

    updateHud();
}

function startGame() {
    if (!state.gameOver && state.running) return;
    resetGame();
    state.running = true;
    overlay.classList.remove('show');
    pauseBtn.disabled = false;
    restartBtn.disabled = false;
    startBtn.disabled = true;

    spawnSnake();
}

function togglePause() {
    if (!state.running || state.gameOver) return;
    state.paused = !state.paused;
    pauseBtn.textContent = state.paused ? 'Resume' : 'Pause';

    if (state.paused) {
        overlay.innerHTML = `<div class="panel"><h3>Paused</h3><p>Press <strong>P</strong> or click Resume to continue.</p></div>`;
        overlay.classList.add('show');
    } else {
        overlay.classList.remove('show');
    }
}

function endGame(message) {
    state.running = false;
    state.gameOver = true;
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    restartBtn.disabled = false;
    pauseBtn.textContent = 'Pause';

    if (state.score > state.best) {
        state.best = state.score;
        localStorage.setItem(STORAGE_KEY, String(state.best));
        bestEl.textContent = String(state.best);
    }

    overlay.innerHTML = `
        <div class="panel">
            <h3>${message}</h3>
            <p style="margin-top: 8px;">Final Score: <strong>${state.score}</strong></p>
            <p style="margin-top: 4px;">Best Score: <strong>${state.best}</strong></p>
            <p style="margin-top: 8px;">Press Restart to play again.</p>
        </div>
    `;
    overlay.classList.add('show');
}

function updateHud() {
    scoreEl.textContent = String(state.score);
    healthEl.textContent = String(state.health);
    levelEl.textContent = String(state.level);
    timeEl.textContent = String(Math.max(0, Math.ceil(state.secondsLeft)));
    chargeBar.style.width = `${state.netCharge}%`;
}

function update(dt) {
    if (!state.running || state.paused || state.gameOver) return;

    state.elapsed += dt;
    state.secondTicker += dt;

    if (state.secondTicker >= 1) {
        state.secondTicker -= 1;
        state.secondsLeft -= 1;
        if (state.secondsLeft <= 0) {
            endGame('Time up!');
            return;
        }
    }

    state.level = 1 + Math.floor((GAME_TIME - state.secondsLeft) / 15);

    const followSpeed = 11;
    state.player.x += (state.pointer.x - state.player.x) * clamp(followSpeed * dt, 0, 1);
    state.player.y += (state.pointer.y - state.player.y) * clamp(followSpeed * dt, 0, 1);

    state.player.x = clamp(state.player.x, 8, canvas.width - 8);
    state.player.y = clamp(state.player.y, 8, canvas.height - 8);

    if (state.netActive) {
        state.netCharge -= 35 * dt;
        if (state.netCharge <= 0) {
            state.netCharge = 0;
            state.netActive = false;
        }
    } else {
        state.netCharge = Math.min(100, state.netCharge + 24 * dt);
    }

    state.invincible = Math.max(0, state.invincible - dt);

    const kept = [];
    for (const snake of state.snakes) {
        const dx = state.player.x - snake.x;
        const dy = state.player.y - snake.y;
        const target = Math.atan2(dy, dx);

        const serpentine = Math.sin(state.elapsed * (snake.wave * 1.7) + snake.bodySway) * snake.turnRate;
        snake.angle += serpentine * dt;
        let diff = target - snake.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        snake.angle += diff * 0.028;

        const levelBoost = 1 + (state.level - 1) * 0.085;
        snake.x += Math.cos(snake.angle) * snake.speed * levelBoost * dt;
        snake.y += Math.sin(snake.angle) * snake.speed * levelBoost * dt;

        snake.tail[0].x = snake.x;
        snake.tail[0].y = snake.y;
        for (let i = 1; i < snake.tail.length; i++) {
            const prev = snake.tail[i - 1];
            const seg = snake.tail[i];
            const t = i / snake.tail.length;
            const follow = 0.42 - t * 0.1;
            seg.x += (prev.x - seg.x) * follow;
            seg.y += (prev.y - seg.y) * follow;
        }

        const dist = Math.hypot(state.player.x - snake.x, state.player.y - snake.y);

        if (state.netActive && state.netCharge > 2 && dist < state.player.r + snake.headR + 14) {
            state.score += snake.value;
            spawnBurst(snake.x, snake.y, `hsl(${snake.hue}, 100%, 60%)`, snake.value > 100 ? 36 : 24);
            spawnSnake();
            continue;
        }

        if (dist < state.player.r + snake.headR && state.invincible <= 0) {
            state.health -= 1;
            state.invincible = 1;
            spawnBurst(state.player.x, state.player.y, '#ff5370', 20);
            if (state.health <= 0) {
                endGame('You were bitten!');
                return;
            }
        }

        const offscreen = snake.x < -80 || snake.x > canvas.width + 80 || snake.y < -80 || snake.y > canvas.height + 80;
        if (!offscreen) kept.push(snake);
    }
    state.snakes = kept;
    if (state.running && !state.gameOver && state.snakes.length === 0) {
        spawnSnake();
    }

    const alive = [];
    for (const p of state.particles) {
        p.life -= dt;
        if (p.life <= 0) continue;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.96;
        p.vy *= 0.96;
        alive.push(p);
    }
    state.particles = alive;

    state.pulse += dt * 5;
    updateHud();
}

function drawGrid() {
    ctx.save();
    ctx.strokeStyle = 'rgba(130, 150, 210, 0.09)';
    ctx.lineWidth = 1;

    for (let x = 0; x <= canvas.width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }

    for (let y = 0; y <= canvas.height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
    ctx.restore();
}

function drawBackgroundFX() {
    // warm ember/dust field
    const t = state.elapsed;
    for (let i = 0; i < 32; i++) {
        const base = (i * 73 + Math.floor(i / 3) * 31);
        const x = (base + t * (6 + (i % 6))) % (canvas.width + 60) - 30;
        let y = (i * 47 + Math.sin(t * 0.6 + i) * 14 + 60) % (canvas.height + 40) - 20;
        const size = 0.8 + (i % 4) * 0.6;
        const alpha = 0.06 + (Math.sin(t * 1.6 + i) + 1) * 0.045;
        ctx.beginPath();
        ctx.fillStyle = `rgba(255, ${120 + i % 80}, ${50 + i % 40}, ${alpha})`;
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
        // slight upwards drift glow
        if (i % 7 === 0) {
            ctx.beginPath();
            ctx.fillStyle = `rgba(255, 140, 60, ${alpha * 0.28})`;
            ctx.ellipse(x + 6, y - 6, size * 2.2, size * 0.8, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

function drawDragonSnake(snake) {
    const headX = snake.x;
    const headY = snake.y;
    const cos = Math.cos(snake.angle);
    const sin = Math.sin(snake.angle);
    const px = -sin;
    const py = cos;
    const flap = Math.sin(state.elapsed * 10 + snake.wingPhase);

    const points = [{ x: headX, y: headY }];
    for (let i = 0; i < snake.tail.length; i++) {
        const seg = snake.tail[i];
        const t = (i + 1) / (snake.tail.length + 1);
        const sway = Math.sin(state.elapsed * 8.5 - i * 0.48 + snake.bodySway) * (1 - t) * 5.2;
        points.push({
            x: seg.x + px * sway,
            y: seg.y + py * sway
        });
    }

    const left = [];
    const right = [];
    const normals = [];

    for (let i = 0; i < points.length; i++) {
        const prev = points[Math.max(0, i - 1)];
        const next = points[Math.min(points.length - 1, i + 1)];
        let tx = next.x - prev.x;
        let ty = next.y - prev.y;
        const len = Math.hypot(tx, ty) || 1;
        tx /= len;
        ty /= len;

        const nx = -ty;
        const ny = tx;
        normals.push({ x: nx, y: ny, tx, ty });

        const t = i / (points.length - 1);
        let w = snake.headR * (1.18 - t * 0.88);
        if (i < 4) {
            w *= 1.2 - i * 0.06;
        }

        left.push({ x: points[i].x + nx * w, y: points[i].y + ny * w });
        right.push({ x: points[i].x - nx * w, y: points[i].y - ny * w });
    }

    // Body shadow
    ctx.beginPath();
    ctx.moveTo(left[0].x + 8, left[0].y + 8);
    for (let i = 1; i < left.length; i++) ctx.lineTo(left[i].x + 8, left[i].y + 8);
    for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i].x + 8, right[i].y + 8);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.26)';
    ctx.fill();

    // Main dragon body
    const bodyGrad = ctx.createLinearGradient(headX, headY, points[points.length - 1].x, points[points.length - 1].y);
    bodyGrad.addColorStop(0, `hsl(${snake.hue + 5}, 82%, 44%)`);
    bodyGrad.addColorStop(0.45, `hsl(${snake.hue - 6}, 70%, 30%)`);
    bodyGrad.addColorStop(1, `hsl(${snake.hue - 16}, 62%, 18%)`);

    ctx.beginPath();
    ctx.moveTo(left[0].x, left[0].y);
    for (let i = 1; i < left.length; i++) ctx.lineTo(left[i].x, left[i].y);
    for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i].x, right[i].y);
    ctx.closePath();
    ctx.fillStyle = bodyGrad;
    ctx.fill();

    // Belly strip
    ctx.beginPath();
    const bellyStart = Math.floor(points.length * 0.08);
    const bellyEnd = Math.floor(points.length * 0.88);
    for (let i = bellyStart; i <= bellyEnd; i++) {
        const p = points[i];
        const n = normals[i];
        const t = i / (points.length - 1);
        const bw = snake.headR * (0.42 - t * 0.24);
        const x = p.x - n.x * bw * 0.4;
        const y = p.y - n.y * bw * 0.4;
        if (i === bellyStart) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    for (let i = bellyEnd; i >= bellyStart; i--) {
        const p = points[i];
        const n = normals[i];
        const t = i / (points.length - 1);
        const bw = snake.headR * (0.42 - t * 0.24);
        ctx.lineTo(p.x + n.x * bw * 0.8, p.y + n.y * bw * 0.8);
    }
    ctx.closePath();
    ctx.fillStyle = `hsla(${snake.hue + 24}, 78%, 58%, 0.45)`;
    ctx.fill();

    // Dorsal spikes (real dragon ridge)
    for (let i = 3; i < Math.floor(points.length * 0.72); i += 2) {
        const p = points[i];
        const n = normals[i];
        const t = i / (points.length - 1);
        const spike = snake.headR * (0.7 - t * 0.42);
        const back = snake.headR * (0.32 - t * 0.15);

        ctx.beginPath();
        ctx.moveTo(p.x + n.x * back, p.y + n.y * back);
        ctx.lineTo(p.x - n.x * back, p.y - n.y * back);
        ctx.lineTo(
            p.x - n.tx * spike + n.x * 1.2,
            p.y - n.ty * spike + n.y * 1.2
        );
        ctx.closePath();
        ctx.fillStyle = `hsla(${snake.hue + 36}, 92%, ${74 - t * 18}%, 0.85)`;
        ctx.fill();
    }

    ctx.save();
    ctx.translate(headX, headY);
    ctx.rotate(snake.angle);

    const hr = snake.headR;
    // make wings dramatically larger and more aggressive
    const wingSpan = hr * 8.2 * snake.wingScale;
    const wingLift = flap * hr * 1.2;
    const jawOpen = 0.18 + (Math.sin(state.elapsed * 8.5 + snake.wingPhase) + 1) * 0.09;

    // Giant wings (upper + lower membranes)
    const wingGradient = ctx.createLinearGradient(-hr, 0, -wingSpan, 0);
    wingGradient.addColorStop(0, 'rgba(80, 20, 20, 0.98)');
    wingGradient.addColorStop(0.55, 'rgba(45, 8, 12, 0.94)');
    wingGradient.addColorStop(1, 'rgba(18, 6, 6, 0.96)');

    ctx.beginPath();
    ctx.moveTo(-hr * 0.72, -hr * 0.18);
    ctx.bezierCurveTo(-hr * 2.1, -hr * 1.6 - wingLift, -wingSpan * 0.72, -hr * 2.9 - wingLift, -wingSpan * 1.05, -hr * 0.4);
    ctx.bezierCurveTo(-wingSpan * 0.8, -hr * 0.55, -hr * 2.2, -hr * 0.12, -hr * 0.95, -hr * 0.02);
    ctx.closePath();
    ctx.fillStyle = wingGradient;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-hr * 0.72, hr * 0.18);
    ctx.bezierCurveTo(-hr * 2.1, hr * 1.6 + wingLift, -wingSpan * 0.72, hr * 2.9 + wingLift, -wingSpan * 1.05, hr * 0.4);
    ctx.bezierCurveTo(-wingSpan * 0.8, hr * 0.55, -hr * 2.2, hr * 0.12, -hr * 0.95, hr * 0.02);
    ctx.closePath();
    ctx.fillStyle = wingGradient;
    ctx.fill();

    // Wing bones -- darker, thicker, more menacing
    ctx.strokeStyle = 'rgba(220,140,110,0.92)';
    ctx.lineWidth = Math.max(2.6, hr * 0.08);
    ctx.beginPath();
    ctx.moveTo(-hr * 0.88, -hr * 0.08);
    ctx.lineTo(-wingSpan * 0.98, -hr * 0.42);
    ctx.moveTo(-hr * 0.88, -hr * 0.08);
    ctx.lineTo(-wingSpan * 0.82, -hr * 1.6 - wingLift * 0.65);
    ctx.moveTo(-hr * 0.88, hr * 0.08);
    ctx.lineTo(-wingSpan * 0.98, hr * 0.42);
    ctx.moveTo(-hr * 0.88, hr * 0.08);
    ctx.lineTo(-wingSpan * 0.82, hr * 1.6 + wingLift * 0.65);
    ctx.stroke();

    // Forelimbs (danger claws) - darker
    ctx.strokeStyle = 'rgba(200,140,120,0.96)';
    ctx.lineWidth = Math.max(2.2, hr * 0.06);
    ctx.beginPath();
    ctx.moveTo(-hr * 0.45, -hr * 0.36);
    ctx.lineTo(-hr * 1.05, -hr * 0.95);
    ctx.lineTo(-hr * 1.35, -hr * 1.18);
    ctx.moveTo(-hr * 0.45, hr * 0.36);
    ctx.lineTo(-hr * 1.05, hr * 0.95);
    ctx.lineTo(-hr * 1.35, hr * 1.18);
    ctx.stroke();

    // Skull - sharpen and darken
    ctx.beginPath();
    ctx.moveTo(hr * 1.95, 0);
    ctx.bezierCurveTo(hr * 1.6, -hr * 0.9, hr * 0.4, -hr * 1.4, -hr * 1.6, -hr * 0.82);
    ctx.bezierCurveTo(-hr * 2.15, -hr * 0.5, -hr * 2.05, hr * 0.5, -hr * 1.6, hr * 0.82);
    ctx.bezierCurveTo(hr * 0.4, hr * 1.4, hr * 1.6, hr * 0.9, hr * 1.95, 0);
    ctx.closePath();
    ctx.fillStyle = `hsl(${snake.hue + 2}, 58%, 28%)`;
    ctx.fill();

    // Jaw - deeper, allows flame
    ctx.beginPath();
    ctx.moveTo(hr * 1.35, hr * 0.18);
    ctx.bezierCurveTo(hr * 0.9, hr * (0.6 + jawOpen * 1.2), -hr * 0.6, hr * (1.18 + jawOpen * 1.6), -hr * 1.75, hr * 0.58);
    ctx.bezierCurveTo(-hr * 0.9, hr * 1.02, hr * 0.38, hr * 1.02, hr * 1.5, hr * 0.3);
    ctx.closePath();
    ctx.fillStyle = `hsl(${snake.hue + 8}, 48%, 20%)`;
    ctx.fill();

    // Horns - longer and darker
    ctx.fillStyle = 'rgba(200,160,120,0.98)';
    ctx.beginPath();
    ctx.moveTo(-hr * 0.62, -hr * 0.45);
    ctx.lineTo(-hr * 3.1, -hr * 2.5);
    ctx.lineTo(-hr * 1.2, -hr * 0.12);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-hr * 0.62, hr * 0.45);
    ctx.lineTo(-hr * 3.1, hr * 2.5);
    ctx.lineTo(-hr * 1.2, hr * 0.12);
    ctx.closePath();
    ctx.fill();

    // Eyes - bright glow
    ctx.save();
    ctx.shadowBlur = Math.max(6, hr * 0.8);
    ctx.shadowColor = 'rgba(255,90,40,0.9)';
    ctx.fillStyle = '#ffd9c8';
    ctx.beginPath();
    ctx.ellipse(hr * 0.42, -hr * 0.4, hr * 0.22, hr * 0.12, -0.18, 0, Math.PI * 2);
    ctx.ellipse(hr * 0.42, hr * 0.4, hr * 0.22, hr * 0.12, 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#b00010';
    ctx.beginPath();
    ctx.ellipse(hr * 0.46, -hr * 0.4, hr * 0.08, hr * 0.14, 0, 0, Math.PI * 2);
    ctx.ellipse(hr * 0.46, hr * 0.4, hr * 0.08, hr * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Teeth - many sharp triangles
    ctx.fillStyle = '#fffef0';
    const toothCount = Math.max(8, Math.floor(hr * 3.6));
    for (let i = 0; i < toothCount; i++) {
        const tx = hr * 0.98 - i * (hr * 0.28);
        const h = hr * (0.42 + (i % 2) * 0.12) + jawOpen * hr * 0.9;
        ctx.beginPath();
        ctx.moveTo(tx, hr * 0.18);
        ctx.lineTo(tx - hr * 0.06, hr * (0.28 + h * 0.9));
        ctx.lineTo(tx + hr * 0.06, hr * 0.2);
        ctx.closePath();
        ctx.fill();
    }

    // Flame breath (when jaw opens) - draw flickering cone
    if (jawOpen > 0.26) {
        const flick = Math.sin(state.elapsed * 18 + snake.wingPhase) * hr * 0.22;
        const flameGrad = ctx.createLinearGradient(hr * 1.2, 0, hr * 3.6 + flick, 0);
        flameGrad.addColorStop(0, 'rgba(255,220,120,0.92)');
        flameGrad.addColorStop(0.35, 'rgba(255,110,40,0.94)');
        flameGrad.addColorStop(0.7, 'rgba(180,50,20,0.78)');
        flameGrad.addColorStop(1, 'rgba(60,20,6,0.22)');

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.beginPath();
        ctx.moveTo(hr * 1.2, hr * 0.02);
        ctx.bezierCurveTo(hr * 1.6 + flick, -hr * (0.6 + jawOpen * 0.6), hr * 3.2 + flick, -hr * (0.32 + jawOpen * 0.1), hr * 3.6 + flick, -hr * 0.04);
        ctx.bezierCurveTo(hr * 3.2 + flick, hr * (0.32 + jawOpen * 0.1), hr * 1.6 + flick, hr * (0.6 + jawOpen * 0.6), hr * 1.2, hr * 0.02);
        ctx.closePath();
        ctx.fillStyle = flameGrad;
        ctx.fill();
        ctx.restore();

        // spawn a few ember particles for effect
        for (let i = 0; i < 3; i++) {
            state.particles.push({
                x: headX + hr * (1.6 + Math.random() * 1.8),
                y: headY + (Math.random() - 0.5) * hr * 0.6,
                vx: random(40, 140) + Math.random() * 40,
                vy: random(-30, 30),
                life: random(0.4, 0.9),
                maxLife: 1,
                size: random(2, 5),
                color: `rgba(255, ${120 + Math.floor(Math.random()*80)}, ${40 + Math.floor(Math.random()*40)}, 1)`
            });
        }
    }

    ctx.restore();
}

function draw() {
    // brown warm background for canvas
    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, '#2c1508');
    grad.addColorStop(0.6, '#1c0b05');
    grad.addColorStop(1, '#120804');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawBackgroundFX();
    drawGrid();

    for (const snake of state.snakes) {
        drawDragonSnake(snake);
    }

    for (const p of state.particles) {
        const alpha = p.life / p.maxLife;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fillStyle = p.color.includes('hsl') ? p.color.replace(')', `, ${alpha})`).replace('hsl', 'hsla') : `rgba(255, 83, 112, ${alpha})`;
        ctx.fill();
    }

    const pulseR = state.player.r + (state.netActive ? 16 + Math.sin(state.pulse * 2) * 3 : 0);

    if (state.netActive) {
        ctx.beginPath();
        ctx.arc(state.player.x, state.player.y, pulseR, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(88, 245, 255, 0.9)';
        ctx.lineWidth = 3;
        ctx.stroke();
    }

    if (state.invincible > 0 && Math.sin(state.elapsed * 22) > 0) {
        return;
    }

    ctx.beginPath();
    ctx.arc(state.player.x, state.player.y, state.player.r + 6, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(125, 109, 255, 0.25)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(state.player.x, state.player.y, state.player.r, 0, Math.PI * 2);
    ctx.fillStyle = '#58f5ff';
    ctx.fill();
}

function gameLoop(timestamp) {
    if (!state.lastTime) state.lastTime = timestamp;
    const dt = Math.min((timestamp - state.lastTime) / 1000, 0.033);
    state.lastTime = timestamp;

    update(dt);
    draw();
    requestAnimationFrame(gameLoop);
}

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    state.pointer.x = (e.clientX - rect.left) * sx;
    state.pointer.y = (e.clientY - rect.top) * sy;
    state.mouseInCanvas = true;
});

canvas.addEventListener('mouseleave', () => {
    state.mouseInCanvas = false;
    state.netActive = false;
});

canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0 && state.running && !state.paused) {
        state.netActive = true;
    }
});

window.addEventListener('mouseup', () => {
    state.netActive = false;
});

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const t = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    state.pointer.x = (t.clientX - rect.left) * sx;
    state.pointer.y = (t.clientY - rect.top) * sy;
    if (state.running && !state.paused) state.netActive = true;
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const t = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    state.pointer.x = (t.clientX - rect.left) * sx;
    state.pointer.y = (t.clientY - rect.top) * sy;
}, { passive: false });

canvas.addEventListener('touchend', () => {
    state.netActive = false;
});

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', () => {
    startGame();
});
pauseBtn.addEventListener('click', togglePause);

window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'p') togglePause();
});

updateHud();
requestAnimationFrame(gameLoop);
