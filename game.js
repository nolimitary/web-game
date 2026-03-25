const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// UI Elements
const scoreEl = document.getElementById('score');
const levelEl = document.getElementById('level');
const dashStatusEl = document.getElementById('dashStatus');

// Game State
let score = 0;
let level = 1;
let frameCount = 0;
let animationId;

// Entities
const player = {
    x: canvas.width / 2, y: canvas.height / 2,
    radius: 15, speed: 4, angle: 0,
    dashCooldown: 0, isDashing: false, dashTime: 0
};
const bullets = [];
const zombies = [];
const particles = [];

// Input Handling
const keys = { w: false, a: false, s: false, d: false, ' ': false };
const mouse = { x: canvas.width / 2, y: canvas.height / 2, down: false };

window.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);
window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
window.addEventListener('mousedown', () => mouse.down = true);
window.addEventListener('mouseup', () => mouse.down = false);

// Handle Window Resize
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

// --- SKILLS & ACTIONS ---

function shoot() {
    // Only shoot every 10 frames
    if (frameCount % 10 !== 0) return;

    const bSpeed = 15;
    // Level 1: 1 bullet, Level 2: 3 bullets, Level 3+: 5 bullets
    const bulletCount = level === 1 ? 1 : level === 2 ? 3 : 5;
    const spread = 0.2; // Angle spread

    for (let i = 0; i < bulletCount; i++) {
        // Calculate spread offset
        let offset = (i - Math.floor(bulletCount / 2)) * spread;
        if (bulletCount === 1) offset = 0;

        bullets.push({
            x: player.x + Math.cos(player.angle) * 20, // Spawn at tip of gun
            y: player.y + Math.sin(player.angle) * 20,
            radius: 4,
            vx: Math.cos(player.angle + offset) * bSpeed,
            vy: Math.sin(player.angle + offset) * bSpeed,
            life: 100 // Remove after 100 frames so they don't lag the game
        });
    }
}

function createParticles(x, y, color, amount) {
    for (let i = 0; i < amount; i++) {
        particles.push({
            x: x, y: y,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10,
            radius: Math.random() * 4 + 1,
            color: color,
            life: Math.random() * 20 + 10
        });
    }
}

// --- MAIN GAME LOOP ---

