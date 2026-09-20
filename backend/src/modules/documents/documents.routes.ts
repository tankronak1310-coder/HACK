import { Router } from 'express';
import { documentsController, uploadMiddleware } from './documents.controller.js';
import { authenticateJwt } from '../../middleware/auth.js';

const router = Router();

router.use(authenticateJwt as any);

// Use multer middleware for file upload route
router.post('/upload', uploadMiddleware as any, documentsController.uploadDocument as any);
router.get('/', documentsController.getDocuments as any);
router.delete('/:id', documentsController.deleteDocument as any);

export default router;
