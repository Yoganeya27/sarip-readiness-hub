import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";

export default function TrendsPage() {
  const { user } = useAuth();
  const [attempts, setAttempts] = useState<any[]>([]);
  const [readinessIndex, setReadinessIndex] = useState(0);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("student_assessments")
        .select("*, assessments(title, category)")
        .eq("student_id", user.id)
        .eq("status", "SUBMITTED")
        .order("submitted_at", { ascending: true });

      setAttempts(data ?? []);
      if (data && data.length > 0) {
        const avg = data.reduce((s, a) => s + Number(a.percentage), 0) / data.length;
        setReadinessIndex(Math.round(avg));
      }
    };
    load();
  }, [user]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Performance Trends</h1>
        <p className="text-muted-foreground">Track your progress over time</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full gradient-accent">
              <span className="text-xl font-bold text-accent-foreground">{readinessIndex}%</span>
            </div>
            <div>
              <p className="text-lg font-semibold">Readiness Index</p>
              <p className="text-sm text-muted-foreground">Average across all completed assessments</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Attempt History</CardTitle>
        </CardHeader>
        <CardContent>
          {attempts.length === 0 ? (
            <p className="text-muted-foreground text-sm">No completed attempts yet.</p>
          ) : (
            <div className="space-y-3">
              {attempts.map((a, i) => {
                const prevPct = i > 0 ? Number(attempts[i - 1].percentage) : null;
                const curPct = Number(a.percentage);
                const improving = prevPct !== null && curPct >= prevPct;

                return (
                  <div key={a.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${curPct >= 70 ? "bg-accent/10 text-accent" : curPct >= 40 ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"}`}>
                        {improving ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{(a.assessments as any)?.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(a.submitted_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{curPct.toFixed(0)}%</p>
                      <p className="text-xs text-muted-foreground">{a.score}/{a.max_score}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Simple bar chart */}
          {attempts.length > 0 && (
            <div className="mt-6">
              <p className="text-sm font-medium mb-3">Score Distribution</p>
              <div className="flex items-end gap-1 h-32">
                {attempts.map((a, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end">
                    <div
                      className="w-full rounded-t gradient-primary min-h-[4px]"
                      style={{ height: `${Number(a.percentage)}%` }}
                    />
                    <p className="text-[10px] text-muted-foreground mt-1 truncate w-full text-center">
                      {i + 1}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
