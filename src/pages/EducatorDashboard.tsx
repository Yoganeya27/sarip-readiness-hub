import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Users, BookOpen, BarChart3, FileCheck } from "lucide-react";

export default function EducatorDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ totalUsers: 0, totalStudents: 0, totalAssessments: 0, activeAssessments: 0, totalAttempts: 0 });

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { count: userCount } = await supabase.from("profiles").select("*", { count: "exact", head: true });
      const { count: studentCount } = await supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "student");
      const { count: assessmentCount } = await supabase.from("assessments").select("*", { count: "exact", head: true });
      const { count: activeCount } = await supabase.from("assessments").select("*", { count: "exact", head: true }).eq("active", true);
      const { count: attemptCount } = await supabase.from("student_assessments").select("*", { count: "exact", head: true });

      setStats({
        totalUsers: userCount ?? 0,
        totalStudents: studentCount ?? 0,
        totalAssessments: assessmentCount ?? 0,
        activeAssessments: activeCount ?? 0,
        totalAttempts: attemptCount ?? 0,
      });
    };
    load();
  }, [user]);

  const cards = [
    { title: "Total Users", value: stats.totalUsers, icon: Users, color: "text-primary" },
    { title: "Students", value: stats.totalStudents, icon: Users, color: "text-accent" },
    { title: "Assessments", value: stats.totalAssessments, icon: BookOpen, color: "text-warning" },
    { title: "Active", value: stats.activeAssessments, icon: BarChart3, color: "text-success" },
    { title: "Attempts", value: stats.totalAttempts, icon: FileCheck, color: "text-info" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Educator Dashboard</h1>
        <p className="text-muted-foreground">Overview of platform activity</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
        {cards.map(c => (
          <Card key={c.title}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{c.title}</p>
                  <p className="text-2xl font-bold">{c.value}</p>
                </div>
                <c.icon className={`h-8 w-8 ${c.color} opacity-80`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
