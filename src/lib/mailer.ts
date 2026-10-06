import nodemailer from "nodemailer"

function getTransporter() {
  const clean = (val?: string) => val ? val.replace(/^["']|["']$/g, '').trim() : ''
  const email = clean(process.env.EMAIL)
  const pass = clean(process.env.PASS)

  if (!email || !pass) {
    throw new Error("Email credentials (EMAIL, PASS) are not configured in environment variables.")
  }

  return {
    transporter: nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: email,
        pass: pass
      }
    }),
    fromEmail: email
  }
}

export const sendMail = async (to: string, subject: string, html: string) => {
  if (!to || !to.includes("@")) {
    throw new Error(`Invalid recipient email address: "${to}"`)
  }

  const { transporter, fromEmail } = getTransporter()

  console.log(`[Mailer] Sending email: "${subject}" to: ${to.replace(/(.{2})(.*)(@.*)/, "$1***$3")}`)

  try {
    const info = await transporter.sendMail({
      from: `"Snapcart" <${fromEmail}>`,
      to: to.trim(),
      subject,
      html
    })

    console.log(`[Mailer] Email sent successfully! MessageId: ${info.messageId}`)
    return info
  } catch (error: any) {
    console.error(`[Mailer] Failed to send email to ${to.replace(/(.{2})(.*)(@.*)/, "$1***$3")}:`, error?.message || error)
    throw new Error(`Email sending failed: ${error?.message || "Unknown SMTP error"}`)
  }
}