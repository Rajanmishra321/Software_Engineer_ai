import mongoose from 'mongoose'

const projectSchema = new mongoose.Schema({
    // Names are not globally unique: one user calling a project "todo app"
    // must not stop everyone else from doing the same. Projects are
    // identified by their id, and names are kept as typed.
    name:{
        type: String,
        required: true,
        trim: true
    },
    users:[
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user'
        }
    ],
    fileTree:{
        type: Object,
        default: {}
    }
}, { timestamps: true })

const Project = mongoose.model('project',projectSchema);
export default Project;