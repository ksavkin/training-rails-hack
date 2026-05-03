-- Add `edited` status to the pin_status enum.
--
-- Triage flow:
--   new       — raw model output, untouched.
--   edited    — operator manually corrected `defect_type` (still pre-triage).
--   acknowledged / dispatched — operator has committed to a triage decision;
--               defect_type is no longer editable.
--   resolved  — closed.
--
-- Why a separate status (vs. just an `edited_at` column): operators need an
-- at-a-glance signal that a pin has been human-validated, not raw inference.
-- It also lets the frontend gate the edit pencil purely off `status`.

ALTER TYPE pin_status ADD VALUE IF NOT EXISTS 'edited' AFTER 'new';
