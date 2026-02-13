# HOT ZONE — SHAPE-ONLY VISUAL SPEC (MVP)

This document defines the exact visual rules for the shape-only prototype.
All values are intentional and should be followed unless explicitly changed.

---

## 1. HERO (PLAYER)

### Shape
- Type: Rectangle
- Width: 1.0 units
- Height: 1.4 units
- Rotation: Fixed (does NOT rotate)

### Color
- Fill: #2F80FF (Blue)
- Outline:
  - Color: #0B3D91
  - Thickness: 0.05 units

### States
- Normal:
  - Solid blue
- Damaged:
  - Flash white for 0.08 seconds
- Dash:
  - Stretch 1.2× in movement direction
  - Blue motion trail
  - Afterimage (2–3 frames)

---

## 2. ENEMY

### Shape
- Type: Triangle
- Base width: 1.2 units
- Height: 1.4 units
- Orientation:
  - Always points toward the hero

### Color
- Fill: #FFD84D (Yellow)
- Outline:
  - Color: #8A6A00
  - Thickness: 0.05 units

---

### Shielded State
- Shield visual:
  - Shape: Circle outline
  - Radius: 1.6 units
  - Color: #4DFFF3 (Cyan)
  - Opacity: 70%
- Shield hit feedback:
  - Cyan spark
  - Ripple effect on shield

---

### Armed State
- Bomb becomes visible on enemy back
- Enemy triangle:
  - Slight shake (±2° rotation)
  - +10% color saturation

---

## 3. CHERRY BOMB

### Shape
- Type: Circle
- Radius: 0.35 units
- Position: Offset behind enemy center

### Colors
- Unarmed:
  - #8B1E1E (Dark red)
- Armed:
  - #FF3B3B (Bright red)
  - Pulsing glow

---

### Countdown Display
- Values: 3 → 2 → 1
- Text color: White
- Text outline: Black
- Pulse speed increases as countdown decreases

---

## 4. EXPLOSION

### Visual
- Shape: Expanding circle
- Max radius: 4.5 units
- Duration: 0.25 seconds

### Color Gradient
- Center: #FFF2A8
- Mid: #FF9933
- Edge: #FF3B3B

### Effects
- Ring outline at max radius
- Screen shake (light)
- Hit stop: 0.05 seconds

---

## 5. VISUAL FEEDBACK RULES

### Bullet Hits
- Shielded enemy:
  - Cyan spark
  - Shield ripple
- Unshielded enemy:
  - Orange flash
  - Enemy flashes white briefly

---

### Bomb Feedback
- Bomb activation:
  - Immediate color change
  - Countdown appears instantly
- Near explosion:
  - Faster pulsing
  - Subtle screen darkening near blast

---

### Push Back
- Visible impulse wave
- Enemy slides back smoothly
- Dust trail during movement

---

### Dash
- Blue streak trail
- Afterimage frames
- Stamina bar flashes when used

---

### Shield Break (CRITICAL)
- Shield shatters outward
- Sharp, distinct sound
- Bomb immediately lights up

This moment must feel dangerous, not rewarding.
