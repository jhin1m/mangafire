-- Enable pg_trgm extension for trigram similarity search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add search_vector column (regular, not GENERATED — populated by trigger)
-- GENERATED ALWAYS won't work because to_tsvector() is STABLE, not IMMUTABLE
ALTER TABLE manga ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Trigger function: auto-compute search_vector on INSERT/UPDATE
-- Weight A = title (highest priority)
-- Weight B = description
-- Weight C = alternative titles, author, artist
CREATE OR REPLACE FUNCTION manga_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(array_to_string(NEW.alternative_titles, ' '), '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(NEW.author, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(NEW.artist, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to manga table (fires before INSERT or UPDATE)
DROP TRIGGER IF EXISTS trg_manga_search_vector ON manga;
CREATE TRIGGER trg_manga_search_vector
  BEFORE INSERT OR UPDATE ON manga
  FOR EACH ROW
  EXECUTE FUNCTION manga_search_vector_update();

-- Populate search_vector for existing rows
UPDATE manga SET search_vector =
  setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('simple', coalesce(description, '')), 'B') ||
  setweight(to_tsvector('simple', coalesce(array_to_string(alternative_titles, ' '), '')), 'C') ||
  setweight(to_tsvector('simple', coalesce(author, '')), 'C') ||
  setweight(to_tsvector('simple', coalesce(artist, '')), 'C');

-- GIN index for full-text search queries (@@ operator)
CREATE INDEX IF NOT EXISTS idx_manga_search_vector ON manga USING GIN (search_vector);

-- GIN trigram index for autocomplete (similarity function)
CREATE INDEX IF NOT EXISTS idx_manga_title_trgm ON manga USING GIN (title gin_trgm_ops);
