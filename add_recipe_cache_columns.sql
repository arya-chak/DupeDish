ALTER TABLE public.recipe_cache
  ADD COLUMN prep_time_mins  integer,
  ADD COLUMN flavor_notes    text;
