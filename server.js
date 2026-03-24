const bcrypt = require("bcrypt");
require('dotenv').config();
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const multer = require("multer");
const path = require("path");

const app = express();

app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type"]
}));
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Configure Multer Storages
const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

const recordsStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, "uploads/records/"),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname.replace(/\s+/g, "_"));
    }
});

const uploadRecord = multer({
    storage: recordsStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB Limit
    fileFilter: (req, file, cb) => {
        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Invalid file type. Only PDF, JPG, PNG, DOCX allowed."));
        }
    }
});

const profileStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, "uploads/profile/"),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const uploadProfile = multer({
    storage: profileStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB Limit for profiles
    fileFilter: (req, file, cb) => {
        if (['image/jpeg', 'image/png'].includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Invalid profile image type. Only JPG, PNG allowed."));
        }
    }
});

// Generic Production Upload Storage Configuration
const genericStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, "uploads/"),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname.replace(/\s+/g, "_"));
    }
});

const uploadGeneric = multer({
    storage: genericStorage,
    limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
    fileFilter: (req, file, cb) => {
        const allowed = [
            'image/jpeg', 'image/png', 'image/jpg',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Invalid file type. Only JPG, PNG, PDF, DOC, DOCX allowed."));
        }
    }
});

/* MySQL Connection */
console.log("DB Host:", process.env.MYSQLHOST);

