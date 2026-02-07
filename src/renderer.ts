import { ConfigManager } from './config';
import { Game } from './game';
import { InputManager } from './input';

export class Renderer {
    private ctx: CanvasRenderingContext2D;
    private width: number;
    private height: number;
    private pixelsPerUnit: number = 20; // Zoom level

    private shakeTimer: number = 0;
    private shakeIntensity: number = 0;

    // Background Stars (Deterministic based on coords)
    private stars: { x: number, y: number, r: number, alpha: number }[] = [];

    constructor(canvas: HTMLCanvasElement) {
        this.ctx = canvas.getContext('2d')!;
        this.width = canvas.width = window.innerWidth;
        this.height = canvas.height = window.innerHeight;

        window.addEventListener('resize', () => {
            this.width = canvas.width = window.innerWidth;
            this.height = canvas.height = window.innerHeight;
        });

        // Pre-generate some star data for parallax chunks
        for (let i = 0; i < 200; i++) {
            this.stars.push({
                x: Math.random() * 2000,
                y: Math.random() * 2000,
                r: 0.2 + Math.random() * 0.8,
                alpha: 0.3 + Math.random() * 0.7
            });
        }
    }

    public render(game: Game) {
        const entities = game.getEntities();

        // Update Shake
        const dt = 1 / 60;
        if (this.shakeTimer > 0) {
            this.shakeTimer -= dt;
        }

        // --- NEW PREMIUM BACKGROUND (Cyberpunk Inferno) ---
        // 0. Base Nebula Gradient
        // --- NEW NIGHT-BLUEPRINT BACKGROUND ---
        this.ctx.fillStyle = '#0f172a'; // Deep Navy Slate
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Center camera on Hero if exists
        const cameraX = entities.hero ? entities.hero.x : 0;
        const cameraY = entities.hero ? entities.hero.y : 0;

        // 0.5. Parallax Starfield
        this.drawParallaxStars(cameraX, cameraY);

        // Sync InputManager with camera
        const input = InputManager.getInstance();
        input.cameraOffset.x = cameraX;
        input.cameraOffset.y = cameraY;
        input.updateMouseWorld();

        this.ctx.save();

        // 1. Screen Space to World Space Translation
        // Center of screen
        this.ctx.translate(this.width / 2, this.height / 2);

        // Screen Shake Apply
        if (this.shakeTimer > 0) {
            const sx = (Math.random() - 0.5) * this.shakeIntensity * this.pixelsPerUnit;
            const sy = (Math.random() - 0.5) * this.shakeIntensity * this.pixelsPerUnit;
            this.ctx.translate(sx, sy);
        }

        // Zoom/Scale
        this.ctx.scale(this.pixelsPerUnit, this.pixelsPerUnit);

        // Camera Offset (negative hero pos)
        this.ctx.translate(-cameraX, -cameraY);

        // Draw Arena Floor (New Brotato Style)
        this.drawArenaFloor();

        // Draw Infinite Grid
        this.drawInfiniteGrid(cameraX, cameraY);

        // Draw Arena Boundary
        this.drawArenaBoundary();





        // Draw Entities
        for (const enemy of entities.enemies) {
            enemy.draw(this.ctx);
        }

        if (entities.coins) {
            for (const coin of entities.coins) {
                coin.draw(this.ctx);
            }
        }





        for (const bomb of entities.bombs) {
            bomb.draw(this.ctx);
        }

        for (const bullet of entities.bullets) {
            bullet.draw(this.ctx);
        }

        if (entities.hero) {
            entities.hero.draw(this.ctx);
        }

        this.drawTelegraphs(game);
        this.drawEnemyBars(entities.enemies);

        // --- COMBOS (World Space Popups) ---
        for (const combo of game.combos) {
            this.ctx.save();
            this.ctx.translate(combo.x, combo.y);
            this.ctx.scale(1 / this.pixelsPerUnit, 1 / this.pixelsPerUnit);
            this.ctx.font = 'bold 32px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            const alpha = Math.min(1.0, combo.timer * 2);
            this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            this.ctx.strokeStyle = `rgba(0, 0, 0, ${alpha})`;
            this.ctx.lineWidth = 4;
            this.ctx.strokeText(combo.text, 0, 0);
            this.ctx.fillText(combo.text, 0, 0);
            this.ctx.restore();
        }

        this.ctx.restore(); // Back to screen space

        // --- Atmospheric Dimming (Conditional) ---
        if (game.waveManager.isShopOpen || game.waveManager.isReady || game.waveManager.isIndexOpen) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
            this.ctx.fillRect(0, 0, this.width, this.height);
        }

        this.drawUI(game);

        // Mobile Controls
        this.drawMobileControls();

        if (game.deathHighlightTimer > 0) {
            this.drawDeathClarity(game);
        }

        // --- PAUSE OVERLAY ---
        if (game.isPaused) {
            this.drawPauseOverlay();
        }

        // --- ENEMY INDEX ---
        if (game.waveManager.isIndexOpen) {
            this.drawEnemyIndex();
        }

        // --- STATS OVERLAY ---
        if (game.waveManager.isStatsOpen) {
            this.drawStatsOverlay(game);
        }



