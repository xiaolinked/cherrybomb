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
        this.drawEnemyBars(game);

        this.ctx.restore(); // Back to screen space

        // --- Atmospheric Dimming (Conditional) ---
        // Only dim when in intermissions (Ready/Shop)
        if (game.waveManager.isShopOpen || game.waveManager.isReady) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
            this.ctx.fillRect(0, 0, this.width, this.height);
        }

        this.drawUI(game);

        // Draw Mobile Controls
        this.drawMobileControls();

        // Draw Virtual Joystick
        this.drawJoystick();

        if (game.deathHighlightTimer > 0) {
            this.drawDeathClarity(game);
        }

        this.drawScanlines();
    }

    private drawInfiniteGrid(cameraX: number, cameraY: number) {
        const ctx = this.ctx;
        const config = ConfigManager.getConfig();
        const gridSize = config.arena.grid_size || 2;

        // Calculate bounds in world space
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
        ctx.globalCompositeOperation = 'overlay'; // Blend mode for subtlety

        // Scanlines
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        for (let y = 0; y < this.height; y += 4) {
            ctx.fillRect(0, y, this.width, 2);
        }

        // Vignette
        const grad = ctx.createRadialGradient(
            this.width / 2, this.height / 2, this.height * 0.4,
            this.width / 2, this.height / 2, this.height * 0.9
        );
        grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0.6)'); // Darken corners

        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.restore();
    }


    private drawUI(game: Game) {
        const ctx = this.ctx;
        const waveMgr = game.waveManager;

        ctx.save();
        ctx.resetTransform(); // Draw UI in screen space

        const width = this.ctx.canvas.width;
        const height = this.ctx.canvas.height;
        const centerX = width / 2;

        // Low Health Warning (Red Pulsing Vignette)
        if (game.hero && !game.hero.isDead) {
            const hpPct = game.hero.hp / game.hero.maxHp;
            if (hpPct <= 0.3) {
                const pulse = (Math.sin(performance.now() / 200) + 1) / 2; // 0 to 1 pulsing
                const opacity = 0.1 + pulse * 0.4; // 10% to 50% opacity

                const grad = ctx.createRadialGradient(
                    centerX, height / 2, 0,
                    centerX, height / 2, Math.sqrt(centerX * centerX + (height / 2) * (height / 2))
                );
                grad.addColorStop(0.6, 'rgba(255, 0, 0, 0)');
                grad.addColorStop(1, `rgba(255, 0, 0, ${opacity})`);

                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, width, height);

                // Optional: Thin red border for extra emphasis
                ctx.strokeStyle = `rgba(255, 0, 0, ${opacity})`;
                ctx.lineWidth = 10;
                ctx.strokeRect(0, 0, width, height);
            }
        }

        // 0. Score & Coins (Top Left / Right)
        ctx.font = 'bold 24px monospace';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#FFF';
        ctx.fillText(`SCORE: ${game.score}`, 20, 40);

        ctx.fillStyle = '#FFD700'; // Gold
        ctx.fillText(`COINS: ${game.coinCount}`, 20, 70);

        // 1. Wave Status (Top Center)
        ctx.textAlign = 'center';
        ctx.font = 'bold 30px monospace'; // monospace for timer

        if (waveMgr.isWaveActive) {
            ctx.fillStyle = '#FFFFFF';
            if (waveMgr.stateTimer <= 5) ctx.fillStyle = '#FF0000'; // Warning
            ctx.fillText(waveMgr.stateTimer.toFixed(1), centerX, 40); // Use stateTimer

            ctx.font = '20px sans-serif';
            ctx.fillStyle = '#AAAAAA';
            ctx.fillText(`WAVE ${waveMgr.currentWave}`, centerX, 70);
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
            // Game Title
            ctx.fillStyle = '#FF0000';
            ctx.font = 'bold 80px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText("HOT ZONE", centerX, height / 2 - 120);

            // Subtitle
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 24px sans-serif';
            ctx.fillText("MADE BY ANTON LI USING AI", centerX, height / 2 - 80);

            this.drawButton(centerX, height / 2, 280, 55, "START GAME", "#00FF00");

            const input = InputManager.getInstance();
            ctx.font = '20px sans-serif';
            ctx.fillStyle = '#AAA';
            ctx.textAlign = 'center';
            if (input.isTouchDevice) {
                ctx.fillText("Touch Left Side to Move, Right Side to Aim", centerX, height / 2 + 60);
                ctx.fillText("Tap Buttons for Actions", centerX, height / 2 + 85);
            } else {
                ctx.fillText("WASD/Arrows to Move, Mouse to Aim", centerX, height / 2 + 60);
            }
        }
        else if (waveMgr.isShopOpen) {
            // SHOP UI
            ctx.fillStyle = '#FFFF00';
            ctx.fillText("SHOP OPEN", centerX, 40);

            // Next Wave Button
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

                // Card BG
                const input = InputManager.getInstance();
                const mx = input.mouse.x;
                const my = input.mouse.y;
                const isHovered = mx >= x && mx <= x + cardWidth && my >= y && my <= y + cardHeight;

                ctx.fillStyle = isHovered ? 'rgba(50, 50, 50, 0.95)' : 'rgba(30, 30, 30, 0.9)';
                ctx.strokeStyle = isHovered ? '#FFFFFF' : '#FFFF00';
                ctx.lineWidth = isHovered ? 4 : 2;
                ctx.fillRect(x, y, cardWidth, cardHeight);
                ctx.strokeRect(x, y, cardWidth, cardHeight);

                // Option Number
                ctx.fillStyle = '#FFFF00';
                ctx.font = 'bold 18px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(`[${i + 1}]`, x + cardWidth / 2, y + 25);

                // Name
                ctx.fillStyle = '#FFF';
                ctx.font = 'bold 16px sans-serif';
                ctx.fillText(opt.name, x + cardWidth / 2, y + 50);

                // Description
                ctx.font = '14px sans-serif';
                ctx.fillStyle = '#AAA';
                ctx.fillText(opt.description, x + cardWidth / 2, y + 75);

                // Cost
                ctx.font = 'bold 16px monospace';
                ctx.fillStyle = game.coinCount >= opt.cost ? '#00FF00' : '#FF0000';
                ctx.fillText(`$${opt.cost} `, x + cardWidth / 2, y + 105);
            }

            ctx.textAlign = 'center'; // Reset for other draws
        }

        // 2. Hero HUD (Bottom Center)
        if (game.hero) {
            ctx.save();
            ctx.textAlign = 'center';

            // --- HUD BACKING PLATE ---
            const plateWidth = 240;
            const plateHeight = 110;
            const plateX = centerX - plateWidth / 2;
            const plateY = height - plateHeight - 15; // Raised 15px from bottom

            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.beginPath();
            ctx.roundRect(plateX, plateY, plateWidth, plateHeight, 10);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Labels Global Config
            ctx.shadowBlur = 4;
            ctx.shadowColor = 'rgba(0,0,0,1)';

            // --- 4. AMMO (Top Bar) ---
            const ammoY = plateY + 25;
            const ammoPct = game.hero.ammo / game.hero.maxAmmo;

            ctx.fillStyle = '#FFFF00'; // Yellow Label
            ctx.font = 'bold 12px monospace';
            ctx.fillText("AMMO", centerX, ammoY - 12);

            ctx.shadowBlur = 0;
            ctx.fillStyle = '#333';
            ctx.fillRect(centerX - 100, ammoY, 200, 10); // BG

            if (game.hero.reloadTimer > 0) {
                const flash = Math.sin(performance.now() / 100) * 0.5 + 0.5;
                ctx.fillStyle = `rgba(255, 255, 0, ${flash})`; // Yellow Flash
                ctx.fillRect(centerX - 100, ammoY, 200, 10);

                ctx.fillStyle = '#FFF';
                ctx.font = 'bold 10px sans-serif';
                ctx.fillText("RELOADING...", centerX, ammoY + 8);
            } else {
                ctx.fillStyle = '#FFFF00'; // Yellow Bar
                ctx.fillRect(centerX - 100, ammoY, 200 * ammoPct, 10);

                // Segmented lines
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 1;
                for (let i = 1; i < game.hero.maxAmmo; i++) {
                    const xPos = (centerX - 100) + (200 / game.hero.maxAmmo) * i;
                    ctx.beginPath();
                    ctx.moveTo(xPos, ammoY);
                    ctx.lineTo(xPos, ammoY + 10);
                    ctx.stroke();
                }
            }
            ctx.strokeStyle = '#FFF';
            ctx.strokeRect(centerX - 100, ammoY, 200, 10);

            // --- 3. STAMINA (Middle Bar) ---
            const stamY = plateY + 55;
            const stamPct = game.hero.stamina / game.hero.maxStamina;

            ctx.shadowBlur = 4;
            ctx.fillStyle = '#5DADE2'; // Blue Label
            ctx.font = 'bold 12px monospace';
            ctx.fillText("STAMINA", centerX, stamY - 8);

            ctx.shadowBlur = 0;
            ctx.fillStyle = '#333';
            ctx.fillRect(centerX - 100, stamY, 200, 8); // BG
            ctx.fillStyle = '#2E86C1'; // Blue Bar
            ctx.fillRect(centerX - 100, stamY, 200 * stamPct, 8);
            ctx.strokeStyle = '#FFF';
            ctx.strokeRect(centerX - 100, stamY, 200, 8);

            // --- 2. HEALTH (Bottom Bar) ---
            const healthY = plateY + 85;
            const hpPct = game.hero.hp / game.hero.maxHp;

            ctx.shadowBlur = 4;
            ctx.fillStyle = '#2ECC71'; // Green Label
            ctx.font = 'bold 14px monospace';
            ctx.fillText("HEALTH", centerX, healthY - 10);

            ctx.shadowBlur = 0;
            ctx.fillStyle = '#555';
            ctx.fillRect(centerX - 100, healthY, 200, 15); // BG
            ctx.fillStyle = hpPct > 0.3 ? '#27AE60' : '#FF0000'; // Green Bar (Red if low)
            ctx.fillRect(centerX - 100, healthY, 200 * hpPct, 15);
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#FFF';
            ctx.strokeRect(centerX - 100, healthY, 200, 15);

            ctx.restore();
        }

        // Game Over Overlay
        if (game.hero.isDead) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, 0, width, height);

            ctx.fillStyle = '#FF0000';
            ctx.font = 'bold 60px sans-serif';
            ctx.fillText("YOU DIED", centerX, height / 2);
            ctx.font = '30px sans-serif';
            ctx.fillStyle = '#FFF';
            const input = InputManager.getInstance();
            const restartText = input.isTouchDevice ? "Tap to Restart" : "Press SPACE to Restart";
            ctx.fillText(restartText, centerX, height / 2 + 50);
        }

        // Draw Enemy HP Bars (World Space -> Screen Space? No, usually world space above entity)
        // Check render method: transform is reset for drawUI. To draw above enemies, we need world coordinates.
        // Option A: Use another world-space pass. Option B: Project coords.
        // Let's do a world space pass in the main render method instead of drawUI.
        ctx.restore();
    }

    private drawEnemyBars(game: any) {
        const ctx = this.ctx;
        const entities = game.getEntities();

        ctx.save();
        // Transform already applied by caller (render method)

        ctx.font = '0.5px sans-serif';
        ctx.textAlign = 'center';

        for (const enemy of entities.enemies) {
            ctx.save();
            ctx.translate(enemy.x, enemy.y);

            // Bar Dimensions
            const w = 1.0;
            const h = 0.15;
            const yOffset = -0.8;

            // Background
            ctx.fillStyle = '#333';
            ctx.fillRect(-w / 2, yOffset, w, h);

            if (enemy.shield > 0) {
                // Shield Bar
                const pct = enemy.shield / enemy.maxShield;
                ctx.fillStyle = '#00FFFF';
                ctx.fillRect(-w / 2, yOffset, w * pct, h);
            } else {
                // HP Bar
                const pct = enemy.hp / enemy.maxHp;
                ctx.fillStyle = '#FF0000';
                ctx.fillRect(-w / 2, yOffset, w * pct, h);
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
        // 1. Darken screen (tint everything darker)
        ctx.resetTransform();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(0, 0, this.width, this.height);
        ctx.restore();

        ctx.save();
        ctx.translate(this.width / 2, this.height / 2);
        ctx.scale(this.pixelsPerUnit, this.pixelsPerUnit);

        // 2. Thick red outline ring at explosion radius
        ctx.beginPath();
        ctx.arc(kb.explosionX, kb.explosionY, kb.radius, 0, Math.PI * 2);
        ctx.strokeStyle = '#FF0000';
        ctx.lineWidth = 0.15; // Thick
        ctx.stroke();

        // 3. Cause Line / Ghost
        if (kb.enemyInfo) {
            // Line from explosion center to enemy
            ctx.beginPath();
            ctx.moveTo(kb.explosionX, kb.explosionY);
            ctx.lineTo(kb.enemyInfo.x, kb.enemyInfo.y);
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
            ctx.lineWidth = 0.05;
            ctx.stroke();

            // Ghosted Triangle
            ctx.save();
            ctx.translate(kb.enemyInfo.x, kb.enemyInfo.y);
            ctx.rotate(kb.enemyInfo.angle);
            ctx.fillStyle = 'rgba(255, 216, 77, 0.4)'; // Yellow ghost
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
            // Highlight detached bomb with pulse
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

            // Pulsing Scale & Alpha
            const pulse = Math.sin(Date.now() * 0.015);
            const scale = 0.7 + pulse * 0.2;
            ctx.scale(scale, scale);

            // Draw Red X
            ctx.strokeStyle = '#FF0000';
            ctx.lineWidth = 0.4;
            ctx.lineCap = 'round';

            const size = 1.5;
            ctx.beginPath();
            ctx.moveTo(-size, -size);
            ctx.lineTo(size, size);
            ctx.moveTo(size, -size);
            ctx.lineTo(-size, size);
            ctx.stroke();

            // Glow Aura
            ctx.globalAlpha = 0.3 + pulse * 0.1;
            ctx.fillStyle = '#FF0000';
            ctx.beginPath();
            ctx.arc(0, 0, size, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1.0;

            ctx.restore();
        }
    }

    private drawButton(x: number, y: number, w: number, h: number, text: string, color: string) {
        const ctx = this.ctx;
        ctx.save();
        ctx.translate(x - w / 2, y - h / 2);

        // Hover effect (simple)
        const input = InputManager.getInstance();
        const mx = input.mouse.x;
        const my = input.mouse.y;
        const isHover = mx >= x - w / 2 && mx <= x + w / 2 && my >= y - h / 2 && my <= y + h / 2;

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
        // Only draw if we are on a touch-enabled device
        if (!input.isTouchDevice) return;

        const w = this.width;
        const h = this.height;

        this.drawCircleButton(w - 80, h - 80, 45, "DASH", "#FFF");
        this.drawCircleButton(w - 80, h - 190, 40, "RELOAD", "#FFFF00");
        this.drawCircleButton(w - 180, h - 80, 40, "PUSH", "#00FFFF");
    }

    private drawCircleButton(x: number, y: number, r: number, label: string, color: string) {
        const ctx = this.ctx;
        ctx.save();
        ctx.resetTransform();

        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
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

    private drawJoystick() {
        const input = InputManager.getInstance();
        if (!input.joystick.active) return;

        const ctx = this.ctx;
        const origin = input.joystick.origin;
        // 50 is the maxDist we used in InputManager
        const currentX = origin.x + input.joystick.x * 50;
        const currentY = origin.y + input.joystick.y * 50;

        ctx.save();
        ctx.resetTransform(); // Screen space

        // Base
        ctx.beginPath();
        ctx.arc(origin.x, origin.y, 50, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.fill();
        ctx.stroke();

        // Knob
        ctx.beginPath();
        ctx.arc(currentX, currentY, 20, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fill();

        ctx.restore();
    }
}
