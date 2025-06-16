import { poolPromise, sql } from '../db.js';
export const getAnnualPayments = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT 
                ap.MembershipID, 
                m.CompanyName, 
                ap.Year, 
                ap.TotalAmount, 
                ap.AmountPaid, 
                ap.DueAmount
            FROM AnnualPayment ap
            INNER JOIN Members m ON ap.MembershipID = m.MembershipID
        `);

        res.status(200).json(result.recordset);
    } catch (error) {
        console.error('Error fetching AnnualPayments:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const insertAnnualPayments = async (req, res) => {

    try {
        const {
            MemberName,
            CompanyName,
            ContactNumber,
            Email,
            Category,
            MemberSince,
            Address1,
            Address2,
            Area,
            City,
            State
        } = req.body;
        console.log(req.body);

        const pool = await poolPromise;

        // 1. Insert into Members table
        const memberResult = await pool.request()
            .input('MemberName', MemberName)
            .input('CompanyName', CompanyName)
            .input('ContactNumber', ContactNumber)
            .input('Email', Email)
            .input('Category', Category)
            .input('MemberSince', MemberSince)
            .input('Address1', Address1)
            .input('Address2', Address2)
            .input('Area', Area)
            .input('City', City)
            .input('State', State)
            .query(`
        INSERT INTO Members (
          MemberName, CompanyName, ContactNumber, Email, Category,
          RegistrationDate, MemberSince, Address1, Address2, Area, City, State
        )
        OUTPUT INSERTED.MembershipID
        VALUES (
          @MemberName, @CompanyName, @ContactNumber, @Email, @Category,
          GETDATE(), @MemberSince, @Address1, @Address2, @Area, @City, @State
        )
      `);

        const newMemberId = memberResult.recordset[0].MembershipID;

        // 2. Fetch amount from TotalPayments table based on year
        const totalQuery = await pool.request()
            .input('MemberSince', MemberSince)
            .query(`
        SELECT 
          ISNULL(PrinterPayment, 0) AS PrinterPayment,
          ISNULL(ProviderPayment, 0) AS ProviderPayment,
          ISNULL(MachineDealerPayment, 0) AS MachineDealerPayment,
          ISNULL(PublisherPayment, 0) AS PublisherPayment
        FROM TotalPayments
        WHERE YearRange = @MemberSince
      `);

        if (totalQuery.recordset.length === 0) {
            return res.status(400).json({ error: 'No payment settings found for this year' });
        }

        const paymentRow = totalQuery.recordset[0];
        let totalAmount = 0;

        if (Category === 'Printer') totalAmount = paymentRow.PrinterPayment;
        else if (Category === 'Provider') totalAmount = paymentRow.ProviderPayment;
        else if (Category === 'MachineDealer') totalAmount = paymentRow.MachineDealerPayment;
        else if (Category === 'Publisher') totalAmount = paymentRow.PublisherPayment;

        // 3. Insert into AnnualPayment table
        await pool.request()
            .input('MembershipID', newMemberId)
            .input('Year', MemberSince)
            .input('TotalAmount', totalAmount)
            .input('AmountPaid', 0)
            .input('DueAmount', totalAmount)
            .query(`
        INSERT INTO AnnualPayment (MembershipID, Year, TotalAmount, AmountPaid, DueAmount, LastUpdated)
        VALUES (@MembershipID, @Year, @TotalAmount, @AmountPaid, @DueAmount, NULL)
      `);

        res.status(201).json({ message: 'Member added and annual payment initialized ✅' });

    } catch (error) {
        console.error('Insert error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};



export const getYearRange = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
      SELECT DISTINCT YearRange FROM TotalPayments ORDER BY YearRange DESC
    `);

        // Agar sirf latest chahiye to:
        // const latestYear = result.recordset.length > 0 ? result.recordset[0].YearRange : null;

        res.json({ years: result.recordset.map(r => r.YearRange) }); // ["2023-2024", "2022-2023", ...]
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// export const updateAnnualPayment = async (req, res) => {
//     const { MembershipID, PaymentYear, AmountPaid } = req.body;

