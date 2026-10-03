import { useEffect, useState } from "react";
import { ArrowLeft, Download, ShieldCheck, ArrowRight } from "lucide-react";
import { api, message } from "../../lib/api";
import { GlassTextarea } from "../../components/glass-input";
import { GlassSelect } from "../../components/glass-select";
import type { Pair, Review } from "./contracts";
import { percent } from "./contracts";
export function PairPage({ id }: { id: number }) {
  const [pair, setPair] = useState<Pair | null>(null),
    [status, setStatus] = useState<Review["status"]>("pending"),
    [comment, setComment] = useState(""),
    [index, setIndex] = useState(0),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    api<Pair>(`/api/similarity-pairs/${id}/`)
      .then((p) => {
        setPair(p);
        setStatus(p.review.status);
        setComment(p.review.comment);
      })
      .catch((e) => setError(message(e)));
  }, [id]);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(`/api/similarity-pairs/${id}/review/`, {
        method: "PUT",
        body: JSON.stringify({ status, comment }),
      });
      setNotice("复核意见已保存，不影响成绩");
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  if (!pair)
    return <div className="panel empty">{error || "正在加载匹配片段…"}</div>;
  const match = pair.matches?.[index];
  return (
    <>
      <a
        className="back-link"
        href={`/assignments/${pair.assignment_id}/similarity`}
      >
        <ArrowLeft size={16} />
        返回检测结果
      </a>
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            检测 #{pair.run_id} ·{" "}
            {pair.mode === "report"
              ? "报告原文"
              : pair.attachment_a.language === "java"
                ? "Java 代码"
                : "Python 代码"}
          </p>
          <h1>匹配片段与复核</h1>
          <p className="muted">
            双方原文位置已保留，结合上下文和原件作出判断。
          </p>
        </div>
        <span className="badge">
          {pair.exact_duplicate ? "原件字节完全一致" : "词元 / 字符片段匹配"}
        </span>
      </div>
      {pair.is_stale && (
        <p className="warning">
          当前结果来自历史快照，请核对版本；最新提交或公共模板已经变化。
        </p>
      )}
      <div className="pair-heads">
        {([pair.attachment_a, pair.attachment_b] as const).map((file, i) => (
          <section className="panel pair-head" key={file.id}>
            <div>
              <span
                className={`avatar ${i ? "sage-avatar" : "lavender-avatar"}`}
              >
                {file.student_name.slice(-2)}
              </span>
              <div>
                <h2>
                  {file.student_name}
                  <small>提交 v{file.version}</small>
                </h2>
                <p>{file.original_name}</p>
              </div>
            </div>
            <div className="pair-coverage">
              <strong>{percent(i ? pair.coverage_b : pair.coverage_a)}</strong>
              <span>有效指纹覆盖率</span>
            </div>
            <a
              className="text-button"
              href={`/api/attachments/${file.id}/download/`}
            >
              <Download size={15} />
              下载原件
            </a>
            {file.extraction_note && (
              <small className="muted">{file.extraction_note}</small>
            )}
          </section>
        ))}
      </div>
      <section className="panel match-panel">
        <div className="section-heading">
          <h2>
            匹配片段<span>{pair.match_count}</span>
          </h2>
          {!!pair.match_count && (
            <div className="match-navigation">
              <button
                className="icon-button"
                aria-label="上一个片段"
                disabled={index === 0}
                onClick={() => setIndex((v) => v - 1)}
              >
                <ArrowLeft size={16} />
              </button>
              <span>
                {index + 1} / {pair.match_count}
              </span>
              <button
                className="icon-button"
                aria-label="下一个片段"
                disabled={index === pair.match_count - 1}
                onClick={() => setIndex((v) => v + 1)}
              >
                <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>
        <p className="comparison-note">{pair.note}</p>
        {match ? (
          <div className="match-grid">
            <article>
              <div className="match-location">
                {pair.attachment_a.student_name} · {match.a_label}
                <span>
                  字符 {match.a_start}–{match.a_end}
                </span>
              </div>
              <pre className="match-text">{match.a_text}</pre>
            </article>
            <article>
              <div className="match-location">
                {pair.attachment_b.student_name} · {match.b_label}
                <span>
                  字符 {match.b_start}–{match.b_end}
                </span>
              </div>
              <pre className="match-text">{match.b_text}</pre>
            </article>
          </div>
        ) : (
          <div className="empty">
            {pair.exact_duplicate
              ? "原件字节一致，但有效内容不足或已经被公共模板排除，请下载原件核实。"
              : "没有可展示的共同片段；无法提取或有效内容不足时，覆盖率为不可检测。"}
          </div>
        )}
      </section>
      <section className="panel review-panel">
        <div className="section-heading">
          <h2>
            <ShieldCheck size={18} />
            教师复核
          </h2>
          <span>复核与成绩独立</span>
        </div>
        <form onSubmit={save}>
          <div>
            <label className="field-label" htmlFor="review-status">
              复核状态
            </label>
            <GlassSelect
              id="review-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as Review["status"])}
            >
              <option value="pending">待复核</option>
              <option value="cleared">已排除</option>
              <option value="follow_up">需进一步核实</option>
            </GlassSelect>
            <p className="muted">
              结合公共资料、合作范围和学生说明，记录具体理由。
            </p>
          </div>
          <div>
            <label className="field-label" htmlFor="review-comment">
              复核备注
            </label>
            <GlassTextarea
              id="review-comment"
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={5000}
              placeholder="记录已核实的事实与需要继续确认的问题。"
            />
          </div>
          <div className="review-save">
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            {notice && (
              <p className="success" role="status">
                {notice}
              </p>
            )}
            <button className="button primary" disabled={busy}>
              {busy ? "正在保存…" : "保存复核"}
            </button>
          </div>
        </form>
      </section>
    </>
  );
}
