-- CreateEnum
CREATE TYPE "ConsultationFeePolicy" AS ENUM ('FIRST_CONSULTATION_FREE', 'ALL_CONSULTATIONS_FREE', 'CHARGE_FROM_FIRST');

-- AlterTable
-- Default keeps existing consultants on the current rule: a priced meeting
-- is charged from the first booking, rather than silently becoming free.
ALTER TABLE "ConsultantProfile" ADD COLUMN "consultationFeePolicy" "ConsultationFeePolicy" NOT NULL DEFAULT 'CHARGE_FROM_FIRST';
