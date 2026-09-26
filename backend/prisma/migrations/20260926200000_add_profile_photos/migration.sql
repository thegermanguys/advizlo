-- CreateTable
CREATE TABLE "UserProfilePhoto" (
    "userId" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "mime" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfilePhoto_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "ConsultantProfilePhoto" (
    "consultantId" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "mime" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsultantProfilePhoto_pkey" PRIMARY KEY ("consultantId")
);

-- AddForeignKey
ALTER TABLE "UserProfilePhoto" ADD CONSTRAINT "UserProfilePhoto_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultantProfilePhoto" ADD CONSTRAINT "ConsultantProfilePhoto_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "ConsultantProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
