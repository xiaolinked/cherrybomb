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
        this.radius = 1.1;
        this.shieldRadius = 2.2;
    }

    public draw(ctx: CanvasRenderingContext2D): void {
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.translate(this.x, this.y);
        ctx.scale(1.1, 1.1);

        // Bloom
        // ctx.shadowBlur = 10;
        // ctx.shadowColor = this.color;

        // Shield
        if (this.shield > 0) {
            ctx.save();
            ctx.strokeStyle = '#4DFFF3';
            ctx.globalAlpha = 0.7 * this.opacity;
            ctx.lineWidth = 0.08; // Thicker shield
            ctx.beginPath();
            ctx.arc(0, 0, this.shieldRadius, 0, Math.PI * 2); // Big shield
            ctx.stroke();
            ctx.restore();
        }

        const isFacingLeft = Math.abs(this.angle) > Math.PI / 2;
        if (isFacingLeft) {
            ctx.scale(-1, 1);
        }

        // Apply a subtle heavy stomp tilt
        const stompLean = Math.sin(Date.now() * 0.005) * 0.03;
        ctx.rotate(stompLean);

        // --- DRAW HEAVY JUGGERNAUT ---
        const baseColor = this.damageFlash > 0 ? '#FFFFFF' : (this.freezeTimer > 0 ? '#AED6F1' : '#2F4F4F');
        const plateColor = this.damageFlash > 0 ? '#FFFFFF' : (this.freezeTimer > 0 ? '#5DADE2' : '#1A3333');

        ctx.strokeStyle = '#000';
        ctx.lineWidth = 0.08;

        const stompCycle = Math.sin(Date.now() * 0.005) * 0.2;

        // Heavy Legs
        ctx.fillStyle = '#111';
        // Left
        ctx.save();
        ctx.translate(-0.35, 0.2);
        ctx.rotate(-stompCycle);
        ctx.fillRect(-0.25, 0, 0.5, 0.8);
        ctx.strokeRect(-0.25, 0, 0.5, 0.8);
        ctx.restore();
        // Right
        ctx.save();
        ctx.translate(0.35, 0.2);
        ctx.rotate(stompCycle);
        ctx.fillRect(-0.25, 0, 0.5, 0.8);
        ctx.strokeRect(-0.25, 0, 0.5, 0.8);
        ctx.restore();

        // Massive Torso
        ctx.fillStyle = baseColor;
        ctx.beginPath();
        ctx.roundRect(-0.7, -0.6, 1.4, 1.2, 0.3);
        ctx.fill();
        ctx.stroke();

        // Chest Plate
        ctx.fillStyle = plateColor;
        ctx.beginPath();
        ctx.roundRect(-0.5, -0.4, 1.0, 0.6, 0.1);
        ctx.fill();
        ctx.stroke();

        // Heavy Helmet
        ctx.fillStyle = baseColor;
        ctx.beginPath();
        ctx.roundRect(-0.35, -1.0, 0.7, 0.5, 0.2);
        ctx.fill();
        ctx.stroke();

        // Glowing Visor
        ctx.fillStyle = '#FF0000';
        ctx.beginPath();
        ctx.roundRect(-0.2, -0.85, 0.5, 0.15, 0.05);
        ctx.fill();

        ctx.restore();

        // Bomb
        if (this.bomb && this.bomb.parent === this) {
            this.bomb.draw(ctx);
        }
    }
}
