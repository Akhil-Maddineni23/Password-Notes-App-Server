const mongoose = require('mongoose');
const UserModel  = require('./Users');

const SharedNotesSchema = new mongoose.Schema({
    noteID : {
        type : mongoose.Schema.Types.ObjectId,
        ref: "notes",
        required : true
    },
    receiverID : {
        type : mongoose.Schema.Types.ObjectId,
        ref: "users",
        required : true
    },
    expirationDate :{
        type: Date,
        index : {expires: 0},
    },
   
});


// Pre hook to remove the reference from User's receivedNotes array when the shared note is removed
SharedNotesSchema.pre('remove', async function (next) {
    try {
        const sharedNote = this;
        // Remove the reference from the User's receiverdNotes array
        /*
        await UserModel.findByIdAndUpdate(
            { _id: sharedNote.receiverID },
            { $pull: { receivedNotes: sharedNote._id } }
        );
        */
        await UserModel.updateMany({},
            { $pull: { receivedNotes: sharedNote._id } }
        );

        next();
    } catch (error) {
      next(error);
    }
});


const SharedNotesModel = mongoose.model("sharednotes" , SharedNotesSchema);
module.exports = SharedNotesModel;