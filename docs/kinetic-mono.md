---
name: Kinetic Mono
colors:
  surface: '#f9f9ff'
  surface-dim: '#d3daea'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eefe'
  surface-container-high: '#e2e8f8'
  surface-container-highest: '#dce2f3'
  on-surface: '#151c27'
  on-surface-variant: '#4c4546'
  inverse-surface: '#2a313d'
  inverse-on-surface: '#ebf1ff'
  outline: '#7e7576'
  outline-variant: '#cfc4c5'
  surface-tint: '#5e5e5e'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1b1b1b'
  on-primary-container: '#848484'
  inverse-primary: '#c6c6c6'
  secondary: '#555f6f'
  on-secondary: '#ffffff'
  secondary-container: '#d6e0f3'
  on-secondary-container: '#596373'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#002113'
  on-tertiary-container: '#009668'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2e2e2'
  primary-fixed-dim: '#c6c6c6'
  on-primary-fixed: '#1b1b1b'
  on-primary-fixed-variant: '#474747'
  secondary-fixed: '#d9e3f6'
  secondary-fixed-dim: '#bdc7d9'
  on-secondary-fixed: '#121c2a'
  on-secondary-fixed-variant: '#3d4756'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#f9f9ff'
  on-background: '#151c27'
  surface-variant: '#dce2f3'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 56px
    letterSpacing: -0.03em
  display-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '800'
    lineHeight: 42px
    letterSpacing: -0.025em
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 30px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '700'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-caps:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.06em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-tablet: 1.5rem
  margin-desktop: 2.5rem
  space-2xs: 0.25rem
  space-xs: 0.5rem
  space-sm: 0.75rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
  space-2xl: 3rem
---

## Brand & Style

This design system embodies high-utility modernism, precision mobility, and decisive clarity. Built on an ultra-high-contrast monochrome foundation, it creates an atmosphere of immediacy, real-time command, and effortless movement. Interfaces built with this system do not distract; they orient, direct, and execute.

The aesthetic fuses architectural minimalism with functional Swiss typographic structure. Pure whites represent pristine physical space, while deep pitch-black elements anchor critical actions and definitive typography. Chromatic color is strictly segregated from decoration—reserved solely as real-time sensory signals for location tracking, state changes, and live trip status.

Interfaces feel snappy, physical, and highly responsive. Tap targets provide tangible mechanical feedback through active compression, subtle card elevations, and rhythmic live-pulse ripples, delivering an uncompromising executive standard across both rider-facing and high-density operator surfaces.

## Colors

The palette operates on a strict functional hierarchy where black and white command 95% of the visual field, allowing targeted chromatic accents to operate with maximum cognitive impact.

### Monochromatic Core
- **Canvas Base (`#FFFFFF`):** Pure light surface generating absolute contrast against text and interactive blocks.
- **Surface Muted (`#F9FAFB` / `#F3F4F6`):** Secondary container backgrounds for grouped cards, pills, and sheet backdrops.
- **Border Default (`#E5E7EB`):** Subtle structural dividing lines, maintaining separation without visual noise.
- **Primary Ink & Action (`#000000`):** Pitch black for primary headlines, bottom sheet actions, prominent badges, and dominant CTAs.
- **Secondary Ink (`#1F2937`):** Graphite for subheadings, active icon fills, and secondary buttons.
- **Muted Ink (`#6B7280`):** Slate for metadata, timestamps, vehicle license details, and inactive states.

### Functional Accents
- **Status Live / Success (`#10B981`):** Functional emerald strictly reserved for driver arrival, completed trips, live telemetry pins, and active payment authorizations.
- **Status Warning / Dispatch (`#F59E0B`):** Warm amber used exclusively for surge zones, ETA delays, connection recalibrations, and driver reassignment alerts.
- **Status Danger (`#EF4444`):** Pure red dedicated to critical alerts, safety toolkit actions, trip cancellations, and SOS triggers.

## Typography

The typography leverages Plus Jakarta Sans across all layers to ensure structural rigidity and immediate readability while on the go. Letter spacing tightens aggressively on larger headlines to mimic transport signage and engineering precision.

- **Display & Headings:** Always set in bold (`700`) or extra-bold (`800`) weights with negative tracking (`-0.015em` to `-0.03em`). Numbers in ETAs, fares, and ratings take full tabular lining where possible to maintain geometric column alignment during live recalculations.
- **Body & Captions:** Tuned for maximum glanceability in outdoor and high-glare environments. Medium (`500`) weight is preferred over Regular (`400`) for secondary ride details to preserve contrast against white surfaces.
- **Utility Labels:** `label-caps` must always be rendered in full uppercase with positive tracking (`0.06em`) for ride tier badges (e.g., `PREMIER`, `COMFORT`, `XL`) and license plate signifiers.

## Layout & Spacing

The layout is built on an adaptive multi-tiered column system geared towards continuous spatial navigation and overlay sheets.

