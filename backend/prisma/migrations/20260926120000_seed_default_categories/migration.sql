-- Idempotent specialty seed. Names match backend/src/categories/default-categories.ts.
-- ON CONFLICT keeps a row already stored under that name (including data
-- copied from Railway) and does not insert a second copy.
INSERT INTO "Category" ("id", "name") VALUES
  (gen_random_uuid()::text, 'Legal'),
  (gen_random_uuid()::text, 'Medical'),
  (gen_random_uuid()::text, 'Tax Advisory'),
  (gen_random_uuid()::text, 'Educational Consulting'),
  (gen_random_uuid()::text, 'Financial Planning'),
  (gen_random_uuid()::text, 'Career Coaching'),
  (gen_random_uuid()::text, 'Immigration'),
  (gen_random_uuid()::text, 'Mental Health Counseling')
ON CONFLICT ("name") DO NOTHING;
