import dotenv from "dotenv";
dotenv.config();

import { Resend } from "resend";

const resend = new Resend(
  process.env.RESEND_API_KEY
);

const sendEmail = async ({
  to,
  subject,
  html,
}) => {

  try {

    console.log(
      "API KEY:",
      process.env.RESEND_API_KEY
    );

    const response =
      await resend.emails.send({
        from: "onboarding@resend.dev",
        to,
        subject,
        html,
      });

    console.log("Email Sent:", response);

  } catch (error) {

    console.log(error);

  }
};

export default sendEmail;