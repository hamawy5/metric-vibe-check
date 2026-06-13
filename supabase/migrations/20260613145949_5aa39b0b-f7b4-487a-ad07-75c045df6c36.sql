CREATE TABLE public.questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject TEXT NOT NULL,
  grade TEXT NOT NULL,
  unit TEXT NOT NULL,
  subunit TEXT,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.questions TO anon;
GRANT SELECT ON public.questions TO authenticated;
GRANT ALL ON public.questions TO service_role;

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Questions are publicly readable"
  ON public.questions FOR SELECT
  USING (true);

INSERT INTO public.questions (subject, grade, unit, subunit, question_text, options, correct_answer, explanation)
VALUES (
  'Physics', '12', '1', '1.1',
  'Who is credited with formulating the three fundamental laws of motion that form the foundation of classical mechanics?',
  '["Newton", "Jule", "Ampir", "Columb"]'::jsonb,
  'Newton',
  'Sir Isaac Newton (1643–1727) formulated the three laws of motion published in his 1687 work "Philosophiæ Naturalis Principia Mathematica". These laws describe the relationship between a body and the forces acting upon it, and the body''s motion in response to those forces — forming the basis of classical mechanics.'
);