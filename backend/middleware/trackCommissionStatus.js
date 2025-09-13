import {User} from "../models/userSchema.js";
import  {catchAsyncErrors} from "../middleware/catchAsyncErrors.js";
import ErrorHandler from"../middleware/error.js";

export const trackCommissionStatus=catchAsyncErrors(async(req,res,next)=>{
    const user=await User.findById(req.user._id);
    if(user.unpaidCommission>0){
        return next(new ErrorHandler(
            `You have unpaid commission. Please clear it to proceed.`,
            403
        ));
    }
    next();
});