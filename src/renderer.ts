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

    constructor(canvas: HTMLCanvasElement) {
        this.ctx = canvas.getContext('2d')!;
        this.width = canvas.width = window.innerWidth;
        this.height = canvas.height = window.innerHeight;

        window.addEventListener('resize', () => {
            this.width = canvas.width = window.innerWidth;
            this.height = canvas.height = window.innerHeight;
        });
    }

    public render(game: Game) {
        const entities = game.getEntities();

        // Update Shake
        const dt = 1 / 60;
        if (this.shakeTimer > 0) {
            this.shakeTimer -= dt;
        }

        // Clear screen (Deep Space Blue)
        this.ctx.fillStyle = '#0a0a12';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Center camera on Hero if exists
        const cameraX = entities.hero ? entities.hero.x : 0;
        const cameraY = entities.hero ? entities.hero.y : 0;

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

        // Draw Infinite Grid
        this.drawInfiniteGrid(cameraX, cameraY);


        // Draw Obstacles
        if (game.obstacles) {
            for (const obstacle of game.obstacles) {
                obstacle.draw(this.ctx);
            }
        }

        // Draw Entities
        for (const enemy of entities.enemies) {
            enemy.draw(this.ctx);
        }

        for (const bomb of entities.bombs) {
            bomb.draw(this.ctx);
        }

        for (const bullet of entities.bullets) {
            bullet.draw(this.ctx);
        }

        if (entities.coins) {
            for (const coin of entities.coins) {
                coin.draw(this.ctx);
            }
        }

        if (entities.hero) {
            entities.hero.draw(this.ctx);
        }

        this.drawTelegraphs(game);
        this.drawEnemyBars(entities.enemies);

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

        this.drawScanlines();
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
        ctx.strokeStyle = '#1a1a2e'; // Faint Neon Blue
        ctx.lineWidth = 0.05;
        ctx.shadowBlur = 5;
        ctx.shadowColor = '#0000FF'; // Blue Glow

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

        const grad = ctx.createRadialGradient(
            this.width / 2, this.height / 2, this.height * 0.4,
            this.width / 2, this.height / 2, this.height * 0.9
        );
        grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0.6)');

        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.width, this.height);
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

        ctx.font = 'bold 24px monospace';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#FFF';
        ctx.fillText(`SCORE: ${game.score}`, 20, 40);

        ctx.fillStyle = '#FFD700';
        ctx.fillText(`COINS: ${game.coinCount}`, 20, 70);

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
            ctx.fillStyle = '#4DFFF3';
            ctx.font = 'bold 60px monospace';
            ctx.shadowColor = '#4DFFF3';
            ctx.shadowBlur = 20;
            ctx.fillText("WAVE COMPLETE", centerX, height / 2);
            ctx.shadowBlur = 0;
        }
        else if (waveMgr.isCountdown) {
            ctx.fillStyle = '#FFFF00';
            ctx.font = 'bold 60px monospace';
            ctx.fillText(waveMgr.stateTimer.toFixed(1), centerX, 100);

            ctx.font = '30px sans-serif';
            ctx.fillStyle = '#FFF';
            ctx.fillText("GET READY!", centerX, 40);
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

        // Pause Button (HUD)
        if (!game.hero.isDead && !waveMgr.isReady && !waveMgr.isIndexOpen) {
            this.drawButton(width - 60, 40, 80, 40, "PAUSE", "#FFFFFF");
        }
        else if (waveMgr.isShopOpen) {
            ctx.fillStyle = '#FFFF00';
            ctx.fillText("SHOP OPEN", centerX, 40);

            this.drawButton(centerX, 85, 220, 45, "NEXT WAVE", "#FFFF00");

            const startY = 150;
            const cardWidth = 200;
            const cardHeight = 120;
            const spacing = 20;
            const totalWidth = (cardWidth * 3) + (spacing * 2);
            const startX = centerX - totalWidth / 2;

            for (let i = 0; i < 3; i++) {
                const opt = game.currentShopOptions[i];
                if (!opt) continue;

                const x = startX + i * (cardWidth + spacing);
                const y = startY;

                const input = InputManager.getInstance();
                const mx = input.mouse.x;
                const my = input.mouse.y;
                const isHovered = mx >= x && mx <= x + cardWidth && my >= y && my <= y + cardHeight;

                ctx.fillStyle = isHovered ? 'rgba(50, 50, 50, 0.95)' : 'rgba(30, 30, 30, 0.9)';
                ctx.strokeStyle = isHovered ? '#FFFFFF' : '#FFFF00';
                ctx.lineWidth = isHovered ? 4 : 2;
                ctx.fillRect(x, y, cardWidth, cardHeight);
                ctx.strokeRect(x, y, cardWidth, cardHeight);

                ctx.fillStyle = '#FFFF00';
                ctx.font = 'bold 18px monospace';
                ctx.fillText(`[${i + 1}]`, x + cardWidth / 2, y + 25);

                ctx.fillStyle = '#FFF';
                ctx.font = 'bold 16px sans-serif';
                ctx.fillText(opt.name, x + cardWidth / 2, y + 50);

                ctx.font = '14px sans-serif';
                ctx.fillStyle = '#AAA';
                ctx.fillText(opt.description, x + cardWidth / 2, y + 75);

                ctx.font = 'bold 16px monospace';
                ctx.fillStyle = game.coinCount >= opt.cost ? '#00FF00' : '#FF0000';
                ctx.fillText(`$${opt.cost} `, x + cardWidth / 2, y + 105);
            }
        }

        if (game.hero) {
            const plateWidth = 240;
            const plateHeight = 110;
            const plateX = centerX - plateWidth / 2;
            const plateY = height - plateHeight - 15;

            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.beginPath();
            ctx.roundRect(plateX, plateY, plateWidth, plateHeight, 10);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 1;
            ctx.stroke();

            const ammoY = plateY + 25;
            const maxAmmo = game.hero.maxAmmo;
            const currentAmmo = game.hero.ammo;
            const totalWidth = 200;
            const totalHeight = 10;
            const startX = centerX - totalWidth / 2;

            // Calculate block size
            // We want: (width * count) + (gap * (count - 1)) = totalWidth
            // width * count = totalWidth - gap * (count - 1)
            // width = (totalWidth - gap * (count - 1)) / count
            const gap = 4;
            const blockWidth = (totalWidth - (gap * (maxAmmo - 1))) / maxAmmo;

            ctx.fillStyle = '#FFFF00';
            ctx.font = 'bold 12px monospace';
            ctx.fillText("AMMO", centerX, ammoY - 12);

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
                // Subtle border for each block
                ctx.strokeStyle = '#444';
                ctx.lineWidth = 1;
                ctx.strokeRect(x, ammoY, blockWidth, totalHeight);
            }

            const stamY = plateY + 55;
            const stamPct = game.hero.stamina / game.hero.maxStamina;
            ctx.fillStyle = '#5DADE2';
            ctx.fillText("STAMINA", centerX, stamY - 8);
            ctx.fillStyle = '#333';
            ctx.fillRect(centerX - 100, stamY, 200, 8);
            ctx.fillStyle = '#2E86C1';
            ctx.fillRect(centerX - 100, stamY, 200 * stamPct, 8);
            ctx.strokeStyle = '#FFF';
            ctx.strokeRect(centerX - 100, stamY, 200, 8);

            const healthY = plateY + 85;
            const hpPct = game.hero.hp / game.hero.maxHp;
            ctx.fillStyle = '#2ECC71';
            ctx.font = 'bold 14px monospace';
            ctx.fillText("HEALTH", centerX, healthY - 10);
            ctx.fillStyle = '#555';
            ctx.fillRect(centerX - 100, healthY, 200, 15);
            ctx.fillStyle = hpPct > 0.3 ? '#27AE60' : '#FF0000';
            ctx.fillRect(centerX - 100, healthY, 200 * hpPct, 15);
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#FFF';
            ctx.strokeRect(centerX - 100, healthY, 200, 15);
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
        ctx.translate(x - w / 2, y - h / 2);
        const input = InputManager.getInstance();
        const isHover = input.mouse.x >= x - w / 2 && input.mouse.x <= x + w / 2 &&
            input.mouse.y >= y - h / 2 && input.mouse.y <= y + h / 2;

        ctx.fillStyle = isHover ? color : 'rgba(0, 0, 0, 0.5)';
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.fillRect(0, 0, w, h);
        ctx.strokeRect(0, 0, w, h);
        ctx.fillStyle = isHover ? '#000' : color;
        ctx.font = 'bold 24px sans-serif';
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
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = active ? `rgba(${this.hexToRgb(color)}, 0.5)` : 'rgba(255, 255, 255, 0.15)';
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = color;
        ctx.font = 'bold 14px sans-serif';
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
        ctx.fillText("PAUSED", this.width / 2, this.height / 2 - 40);

        this.drawButton(this.width / 2, this.height / 2 + 60, 200, 60, "RESUME", "#00FF00");

        ctx.font = '16px sans-serif';
        ctx.fillStyle = '#AAA';
        ctx.fillText("Press P or ESC to Resume", this.width / 2, this.height / 2 + 120);

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

        ctx.fillStyle = '#FFF';
        ctx.textAlign = 'center';
        ctx.font = '20px sans-serif';
        ctx.fillText("Press Space or Click to Return", w / 2, h - 40);

        ctx.restore();
    }

    private hexToRgb(hex: string): string {
        // Simple hex to rgb for rgba conversion
        if (hex === "#FFF") return "255, 255, 255";
        if (hex === "#FFFF00") return "255, 255, 0";
        if (hex === "#00FFFF") return "0, 255, 255";
        return "255, 255, 255";
    }
}
