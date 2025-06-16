import { poolPromise, sql } from '../db.js';
import bcrypt from 'bcryptjs'; // 🔐 import bcrypt
export const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input("Email", sql.NVarChar, email)
            .query("SELECT * FROM Users1 WHERE Email = @Email");

        if (result.recordset.length > 0) {
            const user = result.recordset[0];

            // ✅ Ignore case while comparing Status
           if ((user.status || "").toLowerCase() !== "active") {
    return res.status(403).json({
        success: false,
        message: "Your account is deactivated. Please contact admin."
    });
}


            const isMatch = await bcrypt.compare(password, user.Password);

            if (isMatch) {
                return res.json({
                    success: true,
                    user: {
                        name: user.Name,
                        role: user.Role,
                        email: user.Email,
                        userID: user.UserID
                    }
                });
            } else {
                return res.status(401).json({ success: false, message: "Invalid credentials" });
            }
        } else {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};


// ✅ CREATE USER or ADMIN
export const createUser = async (req, res) => {
    const { name, email, password, role } = req.body;


    // 🔍 Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // 🔒 Password validation
    const passwordRegex = /^(?=.[A-Z])(?=.\d)(?=.[!@#$%^&()_+{}\[\]:;<>,.?~\\/-]).{6,}$/;

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
        const hashedPassword = await bcrypt.hash(password, 10); // 🔐 hash password

        const pool = await poolPromise;
        await pool.request()
            .input("Name", sql.NVarChar, name)
            .input("Email", sql.NVarChar, email)
            .input("Password", sql.NVarChar, hashedPassword)
            .input("Role", sql.NVarChar, role)
            .query(`
                INSERT INTO Users1 (Name, Email, Password, Role) 
                VALUES (@Name, @Email, @Password, @Role)
            `);

        res.json(`{ success: true, message: ${role} created successfully }`);
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
            .query("SELECT Role FROM Users1 WHERE Email = @Email"); // ✅ correct column name

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
            FROM Users1
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error("Error fetching Users1:", err);
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
                UPDATE Users1
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

    const passwordRegex = /^(?=.[A-Z])(?=.\d)(?=.[!@#$%^&()_+{}\[\]:;<>,.?~\\/-]).{6,}$/;

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
            .query("SELECT * FROM Users1 WHERE Email = @Email");

        if (userCheck.recordset.length === 0) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update the password
        await pool.request()
            .input("Email", sql.NVarChar, email)
            .input("Password", sql.NVarChar, hashedPassword)
            .query("UPDATE Users1 SET Password = @Password WHERE Email = @Email");

        return res.json({ success: true, message: "Password updated successfully" });

    } catch (err) {
        console.error("Error resetting password:", err);
        res.status(500).json({ success: false, message: "Internal server error" });
}
};