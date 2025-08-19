# Create a Pixel-Eye (Option B) brand pack for VitaVision

import os, zipfile, json

base = "/mnt/data/vitavision-brand"
os.makedirs(base, exist_ok=True)

# ---------- Color tokens & metadata ----------
brand_tokens = {
    "brand": "VitaVision",
    "concept": "Pixel-Eye",
    "colors": {
        "accent_from": "#22D3EE",
        "accent_to":   "#2563EB",
        "ink_dark":    "#0F172A",
        "ink_light":   "#FFFFFF",
        "bg_dark":     "#0B1220",
        "bg_light":    "#FFFFFF"
    }
}

with open(os.path.join(base, "tokens.json"), "w", encoding="utf-8") as f:
    json.dump(brand_tokens, f, indent=2)

# ---------- CSS variables ----------
colors_css = """
:root {
  --vv-accent-from: #22D3EE;
  --vv-accent-to:   #2563EB;
  --vv-ink:         #0F172A;
  --vv-ink-invert:  #FFFFFF;
  --vv-bg:          #FFFFFF;
  --vv-bg-invert:   #0B1220;
}
"""
with open(os.path.join(base, "colors.css"), "w", encoding="utf-8") as f:
    f.write(colors_css.strip() + "\n")

# ---------- Core SVG primitives (Option B) ----------
def icon_svg(size=256, dark=False, id_suffix=""):
    ink = "#FFFFFF" if dark else "#0F172A"
    grad_id = f"vvB{id_suffix}"
    pixel_size = 40 if size>=256 else 24 if size>=128 else 12
    pixel_radius = max(2, pixel_size//6)
    center = size/2
    margin = size*0.125  # 12.5% padding
    top_y = margin
    bottom_y = size - margin
    left_x = margin
    right_x = size - margin
    # Eye using two quads
    svg = f'''<svg width="{size}" height="{size}" viewBox="0 0 {size} {size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="{grad_id}" x1="0" y1="0" x2="{size}" y2="{size}" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#22D3EE"/>
      <stop offset="1" stop-color="#2563EB"/>
    </linearGradient>
  </defs>
  <path d="M {left_x} {center} Q {center} {top_y} {right_x} {center} Q {center} {bottom_y} {left_x} {center} Z"
        fill="none" stroke="{ink}" stroke-width="{size*0.0625:.2f}" stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="{center-pixel_size/2:.2f}" y="{center-pixel_size/2:.2f}" width="{pixel_size}" height="{pixel_size}" rx="{pixel_radius}" fill="url(#{grad_id})"/>
</svg>'''
    return svg

def logo_horizontal_svg(width=640, height=160, dark=False, id_suffix=""):
    ink = "#FFFFFF" if dark else "#0F172A"
    grad_id = f"vvB2{id_suffix}"
    # Icon area
    svg = f'''<svg width="{width}" height="{height}" viewBox="0 0 {width} {height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="{grad_id}" x1="0" y1="0" x2="256" y2="256" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#22D3EE"/>
      <stop offset="1" stop-color="#2563EB"/>
    </linearGradient>
  </defs>
  <g transform="translate(0,0)">
    <path d="M16 80 Q96 16 176 80 Q96 144 16 80 Z" fill="none" stroke="{ink}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="84" y="68" width="24" height="24" rx="4" fill="url(#{grad_id})"/>
  </g>
  <g fill="{ink}" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif" font-weight="600">
    <text x="210" y="72" font-size="40">VitaVision</text>
    <text x="210" y="112" font-size="20" opacity="0.7">vitavision.dev</text>
  </g>
</svg>'''
    return svg

def logo_stacked_svg(width=420, height=420, dark=False, id_suffix=""):
    ink = "#FFFFFF" if dark else "#0F172A"
    grad_id = f"vvB3{id_suffix}"
    svg = f'''<svg width="{width}" height="{height}" viewBox="0 0 {width} {height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="{grad_id}" x1="0" y1="0" x2="{width}" y2="{height}" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#22D3EE"/>
      <stop offset="1" stop-color="#2563EB"/>
    </linearGradient>
  </defs>
  <g transform="translate({(width-256)/2:.2f},20)">
    <path d="M16 128 Q128 32 240 128 Q128 224 16 128 Z" fill="none" stroke="{ink}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="116" y="116" width="24" height="24" rx="4" fill="url(#{grad_id})"/>
  </g>
  <g fill="{ink}" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif" font-weight="600">
    <text x="{width/2:.2f}" y="330" font-size="48" text-anchor="middle">VitaVision</text>
    <text x="{width/2:.2f}" y="366" font-size="18" text-anchor="middle" opacity="0.7">computer vision • demos</text>
  </g>
</svg>'''
    return svg

def favicon_svg():
    # SVG favicon (32x32 viewbox)
    return """<svg width="32" height="32" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="vvF" x1="0" y1="0" x2="256" y2="256" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#22D3EE"/>
      <stop offset="1" stop-color="#2563EB"/>
    </linearGradient>
  </defs>
  <rect width="256" height="256" rx="48" fill="#0F172A"/>
  <path d="M40 128 Q128 56 216 128 Q128 200 40 128 Z" fill="none" stroke="#FFFFFF" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="116" y="116" width="24" height="24" rx="4" fill="url(#vvF)"/>
</svg>"""

def social_card_svg():
    # 1200x630 Open Graph card
    return """<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1200" y2="630" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#0B1220"/>
      <stop offset="1" stop-color="#0F172A"/>
    </linearGradient>
    <linearGradient id="pix" x1="0" y1="0" x2="1200" y2="630" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#22D3EE"/>
      <stop offset="1" stop-color="#2563EB"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <!-- large pixel-eye -->
  <g transform="translate(80,120) scale(3)">
    <path d="M16 80 Q96 16 176 80 Q96 144 16 80 Z" fill="none" stroke="#FFFFFF" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="84" y="68" width="24" height="24" rx="4" fill="url(#pix)"/>
  </g>
  <g fill="#FFFFFF" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif">
    <text x="560" y="260" font-size="80" font-weight="700">VitaVision</text>
    <text x="560" y="315" font-size="28" opacity="0.75">Computer vision demos • research notes</text>
    <text x="560" y="360" font-size="24" opacity="0.75">vitavision.dev</text>
  </g>
</svg>"""

# ---------- Write files ----------
files = {
    "icon/icon-256.svg": icon_svg(256, dark=False, id_suffix="256"),
    "icon/icon-256-dark.svg": icon_svg(256, dark=True, id_suffix="256d"),
    "icon/icon-512.svg": icon_svg(512, dark=False, id_suffix="512"),
    "icon/icon-512-dark.svg": icon_svg(512, dark=True, id_suffix="512d"),
    "logo/logo-horizontal-light.svg": logo_horizontal_svg(dark=False, id_suffix="hL"),
    "logo/logo-horizontal-dark.svg": logo_horizontal_svg(dark=True, id_suffix="hD"),
    "logo/logo-stacked-light.svg": logo_stacked_svg(dark=False, id_suffix="sL"),
    "logo/logo-stacked-dark.svg": logo_stacked_svg(dark=True, id_suffix="sD"),
    "favicon.svg": favicon_svg(),
    "social/social-card-1200x630.svg": social_card_svg(),
}

for rel, content in files.items():
    full = os.path.join(base, rel)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, "w", encoding="utf-8") as f:
        f.write(content)

