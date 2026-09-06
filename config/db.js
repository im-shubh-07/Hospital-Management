const mysql = require("mysql2");
require("dotenv").config();

// ==============================================================================
// PROCESS: MySQL Connection Pooling (डेटाबेस कनेक्शन पूल)
// ==============================================================================
// 1. createConnection vs createPool:
//    - createConnection सिर्फ 1 कनेक्शन बनाता है। अगर 15 मिनट वेबसाइट पर कोई नहीं आए
//      तो MySQL कनेक्शन काट देता है, और फिर वेबसाइट एरर देने लगती है।
//    - createPool एक साथ कई कनेक्शन (जैसे 10) तैयार रखता है। जब भी कोई यूज़र वेबसाइट खोलता है,
//      उसे तुरंत एक फ्री कनेक्शन मिलता है और काम होते ही वह वापस पूल में आ जाता है।
// ==============================================================================

const db = mysql.createPool({
  host: process.env.DB_HOST,                           // क्लाउड/लोकल डेटाबेस का Host
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306, // पोर्ट (लोकल: 3306, TiDB: 4000)
  user: process.env.DB_USER,                           // डेटाबेस यूजरनेम
  password: process.env.DB_PASSWORD,                   // डेटाबेस पासवर्ड
  database: process.env.DB_NAME,                       // डेटाबेस का नाम (city_hospital)
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined, // क्लाउड डेटाबेस के लिए SSL सिक्योरिटी
  waitForConnections: true,                            // अगर सभी 10 कनेक्शन व्यस्त हैं, तो अगली रिक्वेस्ट इंतज़ार करेगी (क्रैश नहीं होगी)
  connectionLimit: 10,                                 // एक साथ अधिकतम 10 कनेक्शन खुले रहेंगे
  queueLimit: 0                                        // अनगिनत रिक्वेस्ट कतार (Queue) में लग सकती हैं
});

// ==============================================================================
// PROCESS: शुरुआती कनेक्शन की जाँच (Initial Health Check)
// ==============================================================================
db.getConnection((error, connection) => {
  if (error) {
    console.log("Database pool connection failed:", error.message);
  } else {
    console.log("MySQL Pool connected successfully");
    connection.release(); // कनेक्शन को तुरंत वापस पूल में छोड़ दिया ताकि दूसरे यूज़र उसे इस्तेमाल कर सकें
  }
});

module.exports = db;