---
name: Serenidad Salud
colors:
  surface: '#fff8f5'
  surface-dim: '#e0d8d5'
  surface-bright: '#fff8f5'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#faf2ee'
  surface-container: '#f4ece8'
  surface-container-high: '#eee7e3'
  surface-container-highest: '#e9e1dd'
  on-surface: '#1e1b19'
  on-surface-variant: '#42474f'
  inverse-surface: '#33302d'
  inverse-on-surface: '#f7efeb'
  outline: '#72777f'
  outline-variant: '#c2c7d0'
  surface-tint: '#35618d'
  primary: '#00375e'
  on-primary: '#ffffff'
  primary-container: '#1f4e79'
  on-primary-container: '#95bff1'
  inverse-primary: '#a0cafc'
  secondary: '#1b6d24'
  on-secondary: '#ffffff'
  secondary-container: '#a0f399'
  on-secondary-container: '#217128'
  tertiary: '#542a00'
  on-tertiary: '#ffffff'
  tertiary-container: '#753d00'
  on-tertiary-container: '#ffa85e'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d1e4ff'
  primary-fixed-dim: '#a0cafc'
  on-primary-fixed: '#001d35'
  on-primary-fixed-variant: '#184974'
  secondary-fixed: '#a3f69c'
  secondary-fixed-dim: '#88d982'
  on-secondary-fixed: '#002204'
  on-secondary-fixed-variant: '#005312'
  tertiary-fixed: '#ffdcc3'
  tertiary-fixed-dim: '#ffb77d'
  on-tertiary-fixed: '#2f1500'
  on-tertiary-fixed-variant: '#6e3900'
  background: '#fff8f5'
  on-background: '#1e1b19'
  surface-variant: '#e9e1dd'
typography:
  display-lg:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 34px
  headline-sm:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 30px
  body-xl:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 32px
  body-lg:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 28px
  label-lg:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 18px
    fontWeight: '700'
    lineHeight: 26px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1.25rem
  space-xs: 0.5rem
  space-sm: 0.75rem
  space-md: 1.25rem
  space-lg: 1.75rem
  space-xl: 2.5rem
---

## Brand & Style

This design system is tailored specifically for elderly adults tracking their health, vitals, and medication routines in Spanish. The aesthetic ethos blends high-accessibility functionalism with the dignified warmth of classical editorial care. Rather than feeling sterile, clinical, or overly technical, the interface radiates clarity, safety, calm, and absolute dependability.

### Target Audience & Psychology
The primary users are seniors (ages 65+) experiencing varying degrees of presbyopia, reduced contrast sensitivity, mild motor tremors, and potential cognitive overload from complex navigation paradigms. Secondary users include family caregivers and geriatric nurses. The system eliminates anxiety through unhurried pacing, clear affordances, explicit text-with-icon confirmations, and zero hidden interactions (no mystery meat navigation, no pull-to-refresh without explicit buttons, and no swipe-only gestures).

### Design Style: Tactile & High-Contrast Editorial
- **Visual Weight:** Solid, comforting, grounded blocks of color. Avoid faint hairline borders, low-contrast pastel washouts, or floating transparent panels.
- **Tone:** Resolute, warm, polite, and reassuring. All copy and labels are written in respectful, unambiguous Spanish (*"Tomar medicina"*, *"Llamar a emergencias"*, *"Guardar registro"*).
- **Physicality:** Interactive elements look unequivocally pressable with distinct active states and clear spatial definition.

## Colors

The palette prioritizes AAA-compliant optical contrast, soothing visual comfort, and definitive semantic roles. The baseline background is a soft alabaster warm white, intentionally chosen to avert the glare and eye fatigue associated with stark digital white (`#FFFFFF`).

