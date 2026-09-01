const mongoose = requie("mongoose");
const bcrypt = require("bcryptjs");//used to hash and salt passwords securely (basically hide)


//schema for users
const userSchema = new mongoose.Schema(
{
    name : {
        type : string ,
        required : [true , 'please provide your name'], 
        trim : true ,

    },

    email : {
        type: string ,
        required : [true , 'enter your email id'],
        unique : true , 
        lowercase : true , 
        trim : true ,
    },

    password : {
        type : string , 
        required : [true , 'please enter your password'],
        minlenght : 6 ,
        select : false , //prevents password to get leaked in quewries 

    },

    phone :  {
        type : string , 
        required : [true , 'please enter your phone number'],
        unique : true ,


    },
},
    { timestamps: true }
);


//mongoose hook
//a lifecycle hook that runs rightbefore the user saves and uploads the documents
userSchema.pre('save' ,async function (next)  {


    if(!this.isModified('password'))return next() ; //checks if the password is modified or not
    const salt = await bycrypt.genSalt(10);//if it is modified then salt it by a factor of 10 
    this.password = await bycrypt.hash(this.passwrod , salt);//after salting hash the salted passqwrod 
    next () ;

});













//custom instance method for matching password 
userSchema.methods.matchPassword = async function (enteredpassword)
{
    return await bcrypt.compare(enteredpassword ,this.password);
};


module.exports = mongoose.model('User', userSchema);

    
    



    





