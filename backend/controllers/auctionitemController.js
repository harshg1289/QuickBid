import {Auction} from "../models/auctionschema.js";
import {User} from "../models/userSchema.js";
import { catchAsyncErrors } from "../middleware/catchAsyncErrors.js";
import ErrorHandler from "../middleware/error.js";
import {v2 as cloudinary} from "cloudinary";
import { mongoose } from "mongoose";
import {Bid} from"../models/bidSchema.js";

export const addNewAuctionItem=catchAsyncErrors(async(req,res,next)=>{
    if(!req.files || Object.keys(req.files).length===0){
        
        return next(new ErrorHandler("Auction item image required.",400))
    }

    const {image}=req.files;
    const allowedFormats=["image/png","image/jpeg","image/webp"];
    if(!allowedFormats.includes(image.mimetype)){
        return next(new ErrorHandler("File format not supported",400));
    }
    const{title,description,category,condition,startingBid,startTime,endTime}=req.body;
    if(
        !title || !description || !category || !condition || !startingBid || !startTime || !endTime
    )
    {
        return next(new ErrorHandler("Please fill full form.",400));
    }
    if(new Date(startTime)<Date.now()){
        return next(new ErrorHandler("Start time must be greater than present time.",400));
    }
    if(new Date(startTime)>=new Date(endTime)){
        return next(new ErrorHandler("Start time must be less than ending time.",400));
    }
    const alreadyOneAuctionActive= await Auction.find({
        createdBy:req.user._id,
        endTime:{$gt:Date.now()},
    });
    if(alreadyOneAuctionActive.length>0){
        return next(new ErrorHandler("You can only create one auction at a time ",400));
    }
    try{
        const cloudinaryResponse=await cloudinary.uploader.upload(image.tempFilePath,{
        folder:"MERN_AUCTION_PLATFORM_AUCTIONS",
    }
);
if(!cloudinaryResponse || cloudinaryResponse.error){
    console.error(
        "cloudinary error:",
        cloudinaryResponse.error||"unknown cloudinary error."
    );
    return next(new ErrorHandler("Failed to upload auction image to cloudinary.",500)
);
}
const auctionItem=await Auction.create({
    title,
    description,
    category,
    condition,
    startingBid,
    startTime,
    endTime,
image:{
    public_id:cloudinaryResponse.public_id,
    url:cloudinaryResponse.secure_url,
},
createdBy:req.user._id,
});
return res.status(201).json({
    success:true,
    message:`Auction item created successfully and will be listed on auction page at ${startTime}`,
    auctionItem,
    });
    }catch(error){
        return next(new ErrorHandler(error.message || "Failed to create auction item.", 500));
    }

});


export const getAllItems=catchAsyncErrors(async(req,res,next)=>{
    let items=await Auction.find();
    res.status(200).json({
        success:true,
        items,
    });
});
export const getMyAuctionItems=catchAsyncErrors(async(req,res,next)=>{
   
    const items=await Auction.find({createdBy:req.user._id});
    res.status(200).json({
        success:true,
        items,
    });
});
    
export const getauctionDetails=catchAsyncErrors(async(req,res,next)=>{
    const {id}=req.params;
    if(!mongoose.Types.ObjectId.isValid(id)){
        return next(new ErrorHandler("Invalid auction item id.",400));
    }
    const auctionItem=await Auction.findById(id);
    if(!auctionItem){
        return next(new ErrorHandler("Auction item not found.",404));
    }
    const bidders = auctionItem.bids.sort((a,b)=>b.bid-a.bid);
    res.status(200).json({
        success:true,
        auctionItem,
        bidders,
    });
});
export const removeFromAuction=catchAsyncErrors(async(req,res,next)=>{
    const {id}=req.params;
    if(!mongoose.Types.ObjectId.isValid(id)){
        return next(new ErrorHandler("Invalid auction item id.",400));
    }
    const auctionItem=await Auction.findById(id);
    if(!auctionItem){
        return next(new ErrorHandler("Auction item not found.",404));
    }
    await auctionItem.deleteOne();
    res.status(200).json({
        success:true,
        message:"Auction item removed successfully.",
    });
});
export const republishItem = catchAsyncErrors(async (req, res, next) => {
    const { id } = req.params;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return next(new ErrorHandler("Invalid auction item id.", 400));
    }
    
    // Find the auction item
    let auctionItem = await Auction.findById(id);
    if (!auctionItem) {
        return next(new ErrorHandler("Auction item not found.", 404));
    }
    
    // Check if user owns this auction
    if (auctionItem.createdBy.toString() !== req.user._id.toString()) {
        return next(new ErrorHandler("You are not authorized to republish this auction.", 403));
    }
    
    // Validate required fields
    if (!req.body.startTime || !req.body.endTime) {
        return next(new ErrorHandler("Please provide start time and end time to republish the item.", 400));
    }
    
    // Check if auction has ended
    if (new Date(auctionItem.endTime) > Date.now()) {
        return next(new ErrorHandler("You can republish the item only after the auction ends.", 400));
    }
    
    // Validate timing
    let data = {
        startTime: new Date(req.body.startTime),
        endTime: new Date(req.body.endTime),
    };
    
    if (data.startTime < Date.now()) {
        return next(new ErrorHandler("Auction starting time must be greater than present time.", 400));
    }
    
    if (data.startTime >= data.endTime) {
        return next(new ErrorHandler("Auction starting time must be less than ending time.", 400));
    }
    
    // Handle previous highest bidder if exists
    if (auctionItem.highestBidder) {
        const highestBidder = await User.findById(auctionItem.highestBidder);
        if (highestBidder) {
            // Reset bidder's stats to 0 (they lose their win when auction is republished)
            highestBidder.moneySpent = Math.max(0, highestBidder.moneySpent - auctionItem.currentBid);
            highestBidder.auctionsWon = Math.max(0, highestBidder.auctionsWon - 1);
            await highestBidder.save();
        }
    }
    
    // Reset auction data
    data.bids = [];
    data.commissionCalculated = false;
    data.currentBid = 0;
    data.highestBidder = null;
    
    // Update the auction item (FIXED: using correct ID)
    auctionItem = await Auction.findByIdAndUpdate(
        id, // Use auction ID, not user ID
        data,
        { new: true, runValidators: true, useFindAndModify: false }
    );
    
    // Delete all previous bids
    await Bid.deleteMany({ auctionItem: auctionItem._id });
    
    // Reset user's unpaid commission
    const createdBy = await User.findByIdAndUpdate(
        req.user._id,
        { unpaidCommission: 0 },
        { new: true, runValidators: false, useFindAndModify: false }
    );
    
    res.status(200).json({
        success: true,
        auctionItem,
        message: `Auction item republished and will be active on ${req.body.startTime}`,
        createdBy,
    });
});