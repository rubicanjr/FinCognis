# Design System Specification: The Luminous Vault

## 1. Overview & Creative North Star
This design system is built to convey the prestige and security of high-end finance through a cinematic, atmospheric lens. We are moving away from the "flat SaaS" trend toward a **Creative North Star we call "The Luminous Vault."**

The experience is defined by deep, obsidian-like surfaces, purposeful lighting, and high-contrast editorial typography. We break the standard grid-bound template by using intentional asymmetry, overlapping "glass" containers, and focal glows that guide the user’s eye toward critical financial data. This is not just a tool; it is a premium digital environment that feels physical, heavy, and authoritative.

---

## 2. Colors
Our palette is rooted in the depth of the night. It uses high-contrast light-blue and silver accents to punctuate an otherwise dark, immersive space.

*   **Core Tones:** The foundation is `background` (#111417), a deep charcoal-navy. The `primary` (#c6c6c7) acts as our "Metalic Silver," providing high-contrast readability, while `secondary` (#9ecaff) provides the "Electric Blue" glow characteristic of modern fintech.
*   **The "No-Line" Rule:** To maintain a premium feel, 1px solid borders are prohibited for sectioning. Boundaries must be defined solely through background color shifts. For example, a `surface-container-low` section should sit adjacent to a `surface` background to create a visible but soft distinction.
*   **Surface Hierarchy & Nesting:** Treat the UI as a series of stacked sheets. 
    *   Background: `surface`
    *   Primary Content Areas: `surface-container-low`
    *   Floating Cards/Modals: `surface-container-high` or `highest`
    *   This nesting creates natural depth without the need for noisy structural lines.
*   **The "Glass & Gradient" Rule:** Floating elements should utilize Glassmorphism. Use semi-transparent `surface-container` colors (60-80% opacity) with a `backdrop-blur` of 12px–20px. 
*   **Signature Textures:** Apply a subtle radial gradient transitioning from `secondary_container` to `surface` at 5% opacity in the top-center of major screens to mimic a spotlight effect, as seen in the "AuthKit" inspiration.

---

## 3. Typography
We utilize a dual-font strategy to balance character with precision.

*   **Display & Headlines (Manrope):** This is our "Editorial" voice. Manrope’s wide, modern stance should be used for large titles (`display-lg` to `headline-sm`). Use it to command attention.
*   **Body & Labels (Inter):** For data-heavy financial tables and functional UI, Inter provides surgical legibility. It is the "Workhorse" that keeps the interface grounded.
*   **Visual Hierarchy:** Always pair a `display-md` headline in `on_surface` with a `label-md` in `on_tertiary_container` to create an "Overline" effect. This creates an authoritative, high-end typographic stack.

---

## 4. Elevation & Depth
Depth in this system is an atmospheric quality, not a structural one.

*   **The Layering Principle:** Place a `surface-container-lowest` card inside a `surface-container-low` section. This "recessed" look is more sophisticated than a standard shadow.
*   **Ambient Shadows:** For floating components (Modals, Dropdowns), use extra-diffused shadows. 
    *   *Formula:* `0px 24px 48px -12px rgba(0, 0, 0, 0.5)`. 
    *   The shadow color should never be pure black; it should be a deep tint of our `surface_container_lowest`.
*   **The "Ghost Border" Fallback:** If a border is required for accessibility, it must be a **Ghost Border**. Use the `outline_variant` token at 15% opacity. It should be felt, not seen.
*   **Light Edges:** To simulate a "glass edge," apply a 1px top-stroke to containers using `primary` at 10% opacity. This mimics how light catches the edge of a physical glass pane.

---

## 5. Components

### Buttons
*   **Primary:** A subtle gradient from `secondary` to `secondary_container`. Text in `on_secondary`. Use `md` (0.375rem) roundedness.
*   **Secondary:** Ghost style. No background, `outline` border at 20% opacity. On hover, transition to `surface-bright`.
*   **Tertiary:** Text-only in `secondary`. No border. Reserved for low-priority actions like "Cancel."

### Input Fields
*   **Base:** Background should be `surface-container-highest`. 
*   **State:** On focus, the border (Ghost Border) should illuminate to `secondary` with a 4px outer "glow" (a soft shadow using `secondary` at 20% opacity).
*   **Typography:** Helper text must be `label-sm` using `on_surface_variant`.

### Cards & Lists
*   **Constraint:** Forbid divider lines.
*   **Execution:** Separate list items using vertical whitespace (16px–24px) or by alternating background tiers (e.g., `surface-container-low` to `surface-container-lowest`).
*   **Interaction:** On hover, a card should transition its background to `surface-bright` and subtly scale by 1.01% to simulate "lift."

### Chips
*   **Action Chips:** Use `surface-container-high` with `label-md` typography. 
*   **Selection:** When active, fill with `secondary_container` and use a `secondary` glow effect.

---

## 6. Do’s and Don’ts

### Do
*   **Do** use asymmetrical layouts for landing pages (e.g., text aligned left, 3D element overlapping the right margin).
*   **Do** use "Spotlight" glows. A soft, large radial gradient behind a primary card makes it feel like the center of the vault.
*   **Do** prioritize `on_surface_variant` for secondary text to maintain the "dark" aesthetic without losing readability.

### Don’t
*   **Don’t** use pure white (#FFFFFF) for text. Always use `on_surface` (#e1e2e7) to reduce eye strain in dark mode.
*   **Don’t** use sharp corners. Always stick to the `md` (0.375rem) or `lg` (0.5rem) roundedness scale to keep the UI feeling approachable yet modern.
*   **Don’t** use high-opacity borders. They break the "Luminous" effect and make the UI look like a legacy enterprise app.
*   **Don’t** use standard "drop shadows" with 0 blur. Shadows must be ambient and expansive.