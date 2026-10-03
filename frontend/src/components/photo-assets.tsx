import type { CSSProperties } from "react";

const portraits = {
  admin: "admin",
  teacher: "teacher",
  teacher2: "teacher2",
  student01: "student01",
  student02: "student02",
  student03: "student03",
  student04: "student04",
} as const;
const demoNames: Record<string, keyof typeof portraits> = {
  演示管理员: "admin",
  陈老师: "teacher",
  林老师: "teacher2",
  顾知行: "student01",
  许一诺: "student02",
  周予安: "student03",
  沈可欣: "student04",
};

/** Locally bundled fictional portraits; these are illustrative default avatars. */
export function UserAvatar({
  name,
  username,
  role = "student",
  className = "",
}: {
  name: string;
  username?: string;
  role?: "admin" | "teacher" | "student";
  className?: string;
}) {
  const known =
    username && Object.hasOwn(portraits, username)
      ? portraits[username as keyof typeof portraits]
      : Object.hasOwn(demoNames, name)
        ? demoNames[name]
        : undefined;
  const pool =
    role === "admin"
      ? ["admin"]
      : role === "teacher"
        ? ["teacher", "teacher2"]
        : ["student01", "student02", "student03", "student04"];
  const hash = [...(username || name)].reduce(
    (value, char) => (value * 31 + char.charCodeAt(0)) >>> 0,
    0,
  );
  return (
    <span className={`avatar photo-avatar ${className}`}>
      <img
        src={`/images/portraits/${known || pool[hash % pool.length]}.png`}
        alt=""
        decoding="async"
      />
    </span>
  );
}

export function coursePhoto(name: string, code = "") {
  const value = `${name} ${code}`.toLowerCase();
  const kind = /java|\bjv\d/.test(value)
    ? "java"
    : /python|\bpy\d/.test(value)
      ? "python"
      : "software";
  return {
    src: `/images/courses/${kind}.png`,
    kind,
    style: {
      "--course-surface":
        kind === "java" ? "#ebe7f0" : kind === "python" ? "#e8eee8" : "#e7edf2",
    } as CSSProperties,
  };
}

export function CourseAvatar({ name, code }: { name: string; code?: string }) {
  const photo = coursePhoto(name, code);
  return (
    <span className={`row-icon course-photo-avatar course-photo-${photo.kind}`}>
      <img src={photo.src} alt="" decoding="async" />
    </span>
  );
}

export function CoursePhoto({ name, code }: { name: string; code?: string }) {
  return (
    <img
      className="course-photo"
      src={coursePhoto(name, code).src}
      alt=""
      decoding="async"
    />
  );
}
