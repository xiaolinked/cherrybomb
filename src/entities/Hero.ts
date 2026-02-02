import { ConfigManager } from "../config";
import { Game } from "../game";
import { InputManager } from "../input";
import { Entity } from "./Entity";
import { Bullet } from "./Bullet";
import { Bomb } from "./Bomb";
import { AudioManager } from "../audio/AudioManager";

export interface DeathClarityInfo {
    explosionX: number;
    explosionY: number;
    bombId: string;
    radius: number;
    enemyInfo?: {
        x: number,
        y: number,
        angle: number
    };
    isDetached: boolean;
}

export class Hero extends Entity {
    public hp: number;
    public maxHp: number;
    public killingBlow: DeathClarityInfo | null = null;

    public stamina: number;
    public maxStamina: number;
    private staminaRegenTimer: number = 0;
    private fireTimer: number = 0;
    public ammo: number;
    public maxAmmo: number;
    public reloadTimer: number = 0;
    public multishot: number = 1;

    // Dash
    private isDashing: boolean = false;
    private dashTimer: number = 0;
    private dashCooldownTimer: number = 0;
    private dashVector: { x: number, y: number } = { x: 0, y: 0 };
    private afterimages: { x: number, y: number, alpha: number }[] = [];

    constructor(x: number, y: number) {
        super(x, y);
        const config = ConfigManager.getConfig();
        // Base Stats
        // Note: For now strictly using config values directly
        // In a real RPG we might have a StatsManager
        this.maxHp = config.hero.base_hp;
        this.hp = this.maxHp;

        this.stamina = config.hero.stamina.base;
        this.maxStamina = config.hero.stamina.base;

        this.maxAmmo = config.blaster.magazine_size;
        this.ammo = this.maxAmmo;
        this.multishot = config.blaster.multishot_count;

        this.color = '#0088FF'; // Blue
    }

    // Push Back
    private pushBackCooldownTimer: number = 0;
    private pushBackVisualTimer: number = 0; // For drawing the ring

    public update(dt: number, game: Game): void {
        const config = ConfigManager.getConfig();
        const input = InputManager.getInstance();

        // 1. Cooldowns
        if (this.dashCooldownTimer > 0) this.dashCooldownTimer -= dt;
        if (this.fireTimer > 0) this.fireTimer -= dt;
        if (this.reloadTimer > 0) {
            this.reloadTimer -= dt;
            if (this.reloadTimer <= 0) {
                this.ammo = this.maxAmmo;
            }
        }
        if (this.pushBackCooldownTimer > 0) this.pushBackCooldownTimer -= dt;
        if (this.pushBackVisualTimer > 0) this.pushBackVisualTimer -= dt;
        if (this.damageFlashTimer > 0) this.damageFlashTimer -= dt;

        // 2. Dash Logic
        if (this.isDashing) {
            this.dashTimer -= dt;
            // Move fast in dash direction // distance = speed * time
            const dashDist = config.abilities.dash.distance;
            const dashSpeed = dashDist / 0.15;

            this.x += this.dashVector.x * dashSpeed * dt;
            this.y += this.dashVector.y * dashSpeed * dt;

            if (this.dashTimer <= 0) {
                this.isDashing = false;
                this.staminaRegenTimer = config.hero.stamina.regen_delay_after_dash;
            }
            return;
        }

        // Push Back Input (E)
        if (input.keys['e'] && this.pushBackCooldownTimer <= 0) {
            this.performPushBack(game);
            this.pushBackCooldownTimer = config.abilities.push_back.cooldown;
            this.pushBackVisualTimer = 0.2; // Show ring for 0.2s
        }

        // Manual Reload (R)
        if (input.keys['r'] && this.reloadTimer <= 0 && this.ammo < this.maxAmmo) {
            this.reloadTimer = config.blaster.reload_time;
            AudioManager.playReload();
        }

        // Shooting
        if (input.mouse.leftDown && this.fireTimer <= 0 && this.reloadTimer <= 0) {
            if (this.ammo > 0) {
                this.ammo--;
                this.fireTimer = config.blaster.fire_rate;

                // Multishot Logic
                const baseAngle = Math.atan2(input.mouseWorld.y - this.y, input.mouseWorld.x - this.x);
                const spread = 0.1; // ~5.7 degrees in radians

                for (let i = 0; i < this.multishot; i++) {
                    // Center the spread
                    const offset = (i - (this.multishot - 1) / 2) * spread;
                    const angle = baseAngle + offset;
                    const targetX = this.x + Math.cos(angle) * 10;
                    const targetY = this.y + Math.sin(angle) * 10;

                    game.bullets.push(new Bullet(this.x, this.y, targetX, targetY));
                }

                AudioManager.playShoot();

                if (this.ammo <= 0) {
                    this.reloadTimer = config.blaster.reload_time;
                    AudioManager.playReload();
                }
            }
        }

        // 3. Normal Movement
        const axis = input.getAxis();
        if (axis.x !== 0 || axis.y !== 0) {
            // Check for Dash Input (Shift or Space)
            if ((input.keys['shift'] || input.keys[' ']) &&
                this.dashCooldownTimer <= 0 &&
                this.stamina >= config.abilities.dash.stamina_cost) {

                // Trigger Dash
                this.isDashing = true;
                this.dashTimer = 0.15;
                this.dashCooldownTimer = config.abilities.dash.cooldown;
                this.dashVector = { ...axis };
                this.stamina -= config.abilities.dash.stamina_cost;
            } else {
                // Move
                const moveSpeed = 6.0;
                this.x += axis.x * moveSpeed * dt;
                this.y += axis.y * moveSpeed * dt;
            }
        }

        // 4. Stamina Regen
        if (!this.isDashing) {
            if (this.staminaRegenTimer > 0) {
                this.staminaRegenTimer -= dt;
            } else if (this.stamina < this.maxStamina) {
                this.stamina += config.hero.stamina.regen_rate * dt;
                if (this.stamina > this.maxStamina) this.stamina = this.maxStamina;
            }
        }

        // Dashing afterimages
        if (this.isDashing) {
            this.afterimages.push({ x: this.x, y: this.y, alpha: 0.5 });
        }
        for (let i = this.afterimages.length - 1; i >= 0; i--) {
            this.afterimages[i].alpha -= dt * 3;
            if (this.afterimages[i].alpha <= 0) this.afterimages.splice(i, 1);
        }

        // 5. Boundary Check (Arena) - Disabled for endless
        if (!config.arena.is_endless) {
            // No longer used
        }
    }

