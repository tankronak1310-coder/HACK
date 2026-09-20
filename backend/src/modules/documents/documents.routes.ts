import { Router } from 'express';
import { documentsController } from './documents.controller.js';
import { authenticateJwt } from '../../middleware/auth.js';

const router = Router();

router.use(authenticateJwt as any);

router.post('/upload', documentsController.uploadDocument as any);
router.get('/', documentsController.getDocuments as any);
router.put('/:id', documentsController.updateDocument as any);
router.patch('/:id', documentsController.updateDocument as any);
router.delete('/:id', documentsController.deleteDocument as any);

export default router;
