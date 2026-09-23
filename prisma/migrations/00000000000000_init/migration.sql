-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "credits" INTEGER NOT NULL DEFAULT 0,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "isDisabled" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" DATETIME,
    "lastActiveAt" DATETIME,
    "lastLoginBonus" DATETIME,
    "registerIp" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Image" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "generationId" TEXT,
    "model" TEXT NOT NULL DEFAULT 'gpt-image-2',
    "aspectRatio" TEXT NOT NULL DEFAULT 'auto',
    "quality" TEXT NOT NULL DEFAULT 'low',
    "resolution" TEXT NOT NULL DEFAULT '1k',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "Image_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GenerationTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "referenceImages" TEXT,
    "imageIds" TEXT NOT NULL,
    "model" TEXT NOT NULL DEFAULT 'gpt-image-2',
    "aspectRatio" TEXT NOT NULL DEFAULT 'auto',
    "quality" TEXT NOT NULL DEFAULT 'low',
    "resolution" TEXT NOT NULL DEFAULT '1k',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "creditCostPerImage" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lockedAt" DATETIME,
    "lockedBy" TEXT,
    "nextRunAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "completedAt" DATETIME,
    CONSTRAINT "GenerationTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GenerationAlert" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "lastSentAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "RedemptionCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "usedById" TEXT,
    "usedAt" DATETIME,
    "usedIp" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RedemptionCode_usedById_fkey" FOREIGN KEY ("usedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "RedemptionCode_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CreditTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "relatedId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CreditTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "content" TEXT NOT NULL,
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Announcement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EmailVerificationCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "purpose" TEXT NOT NULL DEFAULT 'REGISTER',
    "expiresAt" DATETIME NOT NULL,
    "consumedAt" DATETIME,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "LoginFailure" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" DATETIME,
    "lastIp" TEXT,
    "lastFailedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PromptLibraryItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "imageUrl" TEXT NOT NULL,
    "imageUrls" TEXT,
    "model" TEXT NOT NULL DEFAULT 'gpt-image-2',
    "prompt" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PromptLibraryItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApiSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "provider" TEXT NOT NULL DEFAULT 'OPENAI_COMPATIBLE',
    "baseUrl" TEXT NOT NULL,
    "encryptedApiKey" TEXT,
    "modelsJson" TEXT NOT NULL DEFAULT '[]',
    "providersJson" TEXT NOT NULL DEFAULT '[]',
    "siteName" TEXT NOT NULL DEFAULT 'AI Image Starter',
    "siteDescription" TEXT NOT NULL DEFAULT 'AI 图片生成服务',
    "logoText" TEXT NOT NULL DEFAULT 'LOGO',
    "logoUrl" TEXT,
    "faviconUrl" TEXT,
    "browserTitle" TEXT NOT NULL DEFAULT 'AI Image Starter',
    "registrationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "newUserCredits" INTEGER NOT NULL DEFAULT 0,
    "promptLibraryEnabled" BOOLEAN NOT NULL DEFAULT true,
    "creditsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "announcementsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "defaultModel" TEXT,
    "defaultResolution" TEXT NOT NULL DEFAULT '1k',
    "defaultQuantity" INTEGER NOT NULL DEFAULT 1,
    "operatorName" TEXT NOT NULL DEFAULT '',
    "contactEmail" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_registerIp_createdAt_idx" ON "User"("registerIp", "createdAt");

-- CreateIndex
CREATE INDEX "Image_userId_generationId_createdAt_idx" ON "Image"("userId", "generationId", "createdAt");

-- CreateIndex
CREATE INDEX "GenerationTask_status_nextRunAt_createdAt_idx" ON "GenerationTask"("status", "nextRunAt", "createdAt");

-- CreateIndex
CREATE INDEX "GenerationTask_userId_status_createdAt_idx" ON "GenerationTask"("userId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "GenerationTask_lockedAt_idx" ON "GenerationTask"("lockedAt");

-- CreateIndex
CREATE UNIQUE INDEX "RedemptionCode_code_key" ON "RedemptionCode"("code");

-- CreateIndex
CREATE INDEX "RedemptionCode_source_usedIp_usedAt_idx" ON "RedemptionCode"("source", "usedIp", "usedAt");

-- CreateIndex
CREATE INDEX "Announcement_isActive_createdAt_idx" ON "Announcement"("isActive", "createdAt");

-- CreateIndex
CREATE INDEX "EmailVerificationCode_email_purpose_consumedAt_expiresAt_idx" ON "EmailVerificationCode"("email", "purpose", "consumedAt", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "LoginFailure_email_key" ON "LoginFailure"("email");

-- CreateIndex
CREATE INDEX "LoginFailure_lockedUntil_idx" ON "LoginFailure"("lockedUntil");

-- CreateIndex
CREATE INDEX "LoginFailure_lastIp_lastFailedAt_idx" ON "LoginFailure"("lastIp", "lastFailedAt");

-- CreateIndex
CREATE INDEX "PromptLibraryItem_isActive_createdAt_idx" ON "PromptLibraryItem"("isActive", "createdAt");