    private performPushBack(game: Game) {
        const config = ConfigManager.getConfig();
        const radius = config.abilities.push_back.radius;
        const pushDist = config.abilities.push_back.distance;

        console.log("PUSH BACK!");

        for (const enemy of game.enemies) {
            if (this.distanceTo(enemy) <= radius) {
                // Calculate direction away from hero
                const dx = enemy.x - this.x;
                const dy = enemy.y - this.y;
                const angle = Math.atan2(dy, dx);

                // Apply push
                enemy.x += Math.cos(angle) * pushDist;
                enemy.y += Math.sin(angle) * pushDist;

                // No clamping needed in endless
            }
        }
    }

    private damageFlashTimer: number = 0;

    public takeDamage(amount: number, source?: Bomb) {
        // Simple Armor reduction (percent)
        const config = ConfigManager.getConfig();
        const reduction = config.hero.armor.damage_reduction_percent;
        const finalDamage = amount * (1.0 - reduction);

        this.hp -= finalDamage;
        this.damageFlashTimer = 0.08; // VISUAL SPEC: Flash white for 0.08s
        AudioManager.playHit();

        if (this.hp <= 0 && !this.isDead) {
            this.hp = 0;
            this.isDead = true;

            if (source) {
                const originalParent = (source as any).originalParent; // We'll set this in Bomb explode
                this.killingBlow = {
                    explosionX: source.x,
                    explosionY: source.y,
                    bombId: source.id,
                    radius: (source as any).radiusExplosion,
                    isDetached: !originalParent,
                    enemyInfo: originalParent ? {
                        x: originalParent.x,
                        y: originalParent.y,
                        angle: originalParent.angle
                    } : undefined
                };
            }
        }
    }

    public draw(ctx: CanvasRenderingContext2D): void {
        // Draw afterimages
        for (const img of this.afterimages) {
            ctx.save();
            ctx.translate(img.x, img.y);
            ctx.globalAlpha = img.alpha;
            ctx.fillStyle = '#2F80FF';
            ctx.fillRect(-0.5, -0.7, 1.0, 1.4);
            ctx.restore();
        }

        ctx.save();
        ctx.translate(this.x, this.y);

        // Visual Push Back Effect
        if (this.pushBackVisualTimer > 0) {
            const config = ConfigManager.getConfig();
            const radius = config.abilities.push_back.radius;

            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${this.pushBackVisualTimer * 2})`; // Fade out
            ctx.fill();
            ctx.strokeStyle = '#FFF';
            ctx.lineWidth = 0.05;
            ctx.stroke();
        }

        // VISUAL SPEC: Rotation: Fixed (does NOT rotate)
        // DASH STRETCH: Stretch 1.2x in movement direction
        if (this.isDashing) {
            const angle = Math.atan2(this.dashVector.y, this.dashVector.x);
            ctx.rotate(angle);
            ctx.scale(1.2, 0.85); // Stretch X, squash Y slightly to preserve volume
        }

        // Draw Body (Rectangle)
        // VISUAL SPEC: 1.0 wide, 1.4 high
        const w = 1.0;
        const h = 1.4;

        if (this.damageFlashTimer > 0) {
            ctx.fillStyle = '#FFFFFF';
        } else {
            ctx.fillStyle = '#2F80FF';
        }

        ctx.fillRect(-w / 2, -h / 2, w, h);

        // Outline
        ctx.strokeStyle = '#0B3D91';
        ctx.lineWidth = 0.05;
        ctx.strokeRect(-w / 2, -h / 2, w, h);

        ctx.restore();
    }
}
