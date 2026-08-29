-- 20260108000000_add_study_order_to_decks.sql
-- Agrega la preferencia de orden de estudio por mazo, elegida por el dueño del mazo.

ALTER TABLE public.decks
  ADD COLUMN IF NOT EXISTS study_order text NOT NULL DEFAULT 'insertion';

-- Constraint opcional para mantener valores válidos.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'decks_study_order_check'
  ) THEN
    ALTER TABLE public.decks
      ADD CONSTRAINT decks_study_order_check
      CHECK (study_order IN ('insertion', 'alphabetical', 'reverse', 'random', 'random_seed'));
  END IF;
END $$;
