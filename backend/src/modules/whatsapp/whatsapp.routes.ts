import { Router } from 'express';
import { whatsappController } from './whatsapp.controller.js';
import { authenticateJwt } from '../../middleware/auth.js';

const router = Router();

router.use(authenticateJwt as any);

router.get('/status', whatsappController.getStatus as any);
router.post('/connect', whatsappController.connect as any);
router.post('/disconnect', whatsappController.disconnect as any);
router.post('/send-direct', whatsappController.sendDirect as any);
router.post('/send-broadcast', whatsappController.sendBroadcast as any);

export default router;
