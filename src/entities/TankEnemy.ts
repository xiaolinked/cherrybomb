import { Enemy } from "./Enemy";

export class TankEnemy extends Enemy {
    constructor(x: number, y: number) {
        super(x, y);

        // Stats Override (Slow & Tanky)
        this.maxHp = 200;
        this.hp = this.maxHp;

        this.maxShield = 150;
        this.shield = this.maxShield;

        this.speed = 0.8; // Slow plodding
        this.color = '#2E8B57'; // Sea Green
        this.radius = 0.9;
    }

    public draw(ctx: CanvasRenderingContext2D): void {
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.translate(this.x, this.y);

        // Bloom
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;

        // Shield
        if (this.shield > 0) {
            ctx.save();
            ctx.strokeStyle = '#4DFFF3';
            ctx.globalAlpha = 0.7 * this.opacity;
            ctx.lineWidth = 0.08; // Thicker shield
            ctx.beginPath();
            ctx.arc(0, 0, 2.0, 0, Math.PI * 2); // Big shield
            ctx.stroke();
            ctx.restore();
        }

        ctx.rotate(this.angle);

        // Draw Bulkier Shape (Pentagon-ish or Wide Triangle)
        ctx.fillStyle = this.color;

        ctx.beginPath();
        // Custom heavy shape
        ctx.moveTo(1.0, 0);
        ctx.lineTo(0.2, 1.0);
        ctx.lineTo(-1.0, 0.6);
        ctx.lineTo(-1.0, -0.6);
        ctx.lineTo(0.2, -1.0);
        ctx.closePath();
        ctx.fill();

        // Heavy Outline
        ctx.strokeStyle = '#004d00';
        ctx.lineWidth = 0.1;
        ctx.stroke();

        ctx.restore();

        // Bomb
        if (this.bomb && this.bomb.parent === this) {
            this.bomb.draw(ctx);
        }
    }
}
