import { Game } from "../game";

export abstract class Entity {
    public x: number;
    public y: number;
    public id: string = Math.random().toString(36).substr(2, 9);
    public radius: number = 0.5;
    public isDead: boolean = false;
    public color: string = '#FFF';
    public opacity: number = 1.0;
    public isFadingOut: boolean = false;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    public abstract update(dt: number, game: Game): void;
    public abstract draw(ctx: CanvasRenderingContext2D): void;

    public distanceToSq(other: Entity): number {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        return dx * dx + dy * dy;
    }

    public distanceTo(other: Entity): number {
        return Math.sqrt(this.distanceToSq(other));
    }
}