//     if (!MembershipID || !PaymentYear || isNaN(AmountPaid)) {
//         return res.status(400).json({
//             success: false,
//             message: "Invalid input. MembershipID, PaymentYear, and AmountPaid are required.",
//         });
//     }

//     try {
//         const pool = await poolPromise;

//         // Step 1: Get AnnualFee from TotalPayments using YearRange
//         const totalResult = await pool.request()
//             .input("YearRange", sql.VarChar, PaymentYear)
//             .query(`
//                 SELECT 
//                     ISNULL(PrinterPayment, 0) +
//                     ISNULL(ProviderPayment, 0) +
//                     ISNULL(MachineDealerPayment, 0) +
//                     ISNULL(PublisherPayment, 0) AS AnnualFee
//                 FROM TotalPayments
//                 WHERE YearRange = @YearRange
//             `);

//         if (totalResult.recordset.length === 0) {
//             return res.status(400).json({ success: false, message: "No TotalPayments found for this year." });
//         }

//         const { AnnualFee = 0 } = totalResult.recordset[0];
//         const totalAmount = AnnualFee;

//         if (totalAmount <= 0 || AmountPaid > totalAmount) {
//             return res.status(400).json({ success: false, message: "Invalid Annual Fee or payment amount." });
//         }

//         // Step 2: Check if record exists in AnnualPayment
//         const existing = await pool.request()
//             .input("MembershipID", sql.Int, MembershipID)
//             .input("Year", sql.VarChar, PaymentYear)
//             .query(`
//                 SELECT * FROM AnnualPayment 
//                 WHERE MembershipID = @MembershipID AND Year = @Year
//             `);

//         if (existing.recordset.length > 0) {
//             const row = existing.recordset[0];

//             const prevPaid = row.AmountPaid || 0;
//             const updatedAmountPaid = AmountPaid;
//             const updatedDueAmount = totalAmount - updatedAmountPaid;

//             console.log("Backend DEBUG:");
//             console.log("Total Amount from TotalPayments:", totalAmount);
//             console.log("AmountPaid received from frontend:", AmountPaid);
//             console.log("Final updatedAmountPaid to update:", updatedAmountPaid);
//             console.log("Final updatedDueAmount to update:", updatedDueAmount);



//             if (isNaN(updatedAmountPaid) || isNaN(updatedDueAmount)) {
//                 return res.status(400).json({ success: false, message: "Payment values invalid (NaN)." });
//             }

//             await pool.request()
//                 .input("AmountPaid", sql.Money, updatedAmountPaid)
//                 .input("DueAmount", sql.Money, updatedDueAmount)
//                 .input("TotalAmount", sql.Money, totalAmount)
//                 .input("MembershipID", sql.Int, MembershipID)
//                 .input("Year", sql.VarChar, PaymentYear)
//                 .query(`
//                     UPDATE AnnualPayment
//                     SET AmountPaid = @AmountPaid, DueAmount = @DueAmount, TotalAmount = @TotalAmount
//                     WHERE MembershipID = @MembershipID AND Year = @Year
//                 `);
//         } else {
//             const dueAmount = totalAmount - AmountPaid;

//             if (isNaN(dueAmount)) {
//                 return res.status(400).json({ success: false, message: "Calculated DueAmount is not valid." });
//             }

//             await pool.request()
//                 .input("MembershipID", sql.Int, MembershipID)
//                 .input("Year", sql.VarChar, PaymentYear)
//                 .input("TotalAmount", sql.Money, totalAmount)
//                 .input("AmountPaid", sql.Money, AmountPaid)
//                 .input("DueAmount", sql.Money, dueAmount)
//                 .query(`
//                     INSERT INTO AnnualPayment (MembershipID, Year, TotalAmount, AmountPaid, DueAmount)
//                     VALUES (@MembershipID, @Year, @TotalAmount, @AmountPaid, @DueAmount)
//                 `);
//         }

