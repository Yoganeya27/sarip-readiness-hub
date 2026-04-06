
CREATE TYPE public.app_role AS ENUM ('student', 'educator');
CREATE TYPE public.difficulty_level AS ENUM ('EASY', 'MEDIUM', 'HARD');
CREATE TYPE public.question_type AS ENUM ('MULTIPLE_CHOICE', 'TRUE_FALSE', 'DESCRIPTIVE');
CREATE TYPE public.attempt_status AS ENUM ('IN_PROGRESS', 'SUBMITTED');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own role" ON public.user_roles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Educators can view all profiles" ON public.profiles FOR SELECT USING (
  public.has_role(auth.uid(), 'educator')
);
CREATE POLICY "Educators can view all roles" ON public.user_roles FOR SELECT USING (
  public.has_role(auth.uid(), 'educator')
);

CREATE TABLE public.assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT DEFAULT '',
  difficulty difficulty_level NOT NULL DEFAULT 'MEDIUM',
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  active BOOLEAN NOT NULL DEFAULT false,
  practice BOOLEAN NOT NULL DEFAULT false,
  available_from TIMESTAMPTZ,
  available_until TIMESTAMPTZ,
  resource_links TEXT[] DEFAULT '{}',
  questions JSONB NOT NULL DEFAULT '[]',
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students can view active assessments" ON public.assessments FOR SELECT USING (
  active = true OR public.has_role(auth.uid(), 'educator')
);
CREATE POLICY "Educators can insert assessments" ON public.assessments FOR INSERT WITH CHECK (
  public.has_role(auth.uid(), 'educator')
);
CREATE POLICY "Educators can update assessments" ON public.assessments FOR UPDATE USING (
  public.has_role(auth.uid(), 'educator')
);
CREATE POLICY "Educators can delete assessments" ON public.assessments FOR DELETE USING (
  public.has_role(auth.uid(), 'educator')
);

CREATE TABLE public.student_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  answers JSONB DEFAULT '[]',
  score NUMERIC DEFAULT 0,
  max_score NUMERIC DEFAULT 0,
  percentage NUMERIC DEFAULT 0,
  status attempt_status NOT NULL DEFAULT 'IN_PROGRESS',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  feedback TEXT,
  feedback_by UUID REFERENCES auth.users(id),
  feedback_at TIMESTAMPTZ
);
ALTER TABLE public.student_assessments ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX idx_unique_active_attempt ON public.student_assessments (student_id, assessment_id) WHERE status = 'IN_PROGRESS';
CREATE POLICY "Students can view own attempts" ON public.student_assessments FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Students can insert own attempts" ON public.student_assessments FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Students can update own in-progress attempts" ON public.student_assessments FOR UPDATE USING (auth.uid() = student_id AND status = 'IN_PROGRESS');
CREATE POLICY "Educators can view all attempts" ON public.student_assessments FOR SELECT USING (
  public.has_role(auth.uid(), 'educator')
);
CREATE POLICY "Educators can update feedback" ON public.student_assessments FOR UPDATE USING (
  public.has_role(auth.uid(), 'educator')
);

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Educators can insert notifications" ON public.notifications FOR INSERT WITH CHECK (
  public.has_role(auth.uid(), 'educator')
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_assessments_updated_at BEFORE UPDATE ON public.assessments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
