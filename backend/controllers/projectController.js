import { validationResult } from "express-validator";
import userModel from "../models/userModel.js";
import * as projectService from "../services/projectService.js";

export const createProject = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name } = req.body;
    const loggedInUser = await userModel.findOne({ email: req.user.email });
    const userId = loggedInUser._id;
    const newProject = await projectService.createProject({ name, userId });
    res.status(201).json(newProject);
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: error.message });
  }
};


export const getAllProjects = async (req, res) => {
  try {
    const loggedInUser = await userModel.findOne({ email: req.user.email });
    console.log(loggedInUser);
    const userId = loggedInUser._id;
    console.log(userId);
    const projects = await projectService.getAllProjects(userId);
    res.status(200).json(projects);
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: error.message });
  }
}


export const addUserToProject = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { projectId, users } = req.body;
    const loggedInUser = await userModel.findOne({ email: req.user.email });
    const userId = loggedInUser._id;
    const updatedProject = await projectService.addUserToProject({ projectId, users, userId });
    res.status(200).json(updatedProject);
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: error.message });
  }
}



export const getAllUsersInProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const users = await projectService.getAllUsersInProject({ projectId});
    res.status(200).json(users);
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: error.message });
  }
}


export const updateFileTree = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { projectId, fileTree } = req.body;
    const updatedProject = await projectService.updateFileTree({ projectId, fileTree });
    res.status(200).json(updatedProject);
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: error.message });
  }
}