const db = mysql.createPool({
    host: process.env.MYSQLHOST,
    user: process.env.MYSQLUSER,
    password: process.env.MYSQLPASSWORD,
    database: process.env.MYSQLDATABASE,
    port: process.env.MYSQLPORT,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

db.getConnection((err, connection) => {
    if (err) {
        console.error("MySQL connection failed:", err);
    } else {
        console.log("MySQL Connected");
        connection.release();
    }
});

/* TEST ROUTE */

app.get("/", (req, res) => {
    res.send("Backend is running");
});

/* GET USERS */

app.get("/users", (req, res) => {
    db.query("SELECT * FROM users", (err, result) => {
        if (err) {
            console.log(err);
            res.status(500).json(err);
        } else {
            res.json(result);
        }
    });
});

/* REGISTER */

app.post("/register", (req, res) => {
  const { name, email, password, role } = req.body;

  // Validate input
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const sql = "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)";

  db.query(sql, [name, email, password, role], (err, result) => {
    if (err) {
      console.error("REGISTER ERROR:", err);
      return res.status(500).json({
        error: "Database error",
        details: err.message
      });
    }

    return res.json({
      success: true,
      message: "User registered successfully"
    });
  });
});

/* LOGIN */

app.post("/login", (req, res) => {
    const { email, password } = req.body;

    const query = "SELECT * FROM users WHERE email=? AND password=?";

    db.query(query, [email, password], (err, results) => {
        if (err) {
            return res.status(500).json({ error: "Database error" });
        }

        if (results.length === 0) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        res.json(results[0]);

    });
});

/* GET ALL TABLES DATA */
app.get("/appointments", (req, res) => {
    db.query("SELECT * FROM appointments", (err, result) => {
        if (err) res.status(500).json(err);
        else res.json(result);
    });
});

app.get("/prescriptions", (req, res) => {
    db.query("SELECT * FROM prescriptions", (err, result) => {
        if (err) res.status(500).json(err);
        else res.json(result);
    });
});

app.get("/orders", (req, res) => {
    db.query("SELECT * FROM orders", (err, result) => {
        if (err) res.status(500).json(err);
        else res.json(result);
    });
});

app.get("/notifications", (req, res) => {
    db.query("SELECT * FROM notifications", (err, result) => {
        if (err) res.status(500).json(err);
        else res.json(result);
    });
});

/* INSERTS/UPDATES */
app.post("/appointments", (req, res) => {
    const { id, patient_id, doctor_id, appointment_date, appointment_time, status, notes } = req.body;
    const sql = "INSERT INTO appointments (id, patient_id, doctor_id, appointment_date, appointment_time, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?)";
    db.query(sql, [id, patient_id, doctor_id, appointment_date, appointment_time, status, notes], (err, result) => {
        if (err) { console.log(err); res.status(500).json(err); }
        else res.json({ success: true });
    });
});

app.put("/appointments/:id/status", (req, res) => {
    const sql = "UPDATE appointments SET status=? WHERE id=?";
    db.query(sql, [req.body.status, req.params.id], (err, result) => {
        if (err) { console.log(err); res.status(500).json(err); }
        else res.json({ success: true });
    });
});

app.post("/prescriptions", (req, res) => {
    const { id, patient_id, doctor_id, medication_name, dosage, frequency, duration, notes } = req.body;
    const sql = "INSERT INTO prescriptions (id, patient_id, doctor_id, medication_name, dosage, frequency, duration, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
    db.query(sql, [id, patient_id, doctor_id, medication_name, dosage, frequency, duration, notes], (err, result) => {
        if (err) { console.log(err); res.status(500).json(err); }
        else res.json({ success: true });
    });
});

app.put("/prescriptions/:id/notes", (req, res) => {
    const sql = "UPDATE prescriptions SET notes=? WHERE id=?";
    db.query(sql, [req.body.notes, req.params.id], (err, result) => {
        if (err) { console.log(err); res.status(500).json(err); }
        else res.json({ success: true });
    });
});

app.post("/orders", (req, res) => {
    const { id, patient_id, prescription_id, status, total_amount } = req.body;
    const sql = "INSERT INTO orders (id, patient_id, prescription_id, status, total_amount) VALUES (?, ?, ?, ?, ?)";
    db.query(sql, [id, patient_id, prescription_id, status, total_amount], (err, result) => {
        if (err) { console.log(err); res.status(500).json(err); }
        else res.json({ success: true });
    });
});

app.delete("/users/:id", (req, res) => {
    const sql = "DELETE FROM users WHERE id=?";
    db.query(sql, [req.params.id], (err, result) => {
        if (err) { console.log(err); res.status(500).json(err); }
        else res.json({ success: true });
    });
});

app.get("/users/:id", (req, res) => {
    const sql = "SELECT * FROM users WHERE id=?";
    db.query(sql, [req.params.id], (err, result) => {
        if (err) {
            console.log(err);
            res.status(500).json(err);
        } else {
            if (result.length > 0) {
                res.json(result[0]);
            } else {
                res.status(404).json({ error: "User not found" });
            }
        }
    });
});

app.put("/users/:id/status", (req, res) => {
    const sql = "UPDATE users SET status=? WHERE id=?";
    db.query(sql, [req.body.status, req.params.id], (err, result) => {
        if (err) { console.log(err); res.status(500).json(err); }
        else res.json({ success: true });
    });
});

/* DOCTOR RATING SYSTEM */

app.post("/rate-doctor", (req, res) => {
    const { doctor_id, patient_id, rating, review } = req.body;
    if (!doctor_id || !patient_id || !rating) return res.status(400).json({ error: "Missing required rating fields" });

    // Check if patient already rated this doctor
    const checkSql = "SELECT id FROM ratings WHERE doctor_id = ? AND patient_id = ?";
    db.query(checkSql, [doctor_id, patient_id], (err, results) => {
        if (err) return res.status(500).json({ error: "Database error checking existing rating" });

        if (results.length > 0) {
            // Update existing rating
            const updateSql = "UPDATE ratings SET rating = ?, review = ? WHERE doctor_id = ? AND patient_id = ?";
            db.query(updateSql, [rating, review, doctor_id, patient_id], (updateErr) => {
                if (updateErr) return res.status(500).json({ error: "Failed to update rating" });
                res.json({ success: true, message: "Rating updated successfully" });
            });
        } else {
            // Insert new rating
            const insertSql = "INSERT INTO ratings (doctor_id, patient_id, rating, review) VALUES (?, ?, ?, ?)";
            db.query(insertSql, [doctor_id, patient_id, rating, review], (insertErr) => {
                if (insertErr) return res.status(500).json({ error: "Failed to submit rating" });
                res.json({ success: true, message: "Rating submitted successfully" });
            });
        }
    });
});

app.get("/doctor-ratings/:doctorId", (req, res) => {
    const doctorId = req.params.doctorId;

    const statsSql = `
        SELECT 
            COUNT(*) as totalReviews,
            IFNULL(ROUND(AVG(rating), 1), 0) as averageRating
        FROM ratings 
        WHERE doctor_id = ?
    `;

    const reviewsSql = `
        SELECT r.rating, r.review, r.created_at, u.name as patient_name, u.profile_picture as patient_avatar
        FROM ratings r
        JOIN users u ON r.patient_id = u.id
        WHERE r.doctor_id = ?
        ORDER BY r.created_at DESC
        LIMIT 50
    `;

    db.query(statsSql, [doctorId], (err, statsResult) => {
        if (err) return res.status(500).json({ error: "Failed to fetch aggregated ratings" });

        db.query(reviewsSql, [doctorId], (err2, reviewsResult) => {
            if (err2) return res.status(500).json({ error: "Failed to fetch top reviews" });

            res.json({
                stats: statsResult[0],
                reviews: reviewsResult
            });
        });
    });
});

app.put("/users/:id/personal-info", (req, res) => {
    const userId = req.params.id;
    const { age, height_cm, weight_kg, blood_group } = req.body;

    // Calculate BMI
    let bmi = null;
    if (height_cm && weight_kg) {
        const heightMeters = height_cm / 100;
        bmi = weight_kg / (heightMeters * heightMeters);
        // We will store exact value, let frontend handle formatting if needed, but DB is float
    }

    const sql = `
        UPDATE users 
        SET age = ?, height_cm = ?, weight_kg = ?, blood_group = ?, bmi = ?
        WHERE id = ?
    `;

    db.query(sql, [age, height_cm, weight_kg, blood_group, bmi, userId], (err, result) => {
        if (err) {
            console.error(err);
            res.status(500).json({ error: "Failed to update personal information" });
        } else {
            res.json({ success: true, bmi });
        }
    });
});

app.put("/update-profile", (req, res) => {
    const { user_id, name, phone, emergency_contact } = req.body;
    if (!user_id) return res.status(400).json({ error: "Missing user_id" });

    const sql = `
        UPDATE users 
        SET name = COALESCE(?, name), 
            phone = COALESCE(?, phone), 
            emergency_contact = COALESCE(?, emergency_contact)
        WHERE id = ?
    `;

    db.query(sql, [name, phone, emergency_contact, user_id], (err, result) => {
        if (err) {
            console.error(err);
            res.status(500).json({ error: "Failed to update core profile information" });
        } else {
            res.json({ success: true });
        }
    });
});

app.get("/consultations", (req, res) => {
    db.query("SELECT * FROM consultations", (err, result) => {
        if (err) res.status(500).json(err);
        else res.json(result);
    });
});

app.post("/consultations", (req, res) => {
    const { patient_id, doctor_id, consultation_date, notes, fee } = req.body;
    const sql = "INSERT INTO consultations (patient_id, doctor_id, consultation_date, notes, fee) VALUES (?, ?, ?, ?, ?)";
    db.query(sql, [patient_id, doctor_id, consultation_date, notes, fee || 0], (err, result) => {
        if (err) { console.error(err); return res.status(500).json(err); }
        res.json({ success: true, id: result.insertId });
    });
});

app.get("/stats", (req, res) => {
    const stats = {};
    db.query("SELECT COUNT(*) AS doctors FROM users WHERE role='doctor'", (err, doctorResult) => {
        if (err) return res.status(500).json(err);
        stats.doctors = doctorResult[0].doctors;
        db.query("SELECT COUNT(*) AS patients FROM users WHERE role='patient'", (err, patientResult) => {
            if (err) return res.status(500).json(err);
            stats.patients = patientResult[0].patients;
            db.query("SELECT COUNT(*) AS consultations FROM consultations", (err, consultResult) => {
                if (err) return res.status(500).json(err);
                stats.consultations = consultResult[0].consultations;
                res.json(stats);
            });
        });
    });
});

/* FILE UPLOAD ENDPOINTS */

// PROD: Unified File Upload System (Railway/Vercel Support)
app.post("/upload", (req, res) => {
    uploadGeneric.single("file")(req, res, (err) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }

        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded. Please attach a valid file." });
        }

        const { user_id, file_type } = req.body;

        if (!user_id || !file_type) {
            return res.status(400).json({ error: "Missing required fields: user_id and file_type." });
        }

        const filename = req.file.filename;
        const file_url = `${req.protocol}://${req.get("host")}/uploads/${filename}`;

        const sql = "INSERT INTO files (user_id, file_url, file_type) VALUES (?, ?, ?)";

        // Execute securely inside the existing MySQL connection pool
        db.query(sql, [user_id, file_url, file_type], (dbErr, result) => {
            if (dbErr) {
                console.error("Database error saving file logic:", dbErr);
                return res.status(500).json({ error: "Database error while saving file metadata to files table." });
            }

            res.json({
                message: "File uploaded successfully",
                file_url: file_url
            });
        });
    });
});


