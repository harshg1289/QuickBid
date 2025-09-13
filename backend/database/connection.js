import mongoose from "mongoose";
export const connection =()=>{
    mongoose.connect(process.env.MONGO_URL,{
        dbname: "MERN_AUCTION_PLATFORM"
    }).then(()=>{
        console.log(`Connected to database`);
    }).catch(err=>{
        console.log(`some error occured while connecting to database: $(err) `);
    });
};