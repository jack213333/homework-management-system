import { useEffect, useState } from "react";
import { Plus, Users, BookOpen } from "lucide-react";
import { api, listAll, message } from "../../lib/api";
import type { CourseSummary, UserSummary } from "../../lib/contracts";
import type { ManagedUser } from "./users-page";
import { GlassDialog } from "../../components/glass-dialog";
import { GlassInput, GlassTextarea } from "../../components/glass-input";
import { GlassSelect } from "../../components/glass-select";
type Member = {
  id: number;
  student_id: number;
  display_name: string;
  username: string;
};
export function CourseManagementPage({
  user,
  courses,
  onRefresh,
}: {
  user: UserSummary;
  courses: CourseSummary[];
  onRefresh: () => Promise<void>;
}) {
  const admin = user.role === "admin",
    [users, setUsers] = useState<ManagedUser[]>([]),
    [editing, setEditing] = useState<CourseSummary | null>(null),
    [open, setOpen] = useState(false),
    [membership, setMembership] = useState<CourseSummary | null>(null),
    [members, setMembers] = useState<Member[]>([]),
    [studentId, setStudentId] = useState(""),
    [archive, setArchive] = useState<CourseSummary | null>(null),
    [form, setForm] = useState({
      code: "",
      name: "",
      description: "",
      teacher_id: "",
    }),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (admin)
      listAll<ManagedUser>("/api/users/")
        .then(setUsers)
        .catch((e) => setError(message(e)));
  }, [admin]);
  function show(c: CourseSummary | null) {
    setEditing(c);
    setForm(
      c
        ? {
            code: c.code,
            name: c.name,
            description: c.description,
            teacher_id: String(c.teacher_id),
          }
        : {
            code: "",
            name: "",
            description: "",
            teacher_id: String(
              users.find((u) => u.role === "teacher" && u.is_active)?.id || "",
            ),
          },
    );
    setError("");
    setOpen(true);
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(editing ? `/api/courses/${editing.id}/` : "/api/courses/", {
        method: editing ? "PATCH" : "POST",
        body: JSON.stringify({ ...form, teacher_id: Number(form.teacher_id) }),
      });
      await onRefresh();
      setOpen(false);
      setNotice("课程信息已保存");
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function showMembers(c: CourseSummary) {
    setMembership(c);
    setStudentId("");
    setError("");
    try {
      setMembers(await api<Member[]>(`/api/courses/${c.id}/enrollments/`));
    } catch (e) {
      setError(message(e));
    }
  }
  async function addMember() {
    if (!membership || !studentId) return;
    setBusy(true);
    setError("");
    try {
      await api(`/api/courses/${membership.id}/enrollments/`, {
        method: "POST",
        body: JSON.stringify({ student_id: Number(studentId) }),
      });
      await showMembers(membership);
      await onRefresh();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function removeMember(member: Member) {
    if (!membership) return;
    setBusy(true);
    setError("");
    try {
      await api(`/api/courses/${membership.id}/enrollments/${member.id}/`, {
        method: "DELETE",
      });
      await showMembers(membership);
      await onRefresh();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function archiveCourse() {
    if (!archive) return;
    setBusy(true);
    setError("");
    try {
      await api(
        archive.status === "active"
          ? `/api/courses/${archive.id}/archive/`
          : `/api/courses/${archive.id}/`,
        {
          method: archive.status === "active" ? "POST" : "PATCH",
          ...(archive.status === "archived"
            ? { body: JSON.stringify({ status: "active" }) }
            : {}),
        },
      );
      await onRefresh();
      setArchive(null);
      setNotice("课程状态已更新");
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">连接课程与学习者</p>
          <h1>课程管理</h1>
          <p className="muted">
            {admin
              ? "维护课程与选课关系，保留完整教学记录。"
              : "查看任教课程，完善课程说明与教学安排。"}
          </p>
        </div>
        {admin && (
          <button className="button primary" onClick={() => show(null)}>
            <Plus size={17} />
            新增课程
          </button>
        )}
      </div>
      {notice && <p className="success">{notice}</p>}
      {error && !open && !membership && !archive && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <section className="panel">
        <div className="section-heading">
          <h2>
            <BookOpen size={18} />
            全部课程<span>{courses.length}</span>
          </h2>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>课程</th>
                <th>任课教师</th>
                <th>学生人数</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((c) => (
                <tr key={c.id}>
                  <td>
                    <a href={`/courses/${c.id}`}>
                      <strong>{c.name}</strong>
                      <small>{c.code}</small>
                    </a>
                  </td>
                  <td>{c.teacher_name}</td>
                  <td>{c.student_count}</td>
                  <td>
                    <span className="badge">
                      {c.status === "active" ? "进行中" : "已归档"}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button className="text-button" onClick={() => show(c)}>
                        编辑
                      </button>
                      <button
                        className="text-button"
                        onClick={() => showMembers(c)}
                      >
                        <Users size={14} />
                        {admin ? "成员管理" : "课程成员"}
                      </button>
                      {admin && (
                        <button
                          className="text-button"
                          onClick={() => {
                            setArchive(c);
                            setError("");
                          }}
                        >
                          {c.status === "active" ? "归档" : "恢复"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <GlassDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? "编辑课程" : "新增课程"}
        dirty={!editing && !!form.name}
        busy={busy}
      >
        <form onSubmit={save}>
          <label className="field-label" htmlFor="course-code">
            课程编号
          </label>
          <GlassInput
            id="course-code"
            required
            value={form.code}
            maxLength={40}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
          />
          <label className="field-label" htmlFor="course-name">
            课程名称
          </label>
          <GlassInput
            id="course-name"
            required
            value={form.name}
            maxLength={100}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          {admin && (
            <>
              <label className="field-label" htmlFor="course-teacher">
                任课教师
              </label>
              <GlassSelect
                id="course-teacher"
                required
                value={form.teacher_id}
                onChange={(e) =>
                  setForm({ ...form, teacher_id: e.target.value })
                }
              >
                <option value="">选择教师</option>
                {users
                  .filter((u) => u.role === "teacher" && u.is_active)
                  .map((u) => (
                    <option value={u.id} key={u.id}>
                      {u.display_name}
                    </option>
                  ))}
              </GlassSelect>
            </>
          )}
          <label className="field-label" htmlFor="course-description">
            课程说明
          </label>
          <GlassTextarea
            id="course-description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="dialog-footer">
            <button className="button primary" disabled={busy}>
              {busy ? "正在保存…" : "保存课程"}
            </button>
          </div>
        </form>
      </GlassDialog>
      <GlassDialog
        open={!!membership}
        onOpenChange={(v) => {
          if (!v) setMembership(null);
        }}
        title={admin ? "课程成员管理" : "课程成员"}
        description={membership?.name}
        busy={busy}
      >
        {admin && (
          <div className="member-add">
            <GlassSelect
              aria-label="添加课程学生"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
            >
              <option value="">选择要添加的学生</option>
              {users
                .filter(
                  (u) =>
                    u.role === "student" &&
                    u.is_active &&
                    !members.some((m) => m.student_id === u.id),
                )
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.display_name} · {u.username}
                  </option>
                ))}
            </GlassSelect>
            <button
              className="button primary"
              onClick={addMember}
              disabled={!studentId || busy || membership?.status !== "active"}
            >
              添加
            </button>
          </div>
        )}
        <div className="member-list">
          {members.map((m) => (
            <div key={m.id}>
              <span className="avatar">{m.display_name.slice(-2)}</span>
              <span>
                {m.display_name}
                <small>{m.username}</small>
              </span>
              {admin && (
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={() => removeMember(m)}
                >
                  移除
                </button>
              )}
            </div>
          ))}
          {!members.length && <div className="empty">暂无课程成员</div>}
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </GlassDialog>
      <GlassDialog
        open={!!archive}
        onOpenChange={(v) => {
          if (!v) setArchive(null);
        }}
        title={archive?.status === "active" ? "归档课程" : "恢复课程"}
        description={
          archive?.status === "active"
            ? "归档后保留历史数据，停止新增作业与接收提交。"
            : "恢复后可继续发布作业与接收提交。"
        }
        busy={busy}
      >
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="dialog-footer">
          <button
            className="button primary"
            onClick={archiveCourse}
            disabled={busy}
          >
            确认{archive?.status === "active" ? "归档" : "恢复"}
          </button>
        </div>
      </GlassDialog>
    </>
  );
}
