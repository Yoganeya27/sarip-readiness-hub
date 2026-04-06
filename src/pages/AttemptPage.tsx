import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Clock, CheckCircle } from "lucide-react";

interface Question {
  text: string;
  type: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "DESCRIPTIVE";
  options?: string[];
  correctAnswer: string;
  points: number;
  orderIndex: number;
}

export default function AttemptPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [attempt, setAttempt] = useState<any>(null);
  const [assessment, setAssessment] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    if (!attemptId || !user) return;
    const load = async () => {
      const { data: att } = await supabase
        .from("student_assessments")
        .select("*, assessments(*)")
        .eq("id", attemptId)
        .single();

      if (!att) { navigate("/assessments"); return; }
      setAttempt(att);
      setAssessment(att.assessments);
      const qs = (Array.isArray((att.assessments as any)?.questions) ? (att.assessments as any).questions : []) as Question[];
      qs.sort((a, b) => a.orderIndex - b.orderIndex);
      setQuestions(qs);

      if (att.status === "SUBMITTED") {
        setResult({ score: att.score, maxScore: att.max_score, percentage: att.percentage });
        // Restore answers
        if (att.answers && Array.isArray(att.answers)) {
          const restored: Record<number, string> = {};
          (att.answers as any[]).forEach((a: any) => { restored[a.index] = a.answer; });
          setAnswers(restored);
        }
      }
    };
    load();
  }, [attemptId, user]);

  const handleSubmit = async () => {
    if (!attempt || !user) return;
    setSubmitting(true);
    try {
      let score = 0;
      let maxScore = 0;
      const answerArray = questions.map((q, i) => {
        maxScore += q.points;
        const studentAnswer = answers[i] ?? "";
        if (q.type !== "DESCRIPTIVE" && studentAnswer.toLowerCase().trim() === q.correctAnswer.toLowerCase().trim()) {
          score += q.points;
        }
        return { index: i, answer: studentAnswer, correct: studentAnswer.toLowerCase().trim() === q.correctAnswer.toLowerCase().trim() };
      });
      const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;

      const { error } = await supabase
        .from("student_assessments")
        .update({
          answers: answerArray as any,
          score,
          max_score: maxScore,
          percentage,
          status: "SUBMITTED" as any,
          submitted_at: new Date().toISOString(),
        })
        .eq("id", attempt.id);

      if (error) throw error;
      setResult({ score, maxScore, percentage });
      toast({ title: "Submitted!", description: `Score: ${score}/${maxScore} (${percentage.toFixed(0)}%)` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (!attempt || !assessment) return <div className="p-6">Loading...</div>;

  if (result) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <Card className="text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <CheckCircle className="h-16 w-16 text-accent mx-auto" />
            <h2 className="text-2xl font-bold">Assessment Complete</h2>
            <p className="text-muted-foreground">{assessment.title}</p>
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div>
                <p className="text-3xl font-bold text-primary">{Number(result.percentage).toFixed(0)}%</p>
                <p className="text-sm text-muted-foreground">Score</p>
              </div>
              <div>
                <p className="text-3xl font-bold">{result.score}</p>
                <p className="text-sm text-muted-foreground">Points</p>
              </div>
              <div>
                <p className="text-3xl font-bold">{result.maxScore}</p>
                <p className="text-sm text-muted-foreground">Max Points</p>
              </div>
            </div>
            {attempt.feedback && (
              <div className="mt-4 p-4 rounded-lg bg-muted text-left">
                <p className="text-sm font-medium mb-1">Educator Feedback</p>
                <p className="text-sm text-muted-foreground">{attempt.feedback}</p>
              </div>
            )}
            <Button onClick={() => navigate("/assessments")} className="mt-4">Back to Assessments</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{assessment.title}</h1>
          <p className="text-muted-foreground">{assessment.description}</p>
        </div>
        <Badge variant="outline" className="flex items-center gap-1">
          <Clock className="h-3 w-3" /> {assessment.duration_minutes}m
        </Badge>
      </div>

      <div className="space-y-4">
        {questions.map((q, i) => (
          <Card key={i}>
            <CardHeader>
              <CardTitle className="text-base">
                Q{i + 1}. {q.text}
                <span className="ml-2 text-xs text-muted-foreground font-normal">({q.points} pts)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {q.type === "MULTIPLE_CHOICE" && q.options ? (
                <RadioGroup value={answers[i] ?? ""} onValueChange={v => setAnswers(p => ({ ...p, [i]: v }))}>
                  {q.options.map((opt, oi) => (
                    <div key={oi} className="flex items-center space-x-2">
                      <RadioGroupItem value={opt} id={`q${i}-o${oi}`} />
                      <Label htmlFor={`q${i}-o${oi}`}>{opt}</Label>
                    </div>
                  ))}
                </RadioGroup>
              ) : q.type === "TRUE_FALSE" ? (
                <RadioGroup value={answers[i] ?? ""} onValueChange={v => setAnswers(p => ({ ...p, [i]: v }))}>
                  <div className="flex items-center space-x-2"><RadioGroupItem value="True" id={`q${i}-t`} /><Label htmlFor={`q${i}-t`}>True</Label></div>
                  <div className="flex items-center space-x-2"><RadioGroupItem value="False" id={`q${i}-f`} /><Label htmlFor={`q${i}-f`}>False</Label></div>
                </RadioGroup>
              ) : (
                <Textarea
                  value={answers[i] ?? ""}
                  onChange={e => setAnswers(p => ({ ...p, [i]: e.target.value }))}
                  placeholder="Type your answer..."
                />
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Button onClick={handleSubmit} disabled={submitting} className="w-full" size="lg">
        {submitting ? "Submitting..." : "Submit Assessment"}
      </Button>
    </div>
  );
}
