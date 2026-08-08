---
name: Doremon Jump
description: A rain-soaked mobile campaign game where every jump can earn Runs.
colors:
  midnight: "oklch(0.15 0.04 255)"
  storm: "oklch(0.28 0.06 250)"
  monsoon-teal: "oklch(0.78 0.15 175)"
  reward-gold: "oklch(0.82 0.16 85)"
  hazard-red: "oklch(0.45 0.15 0)"
  cloud: "oklch(0.96 0.01 240)"
typography:
  display:
    fontFamily: "Arial Rounded MT Bold, Avenir Next, system-ui, sans-serif"
    fontSize: "3rem"
    fontWeight: 900
    lineHeight: 0.94
  body:
    fontFamily: "Avenir Next, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: 1.55
  label:
    fontFamily: "Avenir Next, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 800
    lineHeight: 1.2
rounded:
  sm: "10px"
  md: "18px"
  pill: "999px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "28px"
components:
  button-primary:
    backgroundColor: "{colors.reward-gold}"
    textColor: "{colors.midnight}"
    rounded: "{rounded.md}"
    padding: "15px 24px"
  input:
    backgroundColor: "{colors.storm}"
    textColor: "{colors.cloud}"
    rounded: "{rounded.sm}"
    padding: "14px 15px"
---

# Design System: Doremon Jump

## 1. Overview

**Creative North Star: “A reward arcade under a Mumbai monsoon.”**

The interface is a compact mobile game wrapped in a credible campaign shell. Deep storm blues create focus; reward gold and bright teal make progress unmistakable. It rejects casino gloss and generic dashboard chrome.

**Key Characteristics:** rain-led atmosphere, tactile controls, wedge-shaped platforms, crisp reward feedback, mobile-first density.

## 2. Colors

The palette moves from midnight rain to warm incentive gold, with teal reserved for positive progress and deep red for hazards and errors.

## 3. Typography

**Display Font:** Arial Rounded MT Bold with Avenir Next fallback  
**Body Font:** Avenir Next with system fallback

**Character:** Friendly and legible, with stout campaign headlines and compact operational labels.

## 4. Elevation

Depth is tonal by default. Soft shadows appear only on active controls, collected goodies, and the lead-capture panel.

## 5. Components

Buttons are broad, tactile, and thumb-friendly. Inputs use strong visible labels and focus rings. HUD modules stay compact and consistent; reward toasts use gold, while permission and error states use clear text plus icons.

## 6. Do's and Don'ts

Do keep campaign progress visible during play, provide touch and keyboard fallbacks, and use celebratory motion for earned events. Don’t copy Doodle Jump characters or art, hide lead-form behavior, or force gyroscope access before a user gesture.
