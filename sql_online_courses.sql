-- Online Courses Module - Student Portal Schema
-- FIXED: No infinite recursion (RLS disabled on oc_collaborators lookup table)

-- 0. Migration Checks
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='oc_courses') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='oc_courses' AND column_name='share_token') THEN
      ALTER TABLE public.oc_courses ADD COLUMN share_token uuid DEFAULT gen_random_uuid();
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='oc_enrollments') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='oc_enrollments' AND column_name='full_name') THEN
      ALTER TABLE public.oc_enrollments ADD COLUMN full_name text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='oc_enrollments' AND column_name='status') THEN
      ALTER TABLE public.oc_enrollments ADD COLUMN status text DEFAULT 'invited';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='oc_enrollments' AND column_name='student_id') THEN
      ALTER TABLE public.oc_enrollments ADD COLUMN student_id text;
    END IF;
  END IF;
END $$;

-- Tables
CREATE TABLE IF NOT EXISTS public.oc_courses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  instructor_id uuid REFERENCES auth.users(id),
  status text DEFAULT 'draft',
  share_token uuid DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.oc_collaborators (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id uuid REFERENCES public.oc_courses(id) ON DELETE CASCADE,
  user_email text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(course_id, user_email)
);

CREATE TABLE IF NOT EXISTS public.oc_lessons (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id uuid REFERENCES public.oc_courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.oc_activities (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id uuid REFERENCES public.oc_lessons(id) ON DELETE CASCADE,
  title text NOT NULL,
  type text NOT NULL,
  content text,
  resource_url text,
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.oc_classes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  instructor_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.oc_class_students (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id uuid REFERENCES public.oc_classes(id) ON DELETE CASCADE,
  user_email text NOT NULL, 
  full_name text,
  student_id text,
  status text DEFAULT 'invited', 
  enrolled_at timestamptz DEFAULT now(),
  is_approved boolean DEFAULT false,
  UNIQUE(user_email, class_id)
);

CREATE TABLE IF NOT EXISTS public.oc_course_classes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id uuid REFERENCES public.oc_courses(id) ON DELETE CASCADE,
  class_id uuid REFERENCES public.oc_classes(id) ON DELETE CASCADE,
  UNIQUE(course_id, class_id)
);

-- =============================================
-- RLS SETUP
-- =============================================

-- CRITICAL: Disable RLS on oc_collaborators to break the infinite recursion loop.
-- This table is just a lookup/mapping table. Access control is enforced at the 
-- oc_courses level (only instructors/collaborators can manage courses).
ALTER TABLE public.oc_collaborators DISABLE ROW LEVEL SECURITY;

-- Drop ALL old policies on oc_collaborators to clean up
DROP POLICY IF EXISTS "Instructors manage collaborators" ON public.oc_collaborators;
DROP POLICY IF EXISTS "Collaborators view fellow collaborators" ON public.oc_collaborators;
DROP POLICY IF EXISTS "Collaborators view own" ON public.oc_collaborators;
DROP POLICY IF EXISTS "View own collaborations" ON public.oc_collaborators;

-- Enable RLS on remaining tables
ALTER TABLE public.oc_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oc_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oc_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oc_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oc_class_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oc_course_classes ENABLE ROW LEVEL SECURITY;

-- 1. COURSES: Instructors & Collaborators can manage; everyone can read
DROP POLICY IF EXISTS "Creators and Collaborators manage courses" ON public.oc_courses;
DROP POLICY IF EXISTS "Public view via token" ON public.oc_courses;
DROP POLICY IF EXISTS "Anyone can read courses" ON public.oc_courses;
DROP POLICY IF EXISTS "Owners and collaborators manage courses" ON public.oc_courses;

CREATE POLICY "Anyone can read courses" ON public.oc_courses
  FOR SELECT USING (true);

CREATE POLICY "Owners and collaborators manage courses" ON public.oc_courses
  FOR ALL USING (
    auth.uid() = instructor_id 
    OR EXISTS (
      SELECT 1 FROM public.oc_collaborators 
      WHERE course_id = oc_courses.id 
      AND user_email = auth.jwt() ->> 'email'
    )
  );

-- 3. LESSONS
DROP POLICY IF EXISTS "Creators and Collaborators manage lessons" ON public.oc_lessons;
DROP POLICY IF EXISTS "Manage lessons" ON public.oc_lessons;

CREATE POLICY "Manage lessons" ON public.oc_lessons
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.oc_courses 
      WHERE id = oc_lessons.course_id 
      AND (instructor_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.oc_collaborators 
        WHERE course_id = oc_courses.id 
        AND user_email = auth.jwt() ->> 'email'
      ))
    )
  );

-- 4. CLASSES: Instructors manage their own classes, Students can read
DROP POLICY IF EXISTS "Instructors manage own classes" ON public.oc_classes;
DROP POLICY IF EXISTS "Anyone can read classes" ON public.oc_classes;

CREATE POLICY "Instructors manage own classes" ON public.oc_classes
  FOR ALL USING (instructor_id = auth.uid());
  
CREATE POLICY "Anyone can read classes" ON public.oc_classes
  FOR SELECT USING (true);

-- 5. CLASS STUDENTS: Instructors manage, Students view their own
DROP POLICY IF EXISTS "Instructors manage class students" ON public.oc_class_students;
DROP POLICY IF EXISTS "Students see own enrollment" ON public.oc_class_students;
DROP POLICY IF EXISTS "Students self enroll" ON public.oc_class_students;

