import { useState } from "react";
import { ArrowUpRight, ArrowRight, Clock3, CheckCircle2 } from "lucide-react";
import type {
  AssignmentDetail,
  CourseSummary,
  UserSummary,
} from "../../lib/contracts";
import { AnimatedBackground } from "../../components/animated-background";
import {
  CourseAvatar,
  CoursePhoto,
  coursePhoto,
} from "../../components/photo-assets";
export function date(value: string) {
  return new Date(value).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
export function Badge({ assignment }: { assignment: AssignmentDetail }) {
  const sub = assignment.my_submission;
  const text = sub?.grade?.published_at
    ? "已反馈"
    : sub
      ? "已提交"
      : assignment.status === "closed"
        ? "已关闭"
        : new Date(assignment.deadline) < new Date()
          ? "已截止"
          : "待提交";
  return (
    <span
      className={`badge ${text === "待提交" ? "warm" : text === "已反馈" ? "positive" : ""}`}
    >
      {text}
    </span>
  );
}
export function AssignmentRow({
  assignment,
  teacher = false,
}: {
  assignment: AssignmentDetail;
  teacher?: boolean;
}) {
  return (
    <div className="assignment-row">
      <CourseAvatar
        name={assignment.course_name}
        code={assignment.course_code}
      />
      <div className="assignment-row-copy">
        <small>{assignment.course_name}</small>
        <h3>{assignment.title}</h3>
        <p>
          {date(assignment.deadline)} 截止<span>·</span>
          {assignment.require_report && "报告"}
          {assignment.require_report && assignment.require_code && " + "}
          {assignment.require_code && "代码"}
        </p>
      </div>
      {teacher ? (
        <span className="badge">
          {assignment.status === "draft"
            ? "草稿"
            : assignment.status === "closed"
              ? "已关闭"
              : "进行中"}
        </span>
      ) : (
        <Badge assignment={assignment} />
      )}
      <a className="row-link" href={`/assignments/${assignment.id}`}>
        查看作业
        <ArrowUpRight size={16} />
      </a>
    </div>
  );
}
export function DashboardPage({
  user,
  courses,
  assignments,
}: {
  user: UserSummary;
  courses: CourseSummary[];
  assignments: AssignmentDetail[];
}) {
  const [selected, setSelected] = useState("all");
  const student = user.role === "student",
    now = Date.now();
  const pending = assignments.filter(
    (a) =>
      !a.my_submission &&
      a.status === "open" &&
      (a.allow_late || new Date(a.deadline).getTime() > now),
  );
  const submitted = assignments.filter((a) => a.my_submission),
    published = assignments.filter((a) => a.my_submission?.grade?.published_at);
  const tabs = student
    ? [
        { id: "all", label: "全部", rows: assignments },
        { id: "pending", label: "待完成", rows: pending },
        { id: "submitted", label: "已提交", rows: submitted },
        { id: "feedback", label: "已反馈", rows: published },
      ]
    : [
        { id: "all", label: "全部", rows: assignments },
        {
          id: "open",
          label: "开放提交",
          rows: assignments.filter((a) => a.status === "open"),
        },
        {
          id: "draft",
          label: "草稿",
          rows: assignments.filter((a) => a.status === "draft"),
        },
        {
          id: "closed",
          label: "已关闭",
          rows: assignments.filter((a) => a.status === "closed"),
        },
      ];
  const current = tabs.find((t) => t.id === selected) || tabs[0];
  const next = [
    ...(student
      ? pending
      : assignments.filter(
          (a) => a.status === "open" && new Date(a.deadline).getTime() > now,
        )),
  ].sort(
    (a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime(),
  )[0];
  const day = next ? new Date(next.deadline) : null;
  function switchTab(e: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    const target =
      e.key === "Home"
        ? 0
        : e.key === "End"
          ? tabs.length - 1
          : (index + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) %
            tabs.length;
    setSelected(tabs[target].id);
    const buttons =
      e.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
        '[role="tab"]',
      );
    buttons?.[target].focus();
  }
  return (
    <>
      <div className="page-heading desk-heading">
        <div>
          <p className="eyebrow">工作台</p>
          <h1>你好，{user.display_name}</h1>
          <p className="muted">
            {student
              ? `${courses.length} 门课程 · ${pending.length} 份作业待完成`
              : `${courses.length} 门课程 · ${assignments.length} 份作业安排`}
          </p>
        </div>
        <a className="button secondary" href="/assignments">
          {student ? "全部作业" : "管理作业"}
          <ArrowUpRight size={16} />
        </a>
      </div>
      <div className="desk-columns">
        <div className="desk-primary">
          <section className="next-deadline">
            <div className="deadline-calendar">
              <span>
                {day
                  ? day.toLocaleDateString("zh-CN", { month: "long" })
                  : "今日"}
              </span>
              <strong>
                {day
                  ? String(day.getDate()).padStart(2, "0")
                  : String(new Date().getDate()).padStart(2, "0")}
              </strong>
              <small>
                {day
                  ? day.toLocaleDateString("zh-CN", { weekday: "short" })
                  : "暂无待办"}
              </small>
            </div>
            <div className="deadline-content">
              <span className="deadline-kicker">
                <Clock3 size={14} />
                {next ? "最近截止" : "当前安排"}
              </span>
              <h2>
                {next?.title ||
                  (student ? "当前没有待完成作业" : "当前没有即将截止的作业")}
              </h2>
              <p>
                {next
                  ? `${next.course_name} · ${date(next.deadline)} 截止`
                  : "可以在下方查看历史提交与反馈。"}
              </p>
              {next && (
                <a href={`/assignments/${next.id}`}>
                  查看要求
                  <ArrowRight size={15} />
                </a>
              )}
            </div>
          </section>
          <section className="panel desk-work">
            <div className="desk-work-title">
              <h2>{student ? "我的作业" : "作业安排"}</h2>
              <span>
                {student
                  ? `已提交 ${submitted.length} / ${assignments.length}`
                  : `${assignments.length} 份作业`}
              </span>
            </div>
            <div className="desk-tabs" role="tablist" aria-label="作业状态">
              <AnimatedBackground
                defaultValue={selected}
                onValueChange={(v) => {
                  if (v) setSelected(v);
                }}
                className="desk-tab-background"
                transition={{ duration: 0.22, ease: [0.22, 0.61, 0.36, 1] }}
              >
                {tabs.map((tab, index) => (
                  <button
                    key={tab.id}
                    data-id={tab.id}
                    type="button"
                    role="tab"
                    id={`work-tab-${tab.id}`}
                    aria-selected={selected === tab.id}
                    aria-controls="work-panel"
                    tabIndex={selected === tab.id ? 0 : -1}
                    onKeyDown={(e) => switchTab(e, index)}
                    className="desk-tab"
                  >
                    <span>{tab.label}</span>
                    <span className="desk-tab-count">{tab.rows.length}</span>
                  </button>
                ))}
              </AnimatedBackground>
            </div>
            <div
              id="work-panel"
              role="tabpanel"
              aria-labelledby={`work-tab-${current.id}`}
              tabIndex={0}
            >
              {current.rows.length ? (
                current.rows.map((a) => (
                  <AssignmentRow key={a.id} assignment={a} teacher={!student} />
                ))
              ) : (
                <div className="desk-empty">
                  <CheckCircle2 size={25} />
                  <p>
                    {selected === "feedback"
                      ? "老师发布批改后，反馈会显示在这里。"
                      : selected === "pending"
                        ? "当前没有待完成的作业。"
                        : "这个分类下暂时没有作业。"}
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
        <aside className="desk-aside">
          <div className="desk-course-heading">
            <h2>{student ? "在学课程" : "任教课程"}</h2>
            <a href="/courses" aria-label="查看全部课程">
              <ArrowUpRight size={17} />
            </a>
          </div>
          {courses.map((c) => (
            <a
              className={`desk-course photo-course course-photo-${coursePhoto(c.name, c.code).kind}`}
              style={coursePhoto(c.name, c.code).style}
              href={`/courses/${c.id}`}
              key={c.id}
            >
              <CoursePhoto name={c.name} code={c.code} />
              <div className="desk-course-top">
                <span>{c.code}</span>
              </div>
              <h3>{c.name}</h3>
              <p>
                {c.teacher_name} · {c.status === "active" ? "进行中" : "已归档"}
              </p>
              <div className="desk-course-bottom">
                <span>
                  {assignments.filter((a) => a.course_id === c.id).length}{" "}
                  份作业
                </span>
                <ArrowRight size={16} />
              </div>
            </a>
          ))}
          {!courses.length && <p className="muted">暂无课程，请联系管理员。</p>}
          <p className="desk-help">
            每次提交保留独立版本。
            <br />
            批改反馈发布后，可在“已反馈”中查看。
          </p>
        </aside>
      </div>
    </>
  );
}
