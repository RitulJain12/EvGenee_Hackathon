---
name: Bespoke Slate
colors:
  surface: '#FAFAFA'
  surface-dim: '#F2F2F2'
  surface-bright: '#FAFAFA'
  surface-container-lowest: '#FFFFFF'
  surface-container-low: '#F5F5F5'
  surface-container: '#F5F5F5'
  surface-container-high: '#EAEAEA'
  surface-container-highest: '#EAEAEA'
  on-surface: '#1A1A1C'
  on-surface-variant: '#5C5C60'
  primary: '#242426'
  on-primary: '#FFFFFF'
  primary-container: '#E0EAEB'
  on-primary-container: '#1A1A1C'
  secondary: '#C64F38'
  on-secondary: '#FFFFFF'
  secondary-container: '#FBE8E4'
  on-secondary-container: '#5B1F13'
  tertiary: '#4A6163'
  on-tertiary: '#FFFFFF'
  tertiary-container: '#E0EAEB'
  on-tertiary-container: '#192829'
  outline: '#D1D1D1'
  background: '#FAFAFA'
  on-background: '#1A1A1C'
  outline-variant: '#EAEAEA'
  inverse-surface: '#1A1A1C'
  inverse-on-surface: '#FAFAFA'
  surface-tint: '#242426'
typography:
  headline-xl:
    fontFamily: Space Grotesk
    fontSize: 64px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.03em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: 0.04em
rounded:
  sm: 0px
  DEFAULT: 4px
  md: 8px
  lg: 12px
  xl: 16px
  full: 9999px
spacing:
  container-max: 1400px
  gutter: 32px
---

## Brand & Style
"Bespoke Slate" rejects the overused AI dark-mode glassmorphism. Instead, it relies on a hyper-premium, editorial layout. The aesthetic is tactile, utilizing off-white canvas backgrounds, deep charcoal text, and highly intentional pops of terracotta and slate green. It feels like a high-end physical magazine adapted for the web.

## Layout & Architecture
- **Asymmetry:** Break the grid. Use off-center layouts and overlapping elements to create tension and visual interest.
- **Whitespace:** Luxury is space. Use massive padding (e.g., 80px - 120px) between sections. Do not cram elements together.
- **Responsive:** Fluid typography and container sizing. On desktop, content is anchored in a 1400px max-width container, while mobile uses full-width edge-to-edge layouts with generous 24px side padding.

## Elevation
- **Flat Depth:** Avoid heavy drop shadows. Depth is created by layering: a stark white card (`surface-container-lowest`) placed on an off-white background (`surface`).
- **Subtle Borders:** Use ultra-thin 1px borders (`outline`) to define delicate boundaries instead of using shadows.
- **Ambient Glows:** If shadows are used, they must be extremely diffused and low opacity (e.g., `rgba(0,0,0,0.04)` with a 40px blur).

## Components
- **Buttons:** Sharp, geometric corners (`rounded: 4px`). Primary buttons are solid Charcoal (`#242426`) with crisp white text. Hover states should subtly shift to a slightly lighter slate.
- **Cards:** Minimalist. Often borderless, relying on whitespace to separate content. When bordered, use a 1px solid line of `#D1D1D1`.
- **Typography:** Large, dramatic headlines using the geometric 'Space Grotesk' font. Labels should be small, uppercase, and tracked out to create an organized, architectural feel.
