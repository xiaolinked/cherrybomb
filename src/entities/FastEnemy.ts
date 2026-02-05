import { Enemy } from "./Enemy";

export class FastEnemy extends Enemy {
    constructor(x: number, y: number) {
        super(x, y);

        // Stats Override (Fast & Fragile)
        this.maxHp = 30;
        this.hp = this.maxHp;

        this.maxShield = 20;
        this.shield = this.maxShield;

        this.speed = 6.0; // Very fast (Base is ~1.5)
        this.chargeSpeed = 10.0; // Extremely fast when armed

        this.color = '#FF3333'; // Bright Red
        this.radius = 0.5; // Slightly smaller
    }

    public draw(ctx: CanvasRenderingContext2D): void {
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.translate(this.x, this.y);

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
            ctx.arc(0, 0, 1.2, 0, Math.PI * 2); // Smaller shield radius
            ctx.stroke();
            ctx.restore();
        }

        ctx.rotate(this.angle);

        // Draw Sharp Diamond (Aerodynamic)
        ctx.fillStyle = this.color;
        ctx.beginPath();
        const h = 1.8; // Length
        const b = 0.6; // Width
        ctx.moveTo(h / 2, 0);          // Front
        ctx.lineTo(0, b / 2);          // Side
        ctx.lineTo(-h / 2, 0);         // Back
        ctx.lineTo(0, -b / 2);         // Other Side
        ctx.closePath();
        ctx.fill();

        // Outline
        ctx.strokeStyle = '#800000';
        ctx.lineWidth = 0.05;
        ctx.stroke();

        ctx.restore();

        // Bomb
        if (this.bomb && this.bomb.parent === this) {
            this.bomb.draw(ctx);
        }
    }
}
