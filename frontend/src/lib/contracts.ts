export type UserSummary = {
  id: number;
  username: string;
  display_name: string;
  role: "admin" | "teacher" | "student";
  student_number: string;
};
export type CourseSummary = {
  id: number;
  code: string;
  name: string;
  description: string;
  teacher_id: number;
  teacher_name: string;
  status: "active" | "archived";
  student_count: number;
};
export type AttachmentDetail = {
  id: number;
  kind: "report" | "code";
  original_name: string;
  size_bytes: number;
  language: string | null;
  extraction_status: string;
  extraction_note: string;
};
export type Grade = {
  score: string;
  feedback: string;
  graded_at: string;
  published_at: string | null;
  grader_name: string;
};
export type SubmissionDetail = {
  id: number;
  assignment_id: number;
  student_id: number;
  student_name: string;
  student_number: string;
  version: number;
  submitted_at: string;
  is_late: boolean;
  comment: string;
  attachments: AttachmentDetail[];
  grade: Grade | null;
};
export type AssignmentDetail = {
  id: number;
  course_id: number;
  course_name: string;
  course_code: string;
  title: string;
  description: string;
  status: "draft" | "open" | "closed";
  deadline: string;
  allow_late: boolean;
  require_report: boolean;
  require_code: boolean;
  total_score: string;
  template_revision: number;
  my_submission: SubmissionDetail | null;
};
export type Page<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};
export type TextPreview = {
  id: number;
  original_name: string;
  text: string;
  locations: Record<string, unknown>[];
  status: string;
  note: string;
};
