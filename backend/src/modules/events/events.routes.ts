import { Router } from 'express';
import { eventsController } from './events.controller.js';
import { authenticateJwt } from '../../middleware/auth.js';

const router = Router();

router.use(authenticateJwt as any);

router.post('/', eventsController.createEvent as any);
router.get('/', eventsController.getClubEvents as any);
router.get('/:id', eventsController.getEvent as any);
router.patch('/:id', eventsController.updateEvent as any);
router.put('/:id', eventsController.updateEvent as any);
router.delete('/:id', eventsController.deleteEvent as any);
router.get('/:id/health', eventsController.getHealth as any);

export default router;
