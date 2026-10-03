import { useEffect, useState } from "react";
import { ArrowLeft, Download, Send, CheckCircle2 } from "lucide-react";
import { api, message } from "../../lib/api";
import type { AssignmentDetail } from "../../lib/contracts";
import { GlassDialog } from "../../components/glass-dialog";
import { date } from "../student/dashboard-page";
type Row = {
  student_id: number;
  student_name: string;
  student_number: string;
  submission_id: number | null;
  version: number | null;
  submitted_at: string | null;
  is_late: boolean;
  score: string | null;
  feedback: string;
  published_at: string | null;
  status: string;
};
type Statistics = {
  enrolled_count: number;
  submitted_count: number;
  missing_count: number;
  late_count: number;
  graded_count: number;
  published_count: number;
  average_score: string | null;
  score_distribution: { label: string; count: number }[];
};
export function GradesPage({ id }: { id: number }) {
  const [assignment, setAssignment] = useState<AssignmentDetail | null>(null),
    [rows, setRows] = useState<Row[]>([]),
    [stats, setStats] = useState<Statistics | null>(null),
    [confirm, setConfirm] = useState<"publish" | "unpublish" | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  async function load() {
    const [a, r, s] = await Promise.all([
      api<AssignmentDetail>(`/api/assignments/${id}/`),
      api<Row[]>(`/api/assignments/${id}/grades/`),
      api<Statistics>(`/api/assignments/${id}/statistics/`),
    ]);
    setAssignment(a);
    setRows(r);
    setStats(s);
  }
  useEffect(() => {
    load().catch((e) => setError(message(e)));
  }, [id]);
  async function publish() {
    setBusy(true);
    setError("");
    try {
      await api(`/api/assignments/${id}/grades/${confirm}/`, {
        method: "POST",
      });
      setNotice(confirm === "publish" ? "成绩已发布" : "成绩已撤回");
      setConfirm(null);
      await load();
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
          <h1>成绩与统计</h1>
          <p className="muted">{assignment?.title} · 统计只使用当前最新提交</p>
        </div>
        <div className="heading-actions">
          <a
            className="button secondary"
            href={`/api/assignments/${id}/grades/export/`}
          >
            <Download size={16} />
            导出 CSV
          </a>
          <button
            className="button primary"
            onClick={() => setConfirm("publish")}
            disabled={!stats?.graded_count}
          >
            <Send size={16} />
            发布成绩
          </button>
        </div>
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
      <div className="stats-grid">
        {[
          { title: "课程人数", value: stats?.enrolled_count },
          {
            title: "已提交 / 待提交",
            value: stats
              ? `${stats.submitted_count} / ${stats.missing_count}`
              : null,
          },
          {
            title: "已批改 / 已发布",
            value: stats
              ? `${stats.graded_count} / ${stats.published_count}`
              : null,
          },
          { title: "平均成绩", value: stats?.average_score },
        ].map((item) => (
          <section className="stat-card" key={item.title}>
            <div>{item.title}</div>
            <strong>{item.value ?? "—"}</strong>
            <small>
              {item.title === "平均成绩"
                ? "未提交和未批改不计入平均分"
                : "仅统计当前版本"}
            </small>
          </section>
        ))}
      </div>
      <div className="grades-layout">
        <section className="panel">
          <div className="section-heading">
            <h2>
              成绩表<span>{rows.length}</span>
            </h2>
            <button
              className="text-button"
              onClick={() => setConfirm("unpublish")}
              disabled={!stats?.published_count}
            >
              撤回发布
            </button>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>学生</th>
                  <th>提交版本</th>
                  <th>提交时间</th>
                  <th>状态</th>
                  <th>成绩</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.student_id}>
                    <td>
                      <strong>{row.student_name}</strong>
                      <small>{row.student_number || "—"}</small>
                    </td>
                    <td>{row.version ? `v${row.version}` : "—"}</td>
                    <td>
                      {row.submitted_at ? date(row.submitted_at) : "—"}
                      {row.is_late && <span className="badge warm">迟交</span>}
                    </td>
                    <td>
                      <span
                        className={`badge ${row.published_at ? "positive" : ""}`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="score-cell">{row.score ?? "—"}</td>
                    <td>
                      {row.submission_id ? (
                        <a
                          className="text-button"
                          href={`/assignments/${id}/grading`}
                        >
                          批改
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="panel distribution">
          <div className="section-heading">
            <h2>成绩分布</h2>
          </div>
          <p className="muted">按作业满分的百分比分组</p>
          {stats?.score_distribution.map((bucket) => (
            <div className="distribution-row" key={bucket.label}>
              <span>{bucket.label}</span>
              <div>
                <i
                  style={{
                    width: stats.graded_count
                      ? `${(bucket.count / stats.graded_count) * 100}%`
                      : "0%",
                  }}
                />
              </div>
              <strong>{bucket.count}</strong>
            </div>
          ))}
          <p className="distribution-note">
            分布包含已批改的当前版本。没有成绩的学生会保留在列表中。
          </p>
        </section>
      </div>
      <GlassDialog
        open={!!confirm}
        onOpenChange={(v) => {
          if (!v) setConfirm(null);
        }}
        title={confirm === "publish" ? "发布成绩" : "撤回成绩"}
        description={
          confirm === "publish"
            ? "将最新提交中已批改的成绩公开给对应学生。未批改者继续等待反馈。"
            : "撤回后，学生将暂时看不到当前版本的成绩与评语。"
        }
        busy={busy}
      >
        <div className="dialog-footer">
          <button
            className="button secondary"
            onClick={() => setConfirm(null)}
            disabled={busy}
          >
            取消
          </button>
          <button className="button primary" onClick={publish} disabled={busy}>
            {busy
              ? "正在保存…"
              : confirm === "publish"
                ? "确认发布"
                : "确认撤回"}
          </button>
        </div>
      </GlassDialog>
    </>
  );
}