//         res.status(200).json({ success: true, message: "Annual Payment Summary updated successfully." });

//     } catch (err) {
//         console.error("Error in updateAnnualPayment:", err);
//         res.status(500).json({ success: false, message: "Server error while updating annual payment summary." });
//     }
// };

export const ReceiptOfPayment = async (req, res) => {
    const {
        ReceiptNumber,
        ReceiptDate,
        MembershipID,
        ReceivedAmount,
        PaymentMode,
        PaymentType,
        ChequeNumber,
        BankName,
        PaymentYear
    } = req.body;

    try {
        // Debugging log to check incoming data
        console.log("=== ReceiptOfPayment called ===");
        console.log("ReceiptNumber:", ReceiptNumber);
        console.log("ReceiptDate:", ReceiptDate);
        console.log("MembershipID:", MembershipID);
        console.log("ReceivedAmount:", ReceivedAmount);
        console.log("PaymentMode:", PaymentMode);
        console.log("PaymentType:", PaymentType);
        console.log("ChequeNumber:", ChequeNumber);
        console.log("BankName:", BankName);
        console.log("PaymentYear:", PaymentYear);

        const pool = await poolPromise;

        // Check if MembershipID exists in Members table
        const checkMember = await pool.request()
            .input('MembershipID', sql.Int, MembershipID)
            .query('SELECT MembershipID FROM Members WHERE MembershipID = @MembershipID');

        if (checkMember.recordset.length === 0) {
            return res.status(400).json({ error: "❌ MembershipID not found in Members table." });
        }

        const query = `
            INSERT INTO Receipts (
                ReceiptNumber,
                ReceiptDate,
                MembershipID,
                ReceivedAmount,
                PaymentMode,
                PaymentType,
                ChequeNumber,
                BankName,
                PaymentYear
            ) VALUES (
                @ReceiptNumber,
                @ReceiptDate,
                @MembershipID,
                @ReceivedAmount,
                @PaymentMode,
                @PaymentType,
                @ChequeNumber,
                @BankName,
                @PaymentYear
            )
        `;

        await pool.request()
            .input('ReceiptNumber', sql.VarChar(50), ReceiptNumber)
            .input('ReceiptDate', sql.Date, ReceiptDate)
            .input('MembershipID', sql.Int, MembershipID)
            .input('ReceivedAmount', sql.Decimal(10, 2), ReceivedAmount)
            .input('PaymentMode', sql.VarChar(50), PaymentMode)
            .input('PaymentType', sql.VarChar(50), PaymentType)
            .input('ChequeNumber', sql.VarChar(100), ChequeNumber || null)
            .input('BankName', sql.VarChar(100), BankName || null)
            .input('PaymentYear', sql.VarChar(20), PaymentType === 'Annual' ? PaymentYear : null)
            .query(query);

        res.status(200).json({ message: "✅ Receipt added successfully." });

    } catch (err) {
        console.error("❌ Error adding receipt:", err.message);
        res.status(500).json({ error: "Failed to add receipt." });
    }
};
export const getReceiptOfPayment = async (req, res) => {
    try {
        const pool = await poolPromise;

        const result = await pool.request().query(`
            SELECT 
                r.ReceiptNumber,
                r.ReceiptDate,
                m.CompanyName,
                r.ReceivedAmount,
                r.PaymentMode,
                r.PaymentType,
                r.ChequeNumber,
                r.BankName,
                r.PaymentYear     -- Added this line
            FROM 
                Receipts r
            JOIN 
                Members m ON r.MembershipID = m.MembershipID
            ORDER BY 
                r.ReceiptDate DESC
        `);

        res.status(200).json(result.recordset);

    } catch (err) {
        console.error("❌ Error fetching receipts:", err.message);
        res.status(500).json({ error: "Failed to fetch receipts." });
    }
};


