# Mobile Virtual Thumbstick, Top-Bar Zen View & Full Manual Flight Control

This update upgrades the Tesla Roadster C-Ramp Stunt Game with a mobile-first **Virtual Analog Thumbstick + Right Pedal Cluster**, a clean **Top-Bar Zen View toggle** that completely clears the bottom screen edge for thumb controls, and **full manual mid-air steering, roll-flip, and pitch physics** where the player must actively flip the car upright and steer onto the landing runway.

## User Review & Critical Decisions

> [!IMPORTANT]
> All core design and gameplay preferences have been confirmed through your selections and are incorporated below:

- **Confirmed Decision 1 (Mid-Air Flight & Road Landing Control)**: **Full manual steering, roll flip, and pitch control** — After launching upside-down (`180°`) off the C-ramp overhang, the car is no longer locked to a straight centerline or auto-landed. The player controls lateral road steering, roll rotation (flipping from `180°` upside-down to `0°` upright), and nose pitch to land squarely inside the 34m-wide asphalt runway.
- **Confirmed Decision 2 (Mobile Controller Layout)**: **Virtual thumbstick on left and pedals on right** — A multi-touch 2-axis virtual analog joystick on the bottom-left controls proportional steering, mid-air roll flip, and pitch, paired with an ergonomic right-thumb pedal cluster (Gas Pedal, 10-CGT SpaceX Boost/Hover, and context-aware Drift / Flip Roll action).
- **Confirmed Decision 3 (Zen View Behavior)**: **Collapse dock into a sleek top bar icon** — When collapsed into Zen View, the bottom Roadster Studio & Camera dock completely disappears from the bottom of the screen (`0px` bottom obstruction) and is controlled by a sleek toggle button in the top bar.

---

## 1. Overview & Core Concept

- **What It Does**: Transforms the post-launch flight phase from a scripted straight-line glide into a skill-based 3D flight and landing challenge, backed by responsive analog mobile thumb controls and an unobstructed viewport.
- **Target Audience / Persona**: Mobile touchscreen and desktop players competing in the Daily $10 Longest Jump Challenge who want tactile, responsive vehicle and thruster control.
- **Key Value**: Every meter of jump distance and every smooth landing is earned by the player's own hands—steering onto the C-ramp, flipping the inverted Roadster right-side-up in mid-air, countering lateral drift to line up with the runway, and cushioning the touchdown.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Staging & Launch**: The player holds the right-side **Gas Pedal** and **10-CGT Boost** button while using the **Left Virtual Thumbstick** to steer dead-center into the base of the towering C-Ramp.
  2. **Inverted C-Ramp Climb (`0° → 90° → 170°`)**: As the Roadster climbs the vertical wall and glides upside-down along the 170° overhang, lateral steering inputs determine the exact entry line and launch vector off the lip.
  3. **Manual Mid-Air Flip & Runway Alignment**: Launching upside-down (`180°` roll) at ~109 ft altitude with natural lateral drift, the player moves the **Virtual Thumbstick horizontally** (or taps the **Flip/Roll CGT button**) to fire the lateral Cold-Gas Thrusters, rolling the car right-side-up (`0°`) and steering left/right so the car stays aligned over the asphalt runway. Moving the **Thumbstick vertically** pitches the nose up to stretch glide distance or levels it for landing.
  4. **On-Road vs. Off-Road Touchdown**: Landing upright (`roll < 25°`, `pitch < 16°`) within the red-bordered asphalt runway (`|X| ≤ 16m`) awards a **Smooth On-Road Landing (`1.30x` bonus)**; drifting off the runway into the desert (`|X| > 16m`) or landing inverted triggers an **Off-Track / Rollover Crash** penalty.
  5. **Zen View Toggle**: Clicking or tapping the **Studio / Zen View** button in the top navigation bar smoothly opens or completely hides the customization and camera drawer, keeping the bottom thumb zone 100% clear during gameplay.

