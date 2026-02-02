import { Enemy } from "./Enemy";

export class MiniEnemy extends Enemy {
    constructor(x: number, y: number) {
        super(x, y);
        this.maxHp = 10;
        this.hp = this.maxHp;
        this.maxShield = 0;
        this.shield = 0;
        this.speed = 2.5;
        this.radius = 0.3;
        this.color = '#FFA500'; // Orange

        // Arm bomb immediately
        if (this.bomb) {
            this.bomb.arm();
            this.bomb.timer = 2.0; // Short fuse
        }
    }

    public draw(ctx: CanvasRenderingContext2D): void {
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // Small triangle
        const h = 0.8;
        const b = 0.6;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(h / 2, 0);
        ctx.lineTo(-h / 2, b / 2);
        ctx.lineTo(-h / 2, -b / 2);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        if (this.bomb && this.bomb.parent === this) {
            this.bomb.draw(ctx);
        }
    }
}
