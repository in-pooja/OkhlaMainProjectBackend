import { poolPromise, sql } from '../db.js';
export const createNewMember = async (req, res) => {
    const {
        MemberName,
        CompanyName,
        ContactNumber,
        Email,
        GSTNo,
        UdhyamAadhar,
        RegistrationDate,
        MemberSince,
        Address1,
        Address2,
        Area,
        City,
        State,
        IsActive,
        // UpdatedDate,
        Owner,
        Category,            // ✅ NEW FIELD
        PrinterCategory      // ✅ NEW FIELD
    } = req.body;

    try {
        const pool = await poolPromise;

        await pool.request()
            .input('MemberName', sql.NVarChar(100), MemberName)
            .input('CompanyName', sql.NVarChar(150), CompanyName)
            .input('ContactNumber', sql.NVarChar(50), ContactNumber)
            .input('Email', sql.NVarChar(100), Email)
            .input('GSTNo', sql.NVarChar(50), GSTNo)
            .input('UdhyamAadhar', sql.NVarChar(50), UdhyamAadhar)
            .input('RegistrationDate', sql.Date, RegistrationDate)
            .input('MemberSince', sql.NVarChar(20), MemberSince)
            .input('Address1', sql.NVarChar(150), Address1)
            .input('Address2', sql.NVarChar(150), Address2)
            .input('Area', sql.NVarChar(50), Area)
            .input('City', sql.NVarChar(100), City)
            .input('State', sql.NVarChar(50), State)
            .input('IsActive', sql.Bit, IsActive)
            // .input('UpdatedDate', sql.Date, UpdatedDate)
            .input('Owner', sql.NVarChar(100), Owner)
            .input('Category', sql.NVarChar(100), Category ? String(Category) : '')
            .input('PrinterCategory', sql.NVarChar(100), PrinterCategory ? String(PrinterCategory) : '')

            .query(`INSERT INTO Members
                (MemberName, CompanyName, ContactNumber, Email, GSTNo, UdhyamAadhar, RegistrationDate,
                 MemberSince, Address1, Address2, Area, City, State, IsActive, Owner, Category, PrinterCategory)
                VALUES
                (@MemberName, @CompanyName, @ContactNumber, @Email, @GSTNo, @UdhyamAadhar, @RegistrationDate,
                 @MemberSince, @Address1, @Address2, @Area, @City, @State, @IsActive, @Owner, @Category, @PrinterCategory)`);

        return res.status(201).json({ message: "Member created successfully" });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal server error" });
    }
};





export async function getAllMembers(req, res) {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query("SELECT * FROM Members");
        res.status(200).json(result.recordset);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
} export const updateMember = async (req, res) => {
    const id = req.params.id;
    const {
        MemberName,
        CompanyName,
        ContactNumber,
        Email,
        GSTNo,
        UdhyamAadhar,
        RegistrationDate,
        MemberSince,
        Address1,
        Address2,
        Area,
        City,
        State,
        IsActive,
        Owner,
        Category,
        PrinterCategory,
        // Removed UpdatedDate from here
    } = req.body;

    // Always use current server date
    const updatedDateValue = new Date();

    try {
        const pool = await poolPromise;

        await pool.request()
            .input('MembershipID', sql.Int, id)
            .input('MemberName', sql.NVarChar(100), MemberName)
            .input('CompanyName', sql.NVarChar(150), CompanyName)
            .input('ContactNumber', sql.NVarChar(50), ContactNumber)
            .input('Email', sql.NVarChar(100), Email)
            .input('GSTNo', sql.NVarChar(50), GSTNo)
            .input('UdhyamAadhar', sql.NVarChar(50), UdhyamAadhar)
            .input('RegistrationDate', sql.Date, RegistrationDate)
            .input('MemberSince', sql.NVarChar(20), MemberSince)
            .input('Address1', sql.NVarChar(150), Address1)
            .input('Address2', sql.NVarChar(150), Address2)
            .input('Area', sql.NVarChar(50), Area)
            .input('City', sql.NVarChar(100), City)
            .input('State', sql.NVarChar(50), State)
            .input('IsActive', sql.Bit, IsActive)
            .input('Owner', sql.NVarChar(100), Owner)
            .input('Category', sql.NVarChar(100), Category)
            .input('PrinterCategory', sql.NVarChar(100), PrinterCategory)
            .input('UpdatedDate', sql.Date, updatedDateValue)
            .query(`
                UPDATE Members SET
                    MemberName = @MemberName,
                    CompanyName = @CompanyName,
                    ContactNumber = @ContactNumber,
                    Email = @Email,
                    GSTNo = @GSTNo,
                    UdhyamAadhar = @UdhyamAadhar,
                    RegistrationDate = @RegistrationDate,
                    MemberSince = @MemberSince,
                    Address1 = @Address1,
                    Address2 = @Address2,
                    Area = @Area,
                    City = @City,
                    State = @State,
                    IsActive = @IsActive,
                    Owner = @Owner,
                    Category = @Category,
                    PrinterCategory = @PrinterCategory,
                    UpdatedDate = @UpdatedDate
                WHERE MembershipID = @MembershipID
            `);

        return res.status(200).json({ message: 'Member updated successfully' });

    } catch (error) {
        console.error('Update member error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

