import bcrypt from "bcrypt"

import { User } from "../models/User.js"
import { Refresh } from '../models/RefreshToken.js'
import { Contacts } from "../models/Contacts.js"
import { Request } from "../models/Requests.js"

export const userInitialization = async (email, fullName, password) => {
    

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
        email,
        fullName,
        password: hashedPassword,
        status:"online"
    });
    console.log("saving user");
    user.save();
}

