-- CreateTable
CREATE TABLE "Reimbursement" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "photo" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reimbursement_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Reimbursement" ADD CONSTRAINT "Reimbursement_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reimbursement" ADD CONSTRAINT "Reimbursement_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
