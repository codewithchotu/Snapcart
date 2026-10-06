import { v2 as cloudinary } from 'cloudinary'


function getCloudinaryConfig() {
  const clean = (val?: string) => val ? val.replace(/^["']|["']$/g, '').trim() : ''

  const cloud_name = clean(process.env.CLOUDINARY_CLOUD_NAME)
  const api_key = clean(process.env.CLOUDINARY_API_KEY)
  const api_secret = clean(process.env.CLOUDINARY_API_SECRET)
  const cloudinary_url = clean(process.env.CLOUDINARY_URL)

  if (cloudinary_url) {
    cloudinary.config({ cloudinary_url })
    return true
  }

  if (cloud_name && api_key && api_secret) {
    cloudinary.config({
      cloud_name,
      api_key,
      api_secret,
      secure: true
    })
    return true
  }

  return false
}

const uploadOnCloudinary = async (file: Blob): Promise<string | null> => {
  if (!file || !(file instanceof Blob) || file.size === 0) {
    return null
  }

  const isConfigured = getCloudinaryConfig()
  if (!isConfigured) {
    throw new Error("Cloudinary credentials are not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET (or CLOUDINARY_URL) in .env.local.")
  }

  try {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    const resultUrl = await new Promise<string>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { resource_type: "auto" },
        (error, result) => {
          if (error) {
            console.error("Cloudinary upload stream error:", error.message || error)
            reject(error)
          } else if (result?.secure_url) {
            resolve(result.secure_url)
          } else {
            reject(new Error("Cloudinary upload failed: No secure URL returned"))
          }
        }
      )
      uploadStream.end(buffer)
    })

    return resultUrl
  } catch (error: any) {
    console.error("Error in uploadOnCloudinary:", error?.message || error)
    throw new Error(error?.message || "Failed to upload image to Cloudinary")
  }
}

export default uploadOnCloudinary
