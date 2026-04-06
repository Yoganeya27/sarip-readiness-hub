import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: assessments } = await supabase.from("assessments").select("id, title, category, difficulty");
      const { data: attempts } = await supabase.from("student_assessments").select("assessment_id, score, percentage").eq("status", "SUBMITTED");

      const map = new Map<string, { title: string; category: string; difficulty: string; attempts: number; totalScore: number; totalPct: number }>();
      (assessments ?? []).forEach(a => {
        map.set(a.id, { title: a.title, category: a.category ?? "", difficulty: a.difficulty, attempts: 0, totalScore: 0, totalPct: 0 });
      });
      (attempts ?? []).forEach(att => {
        const entry = map.get(att.assessment_id);
        if (entry) {
          entry.attempts++;
          entry.totalScore += Number(att.score);
          entry.totalPct += Number(att.percentage);
        }
      });

      setAnalytics(Array.from(map.values()).filter(v => v.attempts > 0));
    };
    load();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Assessment Analytics</h1>
      {analytics.length === 0 ? (
        <Card><CardContent className="pt-6 text-center text-muted-foreground">No analytics data yet.</CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {analytics.map((a, i) => (
            <Card key={i}>
              <CardHeader>
                <CardTitle className="text-base">{a.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-3">
                  <Badge variant="outline">{a.difficulty}</Badge>
                  {a.category && <Badge variant="secondary">{a.category}</Badge>}
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold">{a.attempts}</p>
                    <p className="text-xs text-muted-foreground">Attempts</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{(a.totalScore / a.attempts).toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground">Avg Score</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{(a.totalPct / a.attempts).toFixed(0)}%</p>
                    <p className="text-xs text-muted-foreground">Avg %</p>
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
