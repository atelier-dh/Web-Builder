MOZA STUDIO V14.8.12 — RESPONSIVE & CROSS-PROJECT UX CANDIDATE

Based on V14.8.11 candidate.

Changes:
1. Adds an explicit Auto Fit Mobile action to the responsive inspector.
   - Fits the selected element to a 375px viewport with 14px side margins.
   - For Visual Smart Filter, sets the mobile card layout to one column and rebuilds
     only that widget's generated embed code.
   - Updates mobile widget height and section height when required.
   - Does not change Desktop or Tablet geometry.
2. Adds explicit empty-state text when no other locally available project exists
   for a Link to Another Project destination.
3. Adds a Preview notice when a Visual Smart Filter project link has no destination.

Important limitations:
- This is a candidate build. Browser interaction, project-store availability,
  real project-to-project navigation, and responsive visual quality must be tested
  in the user's browser before production deployment.
- Cross-project Preview requires the destination project to be opened/imported and
  saved in the same browser's local Moza project store.
- Auto Fit Mobile is a selected-element operation, not a full-page semantic redesign.
