-- CreateTable
CREATE TABLE "ResendPayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" INTEGER NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "amount" REAL NOT NULL,
    "method" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" DATETIME,
    CONSTRAINT "ResendPayment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Order" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "address" TEXT,
    "status" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "redeliveryFee" REAL NOT NULL DEFAULT 0.0,
    "redeliveryDate" DATETIME,
    "isRedeliveryPaid" BOOLEAN NOT NULL DEFAULT false,
    "resendAttempts" INTEGER NOT NULL DEFAULT 0,
    "scheduledDate" DATETIME,
    "resendStatus" TEXT NOT NULL DEFAULT 'ACTIVE'
);
INSERT INTO "new_Order" ("address", "code", "createdAt", "email", "id", "isRedeliveryPaid", "name", "redeliveryDate", "redeliveryFee", "status", "updatedAt") SELECT "address", "code", "createdAt", "email", "id", "isRedeliveryPaid", "name", "redeliveryDate", "redeliveryFee", "status", "updatedAt" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE UNIQUE INDEX "Order_code_key" ON "Order"("code");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
