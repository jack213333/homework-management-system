import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ScanSearch,
  Plus,
  FileText,
  ShieldCheck,
  Trash2,
  ArrowUpRight,
} from "lucide-react";
import { api, listAll, message } from "../../lib/api";
import type { AssignmentDetail } from "../../lib/contracts";
import { GlassSelect } from "../../components/glass-select";
import { GlassDialog } from "../../components/glass-dialog";
import { date } from "../student/dashboard-page";
import type { Run, Template } from "./contracts";
import { percent, reviewName, runName } from "./contracts";

export function SimilarityPage({ id }: { id: number }) {
  const [assignment, setAssignment] = useState<AssignmentDetail | null>(null),
    [runs, setRuns] = useState<Run[]>([]),
    [current, setCurrent] = useState<Run | null>(null),
    [templates, setTemplates] = useState<Template[]>([]),
    [kind, setKind] = useState("all"),
    [threshold, setThreshold] = useState("0"),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [templateOpen, setTemplateOpen] = useState(false),
    [templateKind, setTemplateKind] = useState("report"),
    [file, setFile] = useState<File | null>(null),
    [remove, setRemove] = useState<Template | null>(null);
  async function load() {
    const [a, rs, ts] = await Promise.all([
      api<AssignmentDetail>(`/api/assignments/${id}/`),
      listAll<Run>(`/api/assignments/${id}/similarity-runs/`),
      api<Template[]>(`/api/assignments/${id}/templates/`),
    ]);
    setAssignment(a);
    setRuns(rs);
    setTemplates(ts);
    if (rs.length) {
      const detail = await api<Run>(`/api/similarity-runs/${rs[0].id}/`);
      setCurrent(detail);
    }
  }
  useEffect(() => {
    load().catch((e) => setError(message(e)));
  }, [id]);
  async function selectRun(value: string) {
    setError("");
    try {
      setCurrent(await api<Run>(`/api/similarity-runs/${value}/`));
    } catch (e) {
      setError(message(e));
    }
  }
  async function run() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await api<Run>(`/api/assignments/${id}/similarity-runs/`, {
        method: "POST",
      });
      setCurrent(result);
      setRuns((rs) => [result, ...rs]);
      setNotice("检测已完成");
    } catch (e) {
      setError(message(e));
      await load().catch(() => {});
    } finally {
      setBusy(false);
    }
  }
  async function saveTemplate(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      setError("模板文件最多 20 MiB");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const body = new FormData();
      body.append("kind", templateKind);
      body.append("file", file);
      await api(`/api/assignments/${id}/templates/`, { method: "POST", body });
      setTemplateOpen(false);
      setFile(null);
      await load();
      setNotice("公共模板已添加，旧检测结果将提示重新检测");
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function removeTemplate() {
    if (!remove) return;
    setBusy(true);
    setError("");
    try {
      await api(`/api/templates/${remove.id}/`, { method: "DELETE" });
      setRemove(null);
      await load();
      setNotice("公共模板已移除");
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  const pairs =
    current?.pairs?.filter(
      (p) =>
        (kind === "all" || p.mode === kind) &&
        (p.coverage_a === null ||
          p.coverage_b === null ||
          Math.max(p.coverage_a, p.coverage_b) >= Number(threshold)),
    ) || [];
  const flagged =
    current?.pairs?.filter(
      (p) =>
        p.exact_duplicate ||
        Math.max(p.coverage_a || 0, p.coverage_b || 0) >= 0.8,
    ).length || 0;
  return (
    <>
      <a className="back-link" href={`/assignments/${id}`}>
        <ArrowLeft size={16} />
        返回作业
      </a>
      <div className="page-heading">
        <div>
          <p className="eyebrow">{assignment?.course_name}</p>
          <h1>作业相似检测</h1>
          <p className="muted">
            {assignment?.title} · 仅比较不同学生的最新提交
          </p>
        </div>
        <button className="button primary" onClick={run} disabled={busy}>
          <ScanSearch size={17} />
          {busy ? "正在检测…" : "开始检测"}
        </button>
      </div>
      <div className="similarity-explainer">
        <ShieldCheck size={24} />
        <div>
          <strong>发现线索，再核实原因。</strong>
          <p>
            指纹覆盖率用于定位共同片段，不代表全文抄袭比例或作弊概率。公共模板参与排除，复核意见不会自动改变成绩。
          </p>
        </div>
      </div>
      {notice && (
        <p className="success" role="status">
          {notice}
        </p>
      )}
      {error && !templateOpen && !remove && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {current?.is_stale && (
        <p className="warning">
          这份结果对应历史快照。学生重交或公共模板发生变化，请重新检测。
        </p>
      )}
      {current?.error_message && (
        <p className="error">{current.error_message}</p>
      )}
      <div className="stats-grid">
        <section className="stat-card">
          <div>快照提交</div>
          <strong>{current?.submission_ids.length || 0}</strong>
          <small>每位学生只取一个最新版本</small>
        </section>
        <section className="stat-card">
          <div>文件比较</div>
          <strong>{current?.pair_count || 0}</strong>
          <small>报告与同语言代码分别比较</small>
        </section>
        <section className="stat-card">
          <div>需关注线索</div>
          <strong>{flagged}</strong>
          <small>原件重复或任一覆盖率 ≥ 80%</small>
        </section>
        <section className="stat-card">
          <div>公共模板</div>
          <strong>{templates.length}</strong>
          <small>已排除的公共内容来源</small>
        </section>
      </div>
      <div className="similarity-layout">
        <section className="panel">
          <div className="section-heading">
            <h2>
              检测结果<span>{pairs.length}</span>
            </h2>
            <GlassSelect
              aria-label="检测历史"
              value={current?.id || ""}
              onChange={(e) => selectRun(e.target.value)}
              disabled={busy || !runs.length}
            >
              <option value="" disabled>
                尚无检测记录
              </option>
              {runs.map((r) => (
                <option value={r.id} key={r.id}>
                  #{r.id} · {date(r.started_at)} ·{" "}
                  {runName[r.status] || r.status}
                  {r.is_stale ? " · 历史快照" : ""}
                </option>
              ))}
            </GlassSelect>
          </div>
          <div className="result-filters">
            <label>
              文件类别
              <GlassSelect
                aria-label="文件类别筛选"
                value={kind}
                onChange={(e) => setKind(e.target.value)}
              >
                <option value="all">全部类别</option>
                <option value="report">报告</option>
                <option value="code">代码</option>
              </GlassSelect>
            </label>
            <label>
              提醒阈值
              <GlassSelect
                aria-label="提醒阈值"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
              >
                <option value="0">显示全部</option>
                <option value="0.8">任一覆盖率 ≥ 80%</option>
                <option value="0.5">任一覆盖率 ≥ 50%</option>
              </GlassSelect>
            </label>
            <small>不足或失败结果始终保留，供人工检查</small>
          </div>
          {pairs.length ? (
            <div className="table-scroll">
              <table className="pair-table">
                <thead>
                  <tr>
                    <th>学生与文件</th>
                    <th>双方覆盖率</th>
                    <th>状态</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {pairs.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div className="pair-subject">
                          <span className="badge">
                            {p.mode === "report"
                              ? "报告"
                              : p.attachment_a.language === "java"
                                ? "Java"
                                : "Python"}
                          </span>
                          <div>
                            <strong>
                              {p.attachment_a.student_name} v
                              {p.attachment_a.version} /{" "}
                              {p.attachment_b.student_name} v
                              {p.attachment_b.version}
                            </strong>
                            <small
                              title={`${p.attachment_a.original_name} / ${p.attachment_b.original_name}`}
                            >
                              {p.attachment_a.original_name} /{" "}
                              {p.attachment_b.original_name}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="coverage-values">
                          <strong>{percent(p.coverage_a)}</strong>
                          <span>/</span>
                          <strong>{percent(p.coverage_b)}</strong>
                        </div>
                        {p.exact_duplicate && (
                          <small className="duplicate-label">
                            原件字节一致
                          </small>
                        )}
                      </td>
                      <td>
                        <span
                          className={`badge ${p.review.status === "cleared" ? "positive" : p.review.status === "follow_up" ? "warm" : ""}`}
                        >
                          {reviewName[p.review.status]}
                        </span>
                        <small>{p.match_count} 组匹配片段</small>
                      </td>
                      <td>
                        <a
                          className="text-button"
                          href={`/similarity-pairs/${p.id}`}
                        >
                          查看片段
                          <ArrowUpRight size={14} />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty similarity-empty">
              <ScanSearch size={32} />
              <p>
                {current
                  ? "当前筛选没有可对比文件。至少需要两位学生提交同类文件。"
                  : "添加公共模板后，点击“开始检测”生成一份真实快照。"}
              </p>
            </div>
          )}
        </section>
        <aside className="panel template-panel">
          <div className="section-heading">
            <h2>公共模板</h2>
            <button
              className="icon-button"
              aria-label="添加公共模板"
              onClick={() => {
                setError("");
                setFile(null);
                setTemplateOpen(true);
              }}
            >
              <Plus size={17} />
            </button>
          </div>
          <p>将统一报告模板或代码骨架加入排除范围，减少公共内容造成的提醒。</p>
          {templates.map((t) => (
            <div className="template-item" key={t.id}>
              <FileText size={18} />
              <span>
                {t.original_name}
                <small>
                  {t.kind === "report" ? "报告模板" : "代码骨架"} · r
                  {t.revision}
                </small>
              </span>
              <button
                aria-label={`移除 ${t.original_name}`}
                className="icon-button"
                onClick={() => {
                  setRemove(t);
                  setError("");
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {!templates.length && <div className="empty">尚未添加公共模板</div>}
          <div className="algorithm-note">
            <strong>本次检测口径</strong>
            <p>
              报告：NFKC 与空白规范化
              <br />
              代码：过滤注释与空白词元
              <br />
              报告 k=20 / w=10
              <br />
              代码 k=12 / w=8
              <br />
              算法：确定性 Winnowing
              <br />
              单次最多 160 个附件、400 万字符
            </p>
          </div>
        </aside>
      </div>
      <GlassDialog
        open={templateOpen}
        onOpenChange={setTemplateOpen}
        title="添加公共模板"
        description="仅任课教师和管理员可访问，模板变更后需要重新检测。"
        dirty={!!file}
        busy={busy}
      >
        <form onSubmit={saveTemplate}>
          <label className="field-label" htmlFor="template-kind">
            模板类别
          </label>
          <GlassSelect
            id="template-kind"
            value={templateKind}
            onChange={(e) => {
              setTemplateKind(e.target.value);
              setFile(null);
            }}
          >
            <option value="report">报告模板</option>
            <option value="code">代码骨架</option>
          </GlassSelect>
          <label className="field-label" htmlFor="template-file">
            选择文件<span>最多 20 MiB</span>
          </label>
          <input
            key={templateKind}
            id="template-file"
            className="glass-input"
            type="file"
            required
            accept={templateKind === "report" ? ".txt,.docx,.pdf" : ".py,.java"}
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="dialog-footer">
            <button className="button primary" disabled={!file || busy}>
              保存公共模板
            </button>
          </div>
        </form>
      </GlassDialog>
      <GlassDialog
        open={!!remove}
        onOpenChange={(v) => {
          if (!v) setRemove(null);
        }}
        title="移除公共模板"
        description={`移除 ${remove?.original_name || ""} 后，旧检测结果会标记为历史快照。`}
        busy={busy}
      >
        {error && <p className="error">{error}</p>}
        <div className="dialog-footer">
          <button
            className="button primary"
            onClick={removeTemplate}
            disabled={busy}
          >
            确认移除
          </button>
        </div>
      </GlassDialog>
    </>
  );
}
