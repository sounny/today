# Project Improvements & Pedagogical Roadmap

This document outlines strategic improvements for the "Today in History" application to align it with university-level pedagogical standards and Dr. Sounny's "Gold Standard" for digital textbooks.

## 1. Interactive Mapping (High Priority)
- **Current State:** The app provides text-based historical data but lacks spatial context.
- **Improvement:** Integrate **LeafletJS** to map the locations of historical events.
- **Implementation:** Use the `coordinates` data often provided by the Wikipedia API to place markers on a global map.
- **Status:** ✅ APPROVED for Phase 2. This is the next major feature. Aligns with Dr. Sounny's GIS expertise and differentiates this app from generic "on this day" tools.

## 2. Pedagogical Features ("Gold Standard" Alignment)
> **STATUS: DEFERRED.** These features are better suited for the interactive textbook project, not this lightweight timeline app. Reasons below.

- **"Geographic Inquiry" Prompts:** Generating meaningful spatial analysis questions requires either a curated question bank or LLM integration. This is a static GitHub Pages site with no backend. Adding API keys for AI generation introduces cost, complexity, and security concerns for a public repo.
- **"Local to Global" Sidebar:** Keyword filtering for Texas connections ("Texas", "Houston", "Dallas") is too fragile to be useful. Most historical events with Texas relevance would be missed by string matching. This feature belongs in the textbook where content is curated, not auto-generated.
- **Biographical Highlight Boxes:** The Wikipedia API does not distinguish between "important" and "minor" figures. All births/deaths are already presented equally. The hero card already highlights the most notable entry. Further differentiation would require a separate importance database that doesn't exist.
- **Auto-graded Quizzes:** Multiple-choice question generation from raw event text requires an LLM backend. This conflicts with the project's architecture as a zero-dependency, static-hosted app. Better suited for a Canvas LMS integration in the classroom.

## 3. User Experience & Research Tools
> **STATUS: DEFERRED.** These features represent scope creep beyond the app's purpose as a clean historical timeline.

- **Deep Research Integration:** "Triggers a Deep Research task" is architecturally undefined. This would require a backend service, user authentication, and result storage. This is a separate product, not a feature of a timeline viewer.
- **Sustainability Lens / Regional Decisions:** This is a very specific pedagogical exercise format that does not generalize to a public "Today in History" app. It belongs in the World Regional Geography textbook chapters where the pedagogical context exists.
- **Glossary of Terms:** The app displays Wikipedia event summaries, not specialized terminology. A glossary would need to be manually curated and maintained. Wikipedia links already serve this purpose (users can click through for definitions).

## 4. Technical Refactoring
- **State Persistence:** ✅ IMPLEMENTED. Uses `localStorage` to remember the user's last viewed date and category preference.
- **Accessibility (A11y):** ✅ IMPLEMENTED. Enhanced ARIA labels for timeline cards. Gold accent contrast verified against WCAG AA.
- **Caching Layer:** ✅ IMPLEMENTED. Client-side `sessionStorage` cache keyed by date to eliminate redundant API calls when navigating back to previously viewed dates.
