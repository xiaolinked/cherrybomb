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

        // Small Circle
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Outline
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 0.03;
        ctx.stroke();

        ctx.restore();

        if (this.bomb && this.bomb.parent === this) {
            this.bomb.draw(ctx);
        }
    }
}
