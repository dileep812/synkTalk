import { searchUsersExceptMe, getMyFriends,updateProfile } from "../controllers/userControllers.js"

import express from "express"

const router = express.Router()

router.post("/search", searchUsersExceptMe);
router.get("/friends", getMyFriends);
router.patch("/update",updateProfile);

export default router