- **Mobile Viewports (<640px):** 4-column layout with fixed full-bleed map backing and sliding bottom sheet containers. Screen margins strictly enforce `1rem` (16px) clearance for interactive search bars and ride pickers.
- **Tablet & Split-Screen (640px–1024px):** 8-column layout. The map canvas occupies the full background while booking interfaces dock as a rigid `400px` card pinned to the left edge with `1.5rem` margins.
- **Desktop Dashboards (>1024px):** 12-column layout with `1.5rem` gutters and max container width of `1280px`. Left rail holds route history, middle presents real-time maps, and the right quadrant aggregates telemetry details.

Spacers adhere to a strict 4px/8px incremental rhythm. Internal form components consistently utilize `space-md` (`1rem`) vertical rhythm to maximize thumb-reach viability on mobile devices.

## Elevation & Depth

Visual hierarchy uses physical sheet layers, precision low-contrast outlines, and tactile lift states instead of heavy theatrical shadows.

### Surface Tiers
- **Canvas (Floor 0):** Vector maps, live GIS tiles, and camera views.
- **Floating Controls (Floor 1):** Map controls, locate-me icons, and compass pins. Floating surfaces use `0 2px 8px rgba(0, 0, 0, 0.08)` coupled with an explicit border `1px solid #E5E7EB`.
- **Primary Sheets & Modals (Floor 2):** Ride selection trays, route review sheets, and vehicle detail drawers. Elevated with a high-performance diffuse shadow: `0 12px 32px -4px rgba(0, 0, 0, 0.12)`, anchored by a top border `1px solid #F3F4F6`.
- **System Banners & Toasts (Floor 3):** Urgent arrival notices and driver callouts elevated via `0 20px 40px -8px rgba(0, 0, 0, 0.2)`.

### Tactile Feedback
When interacted with, tactile cards lift via `transform: translateY(-2px)` accompanied by shadow deepening to `0 8px 20px -2px rgba(0, 0, 0, 0.1)`. Interactive buttons feature an instantaneous micro-compression using `transform: scale(0.97)` on active touch.

## Shapes

The geometric vocabulary bridges two extremes: strict structural boxes for data groupings and continuous pill radii for persistent movement triggers.

- **Radius Scale:** Base roundedness token is set to `2` (8px standard radius for cards, inputs, sheet corners, and notifications).
- **Sheet Corners:** Bottom-sheets and pull-up drawers use `rounded-t-2xl` (24px) to signal drag affordance without losing architectural authority.
- **Search & Filter Pills:** Omnipresent destination bars, vehicle tier switchers, and filter pills employ full pill radiuses (`rounded-full` / `9999px`), emphasizing instant one-tap access.
- **Vehicle & Map Markers:** Minimalist driver location pins are sharp geometric teardrops or circular hubs framed with a pure black 2px ring and white center dot.

## Components

### Buttons
- **Primary Action:** Solid `#000000` fill, `#FFFFFF` text, 0.5rem border radius or pill radius depending on screen placement. Full width on mobile sheets, minimum height `56px`. Smooth active feedback with `transform: scale(0.97)` and `cubic-bezier(0.16, 1, 0.3, 1)` transition.
- **Secondary Action:** Solid `#F3F4F6` fill, `#1F2937` text, no border. Hover/active shifts to `#E5E7EB`.
- **Tertiary / Ghost:** Pure white background, `1px solid #E5E7EB`, `#000000` text. Hover adds light shadow.

### Input Fields & Search Pills
- **Destination Search Pill:** White floating pill with `0 4px 16px rgba(0,0,0,0.08)` elevation, `52px` height, featuring a bold black square icon (pickup) or circle icon (dropoff) on the leading edge.
- **Standard Text Fields:** Background `#F9FAFB`, `1px solid #E5E7EB`, text `#000000`. On focus, border transitions directly to solid `#000000` with zero colored ring offset.

### Vehicle Selection Cards
- Horizontally split row card with `#FFFFFF` background. Left: clean vector silhouette of vehicle in solid graphite. Center: Ride category title (`label-lg`), ETA, and capacity indicator. Right: tabular price formatted in `headline-sm`.
- **Selected State:** Border switches from `#E5E7EB` to a high-contrast `2px solid #000000` with subtle `#F9FAFB` fill.

### Live Telemetry & Tracking Indicators
- **Live Pulse Marker:** Outer ring in `#10B981` with animated `ping` ripple effect (0% to 100% scale at 2-second loop with decaying opacity), enclosing a solid `#10B981` core point.
- **Status Badges:** Compact pills with `4px` padding and uppercase text (`label-caps`). Confirmed uses `#10B981` tint, Waiting uses `#F59E0B` tint.

### Lists & Activity Rows
- Minimalist rows separated by a hairline divider (`#F3F4F6`). Left avatar uses a neutral circle (`#F3F4F6`) housing a monochrome icon (clock, map pin, or car). Primary line bold, secondary text in muted slate (`#6B7280`).

### Checkboxes & Segmented Radios
- Square checkbox with `4px` radius, thick `2px solid #000000` border when active, with high-contrast white check.
- Vehicle tier switchers render as segmented sliding bars with solid black active slider thumb and white text.