export const updateAnnualPayment = async (req, res) => {
    const { MembershipID, PaymentYear, AmountPaid } = req.body;

    if (!MembershipID || !PaymentYear || isNaN(AmountPaid)) {
        return res.status(400).json({
            success: false,
            message: "Invalid input. MembershipID, PaymentYear, and AmountPaid are required.",
        });
    }

    try {
        const pool = await poolPromise;

        // Check if record exists in AnnualPayment
        const existing = await pool.request()
            .input("MembershipID", sql.Int, MembershipID)
            .input("Year", sql.VarChar, PaymentYear)
            .query(`SELECT * FROM AnnualPayment WHERE MembershipID = @MembershipID AND Year = @Year`);

        if (existing.recordset.length > 0) {
            // ✅ Update existing record
            const row = existing.recordset[0];
            const totalAmount = row.TotalAmount; // ⛔ Don't fetch from TotalPayments again
            const prevPaid = row.AmountPaid || 0;

            const updatedAmountPaid = AmountPaid;
            const updatedDueAmount = totalAmount - updatedAmountPaid;

            if (isNaN(updatedAmountPaid) || isNaN(updatedDueAmount)) {
                return res.status(400).json({ success: false, message: "Payment values invalid (NaN)." });
            }

            await pool.request()
                .input("AmountPaid", sql.Money, updatedAmountPaid)
                .input("DueAmount", sql.Money, updatedDueAmount)
                .input("MembershipID", sql.Int, MembershipID)
                .input("Year", sql.VarChar, PaymentYear)
                .query(`
                    UPDATE AnnualPayment
                    SET AmountPaid = @AmountPaid, DueAmount = @DueAmount
                    WHERE MembershipID = @MembershipID AND Year = @Year
                `);

        } else {
            // ✅ Create new record — now calculate TotalAmount based on TotalPayments
            const totalResult = await pool.request()
                .input("YearRange", sql.VarChar, PaymentYear)
                .query(`
                    SELECT 
                        ISNULL(PrinterPayment, 0) +
                        ISNULL(ProviderPayment, 0) +
                        ISNULL(MachineDealerPayment, 0) +
                        ISNULL(PublisherPayment, 0) AS AnnualFee
                    FROM TotalPayments
                    WHERE YearRange = @YearRange
                `);

            if (totalResult.recordset.length === 0) {
                return res.status(400).json({ success: false, message: "No TotalPayments found for this year." });
            }

            const { AnnualFee = 0 } = totalResult.recordset[0];
            const totalAmount = AnnualFee;
            const dueAmount = totalAmount - AmountPaid;

            if (isNaN(dueAmount)) {
                return res.status(400).json({ success: false, message: "Calculated DueAmount is not valid." });
            }

            await pool.request()
                .input("MembershipID", sql.Int, MembershipID)
                .input("Year", sql.VarChar, PaymentYear)
                .input("TotalAmount", sql.Money, totalAmount)
                .input("AmountPaid", sql.Money, AmountPaid)
                .input("DueAmount", sql.Money, dueAmount)
                .query(`
                    INSERT INTO AnnualPayment (MembershipID, Year, TotalAmount, AmountPaid, DueAmount)
                    VALUES (@MembershipID, @Year, @TotalAmount, @AmountPaid, @DueAmount)
                `);
        }

        res.status(200).json({ success: true, message: "Annual Payment Summary updated successfully." });

    } catch (err) {
        console.error("Error in updateAnnualPayment:", err);
        res.status(500).json({ success: false, message: "Server error while updating annual payment summary." });
    }
};


