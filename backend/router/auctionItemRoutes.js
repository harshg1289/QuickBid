import {  getMyAuctionItems,getAllItems,removeFromAuction,addNewAuctionItem, getauctionDetails, republishItem } from "../controllers/auctionitemController.js";
import { isAuthenticated, isAuthorized  } from "../middleware/auth.js";
import express from "express";
import { trackCommissionStatus } from "../middleware/trackCommissionStatus.js";
const router=express.Router();


router .post("/create",isAuthenticated,isAuthorized("Auctioneer"),trackCommissionStatus,addNewAuctionItem);
router.get("/myitems",isAuthenticated,isAuthorized("Auctioneer"),getMyAuctionItems);
router.get("/allitems",getAllItems);
router.get("/auction/:id",isAuthenticated,getauctionDetails);
router.delete("/delete/:id",isAuthenticated,isAuthorized("Auctioneer"),removeFromAuction);
router.put("/item/republish/:id",isAuthenticated,isAuthorized("Auctioneer"),republishItem);
export default router;