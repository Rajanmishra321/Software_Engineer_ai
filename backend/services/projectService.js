import mongoose, { mongo } from "mongoose";
import projectModel from "../models/projectModel.js";

export const createProject = async ({ name, userId }) => {
  if (!name) {
    throw new Error("Name is required");
  }
  if (!userId) {
    throw new Error("User id is required");
  }
  const project = await projectModel.create({ name, users: [userId] });
  return project;
};

export const getAllProjects = async (userId) => {
  if (!userId) {
    throw new Error("User id is required");
  }
  // Collaborator emails come along so the project list can show who's on
  // each project without a request per card.
  const projects = await projectModel
    .find({ users: userId })
    .populate("users", "email")
    .sort({ updatedAt: -1 });
  return projects;
};

/**
 * Returns the project when `userId` is one of its collaborators, otherwise
 * throws. Used wherever a route must not expose another team's project.
 */
export const getProjectForUser = async ({ projectId, userId }) => {
  if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
    throw new Error("Invalid project id");
  }
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user id");
  }

  const project = await projectModel.findOne({ _id: projectId, users: userId });
  if (!project) {
    throw new Error("User not authorized for this project");
  }

  return project;
};

export const addUserToProject = async ({ projectId, users, userId }) => {
  if (!projectId) {
    throw new Error("Project id is required");
  }

  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    throw new Error("Invalid project id");
  }

  if (!users || users.length === 0) {
    throw new Error("Users must be an array of strings");
  }

  // Perform check on users if they are valid mongoose objects
  if (
    !Array.isArray(users) ||
    users.some((userId) => !mongoose.Types.ObjectId.isValid(userId))
  ) {
    throw new Error("Invalid userId(s) in users array");
  }

  // Only a collaborator may add more people to the project.
  await getProjectForUser({ projectId, userId });

  const updatedProject = await projectModel.findOneAndUpdate(
    {
      _id: projectId,
    },
    {
      $addToSet: {
        users: {
          $each: users,
        },
      },
    },
    {
      new: true,
    }
  );

  return updatedProject;
};

export const getAllUsersInProject = async ({ projectId }) => {
  if (!projectId) {
    throw new Error("Project id is required");
  }

  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    throw new Error("Invalid project id");
  }

  // The previous catch block called `res`, which doesn't exist in a
  // service, so every failure turned into a ReferenceError.
  const project = await projectModel.findOne({ _id: projectId }).populate("users");
  if (!project) {
    throw new Error("Project not found");
  }

  return project;
};


export const updateFileTree = async ({ projectId, fileTree }) => {
  if (!projectId) {
    throw new Error("Project id is required");
  }

  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    throw new Error("Invalid project id");
  }

  if (!fileTree) {
    throw new Error("File tree is required");
  }

  const updatedProject = await projectModel.findOneAndUpdate(
    { _id: projectId },
    { fileTree },
    { new: true }
  );

  return updatedProject;
}
