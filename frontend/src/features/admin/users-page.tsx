import { useEffect, useState } from "react";
import { Plus, Users, KeyRound, CheckCircle2 } from "lucide-react";
import type { UserSummary } from "../../lib/contracts";
import { api, listAll, message } from "../../lib/api";
import { GlassDialog } from "../../components/glass-dialog";
import { GlassInput } from "../../components/glass-input";
import { GlassSelect } from "../../components/glass-select";
export type ManagedUser = UserSummary & { is_active: boolean };
const roleName = { admin: "管理员", teacher: "教师", student: "学生" };
export function UsersPage({ search }: { search: string }) {
  const [users, setUsers] = useState<ManagedUser[]>([]),
    [editing, setEditing] = useState<ManagedUser | null>(null),
    [open, setOpen] = useState(false),
    [reset, setReset] = useState<ManagedUser | null>(null),
    [resetPassword, setResetPassword] = useState(""),
    [form, setForm] = useState({
      username: "",
      display_name: "",
      student_number: "",
      role: "student",
      password: "",
      is_active: true,
    }),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  async function load() {
    setUsers(await listAll<ManagedUser>("/api/users/"));
  }
  useEffect(() => {
    load().catch((e) => setError(message(e)));
  }, []);
  function show(user: ManagedUser | null) {
    setEditing(user);
    setForm(
      user
        ? {
            username: user.username,
            display_name: user.display_name,
            student_number: user.student_number,
            role: user.role,
            password: "",
            is_active: user.is_active,
          }
        : {
            username: "",
            display_name: "",
            student_number: "",
            role: "student",
            password: "",
            is_active: true,
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
      const data = editing
        ? {
            display_name: form.display_name,
            student_number: form.student_number,
            role: form.role,
            is_active: form.is_active,
          }
        : form;
      await api(editing ? `/api/users/${editing.id}/` : "/api/users/", {
        method: editing ? "PATCH" : "POST",
        body: JSON.stringify(data),
      });
      await load();
      setOpen(false);
      setNotice("账号信息已保存");
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function resetSave(e: React.FormEvent) {
    e.preventDefault();
    if (!reset) return;
    setBusy(true);
    setError("");
    try {
      await api(`/api/users/${reset.id}/reset-password/`, {
        method: "POST",
        body: JSON.stringify({ new_password: resetPassword }),
      });
      setReset(null);
      setResetPassword("");
      setNotice("密码已重置，原有登录会话会失效");
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  const visible = users.filter((u) =>
    `${u.username}${u.display_name}${u.student_number}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">合适的权限，清晰的边界</p>
          <h1>账号与角色</h1>
          <p className="muted">维护账号信息、角色和使用状态。</p>
        </div>
        <button className="button primary" onClick={() => show(null)}>
          <Plus size={17} />
          新增账号
        </button>
      </div>
      <div className="role-cards">
        {(["admin", "teacher", "student"] as const).map((role) => (
          <section className="panel role-card" key={role}>
            <Users size={22} />
            <h2>
              {roleName[role]}
              <span>{users.filter((u) => u.role === role).length}</span>
            </h2>
            <p>
              {role === "admin"
                ? "维护课程、账号与课程成员。"
                : role === "teacher"
                  ? "管理任教课程的作业、批改与相似检测。"
                  : "查看所属课程、提交作业与读取已发布反馈。"}
            </p>
          </section>
        ))}
      </div>
      {notice && (
        <p className="success">
          <CheckCircle2 size={17} />
          {notice}
        </p>
      )}
      {error && !open && !reset && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <section className="panel">
        <div className="section-heading">
          <h2>
            全部账号<span>{visible.length}</span>
          </h2>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>姓名</th>
                <th>账号 / 学号</th>
                <th>角色</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="user-cell">
                      <span className="avatar">
                        {user.display_name.slice(-2)}
                      </span>
                      <strong>{user.display_name}</strong>
                    </div>
                  </td>
                  <td>
                    {user.username}
                    <small>{user.student_number || "—"}</small>
                  </td>
                  <td>
                    <span className="badge">{roleName[user.role]}</span>
                  </td>
                  <td>
                    <span
                      className={`badge ${user.is_active ? "positive" : ""}`}
                    >
                      {user.is_active ? "正常" : "已停用"}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="text-button"
                        onClick={() => show(user)}
                      >
                        编辑
                      </button>
                      <button
                        className="text-button"
                        onClick={() => {
                          setReset(user);
                          setResetPassword("");
                          setError("");
                        }}
                      >
                        <KeyRound size={14} />
                        重置密码
                      </button>
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
        title={editing ? "编辑账号" : "新增账号"}
        description="账号已有课程或提交时，不能变更其角色；历史信息通过停用保留。"
        dirty={!editing && !!form.username}
        busy={busy}
      >
        <form onSubmit={save}>
          <div className="form-grid">
            <div>
              <label className="field-label" htmlFor="user-name">
                姓名
              </label>
              <GlassInput
                id="user-name"
                value={form.display_name}
                onChange={(e) =>
                  setForm({ ...form, display_name: e.target.value })
                }
                maxLength={80}
                required
              />
            </div>
            <div>
              <label className="field-label" htmlFor="user-login">
                账号
              </label>
              <GlassInput
                id="user-login"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                maxLength={150}
                required
                disabled={!!editing}
              />
            </div>
          </div>
          <label className="field-label" htmlFor="user-role">
            角色
          </label>
          <GlassSelect
            id="user-role"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            <option value="student">学生</option>
            <option value="teacher">教师</option>
            <option value="admin">管理员</option>
          </GlassSelect>
          <label className="field-label" htmlFor="user-number">
            学号<span>教师与管理员可留空</span>
          </label>
          <GlassInput
            id="user-number"
            value={form.student_number}
            onChange={(e) =>
              setForm({ ...form, student_number: e.target.value })
            }
            maxLength={40}
          />
          {!editing && (
            <>
              <label className="field-label" htmlFor="user-password">
                初始密码<span>至少 8 个字符</span>
              </label>
              <GlassInput
                id="user-password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </>
          )}
          <div className="check-row">
            <label>
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) =>
                  setForm({ ...form, is_active: e.target.checked })
                }
              />
              账号可用
            </label>
          </div>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="dialog-footer">
            <span className="muted">停用会使已登录会话失效</span>
            <button className="button primary" disabled={busy}>
              {busy ? "正在保存…" : "保存账号"}
            </button>
          </div>
        </form>
      </GlassDialog>
      <GlassDialog
        open={!!reset}
        onOpenChange={(v) => {
          if (!v) setReset(null);
        }}
        title="重置密码"
        description={`为 ${reset?.display_name || ""} 设置新密码。系统不会显示或保存明文原密码。`}
        busy={busy}
      >
        <form onSubmit={resetSave}>
          <label className="field-label" htmlFor="reset-password">
            新密码
          </label>
          <GlassInput
            id="reset-password"
            type="password"
            minLength={8}
            autoComplete="new-password"
            required
            value={resetPassword}
            onChange={(e) => setResetPassword(e.target.value)}
          />
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="dialog-footer">
            <button className="button primary" disabled={busy}>
              {busy ? "正在保存…" : "确认重置"}
            </button>
          </div>
        </form>
      </GlassDialog>
    </>
  );
}
