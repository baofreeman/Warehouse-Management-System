import { Router } from "express";
import { checkRole } from "../middlewares/checkRole";
import UserController from "../controllers/user.controller";
import { checkAuth } from "../middlewares/checkAuth";
import { checkSelfOrAdmin } from "../middlewares/checkSelfOrAdmin";

const router = Router();

router.route("/").get(checkAuth, checkRole(["ADMIN"]), UserController.getUsers);
router
  .route("/all-user")
  .get(checkAuth, checkRole(["ADMIN"]), UserController.getUsers);
router
  .route("/:id")
  .get(checkAuth, checkSelfOrAdmin(), UserController.getUserById);
router
  .route("/:id")
  .patch(checkAuth, checkSelfOrAdmin(), UserController.updateUserDetails);
router
  .route("/:id")
  .delete(checkAuth, checkSelfOrAdmin(), UserController.deleteUser);

export default router;
