import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"
import { userInitialization } from "../utils/userInit.js"
import { configDotenv } from "dotenv"
import { User } from "../models/User.js"
import { Refresh } from "../models/RefreshToken.js"
import { generateAccessToken, generateRefreshToken } from "../utils/jwt.js"


export const signup = async (req, res) => {
    try {
        const { email, fullName, password } = req.body;

        let fetchedUser = await User.find({ email: email });
        if (fetchedUser.length > 0) {
            return res.status(400).json({ message: "Email already exists" })
        }
        if (!email || !/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
            return res.status(400).json({ message: "Invalid email" });
        }
        if (!fullName) {
            return res.status(400).json({ message: "Full name required" });
        }
        if (!password || password.length < 6) {
            return res.status(400).json({ message: "Password should be atleast 6 characters long" });
        }

        await userInitialization(email, fullName, password);
        const accessToken = generateAccessToken(email);
        const refreshToken = generateRefreshToken(email);
        // await Refresh.insertOne({ refreshToken: refreshToken, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) });

        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        req.user = email; // added req.user object
        res.status(200).json({ message: 'Created new account', accessToken: accessToken });

    } catch (error) {
        res.status(500).json({ message: 'Some error occured on server side' });
        console.log(error)
    }
}

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        let fetchedUser = await User.findOne({ email: email });

        if (fetchedUser != null) {
            // validate password and generate tokens to send
            let result = await bcrypt.compare(password, fetchedUser.password);

            if (result) {
                const accessToken = jwt.sign({ email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: process.env.ACCESS_TOKEN_EXP });
                const refreshToken = jwt.sign({ email }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: process.env.REFRESH_TOKEN_EXP || "7d" });

                // Refresh.insertOne({ refreshToken: refreshToken, expiresAt: Date(Date.now() + 7 * 24 * 60 * 60) })

                res.cookie("refreshToken", refreshToken, {
                    httpOnly: true
                });
                req.user = email;
                return res.status(200).json({ message: "logged in", accessToken: accessToken });
            }
            else {
                return res.status(400).json({ message: "Incorrect Password" });
            }
        }
        else {
            return res.status(400).json({ message: "User Not found" });
        }
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

export const logout = async (req, res) => {
    console.log(req.cookies);
    const token = req.cookies.refreshToken;
    try {
        res.clearCookie("refreshToken", {
            httpOnly: true,
        });
        if (token) {
            jwt.verify(token, process.env.REFRESH_TOKEN_SECRET, async (err, decoded) => {
                if (err) {
                    return res.status(401).json({ message: 'Unauthorized' });
                }
                console.log("decoded email: ",decoded.email);
                const user = await User.findOneAndUpdate(
                    { email: decoded.email },
                    { lastSeen: Date.now() },
                    { new: true }
                )
                console.log(user);
                req.user = null;
                // let result = await Refresh.deleteOne({ refreshToken: token });
                return res.status(200).json({ message: "logged out", user:user});
            }
            )
        }
        else {
            console.log("in else");
            return res.status(200).json({ message: "logged out" });
        }
    } catch (error) {
        return res.status(500).json({ message: "Internal server error" });
    }
}

export const check = (req, res) => {
    const refreshToken = req.cookies.refreshToken;
    const authHeader = req.headers.authorization;
    let accessToken = authHeader && authHeader.split(' ')[1];

    if (!refreshToken) return res.status(401).json({ message: "Unauthorized" });
    if (!accessToken) accessToken = 'notoken';

    try {
        jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
            if (err) {
                // check for validating refresh token
                jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
                    if (err) { // refresh token not valid 
                        return res.status(401).json({ message: "Unauthorized" });
                    }
                    req.user = user.email;
                    let newAccessToken = generateAccessToken(user);
                    return res.status(200).json({ message: "already logged in", accessToken: newAccessToken });
                })
            }
            else {
                req.user = user.email;
                return res.status(200).json({ message: "already logged in", accessToken: accessToken });
            }
        })
    } catch (error) {
        return res.status(500).json({ message: "Internal server error" });
    }
}