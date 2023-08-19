const express = require('express');
const NotesModel = require('../models/Notes');
const UserModel  = require('../models/Users.js');
const SharedNotesModel  = require('../models/SharedNotes');
const { verifyToken } = require('./users');

const router = express.Router();


router.post("/" ,  async (req , res) => {
    const { name , password , userID } = req.body;

    const userOwner = userID
    const note = await NotesModel.findOne({userOwner : userID , name : name});
    if(!note){
        const newNote = new NotesModel({
            name , password , userOwner
        });
        const note = await newNote.save();

        //Save the NoteID under the User as well
        const user = await UserModel.findOne({ _id : userID});
        user.savedNotes.push(note._id);
        await UserModel.updateOne({ _id : userID } , user);
        
        return res.json({message : "Note Created Successfully !!"});
    }
    else{
        //console.log("Notes already existed");
        
        //Update the Note
        note.password = password;
        await NotesModel.updateOne({ _id : note._id}, note);
        return res.json({message : "Note updated Successfully in Users !!"});
    }
});

//Get all the user saved Notes
router.get("/:userID" , async(req , res) => {
    const userID = req.params.userID;
    const notes = await NotesModel.find({userOwner : userID});
    return res.json(notes);
})

router.post("/:noteID" , async(req , res) => {
    const noteID = req.params.noteID;
    const newPassword  = req.body.password;

    //Updating the password
    const note = await NotesModel.findOne({ _id : noteID});
    note.password = newPassword
    await NotesModel.updateOne({ _id : noteID}, note);

    return res.json({message : "Password Updated successfully in the Note!!"});
})

router.delete("/:noteID" , async(req , res) => {
    const noteID = req.params.noteID;
    const note = await NotesModel.findByIdAndDelete({_id : noteID});
    
    //Also delete this note from the User as well
    const userID = note.userOwner;
    await UserModel.updateOne({ _id : userID } , { $pull : { savedNotes : noteID}} );

    return res.json({message : "Successfully deleted Note"});
})


// Create a new Note in the sharedNotes schema and set an expiry time 
router.post("/shared/:noteID" , async(req , res) => {
    const noteID = req.params.noteID;
    const receiverID  = req.body.receiverID;
    const expirationDate = new Date();
    expirationDate.setTime(expirationDate.getTime() + 10 * 60 * 1000); //5 minutes

    //First check weather this note has already been shared to this user
    const note = await SharedNotesModel.findOne({ noteId: noteID , recevierID : receiverID});

    if(!note){
        const sharedNote = new SharedNotesModel({
            noteID , receiverID , expirationDate
        })
        const snote = await sharedNote.save();

        //Also update this shared Note in users receiverd Notes Array and also
        //Update isShared variable in Notes Model
        await UserModel.findByIdAndUpdate({_id : receiverID} , { $push : { receivedNotes : snote._id}} );
        await NotesModel.findByIdAndUpdate({_id : noteID} , { isShared : true} );

        res.json({status : true , message : "Note shared successfully"});  
    }else{
        res.json({status : false , message : "This Note has already shared to the following user"});
    } 
})

// All shared notes received by the user
router.get("/received-notes/:userID" , async(req , res) => {
    const userID = req.params.userID;
    const data = await UserModel.findById(userID)
                        .populate({
                            path : "receivedNotes",
                            model : SharedNotesModel,
                            populate : {
                                path : "noteID",
                                model : NotesModel
                            }
                        })
    if(data.receivedNotes){
        return res.json(data.receivedNotes);
    }
    return res.json({message : "Something Fishy !.."});
})

module.exports = router;

