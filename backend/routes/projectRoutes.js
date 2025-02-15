import { Router } from "express";
import { body } from "express-validator";
import * as projectController from "../controllers/projectController.js";
import * as authMiddleware from "../middlewares/authMiddleware.js";

const router = Router();

router.post(
  "/create",
  authMiddleware.authUser,
  body("name").notEmpty().withMessage("Name is required"),
  projectController.createProject
);

router.get("/all", authMiddleware.authUser, projectController.getAllProjects);

router.put("/add-user",authMiddleware.authUser,
  body("projectId").isString().withMessage("Project ID is required"),
  body("users").isArray({ min: 1 }).withMessage("Users must be an array of strings").bail().custom((users) => users.every((user) => typeof user === "string")).withMessage("Each user must be a string"),
  projectController.addUserToProject
);

router.get("/all-project/:projectId", authMiddleware.authUser, projectController.getAllUsersInProject);


export default router;
