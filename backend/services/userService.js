import User from "../models/userModel.js";


const createUser=async ({email,password})=>{
    if(!email || !password){
        return {error:'email and password are required'}
    }

    const hashedPassword = await User.hashPassword(password);

    const user = User.create({email,password:hashedPassword});
    return user;
}

export default {createUser};