### Palette Application Roles
- **Canvas / Surface Baseline (`#FAF9F6`):** Warm white, matte finish. Provides a gentle, non-glare foundation across all primary screens.
- **Surface Elevated (`#FFFFFF`):** Reserved for card containers and interactive surface tiles to establish instant spatial separation against `#FAF9F6`.
- **Primary Navy (`#1F4E79`):** Authoritative, calm, dependable. Used for top app bars, primary action buttons, focused tab states, and key navigational milestones. Exceeds 7:1 contrast on white and alabaster surfaces.
- **Secondary / Success Green (`#2E7D32`):** Positive confirmation, completed medication doses, stable vital readings, and safe ranges. Evokes relief and vitality.
- **Tertiary / Warning Amber (`#D97706`):** Upcoming dose reminders, pending measurements, and moderate caution indicators without provoking panic.
- **Emergency / Critical Red (`#DC2626`):** Dedicated exclusively to immediate assistance, missed vital thresholds, and emergency call triggers.
  - **Emergency Banner Background:** `#FEE2E2` (Soft red container).
  - **Emergency Banner Text & Icon:** `#991B1B` (Deep crimson text, exceeding 7.5:1 contrast against `#FEE2E2`).
- **Neutrals & Content Contrast:**
  - **Text Primary (`#1C1917`):** Near-black warm stone. Delivers maximum contrast (14:1+) for body text and headers.
  - **Text Secondary (`#44403C`):** Dark slate stone for secondary descriptive labels (still meets 7:1 contrast against card surfaces). Never drop text below this threshold.
  - **Dividers & Structural Borders (`#D6D3D1`):** Substantial 2px dividing lines between list items and input field perimeters.

## Typography

Typography is the backbone of this design system. It uses **Atkinson Hyperlegible Next** across all tiers, a typeface engineered by the Braille Institute specifically for low-vision readers to maximize letterform distinction (differentiating ambiguous characters like 'I', 'l', '1', and '0' / 'O').

### Readability Guarantees
- **Absolute Minimums:** The baseline body size never drops below `18px`, with a generous line-height of `28px` to ensure effortless scannability and eye tracking. Titles begin at `28px`.
- **Label Minimums:** Micro-text or sub-14px annotations are strictly prohibited. Even supporting metadata (such as time stamps or unit measures like *"mg"* or *"mm Hg"*) must be set at minimum `16px` with medium or bold weights.
- **Letter Spacing & Casing:** Uppercase transformations (all-caps) are prohibited beyond acronyms. Sentence casing or title casing ensures standard character ascenders and descenders remain intact for word recognition.

## Layout & Spacing

The layout philosophy centers on a comfortable, single-column fluid flow optimized for thumb access, visual isolation, and error-free tapping. Elements are given breathing room to avoid accidental mis-taps.

### Layout Mechanics
- **Single-Column Primacy:** In mobile viewports, multi-column side-by-side data grids are avoided. Content stacks vertically in sequential, narrative blocks.
- **Screen Margins:** Fixed at `1.25rem` (20px) on mobile, widening to `2rem` (32px) on larger tablets.
- **Stack Spacing:** Inter-card vertical margin is set uniformly to `1.25rem` (20px) to prevent cognitive crowding.
- **Target Cushioning:** Every actionable element maintains an outer clearance buffer of at least `0.75rem` (12px) around its tap target perimeter.

## Elevation & Depth

To avoid optical haze, blur illusions, and visual confusion for older eyes, elevation relies on clean, tonal layering combined with tactile, low-blur ambient offsets and crisp structural borders.

### Depth Rules
- **No Complex Blurs or Glassmorphism:** Translucent materials and backdrop blurs reduce contrast and confuse depth perception. They are strictly excluded.
- **Card Tiering:**
  - Base canvas: `#FAF9F6`.
  - Resting cards: Solid `#FFFFFF` fill with a subtle 2px border in `#E7E5E4` and a soft tactile drop shadow (`box-shadow: 0 3px 6px -1px rgba(28, 25, 23, 0.08)`).
  - Pressed / Active card state: Depth flattens, border color darkens to `#1F4E79` (2px), providing unmistakable physical feedback.
- **Emergency and Alert Overlay Surfaces:** Float with an intentional 4px solid perimeter outline and elevated contrast drop shadow (`0 8px 24px rgba(28, 25, 23, 0.16)`) to focus user attention unequivocally.

