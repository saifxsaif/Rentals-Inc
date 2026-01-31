-- AlterTable
ALTER TABLE "ReviewResult" ADD COLUMN     "aiNotes" TEXT,
ADD COLUMN     "confidenceLevel" DOUBLE PRECISION,
ADD COLUMN     "documentClassifications" JSONB,
ADD COLUMN     "isAiGenerated" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "recommendedAction" TEXT;
