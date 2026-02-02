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
        ctx.rotate(this.angle);

        // Draw Octagon
        ctx.fillStyle = this.color;
        ctx.beginPath();
        const r = 0.8;
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI / 4) * i;
            const px = Math.cos(angle) * r;
            const py = Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();

        // Inner detail (Center Circle)
        ctx.fillStyle = '#C71585';
        ctx.beginPath();
        ctx.arc(0, 0, 0.3, 0, Math.PI * 2);
        ctx.fill();

        // Outline
        ctx.strokeStyle = '#8B004F';
        ctx.lineWidth = 0.05;
        ctx.stroke();

        ctx.restore();

        if (this.bomb && this.bomb.parent === this) {
            this.bomb.draw(ctx);
        }
    }
}
