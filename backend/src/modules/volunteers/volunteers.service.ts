import { prisma } from '../../db/prisma.js';

export class VolunteersService {
  async getVolunteers(clubId: string, eventId?: string, teamId?: string) {
    const where: any = { clubId };
    if (eventId && eventId !== 'undefined' && eventId !== 'null') {
      where.eventId = eventId;
    }
    if (teamId && teamId !== 'undefined' && teamId !== 'null') {
      where.teamId = teamId;
    }

    return await prisma.volunteer.findMany({
      where,
      include: {
        team: true,
        skillRecords: true,
      },
      orderBy: [{ rating: 'desc' }, { name: 'asc' }],
    });
  }

  async createVolunteer(clubId: string, data: {
    eventId?: string;
    name: string;
    email: string;
    phone?: string;
    teamId?: string;
    skills: string[];
    experienceYears?: number;
  }) {
    const volunteer = await prisma.volunteer.create({
      data: {
        clubId,
        eventId: data.eventId || null,
        name: data.name,
        email: data.email,
        phone: data.phone,
        teamId: data.teamId || null,
        skills: JSON.stringify(data.skills),
        experienceYears: data.experienceYears || 1.0,
        rating: 4.5 + Math.random() * 0.5,
        availability: 'AVAILABLE',
        currentWorkload: 'LOW',
        assignedHours: 0,
        skillRecords: {
          create: data.skills.map(s => ({
            skillName: s,
            proficiency: 4,
          })),
        },
      },
      include: {
        team: true,
        skillRecords: true,
      },
    });

    return volunteer;
  }

  async updateWorkload(volunteerId: string, assignedHours: number) {
    let currentWorkload = 'LOW';
    if (assignedHours > 16) currentWorkload = 'OVERLOADED';
    else if (assignedHours > 10) currentWorkload = 'HIGH';
    else if (assignedHours > 5) currentWorkload = 'MEDIUM';

    return await prisma.volunteer.update({
      where: { id: volunteerId },
      data: {
        assignedHours,
        currentWorkload,
      },
    });
  }

  async updateVolunteer(volunteerId: string, data: {
    name?: string;
    email?: string;
    phone?: string;
    teamId?: string | null;
    skills?: string[];
    experienceYears?: number;
    availability?: string;
    currentWorkload?: string;
  }) {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.teamId !== undefined) updateData.teamId = data.teamId || null;
    if (data.experienceYears !== undefined) updateData.experienceYears = data.experienceYears;
    if (data.availability !== undefined) updateData.availability = data.availability;
    if (data.currentWorkload !== undefined) updateData.currentWorkload = data.currentWorkload;
    if (data.skills !== undefined) {
      updateData.skills = JSON.stringify(data.skills);
      await prisma.volunteerSkill.deleteMany({ where: { volunteerId } });
      updateData.skillRecords = {
        create: data.skills.map(s => ({
          skillName: s,
          proficiency: 4,
        })),
      };
    }

    return await prisma.volunteer.update({
      where: { id: volunteerId },
      data: updateData,
      include: {
        team: true,
        skillRecords: true,
      },
    });
  }

  async deleteVolunteer(volunteerId: string) {
    await prisma.volunteerSkill.deleteMany({ where: { volunteerId } });
    return await prisma.volunteer.delete({
      where: { id: volunteerId },
    });
  }

  async matchVolunteersForTask(taskId: string) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { event: true, team: true },
    });

    if (!task) throw new Error('Task not found');

    const volunteers = await prisma.volunteer.findMany({
      where: {
        clubId: task.event.clubId,
        eventId: task.eventId,
      },
      include: { team: true, skillRecords: true },
    });

    const taskText = `${task.title} ${task.description || ''} ${task.tags || ''}`.toLowerCase();

    const matches = volunteers.map(vol => {
      let volSkills: string[] = [];
      if (vol.skills) {
        try {
          const parsed = JSON.parse(vol.skills);
          volSkills = Array.isArray(parsed) ? parsed : [String(parsed)];
        } catch {
          volSkills = vol.skills.split(',').map((s: string) => s.trim()).filter(Boolean);
        }
      }
      let matchedSkills: string[] = [];

      // 1. Skill keyword matches
      volSkills.forEach(s => {
        const cleanSkill = s.trim().toLowerCase();
        if (cleanSkill && (taskText.includes(cleanSkill) || cleanSkill.split(/[\s-]+/).some(part => part.length > 2 && taskText.includes(part)))) {
          matchedSkills.push(s);
        }
      });

      const isSameTeam = task.teamId && vol.teamId === task.teamId;
      const isUnassigned = (vol.assignedHours || 0) === 0;

      // Workload multiplier
      let workloadFactor = 1.0;
      if (vol.currentWorkload === 'MEDIUM') workloadFactor = 0.85;
      else if (vol.currentWorkload === 'HIGH') workloadFactor = 0.6;
      else if (vol.currentWorkload === 'OVERLOADED') workloadFactor = 0.25;

      if (vol.availability !== 'AVAILABLE') {
        workloadFactor *= 0.4;
      }

      let finalPercentage = 0;
      let explanation = '';

      if (matchedSkills.length > 0) {
        // High Tier: Direct skill match
        const rawSkillPct = Math.round((matchedSkills.length / Math.max(volSkills.length, 1)) * 80);
        const teamBonus = isSameTeam ? 15 : 0;
        finalPercentage = Math.min(98, Math.max(50, Math.round((rawSkillPct + teamBonus) * workloadFactor)));
        explanation = `Matches skills: ${matchedSkills.join(', ')} (${matchedSkills.length}/${volSkills.length}). Workload is ${vol.currentWorkload}.`;
      } else if (isSameTeam && (isUnassigned || vol.currentWorkload === 'LOW')) {
        // Department Tier: Same department and available
        finalPercentage = Math.round(45 * workloadFactor);
        explanation = `Member of ${vol.team?.name || 'assigned team'}, currently unassigned (0 tasks) — ready for allocation.`;
      } else if (isUnassigned && vol.availability === 'AVAILABLE') {
        // Available Capacity Tier: Volunteer has 0 tasks assigned yet
        finalPercentage = Math.round(35 * workloadFactor);
        explanation = `Available volunteer with 0 tasks assigned (${vol.experienceYears || 1}y exp) — full capacity ready.`;
      } else {
        // Busy or overloaded volunteers with 0 skill match are excluded
        return null;
      }

      return {
        volunteer: {
          id: vol.id,
          name: vol.name,
          email: vol.email,
          skills: volSkills,
          availability: vol.availability,
          workload: vol.currentWorkload,
          rating: vol.rating,
          team: vol.team?.name || 'General',
        },
        matchPercentage: finalPercentage,
        matchedSkills,
        workload: vol.currentWorkload,
        explanation,
      };
    });

    // Filter out null candidates, sort descending by match percentage, return top 5
    return (matches.filter(Boolean) as NonNullable<typeof matches[0]>[])
      .sort((a, b) => b.matchPercentage - a.matchPercentage)
      .slice(0, 5);
  }
}

export const volunteersService = new VolunteersService();
