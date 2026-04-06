import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export default function AssessmentAttempts() {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [assessment, setAssessment] = useState<any>(null);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [feedbackMap, setFeedbackMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!assessmentId) return;
    const load = async () => {
      const { data: a } = await supabase.from("assessments").select("*").eq("id", assessmentId).single();
      setAssessment(a);

      const { data: atts } = await supabase
        .from("student_assessments")
        .select("*, profiles!student_assessments_student_id_fkey(full_name, email)")
        .eq("assessment_id", assessmentId)
        .order("submitted_at", { ascending: false });

      setAttempts(atts ?? []);
      const fb: Record<string, string> = {};
      (atts ?? []).forEach(at => { fb[at.id] = at.feedback ?? ""; });
      setFeedbackMap(fb);
    };
    load();
  }, [assessmentId]);

  const saveFeedback = async (attemptId: string, studentId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from("student_assessments")
        .update({
          feedback: feedbackMap[attemptId],
          feedback_by: user.id,
          feedback_at: new Date().toISOString(),
        })
        .eq("id", attemptId);
      if (error) throw error;

      // Create notification
      await supabase.from("notifications").insert({
        user_id: studentId,
        title: "New Feedback",
        message: `You received feedback on "${assessment?.title}"`,
      });

      toast({ title: "Feedback saved" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  if (!assessment) return <div className="p-6">Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{assessment.title} — Attempts</h1>
        <p className="text-muted-foreground">{attempts.length} total attempts</p>
      </div>

      {attempts.length === 0 ? (
        <Card><CardContent className="pt-6 text-center text-muted-foreground">No attempts yet.</CardContent></Card>
      ) : (
        <div className="space-y-4">
          {attempts.map(a => (
            <Card key={a.id}>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{(a.profiles as any)?.full_name || (a.profiles as any)?.email || "Student"}</p>
                    <p className="text-xs text-muted-foreground">{(a.profiles as any)?.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={a.status === "SUBMITTED" ? "default" : "secondary"}>{a.status}</Badge>
                    <span className="font-bold text-lg">{Number(a.percentage).toFixed(0)}%</span>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  Score: {a.score}/{a.max_score} · Submitted: {a.submitted_at ? new Date(a.submitted_at).toLocaleString() : "N/A"}
                </div>
                <div className="space-y-2">
                  <Textarea
                    placeholder="Add feedback..."
                    value={feedbackMap[a.id] ?? ""}
                    onChange={e => setFeedbackMap(prev => ({ ...prev, [a.id]: e.target.value }))}
                  />
                  <Button size="sm" onClick={() => saveFeedback(a.id, a.student_id)}>Save Feedback</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
