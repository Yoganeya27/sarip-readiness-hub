import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Eye, Power } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Question {
  text: string;
  type: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "DESCRIPTIVE";
  options: string[];
  correctAnswer: string;
  points: number;
  orderIndex: number;
}

interface AssessmentForm {
  title: string;
  description: string;
  category: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  duration_minutes: number;
  active: boolean;
  practice: boolean;
  questions: Question[];
}

const emptyForm: AssessmentForm = {
  title: "", description: "", category: "", difficulty: "MEDIUM",
  duration_minutes: 30, active: false, practice: false, questions: [],
};

const emptyQuestion: Question = {
  text: "", type: "MULTIPLE_CHOICE", options: ["", "", "", ""],
  correctAnswer: "", points: 1, orderIndex: 0,
};

export default function ManageAssessments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [assessments, setAssessments] = useState<any[]>([]);
  const [form, setForm] = useState<AssessmentForm>({ ...emptyForm });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const loadAssessments = async () => {
    const { data } = await supabase.from("assessments").select("*").order("created_at", { ascending: false });
    setAssessments(data ?? []);
  };

  useEffect(() => { loadAssessments(); }, []);

  const handleSave = async () => {
    if (!user) return;
    try {
      const payload = {
        ...form,
        questions: form.questions.map((q, i) => ({ ...q, orderIndex: i })) as any,
        created_by: user.id,
      };

      if (editingId) {
        const { error } = await supabase.from("assessments").update(payload).eq("id", editingId);
        if (error) throw error;
        toast({ title: "Assessment updated" });
      } else {
        const { error } = await supabase.from("assessments").insert(payload);
        if (error) throw error;
        toast({ title: "Assessment created" });
      }
      setDialogOpen(false);
      setForm({ ...emptyForm });
      setEditingId(null);
      loadAssessments();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleEdit = (a: any) => {
    setForm({
      title: a.title, description: a.description ?? "", category: a.category ?? "",
      difficulty: a.difficulty, duration_minutes: a.duration_minutes,
      active: a.active, practice: a.practice,
      questions: Array.isArray(a.questions) ? a.questions : [],
    });
    setEditingId(a.id);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this assessment?")) return;
    await supabase.from("assessments").delete().eq("id", id);
    toast({ title: "Deleted" });
    loadAssessments();
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from("assessments").update({ active: !active }).eq("id", id);
    loadAssessments();
  };

  const addQuestion = () => {
    setForm(f => ({ ...f, questions: [...f.questions, { ...emptyQuestion, orderIndex: f.questions.length }] }));
  };

  const updateQuestion = (idx: number, updates: Partial<Question>) => {
    setForm(f => ({
      ...f,
      questions: f.questions.map((q, i) => i === idx ? { ...q, ...updates } : q),
    }));
  };

  const removeQuestion = (idx: number) => {
    setForm(f => ({ ...f, questions: f.questions.filter((_, i) => i !== idx) }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Manage Assessments</h1>
          <p className="text-muted-foreground">Create and manage assessments</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setForm({ ...emptyForm }); setEditingId(null); } }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> New Assessment</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit" : "Create"} Assessment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Difficulty</Label>
                  <Select value={form.difficulty} onValueChange={(v: any) => setForm(f => ({ ...f, difficulty: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EASY">Easy</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HARD">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Duration (min)</Label>
                  <Input type="number" value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: parseInt(e.target.value) || 30 }))} />
                </div>
                <div className="space-y-2 flex flex-col justify-end">
                  <div className="flex items-center gap-2">
                    <Switch checked={form.practice} onCheckedChange={v => setForm(f => ({ ...f, practice: v }))} />
                    <Label>Practice</Label>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Questions</Label>
                  <Button variant="outline" size="sm" onClick={addQuestion}><Plus className="h-3 w-3 mr-1" /> Add</Button>
                </div>
                {form.questions.map((q, i) => (
                  <Card key={i}>
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">Question {i + 1}</p>
                        <Button variant="ghost" size="sm" onClick={() => removeQuestion(i)}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                      <Input placeholder="Question text" value={q.text} onChange={e => updateQuestion(i, { text: e.target.value })} />
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Type</Label>
                          <Select value={q.type} onValueChange={(v: any) => updateQuestion(i, { type: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="MULTIPLE_CHOICE">Multiple Choice</SelectItem>
                              <SelectItem value="TRUE_FALSE">True/False</SelectItem>
                              <SelectItem value="DESCRIPTIVE">Descriptive</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Points</Label>
                          <Input type="number" value={q.points} onChange={e => updateQuestion(i, { points: parseInt(e.target.value) || 1 })} />
                        </div>
                      </div>
                      {q.type === "MULTIPLE_CHOICE" && (
                        <div className="space-y-2">
                          <Label className="text-xs">Options</Label>
                          {q.options.map((opt, oi) => (
                            <Input key={oi} placeholder={`Option ${oi + 1}`} value={opt}
                              onChange={e => {
                                const newOpts = [...q.options];
                                newOpts[oi] = e.target.value;
                                updateQuestion(i, { options: newOpts });
                              }}
                            />
                          ))}
                        </div>
                      )}
                      <div>
                        <Label className="text-xs">Correct Answer</Label>
                        <Input value={q.correctAnswer} onChange={e => updateQuestion(i, { correctAnswer: e.target.value })} />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Button onClick={handleSave} className="w-full">{editingId ? "Update" : "Create"} Assessment</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {assessments.length === 0 ? (
        <Card><CardContent className="pt-6 text-center text-muted-foreground">No assessments yet.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {assessments.map(a => (
            <Card key={a.id}>
              <CardContent className="pt-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{a.title}</p>
                    <Badge variant={a.active ? "default" : "secondary"}>{a.active ? "Active" : "Inactive"}</Badge>
                    <Badge variant="outline">{a.difficulty}</Badge>
                    {a.category && <Badge variant="secondary">{a.category}</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {Array.isArray(a.questions) ? a.questions.length : 0} questions · {a.duration_minutes}m
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => toggleActive(a.id, a.active)} title={a.active ? "Deactivate" : "Activate"}>
                    <Power className={`h-4 w-4 ${a.active ? "text-accent" : "text-muted-foreground"}`} />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => navigate(`/assessment-attempts/${a.id}`)}><Eye className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(a)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(a.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
