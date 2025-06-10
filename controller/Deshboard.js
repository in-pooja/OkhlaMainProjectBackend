
import { poolPromise, sql } from '../db.js';

export const getCompanies = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .query('SELECT DISTINCT MembershipID, CompanyName FROM Members ORDER BY CompanyName');
    return res.json(result.recordset);
  } catch (err) {
    console.error('Error in getCompanies:', err);
    return res.status(500).json({ error: err.message });
  }
};

export const getYears = async (req, res) => {
  const { MembershipID } = req.query;
  if (!MembershipID) return res.status(400).json({ error: 'MembershipID is required' });

  try {
    const pool = await poolPromise;

    // Log membership id
    console.log('MembershipID:', MembershipID);

    const yearsResult = await pool.request()
      .input('MembershipID', sql.Int, MembershipID)
      .query('SELECT Year FROM AnnualPayment WHERE MembershipID = @MembershipID');

    console.log('Years from DB:', yearsResult.recordset);

    // Return raw years without filtering
    return res.json(yearsResult.recordset.map(r => r.Year));
  } catch (err) {
    console.error('Error in getYears:', err);
    return res.status(500).json({ error: err.message });
  }
};


export const getDashboardData = async (req, res) => {
  const { companyName, paymentYear } = req.body;
  if (!companyName || !paymentYear)
    return res.status(400).json({ error: 'companyName and paymentYear are required' });

  try {
    const pool = await poolPromise;
    const memberRes = await pool.request()
      .input('companyName', sql.NVarChar, companyName)
      .query('SELECT MembershipID, MemberName, MemberSince FROM Members WHERE CompanyName = @companyName');

    if (memberRes.recordset.length === 0) 
      return res.status(404).json({ error: 'Company or members not found' });

    const member = memberRes.recordset[0];

   let paymentRes;

if (paymentYear === 'All') {
  paymentRes = await pool.request()
    .input('MembershipID', sql.Int, member.MembershipID)
    .query(`
    SELECT 
 Year,
  SUM(TotalAmount) AS TotalAmount,
  SUM(AmountPaid) AS AmountPaid,
  SUM(DueAmount) AS DueAmount
FROM AnnualPayment
WHERE MembershipID = @MembershipID
GROUP BY Year
ORDER BY Year
    `);
} else {
  paymentRes = await pool.request()
    .input('MembershipID', sql.Int, member.MembershipID)
    .input('PaymentYear', sql.NVarChar, paymentYear)
   .query(`
  SELECT  TotalAmount, AmountPaid, DueAmount
  FROM AnnualPayment 
  WHERE MembershipID = @MembershipID AND Year = @paymentYear
`)

}


    if (paymentRes.recordset.length === 0) 
      return res.status(404).json({ error: 'No payment data for this year' });

    // Send all payments as array
   return res.json({
  MembershipID: member.MembershipID,
  MemberName: member.MemberName,
  MemberSince: member.MemberSince,
  Payments: paymentRes.recordset  // yaha multiple payments aa jayenge
});

  } catch (err) {
    console.error('Error in getDashboardData:', err);
    return res.status(500).json({ error: err.message });
  }
};

export const getDashboardMultiYearData = async (req, res) => {
  const { companyName } = req.body;
  if (!companyName) return res.status(400).json({ error: 'companyName is required' });

  try {
    const pool = await poolPromise;
    const memberRes = await pool.request()
      .input('companyName', sql.NVarChar, companyName)
      .query('SELECT MembershipID, MemberName, MemberSince FROM Members WHERE CompanyName = @companyName');

    if (memberRes.recordset.length === 0)
      return res.status(404).json({ error: 'Company or member not found' });

    const member = memberRes.recordset[0];

    const paymentRes = await pool.request()
      .input('MembershipID', sql.Int, member.MembershipID)
      .query(`
        SELECT 
          Year AS year,
          SUM(TotalAmount) AS TotalAmount,
          SUM(AmountPaid) AS AmountPaid,
          SUM(DueAmount) AS DueAmount
        FROM AnnualPayment
        WHERE MembershipID = @MembershipID
        GROUP BY Year
        ORDER BY Year
      `);

    if (paymentRes.recordset.length === 0)
      return res.status(404).json({ error: 'No payment data found for all years' });

   return res.json({
  member,
  payments: paymentRes.recordset
});


  } catch (err) {
    console.error('Error in getDashboardMultiYearData:', err);
    return res.status(500).json({ error: err.message });
  }
};


export const getOtherPayments = async (req, res) => {
  const { companyName } = req.query;
  if (!companyName) return res.status(400).json({ error: 'companyName is required' });

  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('companyName', sql.NVarChar, companyName)
      .query(`
        SELECT 
            op.PaymentCategory AS Category,
            op.Amount,
            op.Remark
        FROM 
            dbo.OtherPayments op
        INNER JOIN 
            dbo.Members m ON op.MembershipID = m.MembershipID
        WHERE 
            m.CompanyName = @companyName
      `);

    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching other payments:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};


