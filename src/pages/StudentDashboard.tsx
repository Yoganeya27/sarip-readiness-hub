import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { BookOpen, TrendingUp, Target, Clock } from "lucide-react";

export default function StudentDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ completed: 0, readinessIndex: 0, available: 0 });
  const [recentAttempts, setRecentAttempts] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      // Completed attempts
      const { data: attempts } = await supabase
        .from("student_assessments")
        .select("*, assessments(title, category, difficulty)")
        .eq("student_id", user.id)
        .eq("status", "SUBMITTED")
        .order("submitted_at", { ascending: false })
        .limit(5);

      const { count: completedCount } = await supabase
        .from("student_assessments")
        .select("*", { count: "exact", head: true })
        .eq("student_id", user.id)
        .eq("status", "SUBMITTED");

      // All completed for readiness
      const { data: allCompleted } = await supabase
        .from("student_assessments")
        .select("percentage")
        .eq("student_id", user.id)
        .eq("status", "SUBMITTED");

      const avg = allCompleted && allCompleted.length > 0
        ? allCompleted.reduce((sum, a) => sum + Number(a.percentage), 0) / allCompleted.length
        : 0;

      // Available assessments
      const { count: availableCount } = await supabase
        .from("assessments")
        .select("*", { count: "exact", head: true })
        .eq("active", true);

      setStats({ completed: completedCount ?? 0, readinessIndex: Math.round(avg), available: availableCount ?? 0 });
      setRecentAttempts(attempts ?? []);
    };

    loadData();
  }, [user]);

  const statCards = [
    { title: "Readiness Index", value: `${stats.readinessIndex}%`, icon: Target, color: "text-accent" },
    { title: "Completed", value: stats.completed, icon: BookOpen, color: "text-primary" },
    { title: "Available", value: stats.available, icon: Clock, color: "text-warning" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Student Dashboard</h1>
        <p className="text-muted-foreground">Track your academic readiness</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {statCards.map(s => (
          <Card key={s.title}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{s.title}</p>
                  <p className="text-3xl font-bold">{s.value}</p>
                </div>
                <s.icon className={`h-10 w-10 ${s.color} opacity-80`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-4">
        <Button asChild>
          <Link to="/assessments">Browse Assessments</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/trends">View Trends</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Attempts</CardTitle>
        </CardHeader>
        <CardContent>
          {recentAttempts.length === 0 ? (
            <p className="text-muted-foreground text-sm">No attempts yet. Start your first assessment!</p>
          ) : (
            <div className="space-y-3">
              {recentAttempts.map(a => (
                <div key={a.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium">{(a.assessments as any)?.title}</p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="secondary">{(a.assessments as any)?.category}</Badge>
                      <Badge variant="outline">{(a.assessments as any)?.difficulty}</Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{Number(a.percentage).toFixed(0)}%</p>
                    <p className="text-xs text-muted-foreground">
                      {a.score}/{a.max_score} pts
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