- **Visual Identity & Theme**:
  - *Aesthetic Direction*: High-contrast SpaceX / Tesla aerospace telemetry interface with tactile glassmorphic touch hardware (`bg-black/45 backdrop-blur-md border border-white/15`).
  - *Color Palette & Mood*: Deep night proving-ground canvas (`#070A12`), structural obsidian HUD surfaces (`rgba(10, 14, 23, 0.78)`), electric cyan thruster accents (`#06B6D4`), racing red throttle highlights (`#EF4444`), and amber tournament callouts (`#F59E0B`).
  - *Typography & Hierarchy*: Bold geometric display labels paired with tabular monospace telemetry (`font-mono tabular-nums`) so speed, altitude, roll angle, and runway alignment read at a glance without layout jitter.
  - *Component Styling & Layout*:
    - Adheres strictly to the **15% Mobile Sticky Cap** when in Zen View: the compact top bar occupies `< 48px` height, while the bottom-left Virtual Thumbstick and bottom-right Pedals float transparently in the natural thumb reach zone (`bottom-4 left-4` and `bottom-4 right-4`) with zero solid bar blocking the 3D scene.

- **Interactive Feedback & Motion**:
  - **Virtual Thumbstick**: Spring-centered analog puck with live directional ring glow, vector line indicator, and mobile haptic vibration ticks (`navigator.vibrate`) when crossing upright attitude lock or firing thrusters.
  - **Live Flight & Runway Guidance HUD**: A compact floating attitude & runway alignment indicator at top-center shows whether the car is **UPSIDE DOWN (ROLL TO FLIP!)** or **UPRIGHT**, and whether its flight vector is **ON RUNWAY** or **DRIFTING OFF-TRACK (STEER LEFT/RIGHT!)**.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Proportional 2-Axis Analog Input (`steerX`, `pitchY`) + Quick-Flip Thruster Assist**
  - *Chosen Approach*: Upgrade `PlayerInput` to support continuous analog values (`analogX: -1..1`, `analogY: -1..1`) from the mobile Virtual Thumbstick (while mapping keyboard `WASD`/Arrows to smooth ramped analog values), plus a dedicated **Flip Upright / 360° Roll** thruster button on the right cluster.
  - *Why*: Pure binary buttons on mobile feel jerky when trying to line up a 220+ mph flying car with a runway and level its roll angle simultaneously. A 2-axis thumbstick gives smooth, proportional control over both roll/steering (`analogX`) and pitch (`analogY`).
  - *Alternatives Considered*: Separate D-pad buttons for pitch and roll (rejected because 4 separate directional buttons on the left thumb are hard to press simultaneously without looking).

- **Decision 2: True Lateral Velocity & Off-Road Boundary Physics in Mid-Air**
  - *Chosen Approach*: Preserve lateral velocity (`velocity.x`) upon launching off the C-ramp lip, introduce a subtle high-altitude crosswind/launch drift if the car wasn't perfectly centered on the ramp, and let player horizontal input (`analogX`) vector the SpaceX lateral Cold-Gas Thrusters to accelerate `velocity.x` left/right and rotate `rollAngle`.
  - *Why*: Directly fulfills the requirement that jumping from the ramp does not automatically fly straight down the road—the player has genuine agency and responsibility to steer the car over the road and flip it upright before touchdown.
  - *Alternatives Considered*: Auto-centering `position.x` toward `0` (the previous behavior, which made missing the road impossible).

- **Decision 3: Top-Bar Zen View Icon with Complete Bottom Unmounting**
  - *Chosen Approach*: Move the Roadster Studio / Camera dock toggle into the Top Bar and completely hide (`pointer-events-none opacity-0 translate-y-full`) the bottom dock when collapsed, rather than leaving a 34px tab sticking up at the bottom of the viewport.
  - *Why*: Eliminates visual clutter at the bottom edge and prevents accidental taps on the dock tab while using the mobile thumbstick or pedals.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:
