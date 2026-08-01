import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import systemUsersRouter from "./system-users";
import screeningPlacesRouter from "./screening-places";
import patientsRouter from "./patients";
import dashboardDrsmsRouter from "./dashboard-drsms";
import visionCentersRouter from "./vision-centers";
import vcReferralsRouter from "./vc-referrals";
import remidioRouter from "./remidio";
import settingsRouter from "./settings";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(systemUsersRouter);
router.use(screeningPlacesRouter);
router.use(patientsRouter);
router.use(dashboardDrsmsRouter);
router.use(visionCentersRouter);
router.use(vcReferralsRouter);
router.use(remidioRouter);
router.use(settingsRouter);

export default router;

