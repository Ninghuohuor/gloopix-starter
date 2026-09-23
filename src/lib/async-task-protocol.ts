import { z } from "zod";

const relativePath = z.string().trim().min(1).max(200).refine(
  (value) => value.startsWith("/") && !value.startsWith("//") && !value.includes("..") && !/[?#\\]/.test(value),
  "请填写以 / 开头的接口路径，不要包含查询参数或上级目录",
);
const optionalRelativePath = z.union([relativePath, z.literal("")]);
const jsonPath = z.string().trim().max(120).regex(/^$|^[A-Za-z_][\w]*(?:\.(?:[A-Za-z_][\w]*|\d+))*$/, "请输入以点分隔的 JSON 字段路径");
const fieldName = z.string().trim().min(1).max(80).regex(/^[A-Za-z_][\w]*$/, "请输入有效的字段名称");
const statusList = z.string().trim().min(1).max(200);

export const asyncTaskProtocolSchema = z.object({
  submitPath: relativePath,
  taskPath: relativePath.refine((value) => value.includes("{taskId}"), "轮询路径必须包含 {taskId}"),
  uploadPath: optionalRelativePath,
  uploadField: fieldName,
  referenceField: fieldName,
  taskIdPath: jsonPath,
  statusPath: jsonPath,
  resultPath: jsonPath,
  uploadUrlPath: jsonPath,
  successStatuses: statusList,
  failureStatuses: statusList,
});

export type AsyncTaskProtocol = z.infer<typeof asyncTaskProtocolSchema>;

export const DEFAULT_ASYNC_TASK_PROTOCOL: AsyncTaskProtocol = {
  submitPath: "/images/generations",
  taskPath: "/tasks/{taskId}",
  uploadPath: "",
  uploadField: "file",
  referenceField: "image_urls",
  taskIdPath: "",
  statusPath: "",
  resultPath: "",
  uploadUrlPath: "",
  successStatuses: "completed,succeeded,success",
  failureStatuses: "failed,error,cancelled,canceled",
};

export function protocolUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/+$/, "")}${path}`;
}

export function readJsonPath(payload: unknown, path: string): unknown {
  if (!path) return undefined;
  return path.split(".").reduce<unknown>((current, segment) => {
    if (Array.isArray(current)) return current[Number(segment)];
    if (current && typeof current === "object") return (current as Record<string, unknown>)[segment];
    return undefined;
  }, payload);
}

export function statusValues(value: string) {
  return value.split(",").map((part) => part.trim().toLowerCase()).filter(Boolean);
}
