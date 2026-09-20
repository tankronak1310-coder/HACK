import { prisma } from '../../db/prisma.js';
import { realtimeHub } from '../../realtime/socket.js';
import { eventsService } from '../events/events.service.js';

export class TasksService {
  async getTasks(eventId: string, filters?: {
    teamId?: string;
    status?: string;
    priority?: string;
    assigneeId?: string;
  }) {
    const whereClause: any = { eventId };
    if (filters?.teamId) whereClause.teamId = filters.teamId;
    if (filters?.status) whereClause.status = filters.status;
    if (filters?.priority) whereClause.priority = filters.priority;
    if (filters?.assigneeId) whereClause.assigneeId = filters.assigneeId;

    return await prisma.task.findMany({
      where: whereClause,
      include: {
        team: true,
        assignee: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        dependencies: {
          include: {
            dependsOn: {
              select: { id: true, title: true, status: true, deadline: true, priority: true },
            },
          },
        },
        dependedOnBy: {
          include: {
            task: {
              select: { id: true, title: true, status: true, deadline: true, priority: true },
            },
          },
        },
      },
      orderBy: [{ priority: 'desc' }, { deadline: 'asc' }],
    });
  }

  async createTask(eventId: string, data: {
    title: string;
    description?: string;
    teamId?: string;
    assigneeId?: string;
    priority?: string;
    deadline: string | Date;
    estimatedHours?: number;
    riskLevel?: string;
    tags?: string[];
  }) {
    const trimmedTitle = data.title.trim();
    const existingTasks = await prisma.task.findMany({
      where: { eventId },
      select: { id: true, title: true }
    });

    const duplicate = existingTasks.find(
      t => t.title.trim().toLowerCase() === trimmedTitle.toLowerCase()
    );

    if (duplicate) {
      throw new Error(`A task with the name "${trimmedTitle}" already exists.`);
    }

    const task = await prisma.task.create({
      data: {
        eventId,
        title: trimmedTitle,
        description: data.description,
        teamId: data.teamId || null,
        assigneeId: data.assigneeId || null,
        priority: data.priority || 'MEDIUM',
        status: 'TODO',
        deadline: new Date(data.deadline),
        estimatedHours: data.estimatedHours || 4,
        actualHours: 0,
        riskLevel: data.riskLevel || 'LOW',
        tags: data.tags ? JSON.stringify(data.tags) : null,
      },
      include: {
        team: true,
        assignee: { select: { id: true, name: true, email: true, avatar: true } },
      },
    });

    // Notify real-time
    realtimeHub.broadcastTaskUpdate(eventId, task);
    await eventsService.calculateHealthScore(eventId);

    return task;
  }

