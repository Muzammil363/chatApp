import jwt from "jsonwebtoken";
import { verifyTokenAsync,regenerate } from "../utils/jwt.js";


export const authMiddleware = async (req, res, next) => {
    const token=req.cookies.refreshToken;
    if(!token) {
        return res.status(401).json({message:"Unauthorized"});
    }

    try{
        let decoded=jwt.verify(token,process.env.REFRESH_TOKEN_SECRET);
        req.user=decoded.email;
        next();
    }catch(err) {
        return res.status(400).json({message:"Invalid token"});
    }
};
