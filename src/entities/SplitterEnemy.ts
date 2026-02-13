import { Enemy } from "./Enemy";
import { MiniEnemy } from "./MiniEnemy";
import { Game } from "../game";

export class SplitterEnemy extends Enemy {
    constructor(x: number, y: number) {
        super(x, y);
        this.color = '#FF69B4'; // Hot Pink
        this.maxHp = 80;
        this.hp = this.maxHp;
        this.speed = 1.0;
        this.radius = 0.8;
        this.shieldRadius = 1.8;
    }

    public onDeath(game: Game): void {
        // Spawn 3 MiniEnemies
        for (let i = 0; i < 3; i++) {
            const angle = (Math.PI * 2 / 3) * i;
            const dist = 0.5;
            const mx = this.x + Math.cos(angle) * dist;
            const my = this.y + Math.sin(angle) * dist;
            game.enemies.push(new MiniEnemy(mx, my));
        }
    }

    public draw(ctx: CanvasRenderingContext2D): void {
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.translate(this.x, this.y);
        ctx.scale(1.1, 1.1);

        // Shield
        if (this.shield > 0) {
            ctx.save();
            ctx.strokeStyle = '#4DFFF3';
            ctx.globalAlpha = 0.7 * this.opacity;
            ctx.lineWidth = 0.06;
            ctx.beginPath();
            ctx.arc(0, 0, this.shieldRadius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        const isFacingLeft = Math.abs(this.angle) > Math.PI / 2;
        if (isFacingLeft) {
            ctx.scale(-1, 1);
        }

        // --- DRAW REALISTIC FRACTAL DRONE ---
        const baseColor = this.damageFlash > 0 ? '#FFFFFF' : (this.freezeTimer > 0 ? '#AED6F1' : '#FF69B4');
        const coreColor = this.damageFlash > 0 ? '#FFFFFF' : (this.freezeTimer > 0 ? '#5DADE2' : '#C71585');

        ctx.strokeStyle = this.damageFlash > 0 ? '#FFFFFF' : '#333';
        ctx.lineWidth = 0.05;

        // Modular Housing (3 distinct segments nested)
        for (let i = 0; i < 3; i++) {
            const rot = (Math.PI * 2 / 3) * i + (Date.now() * 0.001);
            ctx.save();
            ctx.rotate(rot);
            ctx.fillStyle = coreColor;
            ctx.beginPath();
            ctx.roundRect(0.2, -0.3, 0.4, 0.6, 0.1);
            ctx.fill();
            ctx.stroke();

            // Nested Unit Eye
            ctx.fillStyle = '#111';
            ctx.beginPath();
            ctx.arc(0.45, 0, 0.1, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Central Neural Hub
        ctx.fillStyle = baseColor;
        ctx.beginPath();
        ctx.arc(0, 0, 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Glowing Center
        const nervePulse = 0.6 + Math.sin(Date.now() * 0.005) * 0.4;
        ctx.fillStyle = `rgba(255, 255, 255, ${nervePulse})`;
        ctx.beginPath();
        ctx.arc(0, 0, 0.15, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        if (this.bomb && this.bomb.parent === this) {
            this.bomb.draw(ctx);
        }
    }
}
