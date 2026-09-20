import { Router } from 'express';
import { meetingsController } from './meetings.controller.js';
import { authenticateJwt } from '../../middleware/auth.js';

const router = Router();

router.use(authenticateJwt as any);

router.post('/process', meetingsController.processMeeting as any);
router.get('/', meetingsController.getEventMeetings as any);
router.get('/:id', meetingsController.getMeeting as any);
router.put('/:id', meetingsController.updateMeeting as any);
router.patch('/:id', meetingsController.updateMeeting as any);
router.delete('/:id', meetingsController.deleteMeeting as any);
router.post('/convert-item', meetingsController.convertItem as any);
router.post('/:id/convert-all', meetingsController.convertAll as any);

export default router;
