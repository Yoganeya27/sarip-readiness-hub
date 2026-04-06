import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function StudentsPage() {
  const [students, setStudents] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "student");
      if (!roles || roles.length === 0) { setStudents([]); return; }

      const ids = roles.map(r => r.user_id);
      const { data: profiles } = await supabase.from("profiles").select("*").in("user_id", ids);
      
      // Get attempt counts per student
      const { data: attempts } = await supabase
        .from("student_assessments")
        .select("student_id, percentage, status")
        .eq("status", "SUBMITTED");

      const attemptMap = new Map<string, { count: number; totalPct: number }>();
      (attempts ?? []).forEach(a => {
        const entry = attemptMap.get(a.student_id) ?? { count: 0, totalPct: 0 };
        entry.count++;
        entry.totalPct += Number(a.percentage);
        attemptMap.set(a.student_id, entry);
      });

      const enriched = (profiles ?? []).map(p => {
        const stats = attemptMap.get(p.user_id) ?? { count: 0, totalPct: 0 };
        return {
          ...p,
          attemptCount: stats.count,
          readinessIndex: stats.count > 0 ? Math.round(stats.totalPct / stats.count) : 0,
        };
      });

      setStudents(enriched);
    };
    load();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Students</h1>
      {students.length === 0 ? (
        <Card><CardContent className="pt-6 text-center text-muted-foreground">No students registered yet.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {students.map(s => (
            <Card key={s.id}>
              <CardContent className="pt-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{s.full_name || "Unnamed"}</p>
                  <p className="text-sm text-muted-foreground">{s.email}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-lg font-bold">{s.attemptCount}</p>
                    <p className="text-xs text-muted-foreground">Attempts</p>
                  </div>
                  <div className="text-center">
                    <Badge variant={s.readinessIndex >= 70 ? "default" : s.readinessIndex >= 40 ? "secondary" : "destructive"}>
                      {s.readinessIndex}% RI
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
