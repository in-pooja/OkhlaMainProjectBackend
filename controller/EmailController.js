// // controllers/EmailController.js
// import { poolPromise, sql } from '../db.js';
// import nodemailer from 'nodemailer';
// // import generateReceiptPDF from '../Utils/PdfGenerator.js';

// export const sendEmailWithReceipt = async (req, res) => {
//   try {
//     console.log("📩 Full request body:", req.body);
//     let { receiptId, userId, toEmail } = req.body;
//     console.log(receiptId)

//     // 1️⃣ Validate presence
//     if (receiptId == null) {
//       return res.status(400).json({ success: false, message: "Missing receiptId" });
//     }
//     if (userId == null) {
//       return res.status(400).json({ success: false, message: "Missing userId" });
//     }

//     // 2️⃣ Ensure numeric IDs
//     //    If receiptId is a string like "REC-140" strip non-digits; otherwise parseInt directly
//     if (typeof receiptId === 'string') {
//       // Remove any non‐digit chars:
//       const digits = receiptId.match(/\d+/);
//       if (!digits) {
//         return res.status(400).json({ success: false, message: "Invalid receiptId format" });
//       }
//       receiptId = parseInt(digits[0], 10);
//     } else {
//       receiptId = parseInt(receiptId, 10);
//     }

//     userId = parseInt(userId, 10);

//     console.log("🔢 Parsed receiptId:", receiptId, "userId:", userId);

//     // 3️⃣ Connect & fetch receipt
//     const pool = await poolPromise;
//     const receiptResult = await pool.request()
//       .input("ReceiptID", sql.Int, receiptId)
//       .query("SELECT * FROM Receipts WHERE ReceiptID = @ReceiptID");
//     console.log("📄 Receipt recordset:", receiptResult.recordset);
//     if (!receiptResult.recordset.length) {
//       return res.status(404).json({ success: false, message: "Receipt not found" });
//     }
//     const receipt = receiptResult.recordset[0];

//     // 4️⃣ Fetch member
//     if (!receipt.MembershipID) {
//       return res.status(400).json({ success: false, message: "MembershipID is missing in Receipt" });
//     }
//     const memberResult = await pool.request()
//       .input("MembershipID", sql.Int, receipt.MembershipID)
//       .query("SELECT * FROM Members WHERE MembershipID = @MembershipID");
//     if (!memberResult.recordset.length) {
//       return res.status(404).json({ success: false, message: "Member not found" });
//     }
//     const member = memberResult.recordset[0];

//     // 5️⃣ Fetch sender credentials
//     const userResult = await pool.request()
//       .input("UserID", sql.Int, userId)
//       .query("SELECT * FROM Users1 WHERE UserID = @UserID");
//     if (!userResult.recordset.length) {
//       return res.status(404).json({ success: false, message: "Sender not found" });
//     }
//     const { SenderEmail, SenderPassword, EmailType } = userResult.recordset[0];

//     // 6️⃣ Create transporter
//     let transporter;
//     if (EmailType === "Google") {
//       transporter = nodemailer.createTransport({
//         service: "gmail",
//         auth: { user: SenderEmail, pass: SenderPassword }
//       });
//     } else if (EmailType === "Microsoft") {
//       transporter = nodemailer.createTransport({
//         host: "smtp.office365.com",
//         port: 587,
//         secure: false,
//         auth: { user: SenderEmail, pass: SenderPassword }
//       });
//     } else {
//       return res.status(400).json({ success: false, message: "Invalid EmailType" });
//     }

//     // 7️⃣ (Optional) Generate PDF
//     // const pdfBuffer = await generateReceiptPDF(member, receipt);

//     // 8️⃣ Send the email
//     await transporter.sendMail({
//       from: SenderEmail,
//       to: toEmail || member.Email,
//       subject: `Payment Receipt - ${receipt.ReceiptNumber}`,
//       html: `<p>Hello <b>${member.MemberName}</b>,<br>Your payment receipt is attached.<br>Thank you.</p>`,
//       // attachments: [{
//       //   filename: `Receipt-${receipt.ReceiptNumber}.pdf`,
//       //   content: pdfBuffer,
//       // }],
//     });

