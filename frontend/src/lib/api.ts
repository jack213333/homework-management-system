import type { Page, SubmissionDetail } from "./contracts";
let token = "";
export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public fields: Record<string, unknown> = {},
  ) {
    super(message);
  }
}
async function request(path: string, options: RequestInit) {
  try {
    return await fetch(path, options);
  } catch (error) {
    if (error instanceof TypeError) {
      throw new ApiError(
        "network",
        "无法连接本机服务，请打开“课序”本机服务窗口后重试。",
      );
    }
    throw error;
  }
}
export async function csrf() {
  const res = await request("/api/auth/csrf/", { credentials: "same-origin" });
  const data = await res.json();
  token = data.csrf_token;
  return token;
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData))
    headers.set("Content-Type", "application/json");
  if (options.method && options.method !== "GET") {
    if (!token) await csrf();
    headers.set("X-CSRFToken", token);
  }
  const response = await request(path, {
    ...options,
    headers,
    credentials: "same-origin",
  });
  if (response.status === 204) return undefined as T;
  const data = await response
    .json()
    .catch(() => ({ message: "服务返回了无法读取的响应，请重试" }));
  if (!response.ok) {
    if (
      response.status === 403 &&
      data.code !== "csrf_failed" &&
      path !== "/api/auth/me/"
    )
      window.dispatchEvent(new Event("session-check"));
    throw new ApiError(
      data.code || "error",
      data.message || "请求未成功",
      data.fields,
    );
  }
  return data;
}
export async function listAll<T>(path: string) {
  const items: T[] = [];
  let next: string | null = path;
  while (next) {
    const page: Page<T> = await api<Page<T>>(next);
    items.push(...page.results);
    next = page.next
      ? new URL(page.next, location.origin).pathname +
        new URL(page.next, location.origin).search
      : null;
  }
  return items;
}
export async function upload(
  path: string,
  data: FormData,
  onProgress: (value: number) => void,
): Promise<SubmissionDetail> {
  if (!token) await csrf();
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", path);
    xhr.withCredentials = true;
    xhr.setRequestHeader("X-CSRFToken", token);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable)
        onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onerror = () =>
      reject(new ApiError("network", "网络连接失败，保留文件后重试"));
    xhr.onload = () => {
      try {
        const result = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) resolve(result);
        else
          reject(
            new ApiError(
              result.code,
              result.message || "提交失败",
              result.fields,
            ),
          );
      } catch {
        reject(new ApiError("response", "无法读取提交结果，请重试"));
      }
    };
    xhr.send(data);
  });
}
export function message(error: unknown) {
  return error instanceof Error ? error.message : "操作未完成，请重试";
}
