import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type Goal = {
  id: string;
  title: string;
  status: string;
  created_at: string;
};

export type GoalAction = {
  id: string;
  goal_id: string;
  text: string;
  done: boolean | null;
  created_at: string;
};

export type Insight = {
  id: string;
  title: string;
  content: string;
  created_at: string;
};

export const useProfile = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, preferred_time, streak_days, created_at")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
};

export const useGoals = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const goals = useQuery({
    queryKey: ["goals", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [{ data: g, error: ge }, { data: a, error: ae }] = await Promise.all([
        supabase.from("goals").select("id, title, status, created_at").order("created_at"),
        supabase.from("goal_actions").select("id, goal_id, text, done, created_at").order("created_at"),
      ]);
      if (ge) throw ge;
      if (ae) throw ae;
      return { goals: (g ?? []) as Goal[], actions: (a ?? []) as GoalAction[] };
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["goals", user?.id] });
    qc.invalidateQueries({ queryKey: ["stats", user?.id] });
  };

  const addGoal = useMutation({
    mutationFn: async (title: string) => {
      const { error } = await supabase.from("goals").insert({ user_id: user!.id, title });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteGoal = useMutation({
    mutationFn: async (goalId: string) => {
      const { error: ae } = await supabase.from("goal_actions").delete().eq("goal_id", goalId);
      if (ae) throw ae;
      const { error } = await supabase.from("goals").delete().eq("id", goalId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const addAction = useMutation({
    mutationFn: async ({ goalId, text }: { goalId: string; text: string }) => {
      const { error } = await supabase
        .from("goal_actions")
        .insert({ user_id: user!.id, goal_id: goalId, text });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const toggleAction = useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean }) => {
      const { error } = await supabase.from("goal_actions").update({ done }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteAction = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("goal_actions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { goals, addGoal, deleteGoal, addAction, toggleAction, deleteAction };
};

export const useInsights = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["insights", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insights")
        .select("id, title, content, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Insight[];
    },
  });
};

export const useStats = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["stats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [profile, actions, insights, messages] = await Promise.all([
        supabase
          .from("profiles")
          .select("streak_days, created_at")
          .eq("user_id", user!.id)
          .maybeSingle(),
        supabase.from("goal_actions").select("id", { count: "exact", head: true }).eq("done", true),
        supabase.from("insights").select("id", { count: "exact", head: true }),
        supabase.from("messages").select("id", { count: "exact", head: true }),
      ]);

      const start = profile.data?.created_at ? new Date(profile.data.created_at) : new Date();
      const days = Math.max(
        1,
        Math.floor((Date.now() - start.getTime()) / 86400000) + 1
      );

      return {
        journeyDays: days,
        streak: profile.data?.streak_days ?? 0,
        completedActions: actions.count ?? 0,
        insights: insights.count ?? 0,
        messages: messages.count ?? 0,
      };
    },
  });
};
