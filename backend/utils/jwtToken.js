export const generateToken = (user,message,statusCode,res) => { 
    const cookieExpireDays = Number(process.env.COOKIE_EXPIRE) || 7;
    const token=user.generateJsonWebToken();
    res.status(statusCode).cookie("token",token,{
        expires:new Date(Date.now()+cookieExpireDays*24*60*60*1000),
        httpOnly:true,
        secure:process.env.NODE_ENV==="Production" ? true : false,
    }).json({
        success:true,
        user,
        token,
        message,

    });
};