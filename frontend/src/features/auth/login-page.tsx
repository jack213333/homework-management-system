import { useState } from "react";
import { ArrowRight, BookOpen, ShieldCheck, Check } from "lucide-react";
import { GlassInput } from "../../components/glass-input";
import { api, csrf, message } from "../../lib/api";
import type { UserSummary } from "../../lib/contracts";
export function LoginPage({
  onLogin,
}: {
  onLogin: (user: UserSummary) => void;
}) {
  const [username, setUsername] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await csrf();
      const user = await api<UserSummary>("/api/auth/login/", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      await csrf();
      onLogin(user);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login-layout">
      <section className="login-story">
        <a className="brand" href="/">
          <span className="brand-mark">
            <BookOpen size={23} />
          </span>
          <span>
            课序<small>COURSEWORK</small>
          </span>
        </a>
        <div className="login-copy">
          <p className="eyebrow">让学习，有迹可循</p>
          <h1>
            每一份认真，
            <br />
            都有回应。
          </h1>
          <p className="login-description">
            从作业发布到提交批改，
            <br />
            把学习的每一步，连接在一起。
          </p>
          <div className="paper-scene" aria-hidden="true">
            <div className="paper-back" />
            <div className="paper-front">
              <span className="paper-label">COURSEWORK</span>
              <div className="paper-heading">
                一步一步，
                <br />
                看见进步。
              </div>
              <div className="paper-line" />
              <div className="paper-line short" />
              <div className="paper-check">
                <Check size={18} />
                已收阅
              </div>
            </div>
            <div className="floating-note">
              <Check size={17} />
              <span>你的努力，值得被看见。</span>
            </div>
          </div>
        </div>
        <p className="login-foot">发布 · 提交 · 批改 · 反馈</p>
      </section>
      <section className="login-form-side">
        <div className="login-form-card">
          <div className="mini-label">
            <span className="status-dot" />
            本机学习工作空间
          </div>
          <h2>欢迎回来</h2>
          <p className="muted">登录你的账号，开始今天的学习。</p>
          <form onSubmit={submit}>
            <label className="field-label" htmlFor="username">
              账号
            </label>
            <GlassInput
              id="username"
              name="username"
              autoComplete="username"
              placeholder="请输入账号"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <label className="field-label" htmlFor="password">
              密码
            </label>
            <GlassInput
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="请输入密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button className="button primary login-submit" disabled={busy}>
              {busy ? "正在登录…" : "登录工作台"}
              <ArrowRight size={18} />
            </button>
          </form>
          <div className="demo-hint">
            <ShieldCheck size={18} />
            <p>
              演示账号：student01 / teacher / admin
              <br />
              <span>初始密码：DemoPass123!</span>
            </p>
          </div>
        </div>
        <p className="login-privacy">数据保存在这台电脑上 · 离线可用</p>
      </section>
    </div>
  );
}
