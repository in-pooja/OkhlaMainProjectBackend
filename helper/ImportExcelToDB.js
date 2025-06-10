import xlsx from 'xlsx';
import { poolPromise, sql } from '../db.js';

function parseExcelDate(dateValue) {
    if (!dateValue) return null; // null or empty

    // If it's already a JS Date object and valid
    if (dateValue instanceof Date && !isNaN(dateValue)) return dateValue;

    // If it's a number (Excel serial date), convert to JS date
    if (typeof dateValue === 'number') {
        // Excel dates start on 1900-01-01 (serial 1), offset by 25569 to get Unix epoch
        const jsDate = new Date((dateValue - 25569) * 86400 * 1000);
        return isNaN(jsDate) ? null : jsDate;
    }

    // Try parsing as string
    const parsedDate = new Date(dateValue);
    return isNaN(parsedDate) ? null : parsedDate;
}

export const importExcelToDB = async (filePath) => {
    try {
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        const pool = await poolPromise;

        for (const row of data) {
            const registrationDate = parseExcelDate(row.RegistrationDate);
            const memberSince = parseExcelDate(row.MemberSince);
            const updatedDate = parseExcelDate(row.UpdatedDate);

            await pool.request()
                .input('MemberName', sql.NVarChar, row.MemberName)
                .input('CompanyName', sql.NVarChar, row.CompanyName)
                .input('ContactNumber', sql.NVarChar, row.ContactNumber)
                .input('Email', sql.NVarChar, row.Email)
                .input('GSTNo', sql.NVarChar, row.GSTNo)
                .input('UdhyamAadhar', sql.NVarChar, row.UdhyamAadhar)
                .input('RegistrationDate', sql.Date, registrationDate)
                .input('MemberSince', sql.Date, memberSince)
                .input('Address1', sql.NVarChar, row.Address1)
                .input('Address2', sql.NVarChar, row.Address2)
                .input('Area', sql.NVarChar, row.Area)
                .input('City', sql.NVarChar, row.City)
                .input('State', sql.NVarChar, row.State)
                .input('IsActive', sql.Bit, row.IsActive)
                .input('UpdatedDate', sql.Date, updatedDate)
                .input('Owner', sql.NVarChar, row.Owner)
                .input('Category', sql.NVarChar, row.Category)
                .input('PrinterCategory', sql.NVarChar, row.PrinterCategory)
                .query(`
          INSERT INTO Members (
            MemberName, CompanyName, ContactNumber, Email, GSTNo,UdhyamAadhar,
            RegistrationDate, MemberSince, Address1, Address2, Area, City, State,
            IsActive, UpdatedDate, Owner, Category, PrinterCategory
          ) VALUES (
            @MemberName, @CompanyName, @ContactNumber, @Email, @GSTNo, @UdhyamAadhar,
            @RegistrationDate, @MemberSince, @Address1, @Address2, @Area, @City, @State,
            @IsActive, @UpdatedDate, @Owner, @Category, @PrinterCategory
          )
        `);
        }

        return { success: true, message: 'Data inserted successfully!' };
    } catch (error) {
        console.error('Import Error:', error);
        return { success: false, message: 'Error inserting data', error };
    }
};
