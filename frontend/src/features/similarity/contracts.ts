export type Review = {
  status: "pending" | "cleared" | "follow_up";
  comment: string;
  reviewer_name?: string;
  updated_at?: string;
};
export type CheckedFile = {
  id: number;
  original_name: string;
  kind: string;
  language: string | null;
  student_name: string;
  version: number;
  extraction_status: string;
  extraction_note: string;
};
export type Match = {
  a_start: number;
  a_end: number;
  b_start: number;
  b_end: number;
  a_label: string;
  b_label: string;
  a_text: string;
  b_text: string;
};
export type Pair = {
  id: number;
  run_id: number;
  mode: string;
  coverage_a: number | null;
  coverage_b: number | null;
  exact_duplicate: boolean;
  note: string;
  match_count: number;
  attachment_a: CheckedFile;
  attachment_b: CheckedFile;
  review: Review;
  matches?: Match[];
  is_stale?: boolean;
  assignment_id?: number;
};
export type Run = {
  id: number;
  assignment_id: number;
  status: string;
  submission_ids: number[];
  template_revision: number;
  algorithm_version: string;
  parameters: Record<string, unknown>;
  started_at: string;
  finished_at: string | null;
  error_message: string;
  is_stale: boolean;
  pair_count: number;
  pairs?: Pair[];
};
export type Template = {
  id: number;
  kind: string;
  language: string | null;
  original_name: string;
  extraction_status: string;
  extraction_note: string;
  revision: number;
};
export const percent = (value: number | null) =>
  value === null ? "不可检测" : `${(value * 100).toFixed(1)}%`;
export const reviewName = {
  pending: "待复核",
  cleared: "已排除",
  follow_up: "需进一步核实",
};
export const runName: Record<string, string> = {
  running: "检测中",
  completed: "已完成",
  failed: "检测失败",
  interrupted: "已中断",
};
