import express from 'express';
import { createNewMember, getAllMembers, updateMember } from '../controller/NewMemberForm.js';
import { getCompany, getMemberById, addPayment, getReceipts } from '../controller/PaymentSummary.js';
const router = express.Router();

router.post("/Member", createNewMember);
router.get('/getMember', getAllMembers);
router.put('/updateMember/:id', updateMember);

router.get("/getCompany", getCompany);
router.get("/getMemberById/:id", getMemberById);
router.post("/addPayment", addPayment);
router.get("/getReceipts", getReceipts);

export default router;