app.post("/upload-file", uploadRecord.single("file"), (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded or invalid dimensions" });

    // Fallback bindings if frontend sends user_id instead of patient_id (for backwards compat)
    const patient_id = req.body.patient_id || req.body.user_id;
    const record_type = req.body.record_type || 'General Document';
    const title = req.body.title || req.file.originalname;

    const file_name = req.file.filename; // The generated unique name
    const file_type = path.extname(req.file.originalname).replace('.', '').toLowerCase();
    const file_path = `/uploads/records/${req.file.filename}`;
    const file_size = req.file.size;
    const mime_type = req.file.mimetype;
    const uploaded_by = patient_id;

    // Insert into `files` first
    const fileSql = "INSERT INTO files (user_id, file_name, file_type, file_path, file_size, mime_type, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?)";
    db.query(fileSql, [patient_id, file_name, file_type, file_path, file_size, mime_type, uploaded_by], (err, fileResult) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "Failed to save file metadata" });
        }

        const file_id = fileResult.insertId;

        // Now link it in `medical_records`
        const recordSql = "INSERT INTO medical_records (patient_id, record_type, title, file_id) VALUES (?, ?, ?, ?)";
        db.query(recordSql, [patient_id, record_type, title, file_id], (err2, recordResult) => {
            if (err2) {
                console.error(err2);
                return res.status(500).json({ error: "Failed to attach medical record" });
            }
            res.json({ success: true, file_path, file_id, record_id: recordResult.insertId });
        });
    });
});

