import cloudinary from '../connections/cloudinary.js'
import { User } from '../models/User.js';
import { Contacts } from '../models/Contacts.js'
import { Request } from '../models/Requests.js';

export const profile = async (req, res) => {
    console.log("req.user: ", req.user); // email

    let user = await User.findOne({ email: req.user }).select('email fullName profilePic');

    if (user) {
        return res.status(200).json({ profile: user, message: "Fetched Profile" });
    }
    return res.status(404).json({ message: "User not found" });
}

export const updateProfile = async (req, res) => {
    const { fullName, profilePic } = req.body;

    if (fullName) {
        try {
            console.log("req.user: ", req.user);
            let updatedUser = await User.findOneAndUpdate({ email: req.user }, { fullName: fullName }, { new: true });
            console.log("updated user");
            return res.status(200).json({ message: "Profile updated successfully" });
        } catch (err) {
            return res.status(500).json({ message: "error in updating fullName" })
        }
    }

    if (profilePic) {
        try {
            console.log("req.user in profile update: ", req.user);
            let response = await cloudinary.uploader.upload(profilePic);
            let updatedUser = await User.findOneAndUpdate(
                { email: req.user },
                { profilePic: response.secure_url },
                { new: true }
            );
            return res.status(200).json({ messsage: "updated profile successfully" });
        } catch (error) {
            console.log("error in updateProfile: ", error);
            return res.status(500).json({ message: "Error in updating profile" });
        }
    }
}

export const getContacts = async (req, res) => {
    try {
        const loggedUser = await User.findOne({ email: req.user });
        if(!loggedUser) return res.status(404).json({message:"user not found"});
        console.log("fetching contacts for: ", loggedUser.email);
        const contacts = await Contacts.find({ user: loggedUser._id }).populate({
            path: 'contacts',
            select: 'email fullName profilePic'
        })

        if (!contacts || contacts.length<=0) {
            return res.status(200).json({ contacts: [] });
        }

        return res.status(200).json({ contacts: contacts[0].contacts });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "sever side error while fetching contacts" });
    }
}

export const fetchFor = async (req, res) => {
    let result = [];
    try {
        const findBy = req.params.id;
        result = await User.find({ $or: [{ fullName: findBy }, { email: findBy }] }).select('email fullName profilePic');
        console.log("result: ",result);
        return res.status(200).json({ result: result });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server side error while fetching for" })
    }
};

export const fetchRequests = async (req, res) => {
    const loggedIn = req.user;
    try {
        console.log("fetching requests for :", loggedIn);
        let req = await Request.find({ user: loggedIn }).populate({
            path: 'requests',
            select: 'email fullName profilePic'
        });
        if(req.length==0) {
            return res.status(200).json({requests:[]});
        }
        console.log("in fetch requests: ",req[0].requests);
        return res.status(200).json({ requests: req[0].requests });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Sever side error while finding request" })
    }
}

export const sendRequest = async (req, res) => {
    const loggedIn = req.user;
    const sendTo = req.body.email
    try {
        let currentUser = await User.findOne({ email: loggedIn })
        let user = await User.findOne({ email: sendTo }); // to user
        // check this user
        if (user) {
            // in request receiver's record add this current user's request 
            console.log("Sending request from " + currentUser.email + " to " + sendTo);
            let updated = await Request.updateOne(
                { user: sendTo },
                { $push: { requests: currentUser._id } },
                { upsert: true }
            )
            return res.status(200).json({ message: "Request sent successfully", updated: updated });
        }
        else {
            return res.status(404).json({ message: "User not found!" });
        }

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Sever side error while sending request" })
    }
}

export const acceptRequest = async (req, res) => {
    try {
        const loggedIn = req.user; // email
        const acceptFor = req.params.id; // email

        // add acceptFor in contacts list of loggedIn user and 
        // add loggedIn in contacts list for acceptFor user

        let acceptForUser = await User.findOne({ email: acceptFor });
        let loggedUser = await User.findOne({ email: loggedIn });

        let action1 = await Contacts.updateOne(
            { user: loggedUser._id },
            { $push: { contacts: acceptForUser._id } }
        );

        let action2 = await Contacts.updateOne(
            { user: acceptForUser._id },
            { $push: { contacts: loggedUser._id } }
        )

        return res.status(200).json({ message: "Accepted request successfully" });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server side error while accepting request" })
    }

}

export const deleteRequest = async (req, res) => {
    const loggedIn = req.user;
    const reject = req.params.id;

    try {
        let rejectUser = await User.findOne({ email: reject });
        let updated = await Request.updateOne(
            { user: loggedIn },
            { $pull: { requests: rejectUser._id } }
        )
        console.log("updated: ",updated);
        return res.status(200).json({message:"Declined user request"});
    } catch (error) {
        console.error(error);
        return res.status(500).json({message:"Server side error while declining request"});
    }

}