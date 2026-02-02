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
            const dashDist = config.abilities.dash.distance;
            const dashSpeed = dashDist / config.abilities.dash.duration;

            this.x += this.dashVector.x * dashSpeed * dt;
            this.y += this.dashVector.y * dashSpeed * dt;

            if (this.dashTimer <= 0) {
                this.isDashing = false;
                this.staminaRegenTimer = config.hero.stamina.regen_delay_after_dash;
            }
            return;
        }

        // Push Back Input (E or Virtual Button)
        if ((input.keys['e'] || input.buttons.pushBack) && this.pushBackCooldownTimer <= 0) {
            this.performPushBack(game);
            this.pushBackCooldownTimer = config.abilities.push_back.cooldown;
            this.pushBackVisualTimer = config.abilities.push_back.visual_duration; // Visual ring duration
        }

        // Manual Reload (R or Virtual Button)
        if ((input.keys['r'] || input.buttons.reload) && this.reloadTimer <= 0 && this.ammo < this.maxAmmo) {
            this.reloadTimer = config.blaster.reload_time;
            AudioManager.playReload();
        }

        // Shooting
        let isShooting = false;
        let aimX = input.mouseWorld.x;
        let aimY = input.mouseWorld.y;

        if (input.isTouchDevice) {
            // Use Right Stick
            if (input.stickRight.active) {
                const dist = Math.sqrt(input.stickRight.x * input.stickRight.x + input.stickRight.y * input.stickRight.y);
                if (dist > 0.3) { // Deadzone
                    isShooting = true;
                }
            }
        } else {
            // Mouse
            isShooting = input.mouse.leftDown;
        }

        if (isShooting && this.fireTimer <= 0 && this.reloadTimer <= 0) {
            if (this.ammo > 0) {
                this.ammo--;
                this.fireTimer = config.blaster.fire_rate;

                // Aim Logic
                let baseAngle = 0;
                if (input.isTouchDevice && input.stickRight.active) {
                    baseAngle = Math.atan2(input.stickRight.y, input.stickRight.x);
                } else {
                    baseAngle = Math.atan2(aimY - this.y, aimX - this.x);
                }

                // Multishot Logic
                const spread = config.blaster.multishot_spread_radians;

                for (let i = 0; i < this.multishot; i++) {
                    const offset = (i - (this.multishot - 1) / 2) * spread;
                    const angle = baseAngle + offset;
                    const targetX = this.x + Math.cos(angle) * config.blaster.multishot_target_distance;
                    const targetY = this.y + Math.sin(angle) * config.blaster.multishot_target_distance;

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
            // Check for Dash Input (Shift or Space or Virtual Button)
            if ((input.keys['shift'] || input.keys[' '] || input.buttons.dash) &&
                this.dashCooldownTimer <= 0 &&
                this.stamina >= config.abilities.dash.stamina_cost) {

                // Trigger Dash
                this.isDashing = true;
                this.dashTimer = config.abilities.dash.duration;
                this.dashCooldownTimer = config.abilities.dash.cooldown;
                this.dashVector = { ...axis };
                this.stamina -= config.abilities.dash.stamina_cost;
            } else {
                // Move
                const moveSpeed = config.hero.move_speed;
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
            this.afterimages.push({ x: this.x, y: this.y, alpha: config.ui.hero.afterimage_alpha });
        }
        for (let i = this.afterimages.length - 1; i >= 0; i--) {
            this.afterimages[i].alpha -= dt * config.ui.hero.afterimage_fade_rate;
            if (this.afterimages[i].alpha <= 0) this.afterimages.splice(i, 1);
        }
    }

    private performPushBack(game: Game) {
        const config = ConfigManager.getConfig();
        const radius = config.abilities.push_back.radius;
        const pushDist = config.abilities.push_back.distance;

        console.log("PUSH BACK!");

        for (const enemy of game.enemies) {
            if (this.distanceTo(enemy) <= radius) {
                const dx = enemy.x - this.x;
                const dy = enemy.y - this.y;
                const angle = Math.atan2(dy, dx);
                enemy.x += Math.cos(angle) * pushDist;
                enemy.y += Math.sin(angle) * pushDist;
            }
        }
    }

    private damageFlashTimer: number = 0;

    public takeDamage(amount: number, source?: Bomb) {
        // Global safety: don't take damage if hero is already dead
        if (this.isDead) return;

        const config = ConfigManager.getConfig();
        const reduction = config.hero.armor.damage_reduction_percent;
        const finalDamage = amount * (1.0 - reduction);

        this.hp -= finalDamage;
        this.damageFlashTimer = config.ui.hero.damage_flash_duration;
        AudioManager.playHit();

        if (this.hp <= 0 && !this.isDead) {
            this.hp = 0;
            this.isDead = true;

            if (source) {
                const originalParent = (source as any).originalParent;
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
        const config = ConfigManager.getConfig();
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

        // Bloom Effect
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#2F80FF';

        // Visual Push Back Effect
        if (this.pushBackVisualTimer > 0) {
            const radius = config.abilities.push_back.radius;
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${this.pushBackVisualTimer * 2})`; // Fade out
            ctx.fill();
            ctx.strokeStyle = '#FFF';
            ctx.lineWidth = 0.05;
            ctx.stroke();
        }

        if (this.isDashing) {
            const angle = Math.atan2(this.dashVector.y, this.dashVector.x);
            ctx.rotate(angle);
            ctx.scale(1.2, 0.85);
        }

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

        // --- DRAW BLASTER (On Top) ---
        const input = InputManager.getInstance();
        let aimAngle = 0;

        if (input.isTouchDevice && input.stickRight.active) {
            aimAngle = Math.atan2(input.stickRight.y, input.stickRight.x);
        } else {
            aimAngle = Math.atan2(input.mouseWorld.y - this.y, input.mouseWorld.x - this.x);
        }

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(aimAngle);

        ctx.fillStyle = '#444';
        ctx.fillRect(0.2, -0.15, 0.9, 0.3);
        ctx.fillStyle = '#666';
        ctx.fillRect(0.2, -0.08, 0.25, 0.16);

        ctx.strokeStyle = '#111';
        ctx.lineWidth = 0.05;
        ctx.strokeRect(0.2, -0.15, 0.9, 0.3);
        ctx.restore();
    }
}
