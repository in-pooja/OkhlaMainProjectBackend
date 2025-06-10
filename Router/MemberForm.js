// import express from 'express';
// import { createNewMember, getAllMembers, updateMember } from '../controller/NewMemberForm.js';
// import { getCompany, getMemberById, addPayment, getReceipts, login,getYearlySummary,DeshboardData} from '../controller/PaymentSummary.js';
// import { getCompanies,getYears,getDashboardData, getDashboardMultiYearData}from'../controller/Deshboard.js';
// const router = express.Router();

// router.post("/Member", createNewMember);
// router.get('/getMember', getAllMembers);
// router.put('/updateMember/:id', updateMember);

// router.get("/getCompany", getCompany);
// router.get("/getMemberById/:id", getMemberById);
// router.post("/addPayment", addPayment);
// router.get("/getReceipts", getReceipts);
// router.post('/login', login);
// router.get('/getYearlySummary',getYearlySummary)
// router.get('/companies', getCompanies);

// router.get('/payment-years', getYears);
// router.post('/dashboard-data', getDashboardData);

// router.post('/dashboard-multiyear', getDashboardMultiYearData);
// r
// export default router;
import express from 'express';
import { createNewMember, getAllMembers, updateMember } from '../controller/NewMemberForm.js';
import { getCompany, getMemberById, addPayment, getReceipts, getRegistrationFee, getSummaryByCompanyYear,ExtraDetail, getMemberAndPaymentSummaryById, getAllOtherPayments, getMemberAndPaymentById, addYear, getYear, getYearlySummary } from '../controller/PaymentSummary.js';
import { signup,login } from '../controller/login.js';
import { getAnnualPayments, insertAnnualPayments, addNewYearAndInsertForAllMember, getYearRange, updateAnnualPayment, ReceiptOfPayment, getReceiptOfPayment, YearlyPaymentList } from '../controller/AnnualTable.js';
 import { getCompanies,getYears,getDashboardData, getDashboardMultiYearData,getOtherPayments}from'../controller/Deshboard.js';
import { importExcelToDB } from "../helper/ImportExcelToDB.js";
import multer from 'multer';

const router = express.Router();

router.post("/Member", createNewMember);
router.get('/getMember', getAllMembers);
router.put('/updateMember/:id', updateMember);

router.get("/getCompany", getCompany);
router.get("/getMemberById/:id", getMemberById);
router.post("/addPayment", addPayment);
router.get("/getReceipts", getReceipts);
router.post("/signup", signup);

router.post("/login", login);
router.get("/DuePayment", getSummaryByCompanyYear);
router.get('/getMemberAndPaymentSummaryById/:id/:year', getMemberAndPaymentById);
router.post('/addYear', addYear);
router.get('/getYear', getYear);
router.post('/ExtraDetail', ExtraDetail);
router.get('/getAllOtherPayments', getAllOtherPayments);
router.get('/getYearlySummary', getYearlySummary);
router.get('/getAnnualPayments', getAnnualPayments);
router.post('/insertAnnualPayments', insertAnnualPayments);
router.get('/getYearRange', getYearRange);
router.put('/updateAnnualPayment', updateAnnualPayment);
router.post('/ReceiptOfPayment', ReceiptOfPayment);
router.get('/getReceiptOfPayment', getReceiptOfPayment);
router.get('/getRegistrationFee/:id', getRegistrationFee);
router.get('/YearlyPaymentList', YearlyPaymentList);
router.post('/addNewYearAndInsertForAllMember', addNewYearAndInsertForAllMember);
router.get('/companies', getCompanies);
router.get('/payment-years', getYears);
router.post('/dashboard-data', getDashboardData);
router.post('/dashboard-multiyear', getDashboardMultiYearData);
router.get('/other-payments',getOtherPayments)

router.get('/payment-years', getYears);
router.post('/dashboard-data', getDashboardData);
router.post('/dashboard-multiyear', getDashboardMultiYearData);
router.get('/other-payments',getOtherPayments)

// router.get('/getMemberAndPaymentSummaryById/:id/:year', getMemberAndPaymentSummaryById)
// router.get('/getMemberAndPaymentSummaryById/:id/:year', getMemberAndPaymentSummaryById);


const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

router.post('/upload-members-excel', upload.single('excelFile'), async (req, res) => {
    const result = await importExcelToDB(req.file.path);

    if (result.success) {
        res.status(200).json({ message: result.message });
    } else {
        res.status(500).json({ message: result.message, error: result.error });
    }
});


export default router;
