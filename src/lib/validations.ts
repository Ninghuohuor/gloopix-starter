import { z } from "zod";
import {
  AVAILABLE_MODELS,
  AVAILABLE_QUALITIES,
  AVAILABLE_RESOLUTIONS,
  ASPECT_RATIO_OPTIONS,
  getDefaultAspectRatioForModel,
  MODEL_IDS,
  QUALITY_IDS,
  RESOLUTION_IDS,
  isAspectRatioCompatibleWithResolution,
} from "@/lib/image-models";

export {
  ASPECT_RATIO_OPTIONS,
  AVAILABLE_MODELS,
  AVAILABLE_QUALITIES,
  AVAILABLE_RESOLUTIONS,
  MODEL_IDS,
  QUALITY_IDS,
  RESOLUTION_IDS,
};

export const PASSWORD_STRENGTH_MESSAGE = "密码至少 8 位，并包含大小写字母和特殊符号";

export const passwordStrengthSchema = z
  .string()
  .min(8, PASSWORD_STRENGTH_MESSAGE)
  .regex(/(?=.*[a-z])/, PASSWORD_STRENGTH_MESSAGE)
  .regex(/(?=.*[A-Z])/, PASSWORD_STRENGTH_MESSAGE)
  .regex(/(?=.*[^A-Za-z0-9])/, PASSWORD_STRENGTH_MESSAGE);

export const registerSchema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
  password: passwordStrengthSchema,
  name: z.string().min(1, "请输入昵称").max(50),
});

export const ASPECT_RATIO_IDS = ASPECT_RATIO_OPTIONS;
export { AVAILABLE_ASPECT_RATIOS } from "@/lib/image-models";

export const REFERENCE_IMAGE_DATA_URL_MAX_LENGTH = 28 * 1024 * 1024;

export const generateSchema = z
  .object({
    prompt: z.string().min(1, "请输入图片描述").max(1000, "描述不能超过1000个字符"),
    model: z.string().trim().min(1, "请选择模型").max(200, "模型 ID 过长").default("gpt-image-2"),
    aspectRatio: z.enum(ASPECT_RATIO_IDS).optional(),
    quality: z.enum(QUALITY_IDS).default("low"),
    resolution: z.enum(RESOLUTION_IDS).default("1k"),
    quantity: z.number().int().min(1).max(4).default(1),
    requestId: z.string().uuid().default(() => crypto.randomUUID()),
    referenceImage: z
      .string()
      .max(REFERENCE_IMAGE_DATA_URL_MAX_LENGTH, "参考图不能超过 20MB")
      .refine((value) => value.startsWith("data:image/"), "参考图格式无效")
      .optional(),
    referenceImages: z
      .array(
        z
          .string()
          .max(REFERENCE_IMAGE_DATA_URL_MAX_LENGTH, "参考图不能超过 20MB")
          .refine((value) => value.startsWith("data:image/"), "参考图格式无效")
      )
      .max(10, "最多上传 10 张参考图")
      .optional(),
  })
  .transform((data) => ({
    ...data,
    aspectRatio:
      data.aspectRatio || getDefaultAspectRatioForModel(data.model, data.resolution),
  }))
  .refine((data) => isAspectRatioCompatibleWithResolution(data.aspectRatio, data.resolution), {
    message: "4K 仅支持 16:9、9:16、2:1、1:2、21:9、9:21 尺寸",
    path: ["resolution"],
  })
  ;

export const redeemSchema = z.object({
  code: z.string().min(1, "请输入兑换码"),
});

export const createCodesSchema = z.object({
  count: z.number().int().min(1).max(100),
  credits: z.number().int().min(1).max(100000),
  source: z.literal("MANUAL").default("MANUAL"),
});

export const announcementSchema = z.object({
  content: z.string().trim().min(1, "请输入公告内容").max(5000, "公告内容不能超过5000个字符"),
  imageUrl: z.string().max(2048, "图片地址过长").optional().nullable(),
});

const promptLibraryImageUrlSchema = z
  .string()
  .min(1, "请上传图片")
  .max(2048, "图片地址过长，请重新上传图片")
  .refine((value) => !value.startsWith("data:image/"), "请先上传图片，不要直接保存图片数据");

export const promptLibraryItemSchema = z
  .object({
    imageUrl: promptLibraryImageUrlSchema.optional(),
    imageUrls: z.array(promptLibraryImageUrlSchema).max(10, "最多上传 10 张图片").optional(),
    model: z.literal("gpt-image-2").default("gpt-image-2"),
    prompt: z.string().trim().min(1, "请输入提示词").max(5000, "提示词不能超过5000个字符"),
  })
  .transform((data) => {
    const imageUrls =
      data.imageUrls && data.imageUrls.length > 0
        ? data.imageUrls
        : data.imageUrl
          ? [data.imageUrl]
          : [];

    return {
      ...data,
      imageUrl: imageUrls[0] || "",
      imageUrls,
    };
  })
  .refine((data) => data.imageUrls.length > 0, {
    message: "请上传图片",
    path: ["imageUrls"],
  });
