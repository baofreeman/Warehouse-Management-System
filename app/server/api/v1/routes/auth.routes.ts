import { Router } from "express";
import AuthController from "../controllers/auth.controller";

const router = Router();

router.route("/register").post(AuthController.registerEnterprise);
router.route("/verify-email/:token").post(AuthController.verifyEmail);
router.route("/login").post(AuthController.login);
router.route("/refresh-token").post(AuthController.refreshToken);

router.route("/google").get(AuthController.googleLogin);
router.route("/google/callback").get(AuthController.googleCallback);

router.route("/facebook").get(AuthController.facebookLogin);
router.route("/facebook/callback").get(AuthController.facebookCallback);

export default router;