        this.drawScanlines();
    }

    private drawArenaFloor() {
        const config = ConfigManager.getConfig();
        const halfW = config.arena.width / 2;
        const halfH = config.arena.height / 2;
        const ctx = this.ctx;

        ctx.save();
        // Base Floor: Dark Blueprint Slate
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-halfW, -halfH, config.arena.width, config.arena.height);

        // Tech Grid (Double Line)
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 0.02;
        for (let x = -halfW; x <= halfW; x += 2) {
            ctx.beginPath();
            ctx.moveTo(x, -halfH); ctx.lineTo(x, halfH);
            ctx.stroke();
        }
        for (let y = -halfH; y <= halfH; y += 2) {
            ctx.beginPath();
            ctx.moveTo(-halfW, y); ctx.lineTo(halfW, y);
            ctx.stroke();
        }

        // Blueprint "Markers" (Crosses)
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 0.01;
        for (let x = -halfW + 10; x < halfW; x += 20) {
            for (let y = -halfH + 10; y < halfH; y += 20) {
                ctx.beginPath();
                ctx.moveTo(x - 0.5, y); ctx.lineTo(x + 0.5, y);
                ctx.moveTo(x, y - 0.5); ctx.lineTo(x, y + 0.5);
                ctx.stroke();
            }
        }

        ctx.restore();
    }

    private drawArenaBoundary() {
        const config = ConfigManager.getConfig();
        const halfW = config.arena.width / 2;
        const halfH = config.arena.height / 2;
        const ctx = this.ctx;

        ctx.save();
        // Dual Neon Frame
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 0.4;
        ctx.strokeRect(-halfW - 0.2, -halfH - 0.2, config.arena.width + 0.4, config.arena.height + 0.4);

        ctx.strokeStyle = '#00ffff'; // Electric Cyan
        ctx.lineWidth = 0.1;
        ctx.strokeRect(-halfW, -halfH, config.arena.width, config.arena.height);

        // Corner Data Clusters
        ctx.fillStyle = '#64748b';
        const dS = 0.5;
        ctx.fillRect(-halfW - dS, -halfH - dS, dS * 2, dS * 2);
        ctx.fillRect(halfW - dS, -halfH - dS, dS * 2, dS * 2);
        ctx.fillRect(-halfW - dS, halfH - dS, dS * 2, dS * 2);
        ctx.fillRect(halfW - dS, halfH - dS, dS * 2, dS * 2);

        ctx.restore();
    }

    private drawInfiniteGrid(cameraX: number, cameraY: number) {
        const ctx = this.ctx;
        const config = ConfigManager.getConfig();
        const gridSize = config.arena.grid_size || 2;

        const halfWidth = (this.width / 2) / this.pixelsPerUnit;
        const halfHeight = (this.height / 2) / this.pixelsPerUnit;

        const startX = Math.floor((cameraX - halfWidth) / gridSize) * gridSize;
        const endX = Math.ceil((cameraX + halfWidth) / gridSize) * gridSize;
        const startY = Math.floor((cameraY - halfHeight) / gridSize) * gridSize;
        const endY = Math.ceil((cameraY + halfHeight) / gridSize) * gridSize;

        ctx.save();
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.03)'; // Very faint dark grid
        ctx.lineWidth = 0.02;

        ctx.beginPath();
        for (let x = startX; x <= endX; x += gridSize) {
            ctx.moveTo(x, startY);
            ctx.lineTo(x, endY);
        }
        for (let y = startY; y <= endY; y += gridSize) {
            ctx.moveTo(startX, y);
            ctx.lineTo(endX, y);
        }
        ctx.stroke();

        // Functional Floor Markers (Angular/Structured)
        for (let x = startX; x <= endX; x += gridSize) {
            for (let y = startY; y <= endY; y += gridSize) {
                const seed = Math.sin(x * 1.5) + Math.cos(y * 1.1);
                if (seed > 0.85) {
                    const glow = (Math.sin(Date.now() * 0.002 + x) + 1) / 2;
                    ctx.fillStyle = `rgba(0, 255, 255, ${0.05 + glow * 0.1})`; // Cyan Node
                    ctx.fillRect(x - 0.2, y - 0.2, 0.4, 0.4);

                    ctx.fillStyle = `rgba(255, 255, 255, ${0.2 + glow * 0.4})`; // White Node
                    ctx.fillRect(x - 0.025, y - 0.025, 0.05, 0.05);
                }
            }
        }
        ctx.restore();
    }

    private drawParallaxStars(camX: number, camY: number) {
        const ctx = this.ctx;
        ctx.save();
        // Digital Blueprint Particles
        const layers = [
            { speed: 0.1, color: '#334155', size: 0.8 },
            { speed: 0.3, color: '#475569', size: 0.4 },
            { speed: 0.5, color: '#00ffff', size: 0.2 }
        ];

        layers.forEach((layer, lIdx) => {
            ctx.fillStyle = layer.color;
            ctx.globalAlpha = 0.5;

            // Loop through pre-gen stars and offset by camera * layer speed
            this.stars.forEach((star, sIdx) => {
                if (sIdx % layers.length !== lIdx) return;

                // Drift + Heat Haze Wave
                const drift = Date.now() * 0.001 * layer.speed;
                const wave = Math.sin(Date.now() * 0.002 + star.x) * 10;

                let sx = (star.x - camX * layer.speed * 20 + drift * 50) % this.width;
                let sy = (star.y - camY * layer.speed * 20 + wave) % this.height;
                if (sx < 0) sx += this.width;
                if (sy < 0) sy += this.height;

                // Draw digital dash instead of circle
                const dashLen = star.r * layer.size * 6;
                ctx.fillRect(sx, sy, 1, dashLen);

                // Ember glow (Linear)
                if (layer.speed > 0.3) {
                    ctx.fillRect(sx, sy, 1, dashLen);
                }
            });
        });
        ctx.restore();
    }

    private drawScanlines() {
        const ctx = this.ctx;
        ctx.save();
        ctx.globalCompositeOperation = 'overlay';

        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        for (let y = 0; y < this.height; y += 4) {
            ctx.fillRect(0, y, this.width, 2);
        }


        ctx.restore();
    }

    private drawUI(game: Game) {
        const ctx = this.ctx;
        const waveMgr = game.waveManager;

        ctx.save();
        ctx.resetTransform();

        const width = this.ctx.canvas.width;
        const height = this.ctx.canvas.height;
        const centerX = width / 2;

        if (game.hero && !game.hero.isDead) {
            const hpPct = game.hero.hp / game.hero.maxHp;
            if (hpPct <= 0.3) {
                const pulse = (Math.sin(performance.now() / 200) + 1) / 2;
                const opacity = 0.1 + pulse * 0.4;

                const grad = ctx.createRadialGradient(
                    centerX, height / 2, 0,
                    centerX, height / 2, Math.sqrt(centerX * centerX + (height / 2) * (height / 2))
                );
                grad.addColorStop(0.6, 'rgba(255, 0, 0, 0)');
                grad.addColorStop(1, `rgba(255, 0, 0, ${opacity})`);

                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, width, height);

                ctx.strokeStyle = `rgba(255, 0, 0, ${opacity})`;
                ctx.lineWidth = 10;
                ctx.strokeRect(0, 0, width, height);
            }
        }

        // 0. Top Left HUD Plate
        ctx.save();
        ctx.textAlign = 'left';

        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.beginPath();
        ctx.roundRect(10, 10, 220, 80, 10);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 123, 0, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.font = 'bold 18px monospace';
        ctx.fillStyle = '#FFF';
        ctx.fillText(`SCORE: ${game.score.toLocaleString()}`, 25, 41);

        ctx.fillStyle = '#FFD700';
        ctx.fillText(`COINS: ${game.coinCount}`, 25, 70);
        ctx.restore();

        // Pause Button (HUD) - Under Coins
        if (!game.hero.isDead && !waveMgr.isReady && !waveMgr.isIndexOpen && !waveMgr.isShopOpen) {
            this.drawButton(110, 120, 100, 35, "PAUSE", "#FFFFFF");
        }

        ctx.textAlign = 'center';
        ctx.font = 'bold 30px monospace';

        if (waveMgr.isWaveActive) {
            ctx.fillStyle = '#FFFFFF';
            if (waveMgr.stateTimer <= 5) ctx.fillStyle = '#FF0000';
            ctx.fillText(waveMgr.stateTimer.toFixed(1), centerX, 40);

            ctx.font = '20px sans-serif';
            ctx.fillStyle = '#AAAAAA';
            ctx.fillText(`WAVE ${waveMgr.currentWave}`, centerX, 70);
        }
        else if (waveMgr.isWaveComplete) {
            ctx.fillStyle = '#2c3e50';
            ctx.font = 'bold 70px monospace';
            ctx.fillText("WAVE DEFEATED", centerX, height / 2);
            ctx.font = 'bold 24px monospace';
            ctx.fillText("COLLECTING REMNANTS...", centerX, height / 2 + 60);
        }
        else if (waveMgr.isCountdown) {
            ctx.fillStyle = '#FF4E00';
            ctx.font = 'bold 100px monospace';
            ctx.fillText(Math.ceil(waveMgr.stateTimer).toString(), centerX, height / 2);

            ctx.font = 'bold 30px monospace';
            ctx.fillStyle = '#FFF';
            ctx.fillText("INITIATING WAVE INBOUND", centerX, height / 2 - 100);
        }
        else if (waveMgr.isReady) {
            ctx.fillStyle = '#FF0000';
            ctx.font = 'bold 80px sans-serif';
            ctx.fillText("HOT ZONE", centerX, height / 2 - 120);

            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 24px sans-serif';
            ctx.fillText("MADE BY ANTON LI USING AI", centerX, height / 2 - 80);

            const startBtnY = height / 2;
            this.drawButton(centerX, startBtnY, 280, 55, "START GAME", "#00FF00");
            this.drawButton(centerX, startBtnY + 70, 280, 55, "ENEMY INDEX", "#FFD84D");

            const input = InputManager.getInstance();
            ctx.font = '20px sans-serif';
            ctx.fillStyle = '#AAA';
            if (input.isTouchDevice) {
                ctx.fillText("Touch Left Side to Move, Right Side to Aim", centerX, startBtnY + 140);
                ctx.fillText("Tap Buttons for Actions", centerX, startBtnY + 170);
            } else {
                ctx.fillText("WASD/Arrows to Move, Mouse to Aim", centerX, startBtnY + 140);
            }
        }
        else if (waveMgr.isIndexOpen) {
            // Handled in main render loop for better layering if needed
            // but we can black out here too
            ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
            ctx.fillRect(0, 0, width, height);
        }

        if (waveMgr.isIndexOpen) {
            // Handled in main render loop for better layering if needed
            // but we can black out here too
            ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
            ctx.fillRect(0, 0, width, height);
        }
        
        if (waveMgr.isShopOpen) {
            // Darken background more for focus
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(0, 0, width, height);

            // 1. Shop Header
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            ctx.fillStyle = '#FF7B00';
            ctx.font = 'bold 36px monospace';
            ctx.fillText("SHOP", centerX, 50);

            // Show Stats in Shop
            ctx.font = 'bold 18px monospace';
            ctx.fillStyle = '#2ECC71';
            ctx.fillText(`HEALTH: ${Math.ceil(game.hero.hp)}/${game.hero.maxHp}`, centerX - 180, 85);
            ctx.fillStyle = '#5DADE2';
            ctx.fillText(`STAMINA: ${Math.ceil(game.hero.stamina)}/${game.hero.maxStamina}`, centerX + 180, 85);

            this.drawButton(centerX, 110, 240, 45, "DEPLOY TO NEXT WAVE", "#FF4E00");

            // 2. Upgrade Cards
            const cardWidth = 260;
            const cardHeight = 360;
            const spacing = 40;
            const totalWidth = (cardWidth * 3) + (spacing * 2);
            const startX = centerX - totalWidth / 2;
            const cardY = 180;

            for (let i = 0; i < 3; i++) {
                const opt = game.currentShopOptions[i];
                if (!opt) continue;

                const x = startX + i * (cardWidth + spacing);
                const y = cardY;

                const input = InputManager.getInstance();
                const mx = input.mouse.x;
                const my = input.mouse.y;
                const isHovered = mx >= x && mx <= x + cardWidth && my >= y && my <= y + cardHeight;

                // Card lift effect
                const hoverOffset = isHovered ? -10 : 0;

                ctx.save();
                ctx.translate(0, hoverOffset);

                // Card base shadow removed
                // ctx.shadowBlur = isHovered ? 30 : 15;
                // ctx.shadowColor = isHovered ? 'rgba(255, 78, 0, 0.4)' : 'rgba(0, 0, 0, 0.5)';

                // Card Base (Glassmorphism)
                const cardGrad = ctx.createLinearGradient(x, y, x, y + cardHeight);
                cardGrad.addColorStop(0, 'rgba(40, 40, 45, 0.95)');
                cardGrad.addColorStop(1, 'rgba(20, 20, 25, 0.98)');

                ctx.fillStyle = cardGrad;
                ctx.beginPath();
                ctx.roundRect(x, y, cardWidth, cardHeight, 15);
                ctx.fill();

                // Card Border
                ctx.strokeStyle = isHovered ? '#FF7B00' : 'rgba(255, 255, 255, 0.1)';
                ctx.lineWidth = isHovered ? 3 : 1;
                ctx.stroke();

                // 3. Upgrade Icon (Simplified Vector)
                ctx.save();
                ctx.translate(x + cardWidth / 2, y + 80);
                this.drawUpgradeIcon(ctx, opt.type, isHovered);
                ctx.restore();

                // 4. Content
                ctx.textAlign = 'center';



                // Name
                ctx.fillStyle = '#FFF';
                ctx.font = 'bold 24px sans-serif';
                ctx.fillText(opt.name.toUpperCase(), x + cardWidth / 2, y + 170);

                // Description
                ctx.font = '16px sans-serif';
                ctx.fillStyle = '#BBB';
                const descLines = opt.description.split('\n');
                descLines.forEach((line, li) => {
                    ctx.fillText(line, x + cardWidth / 2, y + 205 + li * 20);
                });

                // Cost Section
                const afford = game.coinCount >= opt.cost;
                const costY = y + cardHeight - 50;

                // Cost bar
                ctx.fillStyle = afford ? 'rgba(0, 255, 100, 0.1)' : 'rgba(255, 0, 0, 0.1)';
                ctx.fillRect(x + 20, costY - 25, cardWidth - 40, 50);

                ctx.font = 'bold 22px monospace';
                ctx.fillStyle = afford ? '#00FF88' : '#FF4444';
                ctx.fillText(`COINS: ${opt.cost}`, x + cardWidth / 2, costY + 8);

                ctx.restore();
            }
        }

        if (game.hero) {
            const plateWidth = 240;
            const plateHeight = 110;
            const centerX = width / 2;
            const plateX = centerX - plateWidth / 2;
            const plateY = height - plateHeight - 15;

            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.beginPath();
            ctx.roundRect(plateX, plateY, plateWidth, plateHeight, 10);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 1;
            ctx.stroke();

            const barCenterX = plateX + plateWidth / 2;

            // --- AMMO ---
            const ammoY = plateY + 25;
            const maxAmmo = game.hero.maxAmmo;
            const currentAmmo = game.hero.ammo;
            const totalWidth = 200;
            const totalHeight = 10;
            const startX = barCenterX - totalWidth / 2;

            const gap = 4;
            const blockWidth = (totalWidth - (gap * (maxAmmo - 1))) / maxAmmo;

            ctx.fillStyle = '#FFFF00';
            ctx.font = 'bold 12px monospace';
            ctx.textAlign = 'center';
            ctx.fillText("AMMO", barCenterX, ammoY - 12);

            for (let i = 0; i < maxAmmo; i++) {
                const x = startX + i * (blockWidth + gap);

                if (game.hero.reloadTimer > 0) {
                    const flash = Math.sin(performance.now() / 100) * 0.5 + 0.5;
                    ctx.fillStyle = `rgba(255, 255, 0, ${flash})`;
                } else {
                    if (i < currentAmmo) {
                        ctx.fillStyle = '#FFFF00';
                    } else {
                        ctx.fillStyle = '#333';
                    }
                }

                ctx.fillRect(x, ammoY, blockWidth, totalHeight);
                ctx.strokeStyle = '#444';
                ctx.lineWidth = 1;
                ctx.strokeRect(x, ammoY, blockWidth, totalHeight);
            }

            // --- STAMINA (Segmented for 5 dashes) ---
            const stamY = plateY + 55;
            const stamina = game.hero.stamina;
            const maxStamina = game.hero.maxStamina;
            ctx.fillStyle = '#5DADE2';
            ctx.fillText("STAMINA", barCenterX, stamY - 8);

            const stamBlocks = 5;
            const stamBlockGap = 4;
            const stamBlockWidth = (totalWidth - (stamBlockGap * (stamBlocks - 1))) / stamBlocks;
            const stamPerBlock = maxStamina / stamBlocks;

            for (let i = 0; i < stamBlocks; i++) {
                const x = startX + i * (stamBlockWidth + stamBlockGap);
                ctx.fillStyle = '#333';
                ctx.fillRect(x, stamY, stamBlockWidth, 8);

                const blockFill = Math.max(0, Math.min(1, (stamina - i * stamPerBlock) / stamPerBlock));
                if (blockFill > 0) {
                    ctx.fillStyle = '#2E86C1';
                    ctx.fillRect(x, stamY, stamBlockWidth * blockFill, 8);
                }
                ctx.strokeStyle = '#FFF';
                ctx.lineWidth = 1;
                ctx.strokeRect(x, stamY, stamBlockWidth, 8);
            }

            // --- HEALTH ---
            const healthY = plateY + 85;
            const hpPct = game.hero.hp / game.hero.maxHp;
            ctx.fillStyle = '#2ECC71';
            ctx.font = 'bold 14px monospace';
            ctx.fillText("HEALTH", barCenterX, healthY - 10);
            ctx.fillStyle = '#555';
            ctx.fillRect(barCenterX - 100, healthY, 200, 15);
            ctx.fillStyle = hpPct > 0.3 ? '#27AE60' : '#FF0000';
            ctx.fillRect(barCenterX - 100, healthY, 200 * hpPct, 15);
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#FFF';
            ctx.strokeRect(barCenterX - 100, healthY, 200, 15);
        }

        if (game.hero.isDead) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, 0, width, height);

            ctx.fillStyle = '#FF0000';
            ctx.font = 'bold 60px sans-serif';
            ctx.fillText("YOU DIED", centerX, height / 2);

            this.drawButton(centerX, height / 2 + 80, 200, 60, "RESTART", "#FFFFFF");
        }

        ctx.restore();
    }

    private drawEnemyBars(enemies: any[]) {
        const ctx = this.ctx;
        ctx.save();
        ctx.font = '0.5px sans-serif';
        ctx.textAlign = 'center';

        for (const enemy of enemies) {
            if ((enemy as any).isFadingOut) continue;
            ctx.save();
            ctx.translate(enemy.x, enemy.y);
            const w = 1.0;
            const h = 0.15;
            const yOffset = -0.8;
            ctx.fillStyle = '#333';
            ctx.fillRect(-w / 2, yOffset, w, h);

            if (enemy.shield > 0) {
                ctx.fillStyle = '#00FFFF';
                ctx.fillRect(-w / 2, yOffset, w * (enemy.shield / enemy.maxShield), h);
            } else {
                ctx.fillStyle = '#FF0000';
                ctx.fillRect(-w / 2, yOffset, w * (enemy.hp / enemy.maxHp), h);
            }
            ctx.strokeStyle = '#FFF';
            ctx.lineWidth = 0.02;
            ctx.strokeRect(-w / 2, yOffset, w, h);
            ctx.restore();
        }
        ctx.restore();
    }

    public triggerShake(duration: number, intensity: number) {
        this.shakeTimer = duration;
        this.shakeIntensity = intensity;
    }

    private drawDeathClarity(game: Game) {
        const kb = game.hero.killingBlow;
        if (!kb) return;

        const ctx = this.ctx;
        ctx.save();
        ctx.resetTransform();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(0, 0, this.width, this.height);
        ctx.restore();

        ctx.save();
        ctx.translate(this.width / 2, this.height / 2);
        ctx.scale(this.pixelsPerUnit, this.pixelsPerUnit);

        ctx.beginPath();
        ctx.arc(kb.explosionX, kb.explosionY, kb.radius, 0, Math.PI * 2);
        ctx.strokeStyle = '#FF0000';
        ctx.lineWidth = 0.15;
        ctx.stroke();

        if (kb.enemyInfo) {
            ctx.beginPath();
            ctx.moveTo(kb.explosionX, kb.explosionY);
            ctx.lineTo(kb.enemyInfo.x, kb.enemyInfo.y);
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
            ctx.lineWidth = 0.05;
            ctx.stroke();

            ctx.save();
            ctx.translate(kb.enemyInfo.x, kb.enemyInfo.y);
            ctx.rotate(kb.enemyInfo.angle);
            ctx.fillStyle = 'rgba(255, 216, 77, 0.4)';
            ctx.beginPath();
            const h = 1.4;
            const b = 1.2;
            ctx.moveTo(h / 2, 0);
            ctx.lineTo(-h / 2, b / 2);
            ctx.lineTo(-h / 2, -b / 2);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        } else if (kb.isDetached) {
            const pulse = 1.0 + Math.sin(performance.now() / 100) * 0.15;
            ctx.save();
            ctx.translate(kb.explosionX, kb.explosionY);
            ctx.scale(pulse, pulse);
            ctx.fillStyle = '#FF3B3B';
            ctx.beginPath();
            ctx.arc(0, 0, 0.35, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        ctx.restore();
    }

    private drawTelegraphs(game: Game) {
        const ctx = this.ctx;
        const telegraphs = game.waveManager.activeTelegraphs;

        for (const t of telegraphs) {
            ctx.save();
            ctx.translate(t.x, t.y);
            const pulse = Math.sin(Date.now() * 0.015);
            const scale = 0.7 + pulse * 0.2;
            ctx.scale(scale, scale);
            ctx.strokeStyle = '#FF0000';
            ctx.lineWidth = 0.4;
            const size = 1.5;
            ctx.beginPath();
            ctx.moveTo(-size, -size); ctx.lineTo(size, size);
            ctx.moveTo(size, -size); ctx.lineTo(-size, size);
            ctx.stroke();
            ctx.globalAlpha = 0.3 + pulse * 0.1;
            ctx.fillStyle = '#FF0000';
            ctx.beginPath();
            ctx.arc(0, 0, size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    private drawButton(x: number, y: number, w: number, h: number, text: string, color: string) {
        const ctx = this.ctx;
        ctx.save();
        
        const input = InputManager.getInstance();
        const isHover = input.mouse.x >= x - w / 2 && input.mouse.x <= x + w / 2 &&
            input.mouse.y >= y - h / 2 && input.mouse.y <= y + h / 2;

        ctx.translate(x - w / 2, y - h / 2);

        // Hover lift and glow
        if (isHover) {
            ctx.shadowBlur = 20;
            ctx.shadowColor = color;
            ctx.translate(0, -2);
        }

        // 1. Button Background (Glassmorphism + Gradient)
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        if (isHover) {
            grad.addColorStop(0, `rgba(${this.hexToRgb(color)}, 0.4)`);
            grad.addColorStop(1, `rgba(${this.hexToRgb(color)}, 0.1)`);
        } else {
            grad.addColorStop(0, 'rgba(30, 30, 30, 0.8)');
            grad.addColorStop(1, 'rgba(10, 10, 10, 0.9)');
        }

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(0, 0, w, h, 12);
        ctx.fill();

        // 2. Neon Border
        ctx.strokeStyle = isHover ? color : `rgba(${this.hexToRgb(color)}, 0.4)`;
        ctx.lineWidth = isHover ? 3 : 2;
        ctx.stroke();

        // 3. Inner Shine (Top edge)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(2, 1, w - 4, h / 2, 10);
        ctx.stroke();

        // 4. Label
        ctx.fillStyle = isHover ? '#FFF' : '#AAA';
        ctx.shadowBlur = isHover ? 10 : 0;
        ctx.shadowColor = '#FFF';
        ctx.font = 'bold 18px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, w / 2, h / 2);

        ctx.restore();
    }

    private drawMobileControls() {
        const input = InputManager.getInstance();
        if (!input.isTouchDevice) return;

        const ctx = this.ctx;
        ctx.save();
        ctx.resetTransform();

        // Left Stick
        if (input.stickLeft.active) {
            const { originX, originY, x, y } = input.stickLeft;
            ctx.beginPath();
            ctx.arc(originX, originY, 40, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 2;
            ctx.stroke();

            const stickX = originX + x * 50;
            const stickY = originY + y * 50;
            ctx.beginPath();
            ctx.arc(stickX, stickY, 20, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.fill();
        }

        // Right Stick
        if (input.stickRight.active) {
            const { originX, originY, x, y } = input.stickRight;
            ctx.beginPath();
            ctx.arc(originX, originY, 40, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 50, 50, 0.1)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 50, 50, 0.3)';
            ctx.lineWidth = 2;
            ctx.stroke();

            const stickX = originX + x * 50;
            const stickY = originY + y * 50;
            ctx.beginPath();
            ctx.arc(stickX, stickY, 20, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 50, 50, 0.5)';
            ctx.fill();
        }

        // Action Buttons
        const w = this.width;
        const h = this.height;
        this.drawCircleButton(w - 80, h - 80, 45, "DASH", "#FFF", input.buttons.dash);
        this.drawCircleButton(w - 180, h - 80, 40, "PUSH", "#00FFFF", input.buttons.pushBack);

        ctx.restore();
    }

    private drawCircleButton(x: number, y: number, r: number, label: string, color: string, active: boolean) {
        const ctx = this.ctx;
        ctx.save();

        if (active) {
            ctx.shadowBlur = 25;
            ctx.shadowColor = color;
            ctx.translate(0, -3);
        }

        // Outer Ring
        ctx.strokeStyle = active ? color : `rgba(${this.hexToRgb(color)}, 0.3)`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.stroke();

        // Inner Fill
        const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
        if (active) {
            grad.addColorStop(0, `rgba(${this.hexToRgb(color)}, 0.6)`);
            grad.addColorStop(1, `rgba(${this.hexToRgb(color)}, 0.2)`);
        } else {
            grad.addColorStop(0, 'rgba(30, 30, 30, 0.7)');
            grad.addColorStop(1, 'rgba(10, 10, 10, 0.8)');
        }

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, r - 2, 0, Math.PI * 2);
        ctx.fill();

        // Text
        ctx.fillStyle = active ? '#FFF' : '#777';
        ctx.shadowBlur = active ? 10 : 0;
        ctx.shadowColor = '#FFF';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, x, y);

        ctx.restore();
    }

    private drawPauseOverlay() {
        const ctx = this.ctx;
        ctx.save();
        ctx.resetTransform();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 80px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText("PAUSED", this.width / 2, this.height / 2 - 120);

        this.drawButton(this.width / 2, this.height / 2 - 20, 240, 50, "RESUME", "#00FF00");
        this.drawButton(this.width / 2, this.height / 2 + 50, 240, 50, "ENEMY INDEX", "#FFD84D");
        this.drawButton(this.width / 2, this.height / 2 + 120, 240, 50, "STATS", "#5DADE2");

        ctx.font = '16px sans-serif';
        ctx.fillStyle = '#AAA';
        ctx.fillText("Press P or ESC to Resume", this.width / 2, this.height / 2 + 190);

        ctx.restore();
    }

    private drawEnemyIndex() {
        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;

        ctx.save();
        ctx.resetTransform();
        ctx.fillStyle = 'rgba(10, 10, 18, 0.95)';
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = '#FFD84D';
        ctx.font = 'bold 40px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText("ENEMY ENCYCLOPEDIA", w / 2, 60);

        const enemies = [
            { name: "TRIANGLE (Standard)", color: "#FFD84D", desc: "Basic unit. Slow and predictable.", shape: "triangle" },
            { name: "DIAMOND (Fast)", color: "#FF3333", desc: "Speed demon. Charging speed is deadly.", shape: "diamond" },
            { name: "HEXAGON (Tank)", color: "#2ECC71", desc: "Heavily shielded. Takes massive damage.", shape: "hexagon" },
            { name: "SQUARE (Blinker)", color: "#A020F0", desc: "Periodically teleports closer to hero.", shape: "square" },
            { name: "OCTAGON (Splitter)", color: "#FF69B4", desc: "Splits into 3 minis upon death.", shape: "octagon" },
            { name: "CIRCLE (Mini)", color: "#FFA500", desc: "Spawned from Splitters. Fast and armed.", shape: "circle" }
        ];

        const startY = 140;
        const col1 = w / 4;
        const spacingY = 90;

        ctx.font = '20px sans-serif';
        ctx.textAlign = 'left';

        enemies.forEach((en, i) => {
            const y = startY + i * spacingY;

            // Illustration
            ctx.save();
            ctx.translate(col1 - 60, y);
            ctx.scale(20, 20); // Scale up for "illustration"

            ctx.fillStyle = en.color;
            ctx.beginPath();
            if (en.shape === "triangle") {
                ctx.moveTo(0.7, 0); ctx.lineTo(-0.7, 0.5); ctx.lineTo(-0.7, -0.5);
            } else if (en.shape === "diamond") {
                ctx.moveTo(0.9, 0); ctx.lineTo(0, 0.3); ctx.lineTo(-0.9, 0); ctx.lineTo(0, -0.3);
            } else if (en.shape === "hexagon") {
                for (let j = 0; j < 6; j++) {
                    const a = (Math.PI / 3) * j;
                    ctx.lineTo(Math.cos(a) * 0.6, Math.sin(a) * 0.6);
                }
            } else if (en.shape === "square") {
                ctx.rect(-0.5, -0.5, 1, 1);
            } else if (en.shape === "octagon") {
                for (let j = 0; j < 8; j++) {
                    const a = (Math.PI / 4) * j;
                    ctx.lineTo(Math.cos(a) * 0.6, Math.sin(a) * 0.6);
                }
            } else if (en.shape === "circle") {
                ctx.arc(0, 0, 0.4, 0, Math.PI * 2);
            }
            ctx.closePath();
            ctx.fill();
            ctx.restore();

            // Text
            ctx.fillStyle = en.color;
            ctx.font = 'bold 22px sans-serif';
            ctx.fillText(en.name, col1, y - 5);

            ctx.fillStyle = '#AAA';
            ctx.font = '16px sans-serif';
            ctx.fillText(en.desc, col1, y + 20);
        });

        // Close Button
        this.drawButton(w - 100, h - 50, 160, 50, "CLOSE", "#FF5555");

        ctx.restore();
    }

    private drawStatsOverlay(game: Game) {
        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;
        const config = ConfigManager.getConfig();

        ctx.save();
        ctx.resetTransform();
        ctx.fillStyle = 'rgba(10, 18, 14, 0.95)';
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = '#5DADE2';
        ctx.font = 'bold 40px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText("COMBAT STATISTICS", w / 2, 80);

        const stats = [
            { label: "MAX HEALTH", value: game.hero.maxHp.toFixed(0), color: "#2ECC71" },
            { label: "HEALTH REGEN", value: `${game.hero.hpRegen.toFixed(1)}/sec`, color: "#27AE60" },
            { label: "MAX STAMINA", value: game.hero.maxStamina.toFixed(0), color: "#5DADE2" },
            { label: "STAMINA REGEN", value: `${config.hero.stamina.regen_rate}/sec`, color: "#2E86C1" },
            { label: "BLASTER DAMAGE", value: config.blaster.bullet_damage.toString(), color: "#FF4E00" },
            { label: "FIRE RATE", value: `${(1 / config.blaster.fire_rate).toFixed(1)} shots/sec`, color: "#FF7B00" },
            { label: "ARMOR", value: `${(config.hero.armor.damage_reduction_percent * 100).toFixed(0)}% Reduction`, color: "#BDC3C7" }
        ];

        const startY = 180;
        const spacingY = 50;

        stats.forEach((stat, i) => {
            const y = startY + i * spacingY;
            ctx.textAlign = 'right';
            ctx.fillStyle = '#AAA';
            ctx.font = '24px monospace';
            ctx.fillText(stat.label + ":", w / 2 - 20, y);

            ctx.textAlign = 'left';
            ctx.fillStyle = stat.color;
            ctx.font = 'bold 24px monospace';
            ctx.fillText(stat.value, w / 2 + 20, y);
        });

        this.drawButton(w / 2, h - 80, 200, 60, "BACK", "#5DADE2");
        ctx.restore();
    }

    private drawUpgradeIcon(ctx: CanvasRenderingContext2D, type: string, isHovered: boolean) {
        ctx.save();
        const pulse = (Math.sin(Date.now() * 0.008) + 1) / 2;
        const scale = isHovered ? 1.0 + pulse * 0.1 : 1.0;
        ctx.scale(scale, scale);

        ctx.strokeStyle = isHovered ? '#FF7B00' : '#FFF';
        ctx.lineWidth = 3;
        // ctx.shadowBlur = isHovered ? 15 + pulse * 10 : 0;
        // ctx.shadowColor = '#FF7B00';


        switch (type) {
            case 'damage':
                // Crosshair / Burst
                ctx.beginPath();
                ctx.arc(0, 0, 20, 0, Math.PI * 2);
                ctx.moveTo(-30, 0); ctx.lineTo(30, 0);
                ctx.moveTo(0, -30); ctx.lineTo(0, 30);
                ctx.stroke();
                break;
            case 'firerate':
                // Bullets / Lightning
                ctx.beginPath();
                ctx.moveTo(-15, -20); ctx.lineTo(15, 0); ctx.lineTo(-15, 20);
                ctx.lineTo(0, 0); ctx.closePath();
                ctx.stroke();
                break;
            case 'multishot':
                // Shards / Multiple lines
                ctx.beginPath();
                ctx.moveTo(0, 0); ctx.lineTo(-20, -25);
                ctx.moveTo(0, 0); ctx.lineTo(0, -30);
                ctx.moveTo(0, 0); ctx.lineTo(20, -25);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(0, 0, 5, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 'health':
                // Plus sign
                ctx.beginPath();
                ctx.moveTo(-20, 0); ctx.lineTo(20, 0);
                ctx.moveTo(0, -20); ctx.lineTo(0, 20);
                ctx.stroke();
                break;
            case 'stamina':
                // Bolt / Wing
                ctx.beginPath();
                ctx.moveTo(10, -25); ctx.lineTo(-15, 5); ctx.lineTo(5, 5); ctx.lineTo(-10, 25);
                ctx.stroke();
                break;
            case 'ammo':
                // Magazine / Box
                ctx.beginPath();
                ctx.rect(-15, -20, 30, 40);
                // Bullet lines
                ctx.moveTo(-8, -10); ctx.lineTo(8, -10);
                ctx.moveTo(-8, 0); ctx.lineTo(8, 0);
                ctx.moveTo(-8, 10); ctx.lineTo(8, 10);
                ctx.stroke();
                break;
            case 'regen':
                // Heartbeat / Wave
                ctx.beginPath();
                ctx.moveTo(-25, 0);
                ctx.lineTo(-10, 0);
                ctx.lineTo(-5, -20);
                ctx.lineTo(5, 20);
                ctx.lineTo(10, 0);
                ctx.lineTo(25, 0);
                ctx.stroke();
                break;
        }
        ctx.restore();
    }

    private hexToRgb(hex: string): string {
        // Handle common hex codes used in UI
        const colors: Record<string, string> = {
            "#FFF": "255, 255, 255",
            "#FFFFFF": "255, 255, 255",
            "#FF4E00": "255, 78, 0",
            "#00FF00": "0, 255, 0",
            "#FFD84D": "255, 216, 77",
            "#5DADE2": "93, 173, 226",
            "#00FFFF": "0, 255, 255",
            "#FF3B3B": "255, 59, 59",
            "#2ECC71": "46, 204, 113",
            "#FF7B00": "255, 123, 0"
        };
        return colors[hex.toUpperCase()] || "255, 255, 255";
    }
}
