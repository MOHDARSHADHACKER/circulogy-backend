import { Router } from 'express';
const router = Router();
import * as blog from '../controllers/blogController.js';

// Public: only published posts
router.get('/', blog.listPublished);
router.get('/:slug', blog.getPublishedBySlug);

export default router;
