import User from "../models/userModel.js";
import * as userService from "../services/userService.js";
import { validationResult } from "express-validator";
import redisClient from "../services/redisService.js";

export const createUserController = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  try {
    const user = await userService.createUser({ email, password });
    const token = user.generateJWT();
    delete user._doc.password;
    res.status(201).json({
      user: {
        email: user.email,
        token,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const loginController = async (req, res) => {
  const error = validationResult(req);

  if (!error.isEmpty()) {
    console.log(error);
    res.status(400).json({ errors: error.array() });
  }

  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    const isValid = await user.isValidPassword(password);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid password" });
    }
    const token = user.generateJWT();
    return res.status(200).json({
      user: {
        email,
        token,
      },
    });
  } catch (error) {
    console.log(error);
  }
};

export const profileController = async (req, res) => {
  console.log(req.user);

  return res.json({
    user: req.user,
  });
};

export const logoutController = async (req, res) => {
  try {
    const token = req.cookies.token || req.headers.authorization.split(" ")[1];
    redisClient.set(token, "logout", "EX", 60 * 60 * 24);
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: error.message });
  }
};


export const getAllUsersController = async (req, res) => {
  try {
    const loggedInUser = await User.findOne({ email: req.user.email });
    const userId = loggedInUser._id;
    const users = await userService.getAllUsers(userId);
    res.status(200).json(users);
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: error.message });
  }
};
