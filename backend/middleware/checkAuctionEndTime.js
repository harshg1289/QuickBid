import { mongoose } from "mongoose";
import { catchAsyncErrors } from "./catchAsyncErrors.js"
import ErrorHandler from"./error.js";
import {Auction} from "../models/auctionschema.js";
export const checkAuctionEndTime=catchAsyncErrors(async(req,res,next)=>{
    const{id}=req.params;
    if(!mongoose.Types.ObjectId.isValid(id)){
        return next(new ErrorHandler("Invalid auction item id.",400));
    }
    const auction=await Auction.findById(id);
    if(!auction){
        return next(new ErrorHandler("Auction item not found.",404));
    }
    const now=new Date();
    if(new Date(auction.startTime)>now){
        return next(new ErrorHandler("Auction has not started yet.",400));
    }
    if(new Date(auction.endTime)<now){
        return next(new ErrorHandler("Auction has already ended.",400));
    }
    next();
});