//     return res.status(200).json({ success: true, message: "Email sent successfully!" });

//   } catch (error) {
//     console.error("🔴 Email send error:", error);
//     return res.status(500).json({ success: false, message: "Failed to send email." });
//   }
// };

import { poolPromise, sql } from '../db.js';
import nodemailer from 'nodemailer';

export const sendEmailWithReceipt = async (req, res) => {
  try {
    const { receiptId, userId, toEmail } = req.body;

    if (!receiptId || !userId) {
      return res.status(400).json({ success: false, message: "Missing receiptId or userId" });
    }

    const parsedReceiptId = parseInt(receiptId.toString().match(/\d+/)[0], 10);
    const parsedUserId = parseInt(userId, 10);

    const pool = await poolPromise;

    // Fetch Receipt
    const receiptResult = await pool.request()
      .input("ReceiptID", sql.Int, parsedReceiptId)
      .query("SELECT * FROM Receipts WHERE ReceiptID = @ReceiptID");

    if (!receiptResult.recordset.length) {
      return res.status(404).json({ success: false, message: "Receipt not found" });
    }
    const receipt = receiptResult.recordset[0];

    // Fetch Member
    const memberResult = await pool.request()
      .input("MembershipID", sql.Int, receipt.MembershipID)
      .query("SELECT * FROM Members WHERE MembershipID = @MembershipID");

    if (!memberResult.recordset.length) {
      return res.status(404).json({ success: false, message: "Member not found" });
    }
    const member = memberResult.recordset[0];

    // Fetch Email Sender Credentials
    const userResult = await pool.request()
      .input("UserID", sql.Int, parsedUserId)
      .query("SELECT * FROM Users1 WHERE UserID = @UserID");

    if (!userResult.recordset.length) {
      return res.status(404).json({ success: false, message: "Sender not found" });
    }
    const { SenderEmail, SenderPassword, EmailType } = userResult.recordset[0];

    // Create Transporter
    const transporter = nodemailer.createTransport({
      service: EmailType === "Google" ? "gmail" : undefined,
      host: EmailType === "Microsoft" ? "smtp.office365.com" : undefined,
      port: EmailType === "Microsoft" ? 587 : undefined,
      secure: false,
      auth: { user: SenderEmail, pass: SenderPassword },
    });

    // Send Email
    await transporter.sendMail({
      from: SenderEmail,
      to: toEmail || member.Email,
      subject: `Payment Receipt - ${receipt.ReceiptNumber}`,
      html: `<p>Hello <b>${member.MemberName}</b>,<br>Your payment receipt <b>${receipt.ReceiptNumber}</b> is attached.<br>Thank you.</p>`,
    });

    return res.status(200).json({ success: true, message: "Email sent successfully!" });

  } catch (error) {
    console.error("❌ Email send error:", error);
    return res.status(500).json({ success: false, message: "Failed to send email." });
  }
};

export const getMemberEmailByReceiptNumber = async (req, res) => {
  try {
    const { receiptNo } = req.params;

    const pool = await poolPromise;
    const result = await pool.request()
      .input("ReceiptNumber", sql.VarChar, receiptNo)
      .query(`
        SELECT m.Email 
        FROM Receipts r 
        JOIN Members m ON r.MembershipID = m.MembershipID 
        WHERE r.ReceiptNumber = @ReceiptNumber
      `);

    if (!result.recordset.length) {
      return res.status(404).json({ error: "Email not found" });
    }

    res.status(200).json({ email: result.recordset[0].Email });

  } catch (err) {
    console.error("❌ Error fetching email:", err.message);
    res.status(500).json({ error: "Failed to fetch email" });
  }
};
