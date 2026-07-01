import {searchUsersExceptMe,getMyFriends} from "../controllers/userControllers.js"

import express from "express"

const router=express.Router()

router.post("/search",searchUsersExceptMe);
router.get("friends",getMyFriends);

export default router
