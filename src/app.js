const express = require("express");
const cors = require("cors");//Imports the Cross-Origin Resource Sharing middleware
const authRoutes = require("./routes/authroutes");

const app = express();

app.use(cors());

app.use(express.json());//parsing incoming json request bodies 

app.use('/api/auth' , authRoutes);

module.exports = app ; 