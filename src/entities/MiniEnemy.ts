import { Enemy } from "./Enemy";

export class MiniEnemy extends Enemy {
    constructor(x: number, y: number) {
        super(x, y);
        this.maxHp = 10;
        this.hp = this.maxHp;
        this.maxShield = 0;
        this.shield = 0;
        this.speed = 2.5;
        this.radius = 0.4; // Reduced from 0.5
        this.color = '#FFA500'; // Orange

        // Arm bomb immediately
        if (this.bomb) {
            this.bomb.arm();
            this.bomb.timer = 2.0; // Short fuse
            this.bomb.damage = 15; // Even lower for minis
            this.bomb.radiusExplosion = 2.0;
        }
    }

    public draw(ctx: CanvasRenderingContext2D): void {
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.translate(this.x, this.y);
        ctx.scale(1.1, 1.1);
        ctx.rotate(this.angle);

        // --- DRAW SPIDER BOT ---
        const baseColor = this.damageFlash > 0 ? '#FFFFFF' : (this.freezeTimer > 0 ? '#AED6F1' : '#444');
        const eyeColor = this.damageFlash > 0 ? '#FFFFFF' : (this.freezeTimer > 0 ? '#E1F5FE' : '#FF0000');

        ctx.strokeStyle = '#000';
        ctx.lineWidth = 0.02;

        const skitter = (Math.sin(Date.now() * 0.05) + 1) * 0.5;

        // Spider Legs (8 legs)
        ctx.fillStyle = '#111';
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI / 4) * i;
            const legExtend = 0.3 + (i % 2 === 0 ? skitter * 0.1 : (1 - skitter) * 0.1);

            ctx.save();
            ctx.rotate(angle);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(legExtend, 0.1);
            ctx.lineTo(legExtend + 0.1, 0.3);
            ctx.stroke();
            ctx.restore();
        }

        // Central Core
        ctx.fillStyle = baseColor;
        ctx.beginPath();
        ctx.arc(0, 0, 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Glowing Red Eye
        ctx.fillStyle = eyeColor;
        ctx.beginPath();
        ctx.arc(0.08, 0, 0.05, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        if (this.bomb && this.bomb.parent === this) {
            this.bomb.draw(ctx);
        }
    }
}
