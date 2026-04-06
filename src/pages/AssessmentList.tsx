import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Clock, BookOpen } from "lucide-react";

interface Assessment {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  difficulty: string;
  duration_minutes: number;
  practice: boolean;
  questions: any;
}

export default function AssessmentList() {
  const { user } = useAuth();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [inProgressIds, setInProgressIds] = useState<Map<string, string>>(new Map());
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: asmts } = await supabase
        .from("assessments")
        .select("*")
        .eq("active", true)
        .order("created_at", { ascending: false });
      setAssessments(asmts ?? []);

      const { data: attempts } = await supabase
        .from("student_assessments")
        .select("id, assessment_id, status")
        .eq("student_id", user.id);

      const completed = new Set<string>();
      const inProgress = new Map<string, string>();
      (attempts ?? []).forEach(a => {
        if (a.status === "SUBMITTED") completed.add(a.assessment_id);
        if (a.status === "IN_PROGRESS") inProgress.set(a.assessment_id, a.id);
      });
      setCompletedIds(completed);
      setInProgressIds(inProgress);
    };
    load();
  }, [user]);

  const startAttempt = async (assessmentId: string) => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("student_assessments")
        .insert({ student_id: user.id, assessment_id: assessmentId })
        .select()
        .single();
      if (error) throw error;
      navigate(`/attempt/${data.id}`);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Assessments</h1>
        <p className="text-muted-foreground">Browse and start available assessments</p>
      </div>

      {assessments.length === 0 ? (
        <Card><CardContent className="pt-6 text-center text-muted-foreground">No active assessments available.</CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {assessments.map(a => {
            const questionCount = Array.isArray(a.questions) ? a.questions.length : 0;
            const isCompleted = completedIds.has(a.id);
            const ipId = inProgressIds.get(a.id);

            return (
              <Card key={a.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{a.title}</CardTitle>
                    {a.practice && <Badge variant="secondary">Practice</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{a.description}</p>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-end gap-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{a.difficulty}</Badge>
                    {a.category && <Badge variant="secondary">{a.category}</Badge>}
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" /> {a.duration_minutes}m
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <BookOpen className="h-3 w-3" /> {questionCount} Q
                    </span>
                  </div>
                  {isCompleted ? (
                    <Button variant="outline" disabled>Completed</Button>
                  ) : ipId ? (
                    <Button onClick={() => navigate(`/attempt/${ipId}`)}>Continue</Button>
                  ) : (
                    <Button onClick={() => startAttempt(a.id)}>Start Assessment</Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
