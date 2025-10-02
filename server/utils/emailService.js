import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Reusable function to send emails
export const sendEmail = async ({ to, subject, text, html }) => {
  try {
    if (!to) throw new Error("Recipient email required");

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject,
      text,
      html,
    };

    await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent to ${to} | Subject: ${subject}`);
    return true;
  } catch (error) {
    console.error("❌ Error sending email:", error.message);
    return false;
  }
};
