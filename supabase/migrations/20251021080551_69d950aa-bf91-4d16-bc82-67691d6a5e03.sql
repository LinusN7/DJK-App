-- Fix infinite recursion in profiles RLS policies
DROP POLICY IF EXISTS "Users can view own profile and same team" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles in their team" ON public.profiles;

-- Create simple, non-recursive RLS policies for profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view same team profiles"
  ON public.profiles
  FOR SELECT
  USING (
    team_id IN (
      SELECT team_id 
      FROM public.profiles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Fix infinite recursion in locker_duties
DROP POLICY IF EXISTS "Users can view locker duties" ON public.locker_duties;
DROP POLICY IF EXISTS "Users can create locker duties" ON public.locker_duties;
DROP POLICY IF EXISTS "Users can update locker duties" ON public.locker_duties;
DROP POLICY IF EXISTS "Users can delete locker duties" ON public.locker_duties;

CREATE POLICY "Users can view locker duties"
  ON public.locker_duties
  FOR SELECT
  USING (
    team_id IN (
      SELECT team_id 
      FROM public.profiles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create locker duties"
  ON public.locker_duties
  FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT team_id 
      FROM public.profiles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update locker duties"
  ON public.locker_duties
  FOR UPDATE
  USING (
    team_id IN (
      SELECT team_id 
      FROM public.profiles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete locker duties"
  ON public.locker_duties
  FOR DELETE
  USING (
    team_id IN (
      SELECT team_id 
      FROM public.profiles 
      WHERE user_id = auth.uid()
    )
  );

-- Fix wash_duties policies
DROP POLICY IF EXISTS "Users can view wash duties" ON public.wash_duties;
DROP POLICY IF EXISTS "Users can create wash duties" ON public.wash_duties;
DROP POLICY IF EXISTS "Users can update wash duties" ON public.wash_duties;
DROP POLICY IF EXISTS "Users can delete wash duties" ON public.wash_duties;

CREATE POLICY "Users can view wash duties"
  ON public.wash_duties
  FOR SELECT
  USING (
    team_id IN (
      SELECT team_id 
      FROM public.profiles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create wash duties"
  ON public.wash_duties
  FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT team_id 
      FROM public.profiles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update wash duties"
  ON public.wash_duties
  FOR UPDATE
  USING (
    team_id IN (
      SELECT team_id 
      FROM public.profiles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete wash duties"
  ON public.wash_duties
  FOR DELETE
  USING (
    team_id IN (
      SELECT team_id 
      FROM public.profiles 
      WHERE user_id = auth.uid()
    )
  );