## Shapes

The design system employs a soft, friendly, and structured corner language (`roundedness: 2`). Sharp 90-degree corners feel too clinical, while full pill rounds can make text-heavy buttons feel unstable or visually crowded.

### Radii Hierarchy
- **Standard Cards & Alert Containers:** `16px` radius (`rounded-lg`), delivering a soft, non-threatening aesthetic.
- **Buttons & Interactive Touch Surfaces:** Exactly `16px` radius. This maintains structural stability across varied button widths while framing clear inner text margins.
- **Checkboxes & Selection Tiles:** `12px` rounded square format. This preserves maximum usable checkmark interior surface compared to round alternatives.
- **Badges and Status Chips:** `10px` radius.

## Components

Every interactive element is designed to accommodate tremors, reduced dexterity, and lower vision. Touch target minimums strictly enforce a 56px height, and every icon is accompanied by a textual explanation.

### 1. Buttons
- **Touch Target & Sizing:** Minimum height is `56px` (ideal `64px` for primary calls to action). Minimum width spans the full container width on mobile or 180px for inline dialogs.
- **Primary Button:** Background `#1F4E79`, text and icon `#FFFFFF`, font size `20px` bold, icon size `28px` placed with `12px` gap. Corner radius `16px`.
- **Secondary Button:** Background `#FFFFFF`, 2.5px solid border `#1F4E79`, text and icon `#1F4E79`.
- **Emergency / Urgent Button:** Background `#DC2626`, text `#FFFFFF`, height `64px`. Displays an unambiguous medical cross or phone receiver icon next to bold text (e.g., *"Llamar a Emergencias (112 / 911)"*).
- **Affordance Feedback:** Clear active state: drops 2px downward on tap with border highlight.

### 2. Navigation & Navigation Bar
- **No Hidden Menus:** Hamburger drawers, swipe gestures, and nested hover sub-menus are completely banned.
- **Bottom Navigation Dock:** Fixed bottom bar featuring maximum 4 major destinations with permanent labels (e.g., *"Inicio"*, *"Medicinas"*, *"Mi Salud"*, *"Ayuda"*).
- **Target Size:** Bottom navigation items have a minimum height of `64px`, featuring a `30px` icon stacked over a `16px` bold label. Active item indicated with `#1F4E79` icon/text and an active top bar indicator (4px thick).

### 3. Cards & Information Tiles
- **Structure:** Crisp white (`#FFFFFF`) surface set over `#FAF9F6`. Padded with `1.25rem` (20px) internally.
- **Medication Card Example:** Features a prominent time badge (e.g., *"08:00 AM"* in 22px bold), medicine name in 24px bold, dosage in 18px body, and a dedicated, full-width `56px` action button: *"Marcar como tomada"* with a checkmark icon.

### 4. Checkboxes, Radios & Switches
- **Target Dimensions:** The tap target encompasses the entire card row (minimum `64px` row height), not just the tiny box indicator.
- **Box Size:** The visual checkbox or radio glyph is oversized at `32px × 32px` with a 3px border in `#1F4E79`.
- **Checked State:** Checkbox fills with `#2E7D32` and a thick, high-contrast white checkmark icon (4px stroke).

### 5. Input Fields
- **Height & Spacing:** Minimum input container height is `58px`.
- **Borders & Labels:** Persistent top label in `18px` bold `#1C1917` (no floating labels that disappear or shrink). Border is 2px solid `#78716C`, expanding to 3.5px solid `#1F4E79` on focus.
- **Input Text:** Set in `22px` for immediate legibility while typing. Numerical inputs (blood pressure, glucose) feature large dedicated keypad buttons.

### 6. Banners & Notifications
- **Emergency Red Banner:** Container `#FEE2E2`, border `2px solid #DC2626`, text `#991B1B` (`20px` bold), paired with a large `32px` caution shield icon. Contains direct single-tap resolve action.
- **Positive Confirmation Toast:** Container `#DCFCE7`, border `2px solid #2E7D32`, text `#14532D` (`18px` medium), reassuring the user that their data was saved successfully.