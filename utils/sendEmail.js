import nodemailer from "nodemailer";

const sendEmail = async ({ to, subject, html }) => {
  console.log("EMAIL:", process.env.EMAIL ? "SET ✅" : "NOT SET ❌");
  console.log("EMAIL_PASSWORD:", process.env.EMAIL_PASSWORD ? "SET ✅" : "NOT SET ❌");

  const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || "gmail",
    auth: {
      user: process.env.EMAIL,
      pass: process.env.EMAIL_PASSWORD,
    },
    connectionTimeout: 10000, // 10 seconds timeout
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });

  try {
    const info = await transporter.sendMail({
      from: `"Smart Khata" <${process.env.EMAIL}>`,
      to,
      subject,
      html,
    });
    return info;
  } catch (err) {
    console.error("❌ Nodemailer error:", err.message);
    throw err;
  }
};

export default sendEmail;