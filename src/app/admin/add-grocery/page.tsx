'use client'
import { AlertCircle, ArrowLeft, CheckCircle2, Loader, PlusCircle, Trash2, Upload, X } from 'lucide-react'
import Link from 'next/link'
import React, { ChangeEvent, FormEvent, useState } from 'react'
import { motion, AnimatePresence } from "motion/react"
import Image from 'next/image'
import axios from 'axios'

const categories = [
    "Fruits & Vegetables",
    "Dairy & Eggs",
    "Rice, Atta & Grains",
    "Snacks & Biscuits",
    "Spices & Masalas",
    "Beverages & Drinks",
    "Personal Care",
    "Household Essentials",
    "Instant & Packaged Food",
    "Baby & Pet Care"
]

const units = [
    "kg", "g", "liter", "ml", "piece", "pack"
]

function AddGrocery() {
    const [name, setName] = useState("")
    const [category, setCategory] = useState("")
    const [unit, setUnit] = useState("")
    const [price, setPrice] = useState("")
    const [loading, setLoading] = useState(false)
    const [preview, setPreview] = useState<string | null>(null)
    const [backendImage, setBackendImage] = useState<File | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files || files.length === 0) return
        const file = files[0]
        setBackendImage(file)
        setPreview(URL.createObjectURL(file))
        setError(null)
    }

    const removeImage = () => {
        setBackendImage(null)
        setPreview(null)
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setError(null)
        setSuccess(null)

        if (!name.trim() || !category || !unit || !price.trim()) {
            setError("Please fill in all required fields (Name, Category, Unit, and Price).")
            return
        }

        setLoading(true)
        try {
            const formData = new FormData()
            formData.append("name", name.trim())
            formData.append("category", category)
            formData.append("price", price.trim())
            formData.append("unit", unit)
            if (backendImage) {
                formData.append("image", backendImage)
            }

            const result = await axios.post("/api/admin/add-grocery", formData)
            console.log("Grocery added:", result.data)
            
            setSuccess(`Grocery "${name}" added successfully!`)
            setName("")
            setCategory("")
            setUnit("")
            setPrice("")
            setBackendImage(null)
            setPreview(null)
        } catch (err: any) {
            console.error("Failed to add grocery:", err)
            const errorMsg = err.response?.data?.message || err.message || "Failed to add grocery. Please try again."
            setError(errorMsg)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className='min-h-screen flex items-center justify-center bg-linear-to-br from-green-50 to-white dark:from-gray-900 dark:to-gray-800 py-20 px-4 relative w-full'>
            <Link href={"/"} className='absolute top-4 left-4 sm:top-6 sm:left-6 flex items-center gap-2 text-green-700 dark:text-green-400 font-semibold bg-white dark:bg-gray-800 px-4 py-2 rounded-full shadow-md hover:bg-green-100 transition-all border border-gray-100 dark:border-gray-700 text-sm sm:text-base'>
                <ArrowLeft className='w-4 h-4 sm:w-5 sm:h-5' />
                <span>Back to Home</span>
            </Link>
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.4 }}
                className='bg-white dark:bg-gray-800 w-full max-w-2xl shadow-2xl rounded-3xl border border-green-100 dark:border-gray-700 p-6 sm:p-8 mt-12 sm:mt-0'
            >
                <div className='flex flex-col items-center mb-8'>
                    <div className='flex items-center gap-3'>
                        <PlusCircle className='text-green-600 w-8 h-8' />
                        <h1 className='text-2xl font-bold text-gray-800'>Add Your Grocery</h1>
                    </div>
                    <p className='text-gray-500 text-sm mt-2 text-center'>
                        Fill out the details below to add a new grocery item.
                    </p>
                </div>

                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className='mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-start justify-between gap-3 text-sm'
                        >
                            <div className='flex items-start gap-2.5'>
                                <AlertCircle className='w-5 h-5 shrink-0 text-red-500 mt-0.5' />
                                <span className='font-medium'>{error}</span>
                            </div>
                            <button
                                type='button'
                                onClick={() => setError(null)}
                                className='text-red-400 hover:text-red-700 transition'
                            >
                                <X className='w-4 h-4' />
                            </button>
                        </motion.div>
                    )}

                    {success && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className='mb-6 p-4 rounded-xl bg-green-50 border border-green-200 text-green-800 flex items-start justify-between gap-3 text-sm'
                        >
                            <div className='flex items-start gap-2.5'>
                                <CheckCircle2 className='w-5 h-5 shrink-0 text-green-600 mt-0.5' />
                                <span className='font-medium'>{success}</span>
                            </div>
                            <button
                                type='button'
                                onClick={() => setSuccess(null)}
                                className='text-green-600 hover:text-green-800 transition'
                            >
                                <X className='w-4 h-4' />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                <form className='flex flex-col gap-6 w-full' onSubmit={handleSubmit}>
                    <div>
                        <label htmlFor="name" className='block text-gray-700 font-medium mb-1'> Grocery Name <span className='text-red-500'>*</span></label>
                        <input
                            type="text"
                            id='name'
                            placeholder='eg: Sweets, Milk...' 
                            onChange={(e) => setName(e.target.value)}
                            value={name}
                            required
                            className='w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-400 transition-all'
                        />
                    </div>
                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                        <div>
                            <label className='block text-gray-700 font-medium mb-1'>Category <span className='text-red-500'>*</span></label>
                            <select
                                name="category"
                                value={category}
                                required
                                className='w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-400 transition-all bg-white'
                                onChange={(e) => setCategory(e.target.value)}
                            >
                                <option value="">Select Category</option>
                                {categories.map((cat, i) => (
                                    <option key={i} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className='block text-gray-700 font-medium mb-1'>Unit <span className='text-red-500'>*</span></label>
                            <select
                                name="unit"
                                className='w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-400 transition-all bg-white'
                                onChange={(e) => setUnit(e.target.value)}
                                value={unit}
                                required
                            >
                                <option value="">Select Unit</option>
                                {units.map((u, i) => (
                                    <option key={i} value={u}>{u}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="price" className='block text-gray-700 font-medium mb-1'> Price (₹) <span className='text-red-500'>*</span></label>
                        <input
                            type="text"
                            id='price'
                            placeholder='eg. 120'
                            className='w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-400 transition-all'
                            onChange={(e) => setPrice(e.target.value)}
                            value={price}
                            required
                        />
                    </div>
                    <div className='flex flex-col sm:flex-row items-start sm:items-center gap-5'>
                        <label htmlFor="image" className='cursor-pointer flex items-center justify-center gap-2 bg-green-50 text-green-700 font-semibold border border-green-200 rounded-xl px-6 py-3 hover:bg-green-100 transition-all w-full sm:w-auto'>
                            <Upload className='w-5 h-5' />
                            {preview ? "Change image" : "Upload image (Optional)"}
                        </label>

                        <input
                            type="file"
                            id='image'
                            accept='image/*'
                            hidden 
                            onChange={handleImageChange}
                        />
                        {preview && (
                            <div className='relative group'>
                                <Image
                                    src={preview}
                                    width={90}
                                    height={90}
                                    alt='image preview'
                                    className='rounded-xl shadow-md border border-gray-200 object-cover w-[90px] h-[90px]'
                                />
                                <button
                                    type='button'
                                    onClick={removeImage}
                                    className='absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow hover:bg-red-600 transition'
                                    title='Remove image'
                                >
                                    <Trash2 className='w-3.5 h-3.5' />
                                </button>
                            </div>
                        )}
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        disabled={loading}
                        type='submit'
                        className='mt-4 w-full bg-linear-to-r from-green-500 to-green-700 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl disabled:opacity-60 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed'
                    >
                        {loading ? (
                            <>
                                <Loader className='w-5 h-5 animate-spin' />
                                <span>Adding Grocery...</span>
                            </>
                        ) : (
                            "Add Grocery"
                        )}
                    </motion.button>
                </form>
            </motion.div>
        </div>
    )
}

export default AddGrocery

