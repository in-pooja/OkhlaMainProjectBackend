// import { poolPromise, sql } from '../db.js';
// export const getPaymentSummary = async (req, res) => {
//     try {
//         const { membershipID, year } = req.params;
//         const pool = await poolPromise;
//         const result = await pool.request()
//             .input('MembershipID', sql.Int, parseInt(membershipID))
//             .input('Year', sql.VarChar, year)
//             .query(`
//         SELECT
//           SUM(TotalAmount) AS TotalAmount,
//           SUM(ReceivedAmount) AS ReceivedAmount,
//           SUM(PendingAmount) AS DueAmount
//         FROM YearlyPaymentSummary
//         WHERE MembershipID = @MembershipID AND PaymentYear = @Year
//       `);
//         res.json(result.recordset[0]);
//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ error: "Failed to fetch payment summary" });
//     }
// };
