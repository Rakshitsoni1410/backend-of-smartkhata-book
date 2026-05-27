import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",

  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// CHECK SMTP CONNECTION
transporter.verify((error, success) => {
  if (error) {
    console.log("SMTP ERROR:", error);
  } else {
    console.log("SMTP READY");
  }
});

// MAIN SEND FUNCTION
const sendMail = async (to, subject, html) => {
  try {
    // CHECK REQUIRED VALUES
    if (!process.env.EMAIL || !process.env.EMAIL_PASSWORD) {
      throw new Error("Email credentials missing in .env");
    }

    const info = await transporter.sendMail({
      from: `"SmartKhata Book" <${process.env.EMAIL}>`,
      to,
      subject,
      html,
    });

    console.log("Email sent:", info.messageId);

    return info;
  } catch (error) {
    console.error("Email sending failed:");
    console.log(error);

    return undefined;
  }
};

// SEND WELCOME EMAIL
export const sendWelcomeEmail = async (
  to,
  subject,
  html
) => {
  return sendMail(to, subject, html);
};

// GENERIC EMAIL FUNCTION
export const sendEmail = async (
  toOrOptions,
  subject,
  html
) => {
  // OBJECT FORMAT
  if (
    typeof toOrOptions === "object" &&
    toOrOptions !== null
  ) {
    const {
      to,
      subject: mailSubject,
      html: mailHtml,
    } = toOrOptions;

    return sendMail(
      to,
      mailSubject,
      mailHtml
    );
  }

  // NORMAL FORMAT
  return sendMail(
    toOrOptions,
    subject,
    html
  );
};

export default sendEmail;