-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'LOST', 'WON');

-- AlterTable Lead
ALTER TABLE "Lead"
  ADD COLUMN "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
  ADD COLUMN "assignedToId" TEXT,
  ADD COLUMN "handledAt" TIMESTAMP(3),
  ADD COLUMN "internalNotes" TEXT,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable StudentPayment
CREATE TABLE "StudentPayment" (
  "id" TEXT NOT NULL,
  "admissionId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "paidAt" TIMESTAMP(3) NOT NULL,
  "method" "PaymentMethod" NOT NULL,
  "reference" TEXT,
  "proofUrl" TEXT,
  "notes" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StudentPayment_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "Lead_status_createdAt_idx" ON "Lead"("status", "createdAt");
CREATE INDEX "Lead_assignedToId_createdAt_idx" ON "Lead"("assignedToId", "createdAt");
CREATE INDEX "StudentPayment_admissionId_paidAt_idx" ON "StudentPayment"("admissionId", "paidAt");

-- Foreign keys
ALTER TABLE "Lead"
  ADD CONSTRAINT "Lead_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "StudentPayment"
  ADD CONSTRAINT "StudentPayment_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "Admission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentPayment"
  ADD CONSTRAINT "StudentPayment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