app.get("/files/:userId", (req, res) => {
    const sql = "SELECT * FROM files WHERE user_id = ? ORDER BY uploaded_at DESC";
    db.query(sql, [req.params.userId], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "Failed to fetch files" });
        }
        res.json(result);
    });
});

app.get("/medical-records/:userId", (req, res) => {
    const sql = `
        SELECT mr.id, mr.patient_id, mr.record_type, mr.title, mr.uploaded_at, 
               f.file_name, f.file_path, f.file_size, f.mime_type, f.file_type
        FROM medical_records mr
        LEFT JOIN files f ON mr.file_id = f.id
        WHERE mr.patient_id = ? 
        ORDER BY mr.uploaded_at DESC
    `;
    db.query(sql, [req.params.userId], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "Failed to fetch medical records" });
        }
        res.json(result);
    });
});

app.post("/upload-profile-picture", uploadProfile.single("file"), (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No image uploaded" });

    const { user_id } = req.body;
    const profile_picture = `/uploads/profile/${req.file.filename}`;

    const sql = "UPDATE users SET profile_picture = ? WHERE id = ?";
    db.query(sql, [profile_picture, user_id], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "Failed to update profile picture" });
        }
        res.json({ success: true, profile_picture });
    });
});


/* DOCTOR DASHBOARD METRICS */

