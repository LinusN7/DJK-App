-- Add avatar_url column to profiles if not exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url text;

-- Create storage bucket for avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Insert example games
INSERT INTO games (opponent, game_date, location, created_by, team_id)
SELECT 
  'TSV Überlingen/Ried 2',
  '2025-10-19 13:00:00+02'::timestamptz,
  'Auswärts',
  (SELECT user_id FROM profiles WHERE team_id = (SELECT id FROM teams WHERE name = 'Dritte') LIMIT 1),
  (SELECT id FROM teams WHERE name = 'Dritte')
WHERE EXISTS (SELECT 1 FROM teams WHERE name = 'Dritte')
ON CONFLICT DO NOTHING;

INSERT INTO games (opponent, game_date, location, created_by, team_id)
SELECT 
  'SC Bankholzen-Moss 2',
  '2025-11-01 12:30:00+01'::timestamptz,
  'Auswärts',
  (SELECT user_id FROM profiles WHERE team_id = (SELECT id FROM teams WHERE name = 'Dritte') LIMIT 1),
  (SELECT id FROM teams WHERE name = 'Dritte')
WHERE EXISTS (SELECT 1 FROM teams WHERE name = 'Dritte')
ON CONFLICT DO NOTHING;

-- Insert example wash duty
INSERT INTO wash_duties (game_day, user_id, assigned_by, team_id)
SELECT 
  'TSV Überlingen/Ried 2 - 19.10.2025',
  (SELECT user_id FROM profiles WHERE team_id = (SELECT id FROM teams WHERE name = 'Dritte') LIMIT 1),
  (SELECT user_id FROM profiles WHERE team_id = (SELECT id FROM teams WHERE name = 'Dritte') LIMIT 1),
  (SELECT id FROM teams WHERE name = 'Dritte')
WHERE EXISTS (SELECT 1 FROM teams WHERE name = 'Dritte')
ON CONFLICT DO NOTHING;