function update() {
    frameCount++;
    
    // Draw background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // --- PLAYER LOGIC ---
    player.angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);

    // Dash Skill Logic
    if (keys[' '] && player.dashCooldown <= 0) {
        player.isDashing = true;
        player.dashTime = 12; // Dash lasts 12 frames
        player.dashCooldown = 150; // Wait 150 frames to dash again
    }

    if (player.dashCooldown > 0) {
        player.dashCooldown--;
        dashStatusEl.textContent = `COOLDOWN (${Math.ceil(player.dashCooldown/60)}s)`;
        dashStatusEl.className = 'cooldown';
    } else {
        dashStatusEl.textContent = 'READY';
        dashStatusEl.className = 'ready';
    }

    if (player.dashTime > 0) {
        player.dashTime--;
    } else {
        player.isDashing = false;
    }

    let currentSpeed = player.isDashing ? player.speed * 4 : player.speed;
    let isMoving = false;

    if (keys.w && player.y > player.radius) { player.y -= currentSpeed; isMoving = true; }
    if (keys.s && player.y < canvas.height - player.radius) { player.y += currentSpeed; isMoving = true; }
    if (keys.a && player.x > player.radius) { player.x -= currentSpeed; isMoving = true; }
    if (keys.d && player.x < canvas.width - player.radius) { player.x += currentSpeed; isMoving = true; }

    if (mouse.down) shoot();

    // Draw Player (Procedural Sprite with walking animation)
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);
    
    // Walk wobble animation
    let wobble = isMoving && !player.isDashing ? Math.sin(frameCount * 0.3) * 5 : 0;
    
    // Hands/Gun
    ctx.fillStyle = '#95a5a6'; // Gun color
    ctx.fillRect(10, -5 + wobble, 25, 10); // Gun barrel
    ctx.fillStyle = '#e67e22'; // Skin color
    ctx.beginPath(); ctx.arc(15, -6 + wobble, 5, 0, Math.PI * 2); ctx.fill(); // Left hand
    ctx.beginPath(); ctx.arc(20, 6 + wobble, 5, 0, Math.PI * 2); ctx.fill(); // Right hand on gun
    
    // Body
    ctx.fillStyle = '#3498db'; // Shirt color
    ctx.beginPath(); ctx.arc(0, 0, player.radius, 0, Math.PI * 2); ctx.fill();
    // Head overlay
    ctx.fillStyle = '#e67e22';
    ctx.beginPath(); ctx.arc(0, 0, player.radius * 0.6, 0, Math.PI * 2); ctx.fill();
    
    // Dash visual effect
    if (player.isDashing) {
        ctx.strokeStyle = '#34dbdb';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, 0, player.radius + 5, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();

    // --- BULLETS LOGIC ---
    for (let i = bullets.length - 1; i >= 0; i--) {
        let b = bullets[i];
        b.x += b.vx;
        b.y += b.vy;
        b.life--;

        // Draw bullet
        ctx.fillStyle = '#f1c40f';
        ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2); ctx.fill();

        if (b.life <= 0 || b.x < 0 || b.x > canvas.width || b.y < 0 || b.y > canvas.height) {
            bullets.splice(i, 1);
        }
    }

    // --- PARTICLES LOGIC ---
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        p.radius *= 0.9; // Shrink over time

        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill();

        if (p.life <= 0 || p.radius < 0.1) particles.splice(i, 1);
    }

    // --- ZOMBIE LOGIC ---
    // Spawn scaling: spawn faster as score gets higher
    let spawnRate = Math.max(20, 100 - score * 2); 
    if (frameCount % spawnRate === 0) {
        let side = Math.random();
        let zx, zy;
        if (side < 0.25) { zx = -30; zy = Math.random() * canvas.height; } // Left
        else if (side < 0.5) { zx = canvas.width + 30; zy = Math.random() * canvas.height; } // Right
        else if (side < 0.75) { zx = Math.random() * canvas.width; zy = -30; } // Top
        else { zx = Math.random() * canvas.width; zy = canvas.height + 30; } // Bottom
        
        zombies.push({ x: zx, y: zy, radius: 15, speed: Math.random() * 1.5 + 1, hp: 2 });
    }

    for (let i = zombies.length - 1; i >= 0; i--) {
        let z = zombies[i];
        let angle = Math.atan2(player.y - z.y, player.x - z.x);
        
        z.x += Math.cos(angle) * z.speed;
        z.y += Math.sin(angle) * z.speed;

        // Draw Zombie (Procedural Sprite)
        ctx.save();
        ctx.translate(z.x, z.y);
        ctx.rotate(angle);
        
        let zWobble = Math.sin(frameCount * 0.2) * 8; // Slower, wider wobble
        
        // Zombie Arms
        ctx.fillStyle = '#1e8449';
        ctx.fillRect(0, -15, 20 + zWobble, 8); // Left arm reaches forward and back
        ctx.fillRect(0, 7, 20 - zWobble, 8);  // Right arm alternating
        
        // Zombie Body
        ctx.fillStyle = '#2ecc71';
        ctx.beginPath(); ctx.arc(0, 0, z.radius, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        // Player Collision (Game Over)
        let distToPlayer = Math.hypot(player.x - z.x, player.y - z.y);
        if (distToPlayer < z.radius + player.radius && !player.isDashing) {
            cancelAnimationFrame(animationId);
            createParticles(player.x, player.y, '#e74c3c', 50); // Massive blood explosion
            setTimeout(() => alert(`YOU DIED! \nFinal Score: ${score} \nLevel Reached: ${level}`), 100);
            return; // Stop the loop
        }

        // Bullet Collision
        for (let j = bullets.length - 1; j >= 0; j--) {
            let b = bullets[j];
            let distToBullet = Math.hypot(b.x - z.x, b.y - z.y);
            
            if (distToBullet < z.radius + b.radius) {
                bullets.splice(j, 1);
                z.hp--;
                createParticles(b.x, b.y, '#2ecc71', 5); // Small green splatter on hit
                
                if (z.hp <= 0) {
                    zombies.splice(i, 1);
                    createParticles(z.x, z.y, '#8e44ad', 15); // Big purple/green death splatter
                    score += 1;
                    scoreEl.textContent = score;

                    // Level Up logic
                    if (score === 25 && level === 1) { level = 2; levelEl.textContent = "2 (Triple Shot)"; }
                    if (score === 75 && level === 2) { level = 3; levelEl.textContent = "3 (Spread Shot)"; }
                    break; // Zombie is dead, stop checking bullets for it
                }
            }
        }
    }

    animationId = requestAnimationFrame(update);
}

// Start Game
update();