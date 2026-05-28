import nodemailer from "nodemailer";

const sendEmail = async ({ to, subject, html }) => {
  console.log("📧 sendEmail called");
  console.log("EMAIL:", process.env.EMAIL ? "SET ✅" : "NOT SET ❌");
  console.log("EMAIL_PASSWORD:", process.env.EMAIL_PASSWORD ? "SET ✅" : "NOT SET ❌");

  const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || "gmail",
    auth: {
      user: process.env.EMAIL,           // ✅ matches your Render key
      pass: process.env.EMAIL_PASSWORD,  // ✅ matches your Render key
    },
  });

  try {
    const info = await transporter.sendMail({
      from: `"Smart Khata" <${process.env.EMAIL}>`,
      to,
      subject,
      html,
    });
    console.log("✅ Email sent:", info.messageId);
    return info;
  } catch (err) {
    console.error("❌ Nodemailer error:", err.message);
    throw err;
  }
};

export default sendEmail;