export const YearlyPaymentList = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
      SELECT 
        YearRange,
        PrinterPayment,
        ProviderPayment,
        MachineDealerPayment,
        PublisherPayment,
        PrinterRegistration,
        ProviderRegistration,
        MachineDealerRegistration,
        PublisherRegistration
      FROM TotalPayments
    `);

        res.json({ success: true, data: result.recordset });
    } catch (err) {
        console.error("Error fetching total payments:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
}

export const addNewYearAndInsertForAllMember = async (req, res) => {
    const { yearRange, payments, registrations } = req.body;

    try {
        const pool = await poolPromise;

        // 1. Check for existing year in TotalPayments
        const existing = await pool.request()
            .input("YearRange", sql.VarChar, yearRange)
            .query("SELECT * FROM TotalPayments WHERE YearRange = @YearRange");

        if (existing.recordset.length > 0) {
            return res.json({ success: false, message: "Year already exists" });
        }

        // 2. Insert into TotalPayments including registrations
        await pool.request()
            .input("YearRange", sql.VarChar, yearRange)
            .input("PrinterPayment", sql.Money, payments.Printer || 0)
            .input("ProviderPayment", sql.Money, payments.Provider || 0)
            .input("MachineDealerPayment", sql.Money, payments.MachineDealer || 0)
            .input("PublisherPayment", sql.Money, payments.Publisher || 0)
            .input("PrinterRegistration", sql.Money, registrations.Printer || 0)
            .input("ProviderRegistration", sql.Money, registrations.Provider || 0)
            .input("MachineDealerRegistration", sql.Money, registrations.MachineDealer || 0)
            .input("PublisherRegistration", sql.Money, registrations.Publisher || 0)
            .query(`
                INSERT INTO TotalPayments 
                (YearRange, PrinterPayment, ProviderPayment, MachineDealerPayment, PublisherPayment,
                PrinterRegistration, ProviderRegistration,MachineDealerRegistration, PublisherRegistration)
                VALUES 
                (@YearRange, @PrinterPayment, @ProviderPayment, @MachineDealerPayment, @PublisherPayment,
                 @PrinterRegistration, @ProviderRegistration, @MachineDealerRegistration, @PublisherRegistration)
            `);

        // 3. Get all members
        const members = await pool.request()
            .query("SELECT MembershipID, Category FROM Members");

        // 4. Insert into AnnualPayment (Payment + Registration) per member
        for (let member of members.recordset) {
            let payment = 0;
            let registration = 0;

            switch (member.Category) {
                case "Printer":
                    payment = payments.Printer || 0;
                    registration = registrations.Printer || 0;
                    break;
                case "Provider":
                    payment = payments.Provider || 0;
                    registration = registrations.Provider || 0;
                    break;
                case "MachineDealer":
                    payment = payments.MachineDealer || 0;
                    registration = registrations.MachineDealer || 0;
                    break;
                case "Publisher":
                    payment = payments.Publisher || 0;
                    registration = registrations.Publisher || 0;
                    break;
                default:
                    payment = 0;
                    registration = 0;
            }


            const totalAmount = payment
            console.log(totalAmount)
            // await pool.request()
            //     .input("MembershipID", sql.Int, member.MembershipID)
            //     .input("Year", sql.VarChar, yearRange)
            //     .input("TotalAmount", sql.Money, totalAmount)
            //     .input("AmountPaid", sql.Money, 0)
            //     .input("DueAmount", sql.Money, totalAmount)

            //     .query(`
            //         INSERT INTO AnnualPayment (MembershipID, Year, TotalAmount, AmountPaid, DueAmount)
            //         VALUES (@MembershipID, @Year, @TotalAmount, @AmountPaid, @DueAmount)
            //     `);

            const insertResult = await pool.request()
                .input("MembershipID", sql.Int, member.MembershipID)
                .input("Year", sql.VarChar, yearRange)
                .input("TotalAmount", sql.Money, totalAmount)
                .input("AmountPaid", sql.Money, 0)
                .input("DueAmount", sql.Money, totalAmount)
                .query(`
        INSERT INTO AnnualPayment (MembershipID, Year, TotalAmount, AmountPaid, DueAmount)
        OUTPUT INSERTED.*
        VALUES (@MembershipID, @Year, @TotalAmount, @AmountPaid, @DueAmount)
    `);

            console.log("Inserted AnnualPayment row:", insertResult.recordset[0]);
        }

        res.json({ success: true, message: "Year added, TotalPayments and AnnualPayment inserted." });

    } catch (err) {
        console.error("Error adding year:", err);
        res.status(500).json({ success: false, message: "Internal server error"});
}
};