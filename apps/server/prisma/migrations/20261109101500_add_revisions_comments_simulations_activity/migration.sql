-- CreateEnum
CREATE TYPE "ActivityAction" AS ENUM ('USER_SYNCED', 'WORKSPACE_CREATED', 'MEMBER_INVITED', 'MEMBER_REMOVED', 'ROOM_CREATED', 'ROOM_DELETED', 'VISIBILITY_CHANGED', 'REVISION_CREATED', 'REVISION_RESTORED', 'COMMENT_ADDED', 'SIMULATION_RECORDED');

-- CreateTable
CREATE TABLE "CanvasRevision" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "documentBlob" BYTEA NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CanvasRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CanvasComment" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "parentId" TEXT,
    "nodeId" TEXT,
    "posX" DOUBLE PRECISION,
    "posY" DOUBLE PRECISION,
    "content" TEXT NOT NULL,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CanvasComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimulationRun" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "trafficRps" INTEGER NOT NULL,
    "p99LatencyMs" DOUBLE PRECISION NOT NULL,
    "errorRate" DOUBLE PRECISION NOT NULL,
    "bottleneckNodeId" TEXT,
    "metricsSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SimulationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "roomId" TEXT,
    "userId" TEXT NOT NULL,
    "action" "ActivityAction" NOT NULL,
    "details" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CanvasRevision_roomId_idx" ON "CanvasRevision"("roomId");

-- CreateIndex
CREATE INDEX "CanvasRevision_createdById_idx" ON "CanvasRevision"("createdById");

-- CreateIndex
CREATE INDEX "CanvasComment_roomId_idx" ON "CanvasComment"("roomId");

-- CreateIndex
CREATE INDEX "CanvasComment_authorId_idx" ON "CanvasComment"("authorId");

-- CreateIndex
CREATE INDEX "CanvasComment_nodeId_idx" ON "CanvasComment"("nodeId");

-- CreateIndex
CREATE INDEX "SimulationRun_roomId_idx" ON "SimulationRun"("roomId");

-- CreateIndex
CREATE INDEX "SimulationRun_userId_idx" ON "SimulationRun"("userId");

-- CreateIndex
CREATE INDEX "ActivityLog_workspaceId_idx" ON "ActivityLog"("workspaceId");

-- CreateIndex
CREATE INDEX "ActivityLog_roomId_idx" ON "ActivityLog"("roomId");

-- CreateIndex
CREATE INDEX "ActivityLog_userId_idx" ON "ActivityLog"("userId");

-- CreateIndex
CREATE INDEX "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");

-- AddForeignKey
ALTER TABLE "CanvasRevision" ADD CONSTRAINT "CanvasRevision_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "CanvasRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CanvasRevision" ADD CONSTRAINT "CanvasRevision_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CanvasComment" ADD CONSTRAINT "CanvasComment_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "CanvasRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CanvasComment" ADD CONSTRAINT "CanvasComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CanvasComment" ADD CONSTRAINT "CanvasComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "CanvasComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulationRun" ADD CONSTRAINT "SimulationRun_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "CanvasRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulationRun" ADD CONSTRAINT "SimulationRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "CanvasRoom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

