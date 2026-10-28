import { Router } from 'express';
const router = Router();
import * as blog from '../controllers/blogController.js';
import { requireAdmin } from '../middleware/auth.js';

// Every route below needs a valid admin session.
router.use(requireAdmin);

// Express 5 dropped inline regex params, so validate :id here.
router.param('id', (req, res, next, id) => {
  if (!/^\d+$/.test(id)) return res.status(404).json({ message: 'Blog post not found.' });
  next();
});

router.get('/', blog.listAll);
router.post('/', blog.create);
router.get('/:id', blog.getById);
router.put('/:id', blog.update);
router.delete('/:id', blog.remove);

export default router;
