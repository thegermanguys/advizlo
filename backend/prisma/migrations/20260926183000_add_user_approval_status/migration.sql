-- Account approval for users. Consultant profiles already have
-- verificationStatus (PENDING by default); this column is the matching
-- decision for the user account itself.
--
-- Existing rows are marked APPROVED so current clients can keep booking
-- and consultants who are already verification-APPROVED stay on the public
-- list. New inserts default to PENDING, matching schema.prisma.
ALTER TABLE "User" ADD COLUMN "approvalStatus" "VerificationStatus" NOT NULL DEFAULT 'APPROVED';

ALTER TABLE "User" ALTER COLUMN "approvalStatus" SET DEFAULT 'PENDING';
