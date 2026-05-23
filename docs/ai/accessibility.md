# Accessibility

Use this file for UI changes, especially forms, selection controls, and status
indicators.

## Current Expectations

- Inputs need visible labels.
- Buttons must have clear text or an accessible icon label.
- Selected member and selected session states must be visually clear.
- Do not rely on color alone for important statuses.
- Keep focus outlines visible or provide an equivalent focus style.

## Forms

- Associate each input with a clear label.
- Keep submit buttons near the form they submit.
- Do not silently fail required inputs; if validation is added, provide useful
  inline feedback.

## Status UI

- Held and cancelled sessions should be distinguishable by icon/text, not only
  color.
- Attendance states should be readable as text.
- Timeline dates should use semantic `<time>` when practical.
