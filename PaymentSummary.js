import { poolPromise, sql } from '../db.js';

export const getCompany = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT MembershipID, CompanyName FROM Members');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).send(err.message);
    }
};


export const getMemberById = async (req, res) => {
    const id = req.params.id;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('MembershipID', sql.Int, id)
            .query(`
                SELECT MembershipID, MemberName, CompanyName, ContactNumber, Email, MemberSince 
                FROM Members 
                WHERE MembershipID = @MembershipID
            `);
        res.json(result.recordset[0]);
    } catch (err) {
        res.status(500).send(err.message);
    }
};


export const addPayment = async (req, res) => {
    const {
        MembershipID,
        PaymentYear,
        AmountPaid,
        DueAmount,
        TotalAmount,
        ReceiptNumber,

        ChequeNumber,
        ChequeReceiveOn,
        BankName,
        PaymentType // ✅ Make sure this is included in the destructuring
    } = req.body;

    try {
        const pool = await poolPromise;

        const query = `
            INSERT INTO YearlyPaymentSummary (
                MembershipID,
                PaymentYear,
                TotalAmount,
                AmountPaid,
                DueAmount,
                ReceiptNumber,
               
                ChequeNumber,
                ChequeReceiveOn,
                BankName,
                PaymentType
            )
            VALUES (
                @MembershipID,
                @PaymentYear,
                @TotalAmount,
                @AmountPaid,
                @DueAmount,
                @ReceiptNumber,
                @ChequeNumber,
                @ChequeReceiveOn,
                @BankName,
                @PaymentType
            )
        `;

        await pool.request()
            .input('MembershipID', sql.Int, MembershipID)
            .input('PaymentYear', sql.VarChar, PaymentYear)
            .input('TotalAmount', sql.Decimal(10, 2), TotalAmount)
            .input('AmountPaid', sql.Decimal(10, 2), AmountPaid)
            .input('DueAmount', sql.Decimal(10, 2), DueAmount)
            .input('ReceiptNumber', sql.VarChar(100), ReceiptNumber)
            // .input('ReceiptDate', sql.Date, ReceiptDate)
            .input('ChequeNumber', sql.VarChar(100), ChequeNumber)
            .input('ChequeReceiveOn', sql.Date, ChequeReceiveOn)
            .input('BankName', sql.VarChar(100), BankName)
            .input('PaymentType', sql.VarChar(50), PaymentType)
            .query(query);

        res.status(200).json({ message: "✅ Payment saved successfully." });

    } catch (err) {
        console.error("❌ Payment insert failed:", err.message);
        res.status(500).json({ error: "Failed to save payment." });
    }
};

export const getReceipts = async (req, res) => {
    try {
        const pool = await poolPromise;

        const result = await pool.request().query(`
            SELECT 
                yps.ReceiptNumber,
                yps.ReceiptDate,
                m.CompanyName,
                yps.ChequeReceiveOn AS DateOfReceiving,
                yps.AmountPaid AS ReceivedAmount,
                yps.ChequeNumber,
                yps.BankName,
                yps.PaymentYear,
                yps.PaymentType
            FROM 
                YearlyPaymentSummary yps
            JOIN 
                Members m ON yps.MembershipID = m.MembershipID
            ORDER BY yps.ReceiptDate DESC
        `);

        res.status(200).json(result.recordset);

    } catch (err) {
        console.error("Error fetching receipts:", err.message);
        res.status(500).json({ error: "Failed to fetch receipts" });
    }
};






