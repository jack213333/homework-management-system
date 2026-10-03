import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, BookOpen } from "lucide-react";
import { api, listAll, message } from "./lib/api";
import type {
  UserSummary,
  CourseSummary,
  AssignmentDetail,
} from "./lib/contracts";
import { AppShell } from "./components/app-shell";
import { LoginPage } from "./features/auth/login-page";
import {
  DashboardPage,
  AssignmentRow,
} from "./features/student/dashboard-page";
import { CoursesPage } from "./features/student/courses-page";
import { AssignmentPage } from "./features/student/assignment-page";
import { GradingPage } from "./features/teacher/grading-page";
import { GradesPage } from "./features/teacher/grades-page";
import { TeacherAssignmentsPage } from "./features/teacher/assignments-page";
import { UsersPage } from "./features/admin/users-page";
import { CourseManagementPage } from "./features/admin/courses-page";
import { SimilarityPage } from "./features/similarity/similarity-page";
import { PairPage } from "./features/similarity/pair-page";

export default function App() {
  const [user, setUser] = useState<UserSummary | null>(null),
    [ready, setReady] = useState(false),
    [courses, setCourses] = useState<CourseSummary[]>([]),
    [assignments, setAssignments] = useState<AssignmentDetail[]>([]),
    [error, setError] = useState(""),
    [search, setSearch] = useState("");
  const path = location.pathname;
  const refresh = useCallback(async () => {
    const [cs, as] = await Promise.all([
      listAll<CourseSummary>("/api/courses/"),
      listAll<AssignmentDetail>("/api/assignments/"),
    ]);
    setCourses(cs);
    setAssignments(as);
  }, []);
  useEffect(() => {
    api<UserSummary>("/api/auth/me/")
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setReady(true));
    const check = () => {
      api<UserSummary>("/api/auth/me/").catch(() => setUser(null));
    };
    window.addEventListener("session-check", check);
    return () => window.removeEventListener("session-check", check);
  }, []);
  useEffect(() => {
    if (user) refresh().catch((e) => setError(message(e)));
  }, [user, refresh]);
  if (!ready)
    return (
      <div className="initial-loading">
        <BookOpen size={30} />
        <p>正在打开学习工作空间…</p>
      </div>
    );
  if (!user)
    return (
      <LoginPage
        onLogin={(u) => {
          setUser(u);
          location.href = "/dashboard";
        }}
      />
    );
  async function logout() {
    try {
      await api("/api/auth/logout/", { method: "POST" });
      setUser(null);
      location.href = "/login";
    } catch (e) {
      setError(message(e));
    }
  }
  const visibleCourses = courses.filter((c) =>
    `${c.name}${c.code}${c.teacher_name}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const visibleAssignments = assignments.filter((a) =>
    `${a.title}${a.course_name}`.toLowerCase().includes(search.toLowerCase()),
  );
  let content: React.ReactNode;
  const assignmentRoute = path.match(/^\/assignments\/(\d+)\/?$/),
    courseRoute = path.match(/^\/courses\/(\d+)\/?$/);
  const teachingRoute = path.match(
      /^\/assignments\/(\d+)\/(grading|grades|similarity)$/,
    ),
    pairRoute = path.match(/^\/similarity-pairs\/(\d+)$/);
  if (pairRoute)
    content =
      user.role === "student" ? (
        <div className="panel empty">此页面需要任课教师权限。</div>
      ) : (
        <PairPage id={Number(pairRoute[1])} />
      );
  else if (teachingRoute)
    content =
      user.role === "student" ? (
        <div className="panel empty">此页面需要任课教师权限。</div>
      ) : teachingRoute[2] === "grading" ? (
        <GradingPage id={Number(teachingRoute[1])} />
      ) : teachingRoute[2] === "similarity" ? (
        <SimilarityPage id={Number(teachingRoute[1])} />
      ) : (
        <GradesPage id={Number(teachingRoute[1])} />
      );
  else if (path === "/admin/users")
    content =
      user.role === "admin" ? (
        <UsersPage search={search} />
      ) : (
        <div className="panel empty">此页面需要管理员权限。</div>
      );
  else if (path === "/assignments" && user.role !== "student")
    content = (
      <TeacherAssignmentsPage
        assignments={visibleAssignments}
        courses={courses}
        onRefresh={refresh}
      />
    );
  else if (assignmentRoute)
    content = (
      <AssignmentPage
        id={Number(assignmentRoute[1])}
        user={user}
        onRefresh={refresh}
      />
    );
  else if (courseRoute) {
    const course = courses.find((c) => c.id === Number(courseRoute[1]));
    content = (
      <>
        <a className="back-link" href="/courses">
          <ArrowLeft size={16} />
          返回课程
        </a>
        <div className="page-heading">
          <div>
            <p className="eyebrow">{course?.code}</p>
            <h1>{course?.name || "课程"}</h1>
            <p className="muted">{course?.description}</p>
          </div>
        </div>
        <section className="panel">
          <div className="section-heading">
            <h2>课程作业</h2>
          </div>
          {visibleAssignments
            .filter((a) => a.course_id === Number(courseRoute[1]))
            .map((a) => (
              <AssignmentRow
                key={a.id}
                assignment={a}
                teacher={user.role !== "student"}
              />
            ))}
          {!assignments.some((a) => a.course_id === Number(courseRoute[1])) && (
            <div className="empty">老师还没有发布作业。</div>
          )}
        </section>
      </>
    );
  } else if (path === "/courses" || path === "/admin/courses")
    content =
      user.role === "student" ? (
        <CoursesPage courses={visibleCourses} />
      ) : (
        <CourseManagementPage
          user={user}
          courses={visibleCourses}
          onRefresh={refresh}
        />
      );
  else if (path === "/assignments")
    content = (
      <>
        <div className="page-heading">
          <div>
            <p className="eyebrow">每一次练习，都有价值</p>
            <h1>{user.role === "student" ? "我的作业" : "作业管理"}</h1>
            <p className="muted">清晰的要求，完整的提交，及时的反馈。</p>
          </div>
          <span className="count-label">
            共 {visibleAssignments.length} 份作业
          </span>
        </div>
        <section className="panel">
          <div className="section-heading">
            <h2>全部作业</h2>
            <span>{visibleAssignments.length}</span>
          </div>
          {visibleAssignments.map((a) => (
            <AssignmentRow
              key={a.id}
              assignment={a}
              teacher={user.role !== "student"}
            />
          ))}
          {!visibleAssignments.length && (
            <div className="empty">没有找到符合条件的作业。</div>
          )}
        </section>
      </>
    );
  else
    content = (
      <DashboardPage
        user={user}
        courses={courses}
        assignments={visibleAssignments}
      />
    );
  return (
    <AppShell
      user={user}
      path={path}
      onLogout={logout}
      search={search}
      onSearch={setSearch}
    >
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {content}
    </AppShell>
  );
}
