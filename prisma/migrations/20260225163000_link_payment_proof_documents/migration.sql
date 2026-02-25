-- Add optional direct links from AdmissionDocument to payment rows.
ALTER TABLE "AdmissionDocument"
  ADD COLUMN "universityPaymentId" TEXT,
  ADD COLUMN "agentPayoutId" TEXT;

CREATE UNIQUE INDEX "AdmissionDocument_universityPaymentId_key"
  ON "AdmissionDocument"("universityPaymentId");

CREATE UNIQUE INDEX "AdmissionDocument_agentPayoutId_key"
  ON "AdmissionDocument"("agentPayoutId");

ALTER TABLE "AdmissionDocument"
  ADD CONSTRAINT "AdmissionDocument_universityPaymentId_fkey"
  FOREIGN KEY ("universityPaymentId") REFERENCES "UniversityPayment"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AdmissionDocument"
  ADD CONSTRAINT "AdmissionDocument_agentPayoutId_fkey"
  FOREIGN KEY ("agentPayoutId") REFERENCES "AgentPayout"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
