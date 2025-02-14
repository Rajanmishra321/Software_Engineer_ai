import {Router} from 'express';
import {body} from 'express-validator';
import * as projectController from '../controllers/projectController.js';
import * as authMiddleware from '../middlewares/authMiddleware.js';

const router = Router()

router.post('/create',authMiddleware.authUser,
    body('name').notEmpty().withMessage('Name is required'),
    projectController.createProject
)

export default router;