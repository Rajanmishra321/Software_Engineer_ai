import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from 'jsonwebtoken'

const userSchema = new mongoose.Schema({
    email:{
        type: String,
        required: true,
        unique: true,
        losercase: true,
        minLength:[6,'Email must be at least 6 characters long'],
        maxLength:[50,'Email must be at most 50 characters long']
    },
    password:{
        type: String,
        required: true,
        minLength:[6,'Password must be at least 6 characters long'],
        select:false
    }
})

userSchema.statics.hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
}

userSchema.methods.isValidPassword = async function(newPassword){
    try{
        return await bcrypt.compare(newPassword,this.password);
    }catch(err){
        throw new Error(err);
    }
}

userSchema.methods.generateJWT = function(){
    return jwt.sign({email:this.email},process.env.JWT_SECRET_KEY,{expiresIn:'24h'});
}

const User = mongoose.model('user',userSchema);

export default User;