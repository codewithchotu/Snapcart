/**
 * Full order status debug — shows all orders with OTP state
 */
import mongoose from 'mongoose'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load .env.local
try {
  const envPath = join(__dirname, '..', '.env.local')
  const envContent = readFileSync(envPath, 'utf8')
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '')
    if (!process.env[key]) process.env[key] = val
  }
} catch (e) {
  console.error('Could not load .env.local:', e.message)
}

const MONGODB_URL = process.env.MONGODB_URL
if (!MONGODB_URL) { console.error('MONGODB_URL missing'); process.exit(1) }

const orderSchema = new mongoose.Schema({
  user: mongoose.Schema.Types.ObjectId,
  status: String,
  deliveryOtp: { type: String, default: null },
  deliveryOtpVerification: { type: Boolean, default: false },
  deliveredAt: Date
}, { timestamps: true, strict: false })

async function main() {
  await mongoose.connect(MONGODB_URL)
  console.log('Connected to MongoDB\n')

  const Order = mongoose.model('Order', orderSchema)
  const orders = await Order.find({}).sort({ createdAt: -1 }).limit(10).lean()
  
  console.log(`=== ALL ORDERS (last 10) ===`)
  for (const order of orders) {
    const otp = order.deliveryOtp
    const otpInfo = otp ? `length=${otp.toString().length}, codes=[${[...otp.toString()].map(c => c.charCodeAt(0)).join(',')}]` : 'null'
    console.log(`\nOrder: ${order._id}`)
    console.log(`  status: ${order.status}`)
    console.log(`  verified: ${order.deliveryOtpVerification}`)
    console.log(`  deliveryOtp: ${otpInfo}`)
    console.log(`  createdAt: ${order.createdAt}`)
  }

  await mongoose.disconnect()
}

main().catch(err => { console.error(err.message); process.exit(1) })