# ---------- React component ----------
react_tsx = """
import * as React from "react";

type Props = React.SVGProps<SVGSVGElement> & { dark?: boolean };

/** VitaVision Pixel-Eye logo (Option B) */
export default function VitaVisionLogo({ dark = false, ...props }: Props) {
  const ink = dark ? "#FFFFFF" : "#0F172A";
  const gradId = React.useId();
  return (
    <svg viewBox="0 0 200 160" aria-label="VitaVision" {...props}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="256" y2="256">
          <stop offset="0" stopColor="#22D3EE"/><stop offset="1" stopColor="#2563EB"/>
        </linearGradient>
      </defs>
      <g>
        <path d="M16 80 Q96 16 176 80 Q96 144 16 80 Z"
          fill="none" stroke={ink} strokeWidth={12} strokeLinecap="round" strokeLinejoin="round"/>
        <rect x="84" y="68" width="24" height="24" rx="4" fill={`url(#${gradId})`}/>
      </g>
    </svg>
  );
}
""".strip()

with open(os.path.join(base, "VitaVisionLogo.tsx"), "w", encoding="utf-8") as f:
    f.write(react_tsx + "\n")

# ---------- Web manifest template ----------
webmanifest = {
  "name": "VitaVision",
  "short_name": "VitaVision",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0B1220",
  "theme_color": "#0B1220",
  "icons": [
    { "src": "/icons/icon-256.png", "sizes": "256x256", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable any" }
  ]
}
with open(os.path.join(base, "manifest.webmanifest"), "w", encoding="utf-8") as f:
    json.dump(webmanifest, f, indent=2)

# ---------- README ----------
readme = """
# VitaVision - Brand Pack (Option B: Pixel-Eye)

This pack contains SVG assets and a React component for the VitaVision brand.

## Files

- `logo/logo-horizontal-*.svg` — primary logo for headers and nav bars (light/dark).
- `logo/logo-stacked-*.svg` — centered layout for splash/about (light/dark).
- `icon/icon-256.svg`, `icon/icon-512.svg` — app icons.
- `favicon.svg` — SVG favicon (modern browsers supported).
- `social/social-card-1200x630.svg` — Open Graph/Twitter card.
- `colors.css` — CSS variables for brand colors.
- `VitaVisionLogo.tsx` — reusable React component.
- `manifest.webmanifest` — starter PWA manifest (PNG paths are placeholders).

## Color tokens

- Accent gradient: `#22D3EE → #2563EB`
- Ink (text/strokes): `#0F172A`
- Ink inverted: `#FFFFFF`
- Background dark: `#0B1220`

## Usage (React)

```tsx
import VitaVisionLogo from "./VitaVisionLogo";
// In JSX:
<VitaVisionLogo width={200} height={160} aria-hidden />


For the wordmark, pair the icon at left with site text using your app fonts.

Favicon

Modern browsers accept SVG favicons:

Always show details
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="alternate icon" href="/favicon.ico">

Open Graph (social)
Always show details
<meta property="og:image" content="/social/social-card-1200x630.svg">
<meta name="twitter:card" content="summary_large_image">

Clear space & minimum sizes

Clear space: keep at least the height of the center pixel square around the mark.

Minimum sizes: 16px (favicon), 24px (UI icon), 120px width (logo horizontal).

Export PNGs

Use an SVG exporter (e.g. Inkscape) to export 256 and 512 PNG icons:

icons/icon-256.png

icons/icon-512.png

Then update manifest.webmanifest paths if needed.

© VitaVision
""".strip()

with open(os.path.join(base, "README.md"), "w", encoding="utf-8") as f:
    f.write(readme + "\n")

zip_path = "VitaVision_PixelEye_BrandPack.zip"
with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as z:
    for root, _, filenames in os.walk(base):
        for name in filenames:
            full = os.path.join(root, name)
            arc = os.path.relpath(full, base)
            z.write(full, arcname=arc)