  async updateTask(taskId: string, data: Partial<{
    title: string;
    description: string;
    status: string;
    priority: string;
    assigneeId: string | null;
    teamId: string | null;
    deadline: string | Date;
    estimatedHours: number;
    actualHours: number;
    riskLevel: string;
    tags: string[];
  }>) {
    const existing = await prisma.task.findUnique({ where: { id: taskId } });
    if (!existing) throw new Error('Task not found');

    const updateData: any = { ...data };

    if (data.title) {
      const trimmedTitle = data.title.trim();
      const existingTasks = await prisma.task.findMany({
        where: { eventId: existing.eventId },
        select: { id: true, title: true }
      });

      const duplicate = existingTasks.find(
        t => t.id !== taskId && t.title.trim().toLowerCase() === trimmedTitle.toLowerCase()
      );

      if (duplicate) {
        throw new Error(`A task with the name "${trimmedTitle}" already exists.`);
      }
      updateData.title = trimmedTitle;
    }

    if (data.deadline) updateData.deadline = new Date(data.deadline);
    if (data.tags) updateData.tags = JSON.stringify(data.tags);
    if (data.status === 'DONE' && existing.status !== 'DONE') {
      updateData.completedAt = new Date();
    }

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
      include: {
        team: true,
        assignee: { select: { id: true, name: true, email: true, avatar: true } },
        dependencies: { include: { dependsOn: true } },
        dependedOnBy: { include: { task: true } },
      },
    });

    realtimeHub.broadcastTaskUpdate(existing.eventId, updated);
    const health = await eventsService.calculateHealthScore(existing.eventId);
    realtimeHub.broadcastHealthUpdate(existing.eventId, health.score);

    return updated;
  }

  async deleteTask(taskId: string) {
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new Error('Task not found');

    await prisma.task.delete({ where: { id: taskId } });
    const health = await eventsService.calculateHealthScore(task.eventId);
    realtimeHub.broadcastHealthUpdate(task.eventId, health.score);

    return { success: true, taskId };
  }

  async addDependency(taskId: string, dependsOnTaskId: string, type = 'FINISH_TO_START') {
    if (taskId === dependsOnTaskId) {
      throw new Error('A task cannot depend on itself.');
    }

    const dep = await prisma.taskDependency.create({
      data: {
        taskId,
        dependsOnTaskId,
        type,
      },
      include: {
        task: true,
        dependsOn: true,
      },
    });

    return dep;
  }

  async removeDependency(taskId: string, dependsOnTaskId: string) {
    await prisma.taskDependency.delete({
      where: {
        taskId_dependsOnTaskId: {
          taskId,
          dependsOnTaskId,
        },
      },
    });
    return { success: true };
  }

  async assignTask(taskId: string, assigneeId: string | null) {
    const existingTask = await prisma.task.findUnique({ where: { id: taskId } });
    if (!existingTask) throw new Error('Task not found');

    // If previously assigned to a user/volunteer, decrement their workload
    if (existingTask.assigneeId) {
      const prevVolunteer = await prisma.volunteer.findFirst({
        where: { userId: existingTask.assigneeId },
      });
      if (prevVolunteer) {
        const removedHours = existingTask.estimatedHours || 4;
        const newAssignedHours = Math.max(0, (prevVolunteer.assignedHours || 0) - removedHours);
        let newWorkload = 'LOW';
        if (newAssignedHours > 16) newWorkload = 'OVERLOADED';
        else if (newAssignedHours > 10) newWorkload = 'HIGH';
        else if (newAssignedHours > 4) newWorkload = 'MEDIUM';

        await prisma.volunteer.update({
          where: { id: prevVolunteer.id },
          data: {
            assignedHours: newAssignedHours,
            currentWorkload: newWorkload,
          },
        });
      }
    }

    if (!assigneeId) {
      return await this.updateTask(taskId, { assigneeId: null });
    }

    // Check if assigneeId belongs to a Volunteer
    const volunteer = await prisma.volunteer.findUnique({
      where: { id: assigneeId },
    });

    let targetUserId = assigneeId;

    if (volunteer) {
      // Find existing user or create one for the volunteer to satisfy foreign key
      let user = volunteer.userId ? await prisma.user.findUnique({ where: { id: volunteer.userId } }) : null;

      if (!user) {
        user = await prisma.user.findUnique({ where: { email: volunteer.email } });
      }

      if (!user) {
        user = await prisma.user.create({
          data: {
            name: volunteer.name,
            email: volunteer.email,
            mobile: volunteer.phone || undefined,
            role: 'MEMBER',
            verifiedEmail: true,
          },
        });
      }

      // Link volunteer to user if not already linked
      if (volunteer.userId !== user.id) {
        await prisma.volunteer.update({
          where: { id: volunteer.id },
          data: { userId: user.id },
        });
      }

      targetUserId = user.id;

      // Update volunteer workload and assigned hours
      const addedHours = existingTask.estimatedHours || 4;
      const newAssignedHours = (volunteer.assignedHours || 0) + addedHours;
      let newWorkload = 'LOW';
      if (newAssignedHours > 16) newWorkload = 'OVERLOADED';
      else if (newAssignedHours > 10) newWorkload = 'HIGH';
      else if (newAssignedHours > 4) newWorkload = 'MEDIUM';

      await prisma.volunteer.update({
        where: { id: volunteer.id },
        data: {
          assignedHours: newAssignedHours,
          currentWorkload: newWorkload,
        },
      });
    }

    return await this.updateTask(taskId, { assigneeId: targetUserId });
  }
}

export const tasksService = new TasksService();
