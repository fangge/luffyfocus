---
name: Mugiwara Pixel OS
colors:
  surface: '#f7f9ff'
  surface-dim: '#d7dadf'
  surface-bright: '#f7f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f4f9'
  surface-container: '#ebeef3'
  surface-container-high: '#e5e8ee'
  surface-container-highest: '#e0e3e8'
  on-surface: '#181c20'
  on-surface-variant: '#5e3f39'
  inverse-surface: '#2d3135'
  inverse-on-surface: '#eef1f6'
  outline: '#936e68'
  outline-variant: '#e9bcb5'
  surface-tint: '#be0c00'
  primary: '#b60b00'
  on-primary: '#ffffff'
  primary-container: '#e41000'
  on-primary-container: '#fff7f6'
  inverse-primary: '#ffb4a7'
  secondary: '#7a5900'
  on-secondary: '#ffffff'
  secondary-container: '#fcbc0b'
  on-secondary-container: '#6b4e00'
  tertiary: '#004cd9'
  on-tertiary: '#ffffff'
  tertiary-container: '#2765ff'
  on-tertiary-container: '#faf8ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad4'
  primary-fixed-dim: '#ffb4a7'
  on-primary-fixed: '#400100'
  on-primary-fixed-variant: '#920700'
  secondary-fixed: '#ffdea2'
  secondary-fixed-dim: '#fcbc0b'
  on-secondary-fixed: '#261900'
  on-secondary-fixed-variant: '#5c4200'
  tertiary-fixed: '#dce1ff'
  tertiary-fixed-dim: '#b5c4ff'
  on-tertiary-fixed: '#00164e'
  on-tertiary-fixed-variant: '#003bae'
  background: '#f7f9ff'
  on-background: '#181c20'
  surface-variant: '#e0e3e8'
  surface-alt: '#f8f8f8'
  success-green: '#92cc41'
  error-crimson: '#e76e55'
  warning-yellow: '#f7d51d'
  disabled-grey: '#bcbcbc'
typography:
  display-lg:
    fontFamily: Press Start 2P
    fontSize: 24px
    fontWeight: '400'
    lineHeight: 32px
    letterSpacing: 0.02em
  headline-md:
    fontFamily: Press Start 2P
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0.01em
  body-base:
    fontFamily: Press Start 2P
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: '0'
  body-bold:
    fontFamily: Press Start 2P
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 20px
    letterSpacing: '0'
  label-caps:
    fontFamily: Press Start 2P
    fontSize: 10px
    fontWeight: '400'
    lineHeight: 14px
    letterSpacing: 0.05em
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 16px
---

## Brand & Style

This design system is a high-energy, 8-bit retro gaming interface designed for the compact environment of a Chrome extension. It draws direct inspiration from the adventurous spirit of Monkey D. Luffy and the technical constraints of the NES era.

The visual style is **Brutalism-meets-Retro Gaming**. It emphasizes raw, blocky structures, thick 4px black outlines, and a strictly pixel-aligned grid. There are no modern "soft" luxuries here—no border radii, no blurred shadows, and no smooth gradients. The UI is tactile and responsive, designed to make every interaction feel like a button press on a physical console. The presence of a pixelated Luffy mascot provides emotional feedback, transforming the utility of a browser extension into an interactive adventure.

## Colors

The palette is derived from Luffy’s iconic attire and classic 8-bit hardware limitations.

- **Primary (Luffy Vest Red):** Used for critical CTAs, brand framing, and heroic moments.
- **Secondary (Mugiwara Gold):** Used for highlights, achievements, and active tab states.
- **Tertiary (Grand Line Blue):** The primary color for links, focus indicators, and interactive ocean-themed elements.
- **Neutral (NES Charcoal Black):** The foundation for all outlines, body text, and structural framing.

Avoid using pure hex black (#000000) for UI elements; instead, use the Charcoal Black for a more authentic console feel. Surfaces should primarily be white or the off-white **Console Grey** to maintain high legibility within small popup windows.

## Typography

This system uses **Press Start 2P** exclusively to maintain total 8-bit immersion. 

To ensure the pixelated glyphs remain crisp, all font sizes are locked to 4px increments. Because this font only supports a single weight, hierarchy is established through size shifts, color-coding, and forced uppercase for metadata. High line-height ratios are mandatory to prevent the blocky descenders from colliding, ensuring readability in dense layouts. In the Chrome extension context, keep text blocks short—think of them as "RPG dialogue boxes" rather than paragraphs.

## Layout & Spacing

The layout follows a **Fixed Grid** model optimized for the standard Chrome extension viewport (400px width). 

- **Grid:** All components must align to a 4px baseline grid. Floating-point values are prohibited as they cause pixel-art blurring.
- **Margins:** A 16px "Safe Gutter" is maintained around the inner perimeter of the popup to prevent the thick 4px borders from touching the browser window edges.
- **Dividers:** Use 4px-thick dotted lines (alternating charcoal and white blocks) to separate vertical content sections.
- **Reflow:** On mobile-sized viewports, all content must stack vertically. Avoid horizontal scrolling entirely.

## Elevation & Depth

Depth is conveyed through **Bold Borders** and **Inset Isometric Shadows**. 

Instead of ambient blurring, elements use a solid 4px box-shadow offset to simulate 3D depth. Primary surfaces use a bottom-right shadow (in a darker shade of the surface color) to look "raised." When an element is interacted with or "pressed," the shadow flips to the top-left to simulate physical depression into the surface. All containers must feature a solid 4px Charcoal Black outline to separate them from the background.

## Shapes

The shape language is strictly **Sharp (0px radius)**. 

To create a "retro-rounded" look, use "stepped corners"—a technique where the corners are visually clipped by a single pixel or a 2x2 pixel block at a 45-degree angle. This is achieved via SVG border-images rather than CSS `border-radius`. Every interactive element and container must maintain this rigid, blocky silhouette.

## Components

- **Buttons:** Rectangular with a 4px Charcoal border and a 4px bottom-right inset shadow. Hovering shifts the text 2px down/right and deepens the shadow; clicking flips the shadow to the top-left.
- **Cards/Containers:** Use a solid 4px border. Containers with titles should have the title text "interrupting" the top-left border line, placed in a box that matches the card's background color.
- **Progress Bars:** Designed as classic arcade health bars. The fill should use a diagonal pixel-brick pattern. Upon 100% completion, a cheering Luffy sprite should appear at the bar's end.
- **Tabs:** Blocky buttons aligned horizontally. The active tab has a red top-border and no bottom-border, merging it into the content area below.
- **Dialog Balloons:** Use pixelated speech bubbles (`.nes-balloon`) for Luffy’s reactions. These should always be paired with the mascot sprite to provide system context.
- **Checkboxes:** Replace standard checks with a pixelated Straw Hat or Jolly Roger icon when selected.