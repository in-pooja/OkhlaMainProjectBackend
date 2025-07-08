import { poolPromise, sql } from '../db.js';
import bcrypt from 'bcryptjs';

export const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input("Email", sql.NVarChar, email)
            .query("SELECT * FROM Users WHERE Email = @Email");

        if (result.recordset.length === 0) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const user = result.recordset[0];
        const isPasswordMatch = await bcrypt.compare(password, user.Password);

        if (!isPasswordMatch) {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }

        // 🔄 TEMPORARY: Agar status deactivated hai, toh activate kar do
        if ((user.status || "").trim().toLowerCase() !== "active") {
            console.log("User status is deactivated, activating now...");

            // Status ko update karo "active"
            await pool.request()
                .input("Email", sql.NVarChar, email)
                .query("UPDATE Users SET Status = 'active' WHERE Email = @Email");

            // 🔄 Latest user record fetch karo
            const refreshed = await pool.request()
                .input("Email", sql.NVarChar, email)
                .query("SELECT * FROM Users WHERE Email = @Email");

            console.log("User activated:", refreshed.recordset[0].Name);
        }

        // ✅ Login Success
        return res.status(200).json({
            success: true,
            message: "Login successful",
            user: {
                name: user.Name,
                email: user.Email,
                role: user.Role,
            }
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};



// ✅ CREATE USER or ADMIN
export const createUser = async (req, res) => {
    const { name, email, password, role, emailType, senderEmail, senderPassword } = req.body;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{6,}$/;

    if (!emailRegex.test(email)) {
        return res.status(400).json({ success: false, message: "Invalid email format" });
    }

    if (!passwordRegex.test(password)) {
        return res.status(400).json({
            success: false,
            message: "Password must be at least 6 characters long, include an uppercase letter, a digit, and a special character."
        });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const pool = await poolPromise;
        await pool.request()
            .input("Name", sql.NVarChar, name)
            .input("Email", sql.NVarChar, email)
            .input("Password", sql.NVarChar, hashedPassword)
        .input("Role", sql.NVarChar, role.toLowerCase())

            .input("EmailType", sql.NVarChar, emailType)
            .input("SenderEmail", sql.NVarChar, senderEmail)
            .input("SenderPassword", sql.NVarChar, senderPassword)
            .query(`
                INSERT INTO Users (Name, Email, Password, Role, EmailType, SenderEmail, SenderPassword)
                VALUES (@Name, @Email, @Password, @Role, @EmailType, @SenderEmail, @SenderPassword)
            `);

        res.json({ success: true, message: `${role} created successfully` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ✅ GET ROLE BY EMAIL (for dynamic check from frontend)
export const getRoleByEmail = async (req, res) => {
    const { Email } = req.query; // get Email from query string
    console.log("Request received for email:", Email);

    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input("Email", sql.NVarChar, Email) // use correct casing
            .query("SELECT Role FROM Users WHERE Email = @Email"); // ✅ correct column name

        if (result.recordset.length > 0) {
            const role = result.recordset[0].Role;
            res.json({ role }); // ✅ return role
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};


export const getAllUsers = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT 
                UserID, 
                Name, 
                Email, 
                Role, 
                Status AS [Status]  -- enforce case
            FROM Users
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error("Error fetching Users:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const updateUserByAdmin = async (req, res) => {
    const { userId, name, email, role, status } = req.body;

    try {
        const pool = await poolPromise; // ✅ get actual pool from poolPromise

        await pool.request()
            .input("UserID", sql.Int, userId)
            .input("Name", sql.NVarChar(100), name)
            .input("Email", sql.NVarChar(100), email)
            .input("Role", sql.NVarChar(50), role)
            .input("Status", sql.NVarChar(10), status)
            .query(`
                UPDATE Users
                SET Name = @Name,
                    Email = @Email,
                    Role = @Role,
                    Status = @Status
                WHERE UserID = @UserID
            `);

        res.status(200).send("User updated successfully.");
    } catch (err) {
        console.error("Update error:", err);
        res.status(500).send("Internal Server Error");
    }
};


export const changePassword = async (req, res) => {
    const { email, newPassword } = req.body;
    console.log(newPassword);

const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+{}\[\]:;<>,.?~\\/-]).{6,}$/;


    // Validate new password format
    if (!passwordRegex.test(newPassword)) {
        return res.status(400).json({
            success: false,
            message: "New password must be at least 6 characters long and contain an uppercase letter, a number, and a special character.",
        });
    }

    try {
        const pool = await poolPromise;

        // Check if user exists
        const userCheck = await pool.request()
            .input("Email", sql.NVarChar, email)
            .query("SELECT * FROM Users WHERE Email = @Email");

        if (userCheck.recordset.length === 0) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update the password
        await pool.request()
            .input("Email", sql.NVarChar, email)
            .input("Password", sql.NVarChar, hashedPassword)
            .query("UPDATE Users SET Password = @Password WHERE Email = @Email");

        return res.json({ success: true, message: "Password updated successfully" });

    } catch (err) {
        console.error("Error resetting password:", err);
        res.status(500).json({ success: false, message: "Internal server error" });
}
};


  export const OtherPaymentsDtails = async (req, res) => {
  try {
    const pool = await poolPromise; // ✅ Get DB pool
    const result = await pool.request().query("SELECT * FROM OtherPayments"); // ✅ Use request
    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching payments:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