app.get("/doctor/dashboard/:doctorId", (req, res) => {
    const doctorId = req.params.doctorId;

    const queries = {
        patients: "SELECT COUNT(DISTINCT patient_id) AS count FROM consultations WHERE doctor_id = ?",
        appointmentsToday: "SELECT COUNT(*) AS count FROM appointments WHERE doctor_id = ? AND DATE(appointment_date) = CURDATE()",
        completedConsultations: "SELECT COUNT(*) AS count FROM consultations WHERE doctor_id = ?",
        pendingAppointments: "SELECT COUNT(*) AS count FROM appointments WHERE doctor_id = ? AND status = 'pending'"
    };

    let results = {
        patients: 0,
        appointmentsToday: 0,
        completedConsultations: 0,
        pendingAppointments: 0
    };

    let completed = 0;
    const totalQueries = Object.keys(queries).length;

    Object.keys(queries).forEach(key => {
        db.query(queries[key], [doctorId], (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: "Failed to fetch " + key });
            }
            results[key] = result[0].count;
            completed++;
            if (completed === totalQueries) {
                res.json(results);
            }
        });
    });
});

app.get("/doctor/charts/:doctorId", (req, res) => {
    const doctorId = req.params.doctorId;

    const visitsQuery = `
        SELECT DATE(consultation_date) AS day, COUNT(*) AS visits
        FROM consultations
        WHERE doctor_id = ?
        GROUP BY day
        ORDER BY day DESC
        LIMIT 7;
    `;

    const ratingsQuery = `
        SELECT AVG(rating) as average, DATE(created_at) as day
        FROM ratings
        WHERE doctor_id = ?
        GROUP BY day
        ORDER BY day DESC
        LIMIT 7;
    `;

    db.query(visitsQuery, [doctorId], (err, visitsResult) => {
        if (err) return res.status(500).json(err);

        // Try Ratings, but if table doesn't exist, just send empty
        db.query(ratingsQuery, [doctorId], (err2, ratingsResult) => {
            // Defaulting ratings to empty if table fails since it wasn't strictly defined earlier
            res.json({
                visits: visitsResult || [],
                ratings: err2 ? [] : ratingsResult
            });
        });
    });
});

app.get("/doctor/earnings/:doctorId", (req, res) => {
    const doctorId = req.params.doctorId;

    // Fee column doesn't exist in consultations table yet based on previous conversations. 
    // Usually it's in orders or we calculate based on completed appointments if fee is fixed.
    // If the consultations table has a fee, this will work. Otherwise we'll fallback to a basic calculation 
    // or return 0 for now until db schema confirms fee.

    const earningsQuery = `
        SELECT SUM(fee) AS total_earnings 
        FROM consultations 
        WHERE doctor_id = ?
    `;

    // History query
    const historyQuery = `
        SELECT id, patient_id, consultation_date, fee, notes
        FROM consultations 
        WHERE doctor_id = ?
        ORDER BY consultation_date DESC
    `;

    db.query(earningsQuery, [doctorId], (err, earningsResult) => {
        const total_earnings = (earningsResult && earningsResult[0] && earningsResult[0].total_earnings) ? earningsResult[0].total_earnings : 0;

        db.query(historyQuery, [doctorId], (err2, historyResult) => {
            res.json({
                total_earnings: total_earnings,
                history: err2 ? [] : historyResult
            });
        });
    });
});

/* WAITING ROOM METRICS */

app.post("/waiting-room/join", (req, res) => {
    const { doctor_id, patient_id, patient_name } = req.body;
    const sql = "INSERT INTO waiting_room (doctor_id, patient_id, patient_name, status) VALUES (?, ?, ?, 'waiting')";
    db.query(sql, [doctor_id, patient_id, patient_name], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "Failed to join waiting room" });
        }
        res.json({ success: true, id: result.insertId });
    });
});

app.get("/waiting-room/:doctorId", (req, res) => {
    const sql = "SELECT * FROM waiting_room WHERE doctor_id = ? AND status = 'waiting' ORDER BY created_at ASC";
    db.query(sql, [req.params.doctorId], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "Failed to fetch waiting room" });
        }
        res.json(result);
    });
});

app.put("/waiting-room/start/:id", (req, res) => {
    const sql = "UPDATE waiting_room SET status = 'in_consultation' WHERE id = ?";
    db.query(sql, [req.params.id], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "Failed to start consultation" });
        }
        res.json({ success: true });
    });
});

app.put("/waiting-room/complete/:id", (req, res) => {
    const sql = "UPDATE waiting_room SET status = 'completed' WHERE id = ?";
    db.query(sql, [req.params.id], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "Failed to complete consultation" });
        }
        res.json({ success: true });
    });
});
const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
