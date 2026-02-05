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

        // Glitch effect before blink
        if (this.blinkTimer < 0.2) {
            ctx.translate((Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.2);
        }

        // Bloom
        // ctx.shadowBlur = 10;
        // ctx.shadowColor = this.color;

        ctx.rotate(this.angle);

        // Draw Square
        const s = 1.0;
        ctx.fillStyle = this.color;
        ctx.fillRect(-s / 2, -s / 2, s, s);

        // Inner Square (Lighter)
        ctx.fillStyle = '#DDA0DD';
        ctx.fillRect(-s / 4, -s / 4, s / 2, s / 2);

        // Outline
        ctx.strokeStyle = '#4B0082';
        ctx.lineWidth = 0.05;
        ctx.strokeRect(-s / 2, -s / 2, s, s);

        ctx.restore();

        // Bomb
        if (this.bomb && this.bomb.parent === this) {
            this.bomb.draw(ctx);
        }
    }
}
