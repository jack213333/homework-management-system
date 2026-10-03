import { useEffect, useState } from "react";
import { UserAvatar } from "../../components/photo-assets";
import { ArrowLeft, Download, FileText, CheckCircle2 } from "lucide-react";
import { api, listAll, message } from "../../lib/api";
import type {
  AssignmentDetail,
  SubmissionDetail,
  TextPreview,
} from "../../lib/contracts";
import { GlassInput, GlassTextarea } from "../../components/glass-input";
import { CodeViewer } from "../../components/code-viewer";
import { date } from "../student/dashboard-page";

export function GradingPage({ id }: { id: number }) {
  const [assignment, setAssignment] = useState<AssignmentDetail | null>(null),
    [submissions, setSubmissions] = useState<SubmissionDetail[]>([]),
    [selected, setSelected] = useState<number | null>(null),
    [fileId, setFileId] = useState<number | null>(null),
    [preview, setPreview] = useState<TextPreview | null>(null),
    [score, setScore] = useState(""),
    [feedback, setFeedback] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  async function load() {
    const [a, all] = await Promise.all([
      api<AssignmentDetail>(`/api/assignments/${id}/`),
      listAll<SubmissionDetail>(`/api/assignments/${id}/submissions/`),
    ]);
    const latest = new Map<number, SubmissionDetail>();
    all.forEach((s) => {
      if (
        !latest.has(s.student_id) ||
        latest.get(s.student_id)!.version < s.version
      )
        latest.set(s.student_id, s);
    });
    const rows = Array.from(latest.values());
    setAssignment(a);
    setSubmissions(rows);
    setSelected((v) =>
      v && rows.some((s) => s.id === v) ? v : rows[0]?.id || null,
    );
  }
  useEffect(() => {
    load().catch((e) => setError(message(e)));
  }, [id]);
  const current = submissions.find((s) => s.id === selected);
  useEffect(() => {
    setScore(current?.grade?.score || "");
    setFeedback(current?.grade?.feedback || "");
    setFileId(current?.attachments[0]?.id || null);
    setNotice("");
  }, [selected]);
  useEffect(() => {
    let active = true;
    setPreview(null);
    if (fileId)
      api<TextPreview>(`/api/attachments/${fileId}/content/`)
        .then((p) => {
          if (active) setPreview(p);
        })
        .catch((e) => {
          if (active) setError(message(e));
        });
    return () => {
      active = false;
    };
  }, [fileId]);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!current) return;
    setBusy(true);
    setError("");
    try {
      await api(`/api/submissions/${current.id}/grade/`, {
        method: "PUT",
        body: JSON.stringify({ score, feedback }),
      });
      await load();
      setNotice("批改已保存，发布后学生可见");
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <a href={`/assignments/${id}`} className="back-link">
        <ArrowLeft size={16} />
        返回作业
      </a>
      <div className="page-heading">
        <div>
          <p className="eyebrow">{assignment?.course_name}</p>
          <h1>批改作业</h1>
          <p className="muted">{assignment?.title} · 每位学生仅批改最新提交</p>
        </div>
        <a className="button secondary" href={`/assignments/${id}/grades`}>
          成绩与统计
        </a>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="success" role="status">
          <CheckCircle2 size={17} />
          {notice}
        </p>
      )}
      <div className="grading-layout">
        <aside className="panel grading-students">
          <div className="section-heading">
            <h2>
              学生提交<span>{submissions.length}</span>
            </h2>
          </div>
          {submissions.map((s) => (
            <button
              className={`student-pick ${selected === s.id ? "selected" : ""}`}
              key={s.id}
              onClick={() => setSelected(s.id)}
            >
              <UserAvatar name={s.student_name} />
              <span>
                <strong>{s.student_name}</strong>
                <small>
                  v{s.version} · {date(s.submitted_at)}
                </small>
              </span>
              <span className="student-grade">
                {s.grade ? s.grade.score : "待批改"}
              </span>
            </button>
          ))}
          {!submissions.length && <div className="empty">暂无提交</div>}
        </aside>
        <section className="panel grading-preview">
          <div className="section-heading">
            <h2>
              <FileText size={17} />
              提交原文
            </h2>
            {fileId && (
              <a href={`/api/attachments/${fileId}/download/`}>
                <Download size={15} />
                下载原件
              </a>
            )}
          </div>
          <div className="file-tabs">
            {current?.attachments.map((f) => (
              <button
                key={f.id}
                className={fileId === f.id ? "active" : ""}
                onClick={() => setFileId(f.id)}
              >
                {f.original_name}
              </button>
            ))}
          </div>
          <div className="preview-body">
            {preview?.note && <p className="parse-note">{preview.note}</p>}
            {preview?.text ? (
              <CodeViewer text={preview.text} />
            ) : (
              <div className="empty">
                {preview
                  ? "该文件无法自动提取文字，请下载原件人工查看。"
                  : current
                    ? "正在提取原文…"
                    : "选择一位学生开始批改。"}
              </div>
            )}
          </div>
        </section>
        <aside className="panel grading-form">
          <div className="section-heading">
            <h2>批改反馈</h2>
            <span>{current?.grade?.published_at ? "已发布" : "待发布"}</span>
          </div>
          {current ? (
            <form onSubmit={save}>
              <div className="grader-subject">
                <strong>{current.student_name}</strong>
                <span>
                  当前提交 v{current.version}
                  {current.is_late ? " · 迟交" : ""}
                </span>
              </div>
              <label className="field-label" htmlFor="grade-score">
                成绩<span>满分 {assignment?.total_score}</span>
              </label>
              <GlassInput
                id="grade-score"
                type="number"
                min="0"
                max={assignment?.total_score}
                step="0.01"
                required
                value={score}
                onChange={(e) => setScore(e.target.value)}
                placeholder="输入分数"
              />
              <label className="field-label" htmlFor="grade-feedback">
                批改评语
              </label>
              <GlassTextarea
                id="grade-feedback"
                rows={7}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="肯定做得好的地方，指出下一步可以改进的内容。"
                maxLength={5000}
              />
              <p className="parse-note">
                保存后不会立即公开。请在成绩页确认并发布；修改已发布评分会撤回该评分。
              </p>
              <button className="button primary" disabled={busy}>
                {busy ? "正在保存…" : "保存批改"}
              </button>
            </form>
          ) : (
            <div className="empty">选择学生后填写反馈</div>
          )}
        </aside>
      </div>
    </>
  );
}