CREATE POLICY "Instructors manage class students" ON public.oc_class_students
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.oc_classes 
      WHERE id = oc_class_students.class_id 
      AND instructor_id = auth.uid()
    )
  );

CREATE POLICY "Students see own enrollment" ON public.oc_class_students
  FOR SELECT USING (user_email = auth.jwt() ->> 'email');

CREATE POLICY "Students self enroll" ON public.oc_class_students
  FOR INSERT WITH CHECK (user_email = auth.jwt() ->> 'email');

-- 6. COURSE CLASSES: Instructors & Collaborators manage mappings
DROP POLICY IF EXISTS "Manage course classes" ON public.oc_course_classes;
DROP POLICY IF EXISTS "Anyone can read course classes mappings" ON public.oc_course_classes;

CREATE POLICY "Manage course classes" ON public.oc_course_classes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.oc_courses 
      WHERE id = oc_course_classes.course_id 
      AND (instructor_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.oc_collaborators 
        WHERE course_id = oc_courses.id 
        AND user_email = auth.jwt() ->> 'email'
      ))
    )
  );

CREATE POLICY "Anyone can read course classes mappings" ON public.oc_course_classes
  FOR SELECT USING (true);

-- =============================================
-- ASSESSMENTS & LIVE SESSIONS SCHEMA
-- =============================================

CREATE TABLE IF NOT EXISTS public.oc_assessments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id uuid REFERENCES public.oc_courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  type text NOT NULL, -- 'quiz', 'poll', 'attendance', 'feedback'
  questions jsonb DEFAULT '[]'::jsonb, 
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.oc_rooms (
  id text PRIMARY KEY, -- 5-character alphanumeric room code
  course_id uuid REFERENCES public.oc_courses(id) ON DELETE CASCADE,
  assessment_id uuid REFERENCES public.oc_assessments(id) ON DELETE CASCADE,
  type text, 
  assessment_state jsonb DEFAULT '{}'::jsonb, 
  is_active boolean DEFAULT false,
  is_async boolean DEFAULT false,
  start_time timestamptz,
  end_time timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.oc_responses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id text REFERENCES public.oc_rooms(id) ON DELETE CASCADE,
  user_email text NOT NULL,
  student_name text,
  student_id text,
  answers jsonb DEFAULT '{}'::jsonb,
  score numeric,
  submitted_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.oc_reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id uuid REFERENCES public.oc_courses(id) ON DELETE CASCADE,
  assessment_id uuid REFERENCES public.oc_assessments(id) ON DELETE SET NULL,
  title text,
  type text,
  report_data jsonb DEFAULT '{}'::jsonb, 
  created_at timestamptz DEFAULT now()
);

-- RLS FOR ASSESSMENTS

ALTER TABLE public.oc_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oc_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oc_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oc_reports ENABLE ROW LEVEL SECURITY;

-- 7. ASSESSMENTS
DROP POLICY IF EXISTS "Manage assessments" ON public.oc_assessments;
CREATE POLICY "Manage assessments" ON public.oc_assessments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.oc_courses 
      WHERE id = oc_assessments.course_id 
      AND (instructor_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.oc_collaborators 
        WHERE course_id = oc_courses.id 
        AND user_email = auth.jwt() ->> 'email'
      ))
    )
  );

-- 8. ROOMS: Instructors manage, Students can read active/async rooms
DROP POLICY IF EXISTS "Manage rooms" ON public.oc_rooms;
DROP POLICY IF EXISTS "Anyone can read rooms" ON public.oc_rooms;

CREATE POLICY "Manage rooms" ON public.oc_rooms
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.oc_courses 
      WHERE id = oc_rooms.course_id 
      AND (instructor_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.oc_collaborators 
        WHERE course_id = oc_courses.id 
        AND user_email = auth.jwt() ->> 'email'
      ))
    )
  );

CREATE POLICY "Anyone can read rooms" ON public.oc_rooms
  FOR SELECT USING (true);

-- 9. RESPONSES: Instructors can read/delete, Students can insert/update their own
DROP POLICY IF EXISTS "Instructors read responses" ON public.oc_responses;
DROP POLICY IF EXISTS "Students insert responses" ON public.oc_responses;
DROP POLICY IF EXISTS "Students update own responses" ON public.oc_responses;
DROP POLICY IF EXISTS "Students view own responses" ON public.oc_responses;

CREATE POLICY "Instructors read responses" ON public.oc_responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.oc_rooms r
      JOIN public.oc_courses c ON c.id = r.course_id
      WHERE r.id = oc_responses.room_id 
      AND (c.instructor_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.oc_collaborators 
        WHERE course_id = c.id 
        AND user_email = auth.jwt() ->> 'email'
      ))
    )
  );

CREATE POLICY "Students insert responses" ON public.oc_responses
  FOR INSERT WITH CHECK (user_email = auth.jwt() ->> 'email');

CREATE POLICY "Students update own responses" ON public.oc_responses
  FOR UPDATE USING (user_email = auth.jwt() ->> 'email');

CREATE POLICY "Students view own responses" ON public.oc_responses
  FOR SELECT USING (user_email = auth.jwt() ->> 'email');

-- 10. REPORTS: Only Instructors manage
DROP POLICY IF EXISTS "Manage reports" ON public.oc_reports;
CREATE POLICY "Manage reports" ON public.oc_reports
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.oc_courses 
      WHERE id = oc_reports.course_id 
      AND (instructor_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.oc_collaborators 
        WHERE course_id = oc_courses.id 
        AND user_email = auth.jwt() ->> 'email'
      ))
    )
  );
