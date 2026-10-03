import { ArrowUpRight, Users } from "lucide-react";
import type { CourseSummary } from "../../lib/contracts";
import { CoursePhoto, coursePhoto } from "../../components/photo-assets";
export function CoursesPage({ courses }: { courses: CourseSummary[] }) {
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">把知识连成体系</p>
          <h1>我的课程</h1>
          <p className="muted">每门课程，都有新的思考与练习。</p>
        </div>
        <span className="count-label">共 {courses.length} 门课程</span>
      </div>
      <div className="course-grid">
        {courses.map((c, i) => (
          <article className="course-card" key={c.id}>
            <div
              className="course-art photo-course-art"
              style={coursePhoto(c.name, c.code).style}
            >
              <CoursePhoto name={c.name} code={c.code} />
              <span>COURSE / {String(i + 1).padStart(2, "0")}</span>
            </div>
            <div className="course-card-body">
              <div className="course-code">
                {c.code}
                <span className="badge">
                  {c.status === "active" ? "进行中" : "已归档"}
                </span>
              </div>
              <h2>{c.name}</h2>
              <p>{c.description || "每一次练习，都是一次新的探索。"}</p>
              <div className="course-meta">
                <span>{c.teacher_name}</span>
                <span>
                  <Users size={15} />
                  {c.student_count} 位同学
                </span>
              </div>
              <a href={`/courses/${c.id}`}>
                进入课程
                <ArrowUpRight size={17} />
              </a>
            </div>
          </article>
        ))}
      </div>
      {!courses.length && (
        <div className="empty panel">暂无课程，请联系管理员加入课程。</div>
      )}
    </>
  );
}
