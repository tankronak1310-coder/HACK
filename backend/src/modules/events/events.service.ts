import { prisma } from '../../db/prisma.js';

export class EventsService {
  async createEvent(data: {
    clubId: string;
    name: string;
    type: string;
    date: string | Date;
    endDate?: string | Date;
    expectedParticipants?: number;
    location: string;
    budget?: number;
    description?: string;
  }) {
    const event = await prisma.event.create({
      data: {
        clubId: data.clubId,
        name: data.name,
        type: data.type,
        date: new Date(data.date),
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        expectedParticipants: data.expectedParticipants || 500,
        location: data.location,
        budget: data.budget || 0,
        description: data.description,
        status: 'PLANNING',
        healthScore: 92,
        currentMilestone: 'Initial Setup & Scoping',
      },
    });

    // Generate initial workstreams and tasks based on event name, type and description
    await this.scaffoldEventWorkspace(event.id, data.clubId, data.type, new Date(data.date), data.name, data.description);

    return await this.getEventById(event.id);
  }

  async getEventById(eventId: string) {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        club: {
          include: {
            teams: true,
          },
        },
        tasks: {
          include: {
            team: true,
            assignee: { select: { id: true, name: true, email: true, avatar: true } },
            dependencies: { include: { dependsOn: true } },
          },
          orderBy: { deadline: 'asc' },
        },
        risks: {
          orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
        },
        meetings: {
          orderBy: { date: 'desc' },
          take: 5,
        },
        announcements: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        _count: {
          select: { tasks: true, risks: true, meetings: true, documents: true, volunteers: true },
        },
      },
    });

    if (!event) throw new Error('Event not found');

    const health = await this.calculateHealthScore(eventId);
    return { ...event, healthScore: health.score, healthBreakdown: health.breakdown };
  }

  async getClubEvents(clubId: string) {
    return await prisma.event.findMany({
      where: { clubId },
      orderBy: { date: 'desc' },
      include: {
        _count: {
          select: { tasks: true, risks: true, meetings: true, volunteers: true },
        },
      },
    });
  }

  async updateEvent(eventId: string, data: Partial<{
    name: string;
    type: string;
    status: string;
    location: string;
    budget: number;
    healthScore: number;
    currentMilestone: string;
    description: string;
    date: string | Date;
    endDate: string | Date;
  }>) {
    const updateData: any = { ...data };
    if (data.date) updateData.date = new Date(data.date);
    if (data.endDate) updateData.endDate = new Date(data.endDate);

    return await prisma.event.update({
      where: { id: eventId },
      data: updateData,
    });
  }

  async deleteEvent(eventId: string) {
    return await prisma.$transaction(async (tx) => {
      // 1. Delete or unlink event documents
      await tx.document.deleteMany({ where: { eventId } });
      // 2. Delete event activity logs
      await tx.activityLog.deleteMany({ where: { eventId } });
      // 3. Delete event volunteers
      await tx.volunteer.deleteMany({ where: { eventId } });
      // 4. Delete event (cascades tasks, risks, meetings, announcements, aiActions, metrics)
      return await tx.event.delete({ where: { id: eventId } });
    });
  }

  async calculateHealthScore(eventId: string): Promise<{ score: number; breakdown: any }> {
    const tasks = await prisma.task.findMany({ where: { eventId } });
    const risks = await prisma.risk.findMany({ where: { eventId, status: { not: 'RESOLVED' } } });

    if (tasks.length === 0) {
      return {
        score: 85,
        breakdown: { taskPenalty: 0, riskPenalty: 15, blockerPenalty: 0 },
      };
    }

    const now = new Date();
    const overdueTasks = tasks.filter(t => t.status !== 'DONE' && new Date(t.deadline) < now);
    const blockedTasks = tasks.filter(t => t.status === 'BLOCKED');
    const unassignedTasks = tasks.filter(t => !t.assigneeId && (t.priority === 'HIGH' || t.priority === 'CRITICAL'));

    const criticalRisks = risks.filter(r => r.severity === 'CRITICAL');
    const highRisks = risks.filter(r => r.severity === 'HIGH');

    // Penalties calculation
    let score = 100;
    const taskPenalty = Math.min(30, overdueTasks.length * 6);
    const blockerPenalty = Math.min(25, blockedTasks.length * 8);
    const riskPenalty = Math.min(30, criticalRisks.length * 10 + highRisks.length * 5);
    const unassignedPenalty = Math.min(15, unassignedTasks.length * 4);

    score = Math.max(15, score - taskPenalty - blockerPenalty - riskPenalty - unassignedPenalty);

    // Save updated score
    await prisma.event.update({
      where: { id: eventId },
      data: { healthScore: score },
    });

    return {
      score,
      breakdown: {
        totalTasks: tasks.length,
        completedTasks: tasks.filter(t => t.status === 'DONE').length,
        overdueCount: overdueTasks.length,
        blockedCount: blockedTasks.length,
        criticalRisksCount: criticalRisks.length,
        highRisksCount: highRisks.length,
        unassignedCritical: unassignedTasks.length,
      },
    };
  }

  private async scaffoldEventWorkspace(
    eventId: string,
    clubId: string,
    eventType: string,
    eventDate: Date,
    eventName: string = '',
    description: string = '',
  ) {
    const teams = await prisma.team.findMany({ where: { clubId } });
    const teamMap = new Map(teams.map(t => [t.name, t.id]));

    const logisticsId = teamMap.get('Logistics & Operations');
    const techId      = teamMap.get('Technical & Platform');
    const marketingId = teamMap.get('Marketing & Media');
    const sponsorId   = teamMap.get('Sponsorship & Outreach');
    const hospId      = teamMap.get('Hospitality & Registration');

    const dayMs     = 24 * 60 * 60 * 1000;
    const eventTime = eventDate.getTime();

    // Combine all text for keyword detection (lowercase)
    const combined = `${eventType} ${eventName} ${description}`.toLowerCase();

    // Category detection
    const isHackathon = /hackathon|coding|developer|software|programming|techfest|tech fest|code|devthon/.test(combined);
    const isCultural  = /cultural|fest|dance|music|drama|theatre|art|performance|singing|band|concert|talent/.test(combined);
    const isWorkshop  = /workshop|training|seminar|lecture|webinar|session|bootcamp|masterclass/.test(combined);
    const isSports    = /sport|tournament|game|cricket|football|badminton|basketball|marathon|race|athletics|chess/.test(combined);
    const isMedical   = /blood|donation|medical|camp|health|drive|vaccine|first.?aid|ambulance/.test(combined);
    const isFarewell  = /farewell|fresher|party|alumni|social|reunion|graduation|convocation/.test(combined);
    const isExhibit   = /exhibition|expo|showcase|science fair|project|display|stall|demo/.test(combined);

    let tasks: any[] = [];
    let riskDefs: any[] = [];

    if (isHackathon) {
      tasks = [
        { teamId: logisticsId, title: 'Venue & Lab Booking Confirmation', description: 'Secure formal approval and safety clearance for hacking labs and main auditorium.', status: 'IN_PROGRESS', priority: 'CRITICAL', deadline: new Date(eventTime - 20 * dayMs), estimatedHours: 6, riskLevel: 'HIGH', tags: ['Venue', 'Permits'] },
        { teamId: techId, title: 'Registration Portal & QR Check-in System', description: 'Deploy registration site, team formation API, and QR-based entry scanner.', status: 'IN_PROGRESS', priority: 'CRITICAL', deadline: new Date(eventTime - 12 * dayMs), estimatedHours: 16, riskLevel: 'LOW', tags: ['Software', 'Portal'] },
        { teamId: logisticsId, title: 'Audio-Visual & Power Grid Setup', description: 'Stage lighting, dual projectors, microphone rigs, and 3-phase power backup.', status: 'TODO', priority: 'HIGH', deadline: new Date(eventTime - 5 * dayMs), estimatedHours: 8, riskLevel: 'MEDIUM', tags: ['AV', 'Stage'] },
        { teamId: sponsorId, title: 'Sponsor Agreement & Prize Pool Finalization', description: 'Finalize contracts with tech sponsors, confirm prize amounts and swag delivery.', status: 'TODO', priority: 'HIGH', deadline: new Date(eventTime - 25 * dayMs), estimatedHours: 10, riskLevel: 'LOW', tags: ['Sponsors', 'Finance'] },
        { teamId: marketingId, title: 'Social Media & Campus Outreach Campaign', description: 'Design posters, schedule posts, and reach out to college networks and communities.', status: 'TODO', priority: 'MEDIUM', deadline: new Date(eventTime - 18 * dayMs), estimatedHours: 8, riskLevel: 'LOW', tags: ['Marketing'] },
        { teamId: hospId, title: 'Participant Catering & Refreshments Contract', description: 'Arrange dinner, midnight snacks, and 24-hour coffee/energy drink station.', status: 'TODO', priority: 'MEDIUM', deadline: new Date(eventTime - 7 * dayMs), estimatedHours: 5, riskLevel: 'MEDIUM', tags: ['Catering'] },
      ];
      riskDefs = [
        { title: 'Venue Approval Delay', description: 'Admin board meeting rescheduled — could delay lab access and stage load-in.', category: 'VENUE', severity: 'HIGH', status: 'IDENTIFIED', impactAnalysis: 'Cascades to AV Setup, Decoration, and Technical Soundcheck.', mitigationPlan: 'Prepare open-air amphitheater as fallback; seek fast-track dean signature.' },
        { title: 'High-Density Wi-Fi Bottleneck', description: 'Simultaneous load from 500+ participants could overload campus network.', category: 'TECHNICAL', severity: 'MEDIUM', status: 'MITIGATING', impactAnalysis: 'Degraded connectivity during coding rounds.', mitigationPlan: 'Provision 2 dedicated 5G wireless routers from network vendor.' },
      ];

    } else if (isCultural) {
      tasks = [
        { teamId: logisticsId, title: 'Main Stage & Venue Decoration Setup', description: 'Arrange backdrops, props, lighting rigs, and theme-based decoration for stage.', status: 'TODO', priority: 'CRITICAL', deadline: new Date(eventTime - 10 * dayMs), estimatedHours: 12, riskLevel: 'MEDIUM', tags: ['Decoration', 'Stage'] },
        { teamId: hospId, title: 'Participant & Audience Registration System', description: 'Set up online sign-up form, print entry passes, and manage guest list.', status: 'TODO', priority: 'HIGH', deadline: new Date(eventTime - 15 * dayMs), estimatedHours: 8, riskLevel: 'LOW', tags: ['Registration'] },
        { teamId: logisticsId, title: 'Audition Scheduling & Participant Coordination', description: 'Plan audition slots, coordinate with performers, and confirm final lineup.', status: 'TODO', priority: 'HIGH', deadline: new Date(eventTime - 20 * dayMs), estimatedHours: 10, riskLevel: 'LOW', tags: ['Auditions'] },
        { teamId: hospId, title: 'Costume & Props Sourcing', description: 'Coordinate costume requirements for all acts and arrange prop procurement.', status: 'TODO', priority: 'MEDIUM', deadline: new Date(eventTime - 12 * dayMs), estimatedHours: 6, riskLevel: 'LOW', tags: ['Costume', 'Props'] },
        { teamId: marketingId, title: 'Promotional Campaign & Poster Design', description: 'Create event branding, design posters/banners, and run social media promotions.', status: 'TODO', priority: 'MEDIUM', deadline: new Date(eventTime - 18 * dayMs), estimatedHours: 8, riskLevel: 'LOW', tags: ['Marketing'] },
        { teamId: hospId, title: 'Catering & Refreshments Arrangement', description: 'Arrange snacks, beverages, and dinner for performers and audience.', status: 'TODO', priority: 'MEDIUM', deadline: new Date(eventTime - 7 * dayMs), estimatedHours: 5, riskLevel: 'LOW', tags: ['Catering'] },
      ];
      riskDefs = [
        { title: 'Last-Minute Performer Dropout', description: 'A registered act may drop out close to the event date.', category: 'OPERATIONAL', severity: 'HIGH', status: 'IDENTIFIED', impactAnalysis: 'Gap in schedule; audience dissatisfaction.', mitigationPlan: 'Maintain waitlist of backup performers; keep 1–2 open slots.' },
        { title: 'Sound System Technical Failure', description: 'PA system or microphones may fail during live performance.', category: 'TECHNICAL', severity: 'MEDIUM', status: 'IDENTIFIED', impactAnalysis: 'Disrupts live acts and overall program flow.', mitigationPlan: 'Arrange backup microphones and test all equipment 3 hours before event.' },
      ];

    } else if (isWorkshop) {
      tasks = [
        { teamId: logisticsId, title: 'Venue / Room Booking & Setup', description: 'Book seminar hall or classroom, arrange seating, projector, and whiteboard.', status: 'TODO', priority: 'CRITICAL', deadline: new Date(eventTime - 14 * dayMs), estimatedHours: 4, riskLevel: 'MEDIUM', tags: ['Venue', 'Setup'] },
        { teamId: sponsorId, title: 'Speaker / Trainer Coordination', description: 'Finalize speaker topics, travel/accommodation arrangements, and honorarium.', status: 'TODO', priority: 'CRITICAL', deadline: new Date(eventTime - 20 * dayMs), estimatedHours: 8, riskLevel: 'HIGH', tags: ['Speaker'] },
        { teamId: hospId, title: 'Participant Registration & Confirmation', description: 'Open registration form, confirm attendees, and send reminder emails.', status: 'TODO', priority: 'HIGH', deadline: new Date(eventTime - 10 * dayMs), estimatedHours: 5, riskLevel: 'LOW', tags: ['Registration'] },
        { teamId: logisticsId, title: 'Study Material & Handout Printing', description: 'Prepare workshop kits, printed handouts, and any lab exercise sheets.', status: 'TODO', priority: 'MEDIUM', deadline: new Date(eventTime - 5 * dayMs), estimatedHours: 4, riskLevel: 'LOW', tags: ['Materials'] },
        { teamId: marketingId, title: 'Invitations & Outreach', description: 'Send invitations to target audience via email, WhatsApp, and notice boards.', status: 'TODO', priority: 'MEDIUM', deadline: new Date(eventTime - 15 * dayMs), estimatedHours: 4, riskLevel: 'LOW', tags: ['Marketing'] },
        { teamId: hospId, title: 'Feedback Form & Post-Event Report', description: 'Prepare digital/paper feedback forms and compile results into a summary report.', status: 'TODO', priority: 'LOW', deadline: new Date(eventTime + 2 * dayMs), estimatedHours: 3, riskLevel: 'LOW', tags: ['Feedback', 'Report'] },
      ];
      riskDefs = [
        { title: 'Speaker Cancellation', description: 'Invited speaker may cancel due to scheduling conflict or emergency.', category: 'OPERATIONAL', severity: 'HIGH', status: 'IDENTIFIED', impactAnalysis: 'Entire workshop may need to be postponed or restructured.', mitigationPlan: 'Identify a backup speaker in advance; record a video fallback.' },
        { title: 'Low Participant Turnout', description: 'Registration numbers may fall below minimum viable attendance.', category: 'OPERATIONAL', severity: 'MEDIUM', status: 'IDENTIFIED', impactAnalysis: 'Poor cost-per-head ratio; low impact.', mitigationPlan: 'Send reminder messages 3 days and 1 day before the event.' },
      ];

    } else if (isSports) {
      tasks = [
        { teamId: logisticsId, title: 'Ground / Court Booking & Equipment Setup', description: 'Reserve the sports facility, set up equipment, nets, boundary markers, and scoreboards.', status: 'TODO', priority: 'CRITICAL', deadline: new Date(eventTime - 15 * dayMs), estimatedHours: 8, riskLevel: 'HIGH', tags: ['Venue', 'Equipment'] },
        { teamId: hospId, title: 'Team / Participant Registration', description: 'Collect team rosters, validate eligibility, and assign bracket/seeding.', status: 'TODO', priority: 'HIGH', deadline: new Date(eventTime - 12 * dayMs), estimatedHours: 6, riskLevel: 'LOW', tags: ['Registration'] },
        { teamId: logisticsId, title: 'Referee & Officials Arrangement', description: 'Confirm referees, line judges, and scorekeepers for all matches.', status: 'TODO', priority: 'HIGH', deadline: new Date(eventTime - 10 * dayMs), estimatedHours: 5, riskLevel: 'MEDIUM', tags: ['Officials'] },
        { teamId: hospId, title: 'Medical Standby & First Aid Setup', description: 'Arrange first-aid kit, designated medical volunteer, and emergency contact list.', status: 'TODO', priority: 'HIGH', deadline: new Date(eventTime - 5 * dayMs), estimatedHours: 3, riskLevel: 'HIGH', tags: ['Medical', 'Safety'] },
        { teamId: marketingId, title: 'Fixtures, Schedule & Promotion', description: 'Publish match schedule, draw fixtures, and promote on social media.', status: 'TODO', priority: 'MEDIUM', deadline: new Date(eventTime - 14 * dayMs), estimatedHours: 5, riskLevel: 'LOW', tags: ['Schedule', 'Marketing'] },
        { teamId: hospId, title: 'Refreshments & Water Station Setup', description: 'Arrange drinking water, energy drinks, and light snacks for players.', status: 'TODO', priority: 'MEDIUM', deadline: new Date(eventTime - 3 * dayMs), estimatedHours: 3, riskLevel: 'LOW', tags: ['Refreshments'] },
      ];
      riskDefs = [
        { title: 'Weather / Ground Condition Risk', description: 'Rain or poor ground conditions could force cancellation of outdoor matches.', category: 'VENUE', severity: 'HIGH', status: 'IDENTIFIED', impactAnalysis: 'Tournament schedule disrupted; potential venue change needed.', mitigationPlan: 'Identify indoor backup venue; monitor weather forecast 48 hours prior.' },
        { title: 'Player Injury or Medical Emergency', description: 'Participants may sustain injuries during competition.', category: 'OPERATIONAL', severity: 'HIGH', status: 'IDENTIFIED', impactAnalysis: 'Disruption to match schedule and liability concerns.', mitigationPlan: 'Ensure medical volunteer present; keep first-aid kit stocked.' },
      ];

    } else if (isMedical) {
      tasks = [
        { teamId: logisticsId, title: 'Venue Setup & Bed/Camp Arrangement', description: 'Arrange donation beds, curtains, waiting area, and camp signage at venue.', status: 'TODO', priority: 'CRITICAL', deadline: new Date(eventTime - 10 * dayMs), estimatedHours: 8, riskLevel: 'HIGH', tags: ['Venue', 'Setup'] },
        { teamId: sponsorId, title: 'Medical Team & Hospital Coordination', description: 'Coordinate with hospital/blood bank for medical staff, blood bags, and test kits.', status: 'TODO', priority: 'CRITICAL', deadline: new Date(eventTime - 20 * dayMs), estimatedHours: 10, riskLevel: 'HIGH', tags: ['Medical'] },
        { teamId: hospId, title: 'Donor Registration & Pre-screening System', description: 'Set up registration desk, health pre-screening questionnaire, and ID verification.', status: 'TODO', priority: 'HIGH', deadline: new Date(eventTime - 5 * dayMs), estimatedHours: 5, riskLevel: 'LOW', tags: ['Registration', 'Screening'] },
        { teamId: marketingId, title: 'Awareness Campaign & Donor Outreach', description: 'Run awareness drives via social media, posters, announcements, and WhatsApp.', status: 'TODO', priority: 'HIGH', deadline: new Date(eventTime - 15 * dayMs), estimatedHours: 6, riskLevel: 'LOW', tags: ['Awareness', 'Marketing'] },
        { teamId: logisticsId, title: 'Equipment & Consumable Stock Check', description: 'Verify stock of needles, donation bags, gloves, antiseptic, and bandages.', status: 'TODO', priority: 'HIGH', deadline: new Date(eventTime - 7 * dayMs), estimatedHours: 4, riskLevel: 'HIGH', tags: ['Equipment', 'Medical'] },
        { teamId: hospId, title: 'Refreshments & Post-donation Care', description: 'Arrange biscuits, juice, and light snacks for donors after donation.', status: 'TODO', priority: 'MEDIUM', deadline: new Date(eventTime - 3 * dayMs), estimatedHours: 3, riskLevel: 'LOW', tags: ['Refreshments', 'Care'] },
      ];
      riskDefs = [
        { title: 'Medical Staff Shortage', description: 'Insufficient trained medical personnel may limit donation capacity.', category: 'OPERATIONAL', severity: 'HIGH', status: 'IDENTIFIED', impactAnalysis: 'Fewer donations collected; donor wait times increase.', mitigationPlan: 'Confirm minimum 3 medical staff 7 days before; arrange hospital backup.' },
        { title: 'Low Donor Turnout', description: 'Fear of needles or poor awareness may lead to fewer participants.', category: 'OPERATIONAL', severity: 'MEDIUM', status: 'IDENTIFIED', impactAnalysis: 'Collection target not met.', mitigationPlan: 'Run peer-to-peer outreach; offer certificates or tokens of appreciation.' },
      ];

    } else if (isFarewell) {
      tasks = [
        { teamId: logisticsId, title: 'Venue Decoration & Theme Setup', description: 'Plan and execute decoration as per chosen theme (floral, retro, etc.).', status: 'TODO', priority: 'HIGH', deadline: new Date(eventTime - 5 * dayMs), estimatedHours: 10, riskLevel: 'MEDIUM', tags: ['Decoration', 'Theme'] },
        { teamId: hospId, title: 'Invitation Design & Dispatch', description: 'Design digital/printed invitations and send to all guests and honorees.', status: 'TODO', priority: 'HIGH', deadline: new Date(eventTime - 14 * dayMs), estimatedHours: 5, riskLevel: 'LOW', tags: ['Invitations'] },
        { teamId: hospId, title: 'Catering & Dinner Arrangement', description: 'Finalize menu, book caterer, and arrange table layout for the dinner.', status: 'TODO', priority: 'CRITICAL', deadline: new Date(eventTime - 7 * dayMs), estimatedHours: 6, riskLevel: 'MEDIUM', tags: ['Catering', 'Dinner'] },
        { teamId: sponsorId, title: 'Memento / Gift Sourcing', description: 'Source mementos or gifts for honorees; arrange printing/engraving if needed.', status: 'TODO', priority: 'MEDIUM', deadline: new Date(eventTime - 10 * dayMs), estimatedHours: 6, riskLevel: 'LOW', tags: ['Mementos', 'Gifts'] },
        { teamId: marketingId, title: 'Photo Booth & Memory Wall Setup', description: 'Set up a dedicated photo booth with props and a memory wall for messages.', status: 'TODO', priority: 'MEDIUM', deadline: new Date(eventTime - 3 * dayMs), estimatedHours: 4, riskLevel: 'LOW', tags: ['Photo Booth', 'Memories'] },
        { teamId: logisticsId, title: 'Audio-Visual & Entertainment Setup', description: 'Set up projector for slideshows, music system, and stage for performances.', status: 'TODO', priority: 'MEDIUM', deadline: new Date(eventTime - 2 * dayMs), estimatedHours: 5, riskLevel: 'LOW', tags: ['AV', 'Entertainment'] },
      ];
      riskDefs = [
        { title: 'Low Guest Attendance', description: 'Key honorees or senior members may not attend due to scheduling conflicts.', category: 'OPERATIONAL', severity: 'MEDIUM', status: 'IDENTIFIED', impactAnalysis: 'Event feels incomplete; honorees miss the celebration.', mitigationPlan: 'Send invitations 2 weeks ahead and follow up with personal calls.' },
        { title: 'Caterer / Venue Cancellation', description: 'Last-minute cancellation by caterer or venue on event day.', category: 'VENUE', severity: 'HIGH', status: 'IDENTIFIED', impactAnalysis: 'Major disruption to food and venue logistics.', mitigationPlan: 'Have backup caterer shortlisted; confirm booking 3 days before.' },
      ];

    } else if (isExhibit) {
      tasks = [
        { teamId: logisticsId, title: 'Stall Allocation & Layout Planning', description: 'Design floor plan, assign stall numbers to exhibitors, and mark boundaries.', status: 'TODO', priority: 'HIGH', deadline: new Date(eventTime - 10 * dayMs), estimatedHours: 6, riskLevel: 'MEDIUM', tags: ['Layout', 'Stalls'] },
        { teamId: hospId, title: 'Exhibitor & Visitor Registration', description: 'Open registration for exhibitors and visitors; issue badges and passes.', status: 'TODO', priority: 'HIGH', deadline: new Date(eventTime - 14 * dayMs), estimatedHours: 5, riskLevel: 'LOW', tags: ['Registration'] },
        { teamId: logisticsId, title: 'Power Supply & Infrastructure Setup', description: 'Ensure power outlets, extension cords, internet, and lighting at each stall.', status: 'TODO', priority: 'CRITICAL', deadline: new Date(eventTime - 5 * dayMs), estimatedHours: 8, riskLevel: 'HIGH', tags: ['Infrastructure', 'Power'] },
        { teamId: sponsorId, title: 'Judge / Evaluator Panel Coordination', description: 'Invite and confirm judges; share evaluation criteria and schedule.', status: 'TODO', priority: 'HIGH', deadline: new Date(eventTime - 12 * dayMs), estimatedHours: 5, riskLevel: 'MEDIUM', tags: ['Judges'] },
        { teamId: marketingId, title: 'Event Promotion & Media Coverage', description: 'Promote event on social media, invite press, and coordinate photography.', status: 'TODO', priority: 'MEDIUM', deadline: new Date(eventTime - 15 * dayMs), estimatedHours: 6, riskLevel: 'LOW', tags: ['Marketing', 'Media'] },
        { teamId: hospId, title: 'Refreshments for Exhibitors & Visitors', description: 'Arrange water, snacks, and tea/coffee for participants and guests.', status: 'TODO', priority: 'LOW', deadline: new Date(eventTime - 3 * dayMs), estimatedHours: 3, riskLevel: 'LOW', tags: ['Refreshments'] },
      ];
      riskDefs = [
        { title: 'Power Outage at Venue', description: 'Electricity failure during the exhibition could damage demos and equipment.', category: 'TECHNICAL', severity: 'HIGH', status: 'IDENTIFIED', impactAnalysis: 'All electronic stalls go dark; major disruption.', mitigationPlan: 'Arrange generator backup and identify critical-power stalls.' },
        { title: 'Last-Minute Exhibitor Withdrawal', description: 'Registered teams or companies may cancel their stall participation.', category: 'OPERATIONAL', severity: 'MEDIUM', status: 'IDENTIFIED', impactAnalysis: 'Gaps in floor layout; poor visitor experience.', mitigationPlan: 'Maintain a waitlist of interested exhibitors for last-minute fills.' },
      ];

    } else {
      // Generic / Default fallback
      tasks = [
        { teamId: logisticsId, title: 'Venue Booking & Setup', description: 'Confirm venue availability, obtain necessary permissions, and arrange furniture/equipment.', status: 'TODO', priority: 'CRITICAL', deadline: new Date(eventTime - 20 * dayMs), estimatedHours: 6, riskLevel: 'HIGH', tags: ['Venue', 'Setup'] },
        { teamId: hospId, title: 'Registration & Check-in System', description: 'Set up participant registration form and on-site check-in process.', status: 'TODO', priority: 'HIGH', deadline: new Date(eventTime - 12 * dayMs), estimatedHours: 5, riskLevel: 'LOW', tags: ['Registration'] },
        { teamId: marketingId, title: 'Event Promotion & Announcements', description: 'Design promotional material and publish across all channels.', status: 'TODO', priority: 'MEDIUM', deadline: new Date(eventTime - 18 * dayMs), estimatedHours: 6, riskLevel: 'LOW', tags: ['Marketing'] },
        { teamId: logisticsId, title: 'Logistics & Day-of Coordination', description: 'Prepare run-of-show document, coordinate volunteers, and manage on-ground logistics.', status: 'TODO', priority: 'HIGH', deadline: new Date(eventTime - 5 * dayMs), estimatedHours: 8, riskLevel: 'MEDIUM', tags: ['Logistics'] },
        { teamId: hospId, title: 'Refreshments & Hospitality Arrangement', description: 'Arrange catering, water, and hospitality for attendees.', status: 'TODO', priority: 'MEDIUM', deadline: new Date(eventTime - 7 * dayMs), estimatedHours: 4, riskLevel: 'LOW', tags: ['Catering'] },
        { teamId: marketingId, title: 'Post-Event Report & Feedback Collection', description: 'Collect attendee feedback, compile event report, and share highlights.', status: 'TODO', priority: 'LOW', deadline: new Date(eventTime + 3 * dayMs), estimatedHours: 4, riskLevel: 'LOW', tags: ['Report', 'Feedback'] },
      ];
      riskDefs = [
        { title: 'Venue or Booking Cancellation', description: 'Venue may become unavailable due to double-booking or administrative issues.', category: 'VENUE', severity: 'HIGH', status: 'IDENTIFIED', impactAnalysis: 'Event may need to be postponed or moved.', mitigationPlan: 'Confirm venue 1 week before; identify alternate location.' },
        { title: 'Low Participant Turnout', description: 'Insufficient registrations or walk-in attendance.', category: 'OPERATIONAL', severity: 'MEDIUM', status: 'IDENTIFIED', impactAnalysis: 'Event impact reduced; resources wasted.', mitigationPlan: 'Run reminders 3 days and 1 day before the event; open walk-in spots.' },
      ];
    }

    // Create Tasks
    const createdTasks: any[] = [];
    for (const taskDef of tasks) {
      const task = await prisma.task.create({
        data: {
          eventId,
          teamId: taskDef.teamId,
          title: taskDef.title,
          description: taskDef.description,
          status: taskDef.status,
          priority: taskDef.priority,
          deadline: taskDef.deadline,
          estimatedHours: taskDef.estimatedHours,
          riskLevel: taskDef.riskLevel,
          tags: JSON.stringify(taskDef.tags),
        },
      });
      createdTasks.push(task);
    }

    // Link first two tasks as dependency
    if (createdTasks.length >= 2) {
      await prisma.taskDependency.create({
        data: {
          taskId: createdTasks[1].id,
          dependsOnTaskId: createdTasks[0].id,
          type: 'FINISH_TO_START',
        },
      });
    }

    // Create Risks
    for (const riskDef of riskDefs) {
      await prisma.risk.create({
        data: {
          eventId,
          title: riskDef.title,
          description: riskDef.description,
          category: riskDef.category,
          severity: riskDef.severity,
          status: riskDef.status,
          impactAnalysis: riskDef.impactAnalysis,
          mitigationPlan: riskDef.mitigationPlan,
          affectedTasks: JSON.stringify(createdTasks.slice(0, 2).map((t: any) => t.id)),
        },
      });
    }
  }
}

export const eventsService = new EventsService();
