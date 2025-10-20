-- Create teams table
CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- Insert default teams
INSERT INTO public.teams (name) VALUES ('Erste'), ('Zweite'), ('Dritte');

-- Add columns to profiles
ALTER TABLE public.profiles 
  ADD COLUMN team_id uuid REFERENCES public.teams(id),
  ADD COLUMN wash_count integer DEFAULT 0 NOT NULL,
  ADD COLUMN locker_duty_count integer DEFAULT 0 NOT NULL;

-- Add team_id to games
ALTER TABLE public.games ADD COLUMN team_id uuid REFERENCES public.teams(id);

-- Add team_id to wash_duties
ALTER TABLE public.wash_duties ADD COLUMN team_id uuid REFERENCES public.teams(id);

-- Add team_id to locker_duties
ALTER TABLE public.locker_duties ADD COLUMN team_id uuid REFERENCES public.teams(id);

-- Update existing profiles to Dritte team
UPDATE public.profiles 
SET team_id = (SELECT id FROM public.teams WHERE name = 'Dritte');

-- Update existing games to Dritte team
UPDATE public.games 
SET team_id = (SELECT id FROM public.teams WHERE name = 'Dritte');

-- Make team_id required for profiles
ALTER TABLE public.profiles ALTER COLUMN team_id SET NOT NULL;

-- Make team_id required for games
ALTER TABLE public.games ALTER COLUMN team_id SET NOT NULL;

-- Make team_id required for wash_duties
ALTER TABLE public.wash_duties ALTER COLUMN team_id SET NOT NULL;

-- Make team_id required for locker_duties
ALTER TABLE public.locker_duties ALTER COLUMN team_id SET NOT NULL;

-- Make Linus.Nuesing@live.de admin
INSERT INTO public.user_roles (user_id, role)
SELECT au.id, 'admin'::app_role
FROM auth.users au
WHERE au.email = 'Linus.Nuesing@live.de'
ON CONFLICT (user_id, role) DO NOTHING;

-- Enable RLS on teams
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- RLS policy for teams
CREATE POLICY "Everyone can view teams" ON public.teams FOR SELECT USING (true);

-- Update RLS policies for team-based access
DROP POLICY IF EXISTS "Everyone can view games" ON public.games;
CREATE POLICY "Users can view games of their team" ON public.games 
FOR SELECT USING (
  team_id = (SELECT team_id FROM public.profiles WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Admins can insert games" ON public.games;
CREATE POLICY "Admins can insert games" ON public.games 
FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) AND 
  team_id = (SELECT team_id FROM public.profiles WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Admins can update games" ON public.games;
CREATE POLICY "Admins can update games" ON public.games 
FOR UPDATE USING (
  has_role(auth.uid(), 'admin'::app_role) AND 
  team_id = (SELECT team_id FROM public.profiles WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Admins can delete games" ON public.games;
CREATE POLICY "Admins can delete games" ON public.games 
FOR DELETE USING (
  has_role(auth.uid(), 'admin'::app_role) AND 
  team_id = (SELECT team_id FROM public.profiles WHERE user_id = auth.uid())
);

-- Update RLS for wash_duties
DROP POLICY IF EXISTS "Everyone can view wash duties" ON public.wash_duties;
CREATE POLICY "Users can view wash duties of their team" ON public.wash_duties 
FOR SELECT USING (
  team_id = (SELECT team_id FROM public.profiles WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can assign themselves" ON public.wash_duties;
CREATE POLICY "Users can assign themselves" ON public.wash_duties 
FOR INSERT WITH CHECK (
  ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role)) AND
  team_id = (SELECT team_id FROM public.profiles WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Admins can assign anyone" ON public.wash_duties;

DROP POLICY IF EXISTS "Users can delete their own wash duty" ON public.wash_duties;
CREATE POLICY "Users can delete their own wash duty" ON public.wash_duties 
FOR DELETE USING (
  ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role)) AND
  team_id = (SELECT team_id FROM public.profiles WHERE user_id = auth.uid())
);

-- Update RLS for locker_duties
DROP POLICY IF EXISTS "Everyone can view locker duties" ON public.locker_duties;
CREATE POLICY "Users can view locker duties of their team" ON public.locker_duties 
FOR SELECT USING (
  team_id = (SELECT team_id FROM public.profiles WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can assign themselves" ON public.locker_duties;
CREATE POLICY "Users can assign themselves" ON public.locker_duties 
FOR INSERT WITH CHECK (
  ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role)) AND
  team_id = (SELECT team_id FROM public.profiles WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Admins can assign anyone" ON public.locker_duties;

DROP POLICY IF EXISTS "Users can delete their own locker duty" ON public.locker_duties;
CREATE POLICY "Users can delete their own locker duty" ON public.locker_duties 
FOR DELETE USING (
  ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role)) AND
  team_id = (SELECT team_id FROM public.profiles WHERE user_id = auth.uid())
);

-- Update RLS for drivers (team-based via game)
DROP POLICY IF EXISTS "Everyone can view drivers" ON public.drivers;
CREATE POLICY "Users can view drivers of their team games" ON public.drivers 
FOR SELECT USING (
  game_id IN (
    SELECT id FROM public.games WHERE team_id = (
      SELECT team_id FROM public.profiles WHERE user_id = auth.uid()
    )
  )
);

-- Update RLS for passengers (team-based via driver->game)
DROP POLICY IF EXISTS "Everyone can view passengers" ON public.passengers;
CREATE POLICY "Users can view passengers of their team" ON public.passengers 
FOR SELECT USING (
  driver_id IN (
    SELECT d.id FROM public.drivers d
    JOIN public.games g ON d.game_id = g.id
    WHERE g.team_id = (SELECT team_id FROM public.profiles WHERE user_id = auth.uid())
  )
);

-- Update profiles RLS to show only same team
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view profiles of their team" ON public.profiles 
FOR SELECT USING (
  team_id = (SELECT team_id FROM public.profiles WHERE user_id = auth.uid())
);

-- Allow admins to update roles of users in their team
CREATE POLICY "Admins can update user roles" ON public.user_roles
FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) AND
  user_id IN (
    SELECT user_id FROM public.profiles 
    WHERE team_id = (SELECT team_id FROM public.profiles WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Admins can delete user roles" ON public.user_roles
FOR DELETE USING (
  has_role(auth.uid(), 'admin'::app_role) AND
  user_id IN (
    SELECT user_id FROM public.profiles 
    WHERE team_id = (SELECT team_id FROM public.profiles WHERE user_id = auth.uid())
  )
);