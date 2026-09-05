CREATE POLICY "Users can delete own actions"
  ON public.goal_actions FOR DELETE
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.touch_streak()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  last_date date;
  current_streak integer;
  today date := (now() at time zone 'utc')::date;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT last_active_date, COALESCE(streak_days, 0)
    INTO last_date, current_streak
  FROM public.profiles
  WHERE user_id = auth.uid();

  IF NOT FOUND THEN
    INSERT INTO public.profiles (user_id, streak_days, last_active_date)
    VALUES (auth.uid(), 1, today);
    RETURN 1;
  END IF;

  IF last_date = today THEN
    RETURN GREATEST(current_streak, 1);
  ELSIF last_date = today - 1 THEN
    current_streak := current_streak + 1;
  ELSE
    current_streak := 1;
  END IF;

  UPDATE public.profiles
  SET streak_days = current_streak, last_active_date = today
  WHERE user_id = auth.uid();

  RETURN current_streak;
END;
$$;

GRANT EXECUTE ON FUNCTION public.touch_streak() TO authenticated;