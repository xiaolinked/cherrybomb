import { Entity } from "./Entity";

export enum ObstacleType {
    PILLAR = 'PILLAR',
    ROCK = 'ROCK'
}

export class Obstacle extends Entity {
    public type: ObstacleType;

    constructor(x: number, y: number, type: ObstacleType, radius: number = 0.8) {
        super(x, y);
        this.type = type;
        this.radius = radius;
        this.color = type === ObstacleType.PILLAR ? '#888' : '#666';
    }

    public update(_dt: number): void {
        // Static
    }

    public draw(ctx: CanvasRenderingContext2D): void {
        ctx.fillStyle = this.color;
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 0.05;

        if (this.type === ObstacleType.PILLAR) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Texture/Detail
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.beginPath();
            ctx.arc(this.x - this.radius * 0.3, this.y - this.radius * 0.3, this.radius * 0.4, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Rock (Jagged)
            ctx.beginPath();
            // Deterministic "random" for drawing based on id
            const seed = parseInt(this.id, 36);
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                const r = this.radius * (0.8 + (Math.abs(Math.sin(seed + i)) * 0.4));
                const px = this.x + Math.cos(angle) * r;
                const py = this.y + Math.sin(angle) * r;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }
    }
}
