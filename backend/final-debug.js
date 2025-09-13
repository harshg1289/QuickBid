// final-debug.js
import { config } from "dotenv";
import mongoose from "mongoose";
import { Auction } from "./models/auctionschema.js";
import { Bid } from "./models/bidSchema.js";
import { User } from "./models/userSchema.js";
import { sendEmail } from "./utils/sendEmail.js";

config({ path: "./config/config.env" });

const finalDebug = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log("✅ Connected to:", mongoose.connection.name);

    // Find the auction
    const auction = await Auction.findOne({ title: "PS5 controller" });
    console.log("Auction found:", auction ? "YES" : "NO");
    console.log("End time:", auction?.endTime);
    console.log("Current time:", new Date());
    console.log("Is ended:", auction?.endTime < new Date());

    if (auction) {
      // Find highest bid
      const highestBid = await Bid.findOne({ auctionItem: auction._id }).sort({ amount: -1 });
      console.log("Highest bid:", highestBid?.amount, "by", highestBid?.bidder?.userName);

      if (highestBid) {
        // Get bidder details
        const bidder = await User.findById(highestBid.bidder.id);
        console.log("Bidder email:", bidder?.email);

        if (bidder?.email) {
          // Try sending test email
          console.log("Sending test email...");
          await sendEmail({
            email: bidder.email,
            subject: "Test - Your auction won!",
            message: "This is a test email. If you receive this, email functionality works!"
          });
          console.log("✅ EMAIL SENT SUCCESSFULLY!");
        }
      }
    }

  } catch (error) {
    console.log("❌ Error:", error.message);
  } finally {
    mongoose.disconnect();
  }
};

finalDebug();