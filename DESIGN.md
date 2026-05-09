# Design System: Today in History

This document outlines the design language, palette, and architectural decisions for the **Today in History** application. The overarching goal is a premium, archival aesthetic that evokes the feeling of reading a high-quality historical journal or textbook.

## 1. Typography

The typographic hierarchy relies on a strong serif/sans-serif pairing.

*   **Display Font**: `Cormorant Garamond`
    *   *Usage*: Headers, Titles, Hero Numbers, Stat Values.
    *   *Feel*: Elegant, historical, authoritative.
*   **Body Font**: `Inter`
    *   *Usage*: Body text, navigation, dates, metadata.
    *   *Feel*: Clean, highly readable, modern contrast to the serif.

## 2. Color Palette

The color system is warm and organic, avoiding stark #000 or #FFF in favor of softer, paper-like tones.

*   **Ink (`--ink`)**: `#1a1a1a` — Deep charcoal for primary text.
*   **Warm (`--warm`)**: `#3d3632` — Brown-tinted dark gray for secondary headers.
*   **Gold (`--gold`)**: `#8b7355` — Primary accent for links, interactive states, and the timeline rule.
*   **Light Gold (`--gold-light`)**: `#c4a97d` — Used in gradients and subtle borders.
*   **Subtle Border (`--subtle`)**: `#e8e2d9` — Used for dividing lines and empty image placeholders.
*   **Paper (`--paper`)**: `#faf8f5` — The main content container background.
*   **Canvas (`--canvas`)**: `#f0ede8` — The deeper background of the page itself.

## 3. Layout & Structure

*   **Header**: Sticky, frosted glass effect (`backdrop-filter`) to maintain context while scrolling. Gains a drop shadow on scroll.
*   **Hero**: Large typography emphasizing the date, with a subtle "Historical Timeline" badge.
*   **Stats Bar**: Four prominent data points providing immediate context for the chosen day.
*   **Timeline Layout**:
    *   A continuous vertical gold line connects the events.
    *   The Year/Era is displayed prominently on the left.
    *   The content card is positioned on the right.
    *   A dot marker on the line highlights the current node.

## 4. Imagery & Effects

*   **Texture**: The body background includes a very faint, SVG-generated fractal noise to simulate paper texture.
*   **Image Filters**: Historic images load with a sepia, slightly desaturated filter (`filter: sepia(0.4) contrast(0.9) grayscale(0.2);`). On hover, they transition to full color to bring the history to life.
*   **Animations**:
    *   Cards slide up and fade in sequentially when the timeline loads.
    *   Interactive elements feature a smooth `280ms ease` transition.

## 5. Mobile Responsiveness

*   Below 900px, the top navigation moves to a fixed bottom-bar to improve reachability on mobile devices.
*   The timeline adjusts by narrowing the year column, shifting the focus to the card content while maintaining chronological flow.
