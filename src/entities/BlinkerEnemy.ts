import { Enemy } from "./Enemy";
import { Game } from "../game";
import { BombState } from "./Bomb";

export class BlinkerEnemy extends Enemy {
    private blinkTimer: number = 2.0;
    private blinkCooldown: number = 3.0;

    constructor(x: number, y: number) {
        super(x, y);
        this.color = '#A020F0'; // Purple
        this.speed = 1.2;
        this.radius = 0.7;
        this.shieldRadius = 1.5;
    }

    public update(dt: number, game: Game): void {
        super.update(dt, game);

        if (this.isDead || this.isFadingOut) return;

        // Only blink if bomb is NOT armed (or maybe only if it IS armed?)
        // Let's say they blink more aggressively when armed.
        const currentCooldown = (this.bomb && this.bomb.state === BombState.ARMED) ? 1.5 : this.blinkCooldown;

        this.blinkTimer -= dt;
        if (this.blinkTimer <= 0) {
            this.blink(game);
            this.blinkTimer = currentCooldown;
        }
    }

    private blink(game: Game) {
        const hero = game.hero;
        if (!hero) return;

        // Blink towards hero but keep some distance (or go behind?)
        const angle = Math.atan2(hero.y - this.y, hero.x - this.x);
        const blinkDist = 5.0;

        const newX = this.x + Math.cos(angle) * blinkDist;
        const newY = this.y + Math.sin(angle) * blinkDist;

        // Check if new position is valid (not inside obstacle?)
        // For simplicity, just blink. In the game loop checkObstacleCollision will push out.
        this.x = newX;
        this.y = newY;

        // Visual feedback for blink
        // Handle in draw or add a flash
    }

    public draw(ctx: CanvasRenderingContext2D): void {
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.translate(this.x, this.y);
        ctx.scale(1.1, 1.1);

        // Glitch effect before blink
        if (this.blinkTimer < 0.2) {
            ctx.translate((Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.2);
        }

        // Bloom
        // ctx.shadowBlur = 10;
        // ctx.shadowColor = this.color;

        // Shield
        if (this.shield > 0) {
            ctx.save();
            ctx.strokeStyle = '#4DFFF3';
            ctx.globalAlpha = 0.7 * this.opacity;
            ctx.lineWidth = 0.05;
            ctx.beginPath();
            ctx.arc(0, 0, this.shieldRadius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        const isFacingLeft = Math.abs(this.angle) > Math.PI / 2;
        if (isFacingLeft) {
            ctx.scale(-1, 1);
        }

        // --- DRAW REALISTIC BLINKER DRONE ---
        const baseColor = this.damageFlash > 0 ? '#FFFFFF' : (this.freezeTimer > 0 ? '#AED6F1' : '#A020F0');
        const crystalColor = this.damageFlash > 0 ? '#FFFFFF' : (this.freezeTimer > 0 ? '#5DADE2' : '#E0B0FF');

        ctx.strokeStyle = this.damageFlash > 0 ? '#FFFFFF' : '#222';
        ctx.lineWidth = 0.05;

        // Phase-shifting Crystal Core
        ctx.fillStyle = crystalColor;
        const crystalSize = 0.4 + Math.sin(Date.now() * 0.02) * 0.1;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i;
            const px = Math.cos(angle) * crystalSize;
            const py = Math.sin(angle) * crystalSize;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Fragmented Armor Plates (Floating)
        ctx.fillStyle = baseColor;
        for (let i = 0; i < 4; i++) {
            const angle = (Math.PI / 2) * i + (Date.now() * 0.002);
            ctx.save();
            ctx.rotate(angle);
            ctx.beginPath();
            ctx.roundRect(0.4, -0.2, 0.3, 0.4, 0.05);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }

        // Stealth Sensor (Slit Eye)
        ctx.fillStyle = '#000';
        ctx.fillRect(0.1, -0.05, 0.3, 0.1);

        ctx.restore();

        // Bomb
        if (this.bomb && this.bomb.parent === this) {
            this.bomb.draw(ctx);
        }
    }
}
