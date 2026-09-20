import { Router } from 'express';
import { announcementsController } from './announcements.controller.js';
import { authenticateJwt } from '../../middleware/auth.js';

const router = Router();

router.use(authenticateJwt as any);

router.get('/', announcementsController.getAnnouncements as any);
router.post('/', announcementsController.createAnnouncement as any);
router.patch('/:id', announcementsController.updateAnnouncement as any);
router.delete('/:id', announcementsController.deleteAnnouncement as any);

export default router;
