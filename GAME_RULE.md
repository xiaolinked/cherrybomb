# 🍒💣 CHERRY BOMB — GAME RULES
## Single Source of Truth (Must Be Followed)

---

## 1. GAME OVERVIEW

- Genre: 2D top-down arena shooter
- Camera: Fixed top-down view
- Mode: Endless survival
- Objective: Survive infinite waves with escalating difficulty

The game focuses on space control, bomb-based threats, and survival under pressure.

---

## 2. CORE GAME MODE

### 2.1 Endless Waves

- The game consists of infinite waves
- Each wave has:
  - A visible countdown timer
  - A defined enemy spawn pattern
- The hero does NOT need to kill all enemies
- A wave is completed when:
  - The wave countdown reaches zero
  - AND the hero is alive

---

### 2.2 Wave End Resolution

When the wave timer ends:

- **Auto-Pauses**: The game enters a "Shop" state where time stops.
- **Auto-Recovery**: Hero HP and Stamina are fully restored.
- **Coin Wipe**: Uncollected coins are removed from the arena.
- **Enemy Clear**: All enemies and bombs are removed.

---

## 3. PLAYER (HERO)

### 3.1 Core Stats

- Health (HP)
  - Starts at 300
- Armor (upgradeable)
- Stamina
  - Starts at 100
  - Regenerates over time
  - Maximum stamina can be increased via upgrades
- **Recovery**: HP and Stamina auto-refill between waves.

---

### 3.2 Inter-Wave Flow

- **Phase Sequence**: Wave End -> Auto-Pause (Shop) -> Space Press -> 2s Countdown -> Next Wave.
- **Visual Feedback**: Pulsing countdown timer before wave starts.

---

### 3.3 Controls

- Free 2D movement
- Independent aiming
- Fire blaster
- Dash (uses stamina)
- Push Back ability

---

### 3.4 Abilities

#### Dash
- Moves hero quickly in a direction
- Consumes stamina
- Cannot be used if stamina is insufficient

#### Push Back
- Active ability
- Pushes enemy units backward by exactly 10 steps
- Works regardless of:
  - Enemy shield state
  - Enemy bomb state
- Does NOT affect detached bombs
- Does NOT deal damage
- Does NOT activate bombs
- Does NOT alter bomb countdowns

---

## 4. WEAPON SYSTEM

### 4.1 Blaster

- Fires straight-line bullets
- Configurable parameters:
  - Bullet speed
  - Bullet damage
  - Fire rate
- Blaster upgrades are unlocked progressively by wave number
- Upgrades are purchased using coins

---

## 5. CURRENCY & UPGRADES

### 5.1 Coins

- Enemies drop coins on death
- Coins are used between waves to upgrade:
  - Blaster stats
  - Abilities
  - Armor
  - Stamina (max value and/or regeneration)

---

## 6. ENEMIES

### 6.1 Enemy Components

Each enemy has:
- A shield (with its own HP bar)
- Enemy HP
- One cherry bomb attached to its back

---

### 6.2 Enemy Behavior

- On spawn:
  - Shield = full
  - HP = full
  - Bomb = unarmed
- Enemies walk slowly toward the hero
- Enemies do NOT deal contact damage while unarmed

---

## 7. SHIELD SYSTEM

### 7.1 Shield Rules

- Shields absorb all bullet damage
- While shield is active:
  - Enemy HP is immune to bullets
  - Bullets cannot activate bombs

---

### 7.2 Shield Break Rule

When shield HP reaches 0:

1. Shield is permanently destroyed
2. Enemy’s bomb is immediately activated
3. Enemy becomes vulnerable to bullet damage

---

## 8. BOMB SYSTEM

### 8.1 Bomb States

Each cherry bomb exists in exactly one of the following states:

1. Unarmed (attached, inert)
2. Armed (attached, glowing, counting down)
3. Detached (on ground, counting down)

---

### 8.2 Bomb Activation Conditions

A bomb becomes armed if ANY of the following occurs:

1. Enemy shield breaks
2. Enemy comes within 10 steps of the hero
3. Enemy is inside the blast radius of another bomb explosion

---

### 8.3 Armed Enemy Behavior

When armed:

- Bomb glows and pulses
- A visible 3-second countdown appears above the enemy
- Enemy switches to aggressive charge behavior
- Countdown continues regardless of:
  - Damage taken
  - Push Back usage
  - Distance from hero

---

## 9. EXPLOSIONS

### 9.1 Explosion Triggers

A bomb explodes immediately when:

1. Countdown reaches 0
2. Armed enemy touches the hero

(Contact = instant explosion)

---

### 9.2 Self-Explosion Rule (CRITICAL)

When an enemy’s own bomb explodes:

- The enemy is guaranteed to die
- Shield value is ignored
- Enemy HP value is ignored
- This rule has NO exceptions

---

## 10. EXPLOSION EFFECTS ON OTHER ENEMIES

For each enemy within the blast radius of an explosion:

---

### Case A: Enemy HAS a Shield

- Shield is instantly removed
- Enemy HP takes NO damage
- Enemy’s bomb is immediately activated
- Distance from explosion center does NOT matter

---

### Case B: Enemy DOES NOT have a Shield

- Enemy steps take radial damage (Falloff applies)
- Enemy bomb is immediately activated (if present)
- If enemy HP ≤ 0:
  - Enemy dies
  - Bomb detaches (if not exploded)

---

## 11. DETACHED BOMBS

- Detached bombs:
  - Are immobile
  - Cannot be pushed by Push Back
  - Continue counting down
  - Explode when countdown reaches zero
- Detached bomb explosions:
  - Affect enemies using the same explosion rules
  - Can trigger chain reactions

---

## 12. HERO DAMAGE RULE

- The hero ONLY takes damage from explosions
- Damage scales by distance from blast center

---

## 13. WAVE SUCCESS CONDITION

- A wave is won by surviving until the wave timer reaches zero
- Killing enemies:
  - Reduces pressure
  - Generates coins
- Killing enemies is NOT required to complete a wave

---

## 14. DESIGN INVARIANTS (NON-NEGOTIABLE)

- Endless mode only
- Survival > kills
- Shields gate bomb activation and bullet damage
- Bomb owners always die in their own explosion
- Shielded enemies never take explosion HP damage
- Explosions spread danger, never resolve it
- Stamina limits dash usage
- Progression is driven by upgrades and player skill

---

## 15. CORE GAME FANTASY

You do not kill enemies directly.  
You decide when bombs activate, where explosions happen,  
and how long you can survive the chaos.

---

END OF GAME_RULE.md