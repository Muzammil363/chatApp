import mongoose from "mongoose";

const RequestSchema = new mongoose.Schema({
    user: {
        type: String,
        required: true
    },
    sentBy: {
        type:String,
        required:true
    }
});

RequestSchema.index({user:1});
RequestSchema.index({sentBy:1});
export const Request=mongoose.model("Request",RequestSchema);
