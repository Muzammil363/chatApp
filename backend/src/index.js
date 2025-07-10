import express from "express"
import authRouter from './routes/auth.js'
import mongoose from "mongoose";
import { User } from "./models/User.js";
import { configDotenv } from "dotenv";
import { authMiddleware } from "./middleware/authMiddleware.js";
import cookieParser from "cookie-parser";
import userRouter from './routes/user.js';
import { connectMongo } from "./connections/mongo.js";
import messageRouter from './routes/Message.js'
import cors from "cors"
import { Server } from "socket.io";
import { socketActions } from "./connections/Socket.js";
configDotenv();


connectMongo();
const app=express();
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(cookieParser());
app.use(cors({
  origin: 'http://localhost:5173', // your frontend origin (update if using a different port)
  credentials: true               // allow sending cookies (important!)
}));

app.use("/api/auth",authRouter);
app.use('/user',userRouter);
app.use('/api/chat',messageRouter);

app.get("/",async (req,res)=>{  
    // no action here 
    // in front end on / route direct request to /api/auth/validate with browser cookie and accessToken 
});

app.get("/protected",authMiddleware,(req,res)=>{
    return res.status(200).json({message:"validated"});
})

const server=app.listen(3000,()=>{
    console.log("backend started on 3000");
});

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", 
    methods: ["GET", "POST"],
    credentials: true
  }
});

io.on("connection",socketActions)