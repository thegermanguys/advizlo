-- AlterTable
ALTER TABLE "ConsultantProfile" ADD COLUMN "languages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
