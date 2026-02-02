import { Game } from './game';
import { ConfigManager } from './config';

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
        // Update Shake
        const dt = 1 / 60; // Approximate, or pass it in. Let's assume 60fps for simple shake decay.
        if (this.shakeTimer > 0) {
            this.shakeTimer -= dt;
        }

        // Clear screen
        this.ctx.fillStyle = '#111';
        this.ctx.fillRect(0, 0, this.width, this.height);

        this.ctx.save();

        // Center camera (0,0 is center of screen)
        this.ctx.translate(this.width / 2, this.height / 2);

        // Screen Shake Apply
        if (this.shakeTimer > 0) {
            const sx = (Math.random() - 0.5) * this.shakeIntensity * this.pixelsPerUnit;
            const sy = (Math.random() - 0.5) * this.shakeIntensity * this.pixelsPerUnit;
            this.ctx.translate(sx, sy);
        }

        this.ctx.scale(this.pixelsPerUnit, this.pixelsPerUnit);

        // Draw Grid
        this.drawArena();


        // Draw Entities
        const entities = game.getEntities();

        for (const enemy of entities.enemies) {
            enemy.draw(this.ctx);
        }

        // Draw Detached Bombs
        for (const bomb of entities.bombs) {
            bomb.draw(this.ctx);
        }

        // Draw Bullets
        for (const bullet of entities.bullets) {
            bullet.draw(this.ctx);
        }

        // Draw Coins
        if (entities.coins) {
            for (const coin of entities.coins) {
                coin.draw(this.ctx);
            }
        }

        if (entities.hero) {
            entities.hero.draw(this.ctx);
        }

        this.drawEnemyBars(game);
        this.drawUI(game);

        this.ctx.restore();

        if (game.deathHighlightTimer > 0) {
            this.drawDeathClarity(game);
        }
    }

    private drawUI(game: any) {
        const ctx = this.ctx;
        const waveMgr = game.waveManager;

        ctx.save();
        ctx.resetTransform(); // Draw UI in screen space

        const width = this.ctx.canvas.width;
        const height = this.ctx.canvas.height;
        const centerX = width / 2;

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
            if (waveMgr.waveTimer <= 5) ctx.fillStyle = '#FF0000'; // Warning
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
            ctx.fillStyle = '#00FF00';
            ctx.font = 'bold 30px sans-serif';
            ctx.fillText("PRESS SPACE TO START", centerX, height / 2);

            ctx.font = '20px sans-serif';
            ctx.fillStyle = '#AAA';
            ctx.fillText("WASD/Arrows to Move, Mouse to Aim", centerX, height / 2 + 40);
        }
        else if (waveMgr.isShopOpen) {
            // SHOP UI
            ctx.fillStyle = '#FFFF00';
            ctx.fillText("SHOP OPEN", centerX, 40);

            // Resume Prompt
            ctx.font = '20px sans-serif';
            ctx.fillStyle = '#AAAAAA';
            ctx.fillText("Press SPACE to Start Wave", centerX, 80);

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
                ctx.fillStyle = 'rgba(30, 30, 30, 0.9)';
                ctx.strokeStyle = '#FFFF00';
                ctx.lineWidth = 2;
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
                ctx.fillText(`$${opt.cost}`, x + cardWidth / 2, y + 105);
            }

            ctx.textAlign = 'center'; // Reset for other draws
        }

        // 2. Hero HP (Bottom Center or Left)
        if (game.hero) {
            const hpPct = game.hero.hp / game.hero.maxHp;
            ctx.fillStyle = '#555';
            ctx.fillRect(centerX - 100, height - 40, 200, 20); // BG

            ctx.fillStyle = hpPct > 0.3 ? '#00FF00' : '#FF0000';
            ctx.fillRect(centerX - 100, height - 40, 200 * hpPct, 20); // Bar

            ctx.strokeStyle = '#FFF';
            ctx.lineWidth = 2;
            ctx.strokeRect(centerX - 100, height - 40, 200, 20);

            // 3. Stamina Bar (Yellow, Above HP)
            const stamPct = game.hero.stamina / game.hero.maxStamina;
            ctx.fillStyle = '#333';
            ctx.fillRect(centerX - 100, height - 55, 200, 10); // BG

            ctx.fillStyle = '#FFFF00'; // Yellow
            ctx.fillRect(centerX - 100, height - 55, 200 * stamPct, 10); // Bar

            ctx.lineWidth = 1;
            ctx.strokeRect(centerX - 100, height - 55, 200, 10);

            // 4. Ammo Bar (Cyan/White, Above Stamina)
            const ammoPct = game.hero.ammo / game.hero.maxAmmo;
            ctx.fillStyle = '#333';
            ctx.fillRect(centerX - 100, height - 70, 200, 10); // BG

            if (game.hero.reloadTimer > 0) {
                // Flash or pulsing color for reloading
                const flash = Math.sin(performance.now() / 100) * 0.5 + 0.5;
                ctx.fillStyle = `rgba(0, 255, 255, ${flash})`;
                ctx.fillRect(centerX - 100, height - 70, 200, 10);

                ctx.fillStyle = '#FFF';
                ctx.font = 'bold 12px sans-serif';
                ctx.fillText("RELOADING...", centerX, height - 62);
            } else {
                ctx.fillStyle = '#00FFFF'; // Cyan
                ctx.fillRect(centerX - 100, height - 70, 200 * ammoPct, 10);

                // Segmented lines for ammo
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 1;
                for (let i = 1; i < game.hero.maxAmmo; i++) {
                    const x = (centerX - 100) + (200 / game.hero.maxAmmo) * i;
                    ctx.beginPath();
                    ctx.moveTo(x, height - 70);
                    ctx.lineTo(x, height - 60);
                    ctx.stroke();
                }
            }

            ctx.strokeStyle = '#FFF';
            ctx.lineWidth = 1;
            ctx.strokeRect(centerX - 100, height - 70, 200, 10);
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
            ctx.fillText("Press SPACE to Restart", centerX, height / 2 + 50);
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

    private drawArena() {
        const arenaSize = ConfigManager.getConfig().arena.size;

        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 0.1;

        const half = arenaSize / 2;

        // Draw border
        this.ctx.strokeStyle = '#555';
        this.ctx.lineWidth = 0.2;
        this.ctx.strokeRect(-half, -half, arenaSize, arenaSize);

        // Draw grid lines
        this.ctx.beginPath();
        for (let i = -Math.floor(half); i <= half; i++) {
            this.ctx.moveTo(i, -half);
            this.ctx.lineTo(i, half);
            this.ctx.moveTo(-half, i);
            this.ctx.lineTo(half, i);
        }
        this.ctx.stroke();
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
}