```
┌─────────────────────────────────────────────────────────────────────────┐
│                              App State & Refs                           │
│  • inputStateRef (analogX, analogY, accelerate, brake, boost)           │
│  • isStudioDockOpen (Zen View toggle state — defaults to closed on mob) │
└───────────────┬─────────────────────────────────────────┬───────────────┘
                │                                         │
                ▼                                         ▼
┌───────────────────────────────────────┐ ┌───────────────────────────────┐
│             HUD Component             │ │     GameCanvas & Physics      │
│ ┌───────────────────────────────────┐ │ │ ┌───────────────────────────┐ │
│ │ Top Bar: Brand · $10 Prize ·      │ │ │ │ Inverted C-Ramp Climb     │ │
│ │          Board · [Studio / Zen]   │ │ │ │ (Lateral X + Entry Line)  │ │
│ └───────────────────────────────────┘ │ │ └─────────────┬─────────────┘ │
│ ┌───────────────────────────────────┐ │ │               ▼               │
│ │ Flight & Runway Alignment Reticle │ │ │ ┌───────────────────────────┐ │
│ │ (Roll Status + On-Road Corridor)  │ │ │ │ Manual Airborne Physics   │ │
│ └───────────────────────────────────┘ │ │ │ • Manual Roll (180° -> 0°)│ │
│ ┌─────────────────┐ ┌───────────────┐ │ │ │ • Lateral CGT Road Steer  │ │
│ │ Left Thumb Zone │ │ Right Pedals  │ │ │ │ • Manual Pitch & Hover    │ │
│ │ 2-Axis Virtual  │ │ • Gas [W]     │ │ │ └─────────────┬─────────────┘ │
│ │ Analog Joystick │ │ • Boost [SPC] │ │ │               ▼               │
│ │ (Steer/Roll/Pit)│ │ • Flip/Drift  │ │ │ ┌───────────────────────────┐ │
│ └─────────────────┘ └───────────────┘ │ │ │ On-Road vs Off-Road       │ │
└───────────────────────────────────────┘ │ │ Touchdown & Rollout Grade │ │
                                          │ └───────────────────────────┘ │
                                          └───────────────────────────────┘
```

- **Data Model & State**:
  - `PlayerInput`: Extended with `analogX: number` (`-1` left to `+1` right) and `analogY: number` (`-1` nose down/forward to `+1` nose up/pull back).
  - `Telemetry`: Extended with `lateralOffsetMeters: number` (signed distance from runway centerline `X = 0`), `isAlignedWithRunway: boolean` (`|X| <= 16.5m`), and `isUprightReady: boolean` (`normRollDeg < 28°`).
  - `isStudioDockOpen`: Boolean state in `App` controlling the Studio/Camera drawer visibility, toggled from the Top Bar button and auto-minimized into Zen View when the player starts accelerating.

- **Interactive Component & State Mapping**:
  - **Virtual Analog Thumbstick (`HUD`)**: Captures `onPointerDown`, `onPointerMove`, and `onPointerUp/Cancel` with `setPointerCapture` so dragging outside the ring maintains smooth 60fps control. Computes normalized `(dx, dy)` within a `48px` max radius, updates `inputStateRef.current.analogX` and `analogY`, and resets to `(0, 0)` on release.
  - **Right Pedal Cluster (`HUD`)**: Multi-touch independent pointer handlers for **Gas**, **10-CGT Boost**, and **Drift / Flip Upright**. Tapping **Flip Upright** in mid-air imparts an immediate angular roll impulse toward `0°` upright while consuming a burst of N2 pressure.
  - **Manual Mid-Air Physics (`PhysicsEngine`)**:
    - Launches off the 170° C-ramp lip at `roll = 180°` (upside-down) with lateral velocity `velocity.x` derived from ramp steering plus a slight launch drift (`±3.5 m/s`) so the player must actively steer and roll.
    - Horizontal input (`analogX` or `A`/`D`) applies both **roll torque** (to flip the car from `180°` to `0°` upright) and **lateral SpaceX thruster force** (`accelX`) to steer the car over the `+Z` landing runway.
    - Touchdown handler checks both attitude (`pitchDeg`, `normRollDeg`) and runway bounds (`|position.x| <= 16.5m`). Landing outside the runway bounds (`|position.x| > 16.5m`) triggers an `'offroad'` / `'crash'` grade with dirt/smoke spray and a clear prompt in the result modal.
