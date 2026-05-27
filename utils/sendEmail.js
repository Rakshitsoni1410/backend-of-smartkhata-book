import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendMail = async (email, name) => {
  // SEND WELCOME EMAIL
  try {
    console.log("Sending email to:", email);

    const emailResponse = await sendEmail({
      to: email.toLowerCase().trim(),

      subject: "Welcome to Smart Khata 🎉",

      html: `
      <div style="font-family:Arial,sans-serif;padding:20px">
        <h2>Hello ${name},</h2>

        <p>
          Your Smart Khata account has been created successfully.
        </p>

        <p>
          Welcome to Smart Khata 🚀
        </p>

        <br/>

        <p>
          Thanks,<br/>
          Smart Khata Team
        </p>
      </div>
    `,
    });

    console.log("EMAIL SENT SUCCESS");
    console.log(emailResponse);

  } catch (error) {
    console.log("EMAIL FAILED");
    console.log(error.message);
  }
};