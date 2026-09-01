const mongoose = require("mongoose");

const connectDB = async() => 
{
    try {
        //const.conn = Stores the resolved connection object returned by Mongoose.
        const conn = await mongoose.connect(process.env.MONGO_URI); //Pauses execution inside connectDB until Mongoose completes its handshake with the MongoDB server
        console.log(`mongoDb connected : ${conn.connection.host} `)//Retrieves the connection string from environment variables (usually loaded via packages like dotenv).
//Logs the hostname of the connected database cluster to verify where the app is connectd.
    } catch(error){

    
console.log(`databse connection error : ${error.message}`);
process.exit(1) ; 

}
};

module.exports =  connectDB ; //importing a helper 
                    //function named connecDB to connect node js to mongodb 