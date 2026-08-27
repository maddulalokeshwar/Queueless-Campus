import exp from "express";
import jwt from "jsonwebtoken";
import { hash, compare } from "bcryptjs";
import { userModel } from "../models/User.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
const { sign } = jwt;
export const authApp = exp.Router();

//Register
authApp.post("/register", async (req, res) => {
  try {
    //get user details from req body
    const { name, email, phone, password, role } = req.body;
    //check if email already used
    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }
    //hash password
    const hashedPassword = await hash(password, 10);
    //create user document
    const newUser = new userModel({
      name,
      email,
      phone,
      password: hashedPassword,
      role,
    });
    //save
    await newUser.save();
    //send res
    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//Login
authApp.post("/login", async (req, res) => {
  try {
    //get creds from req
    const { email, password } = req.body;
    //find user by email
    const user = await userModel.findOne({ email });
    //if user not found
    if (!user) {
      return res.status(400).json({ message: "Invalid email" });
    }
    //compare password
    const isMatched = await compare(password, user.password);
    //if password isn't matched
    if (!isMatched) {
      return res.status(400).json({ message: "Invalid password" });
    }
    //create jwt
    const token = sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );
    //set token as cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    });
    //remove password before sending back
    const userObj = user.toObject();
    delete userObj.password;
    //send res
    res
      .status(200)
      .json({ message: "Login success", token, payload: userObj });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//Get logged-in user
authApp.get("/me", authMiddleware, async (req, res) => {
  try {
    //get user id from decoded token
    const userId = req.user?.id;
    //find user, exclude password
    const user = await userModel.findById(userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    //send res
    res.status(200).json({ message: "User fetched", payload: user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
