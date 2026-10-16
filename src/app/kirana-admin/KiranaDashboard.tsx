'use client'
import React, { useState, useRef, ChangeEvent, FormEvent } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  PlusCircle, Trash2, Upload, X, CheckCircle2, AlertCircle,
  Store as StoreIcon, ShoppingBasket, Tag, Package, Loader,
  ChevronDown, ChevronRight, LayoutDashboard, LogOut, Image as ImageIcon
} from 'lucide-react'
import Image from 'next/image'
import axios from 'axios'
import Link from 'next/link'
import { signOut } from 'next-auth/react'

const CATEGORIES = [
  "Fruits & Vegetables", "Dairy & Eggs", "Rice, Atta & Grains",
  "Snacks & Biscuits", "Spices & Masalas", "Beverages & Drinks",
  "Personal Care", "Household Essentials", "Instant & Packaged Food", "Baby & Pet Care"
]

const UNITS = ["kg", "g", "liter", "ml", "piece", "pack"]

interface Grocery {
  _id: string
  name: string
  category: string
  price: string
  unit: string
  image?: string
  createdAt?: string
}

interface Store {
  _id: string
  name: string
  storeCode: string
  address: string
  locality?: string
  logo?: string
  groceries: Grocery[]
}

interface Props {
  stores: Store[]
  adminName: string
  adminEmail: string
}

export default function KiranaDashboard({ stores: initialStores, adminName, adminEmail }: Props) {
  const [stores, setStores] = useState<Store[]>(initialStores)
  const [activeStoreId, setActiveStoreId] = useState<string>(initialStores[0]?._id || '')

  // Add grocery form state
  const [showForm, setShowForm] = useState(false)
  const [formName, setFormName] = useState('')
  const [formCategory, setFormCategory] = useState('')
  const [formUnit, setFormUnit] = useState('')
  const [formPrice, setFormPrice] = useState('')
  const [formImage, setFormImage] = useState<File | null>(null)
  const [formPreview, setFormPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const activeStore = stores.find(s => s._id === activeStoreId)

  const resetForm = () => {
    setFormName(''); setFormCategory(''); setFormUnit('')
    setFormPrice(''); setFormImage(null); setFormPreview(null)
    setError(null); setSuccess(null)
  }

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFormImage(file)
    setFormPreview(URL.createObjectURL(file))
  }

  const handleAddGrocery = async (e: FormEvent) => {
    e.preventDefault()
    setError(null); setSuccess(null)

    if (!formName.trim() || !formCategory || !formUnit || !formPrice.trim()) {
      setError('Please fill in all required fields.')
      return
    }

    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('name', formName.trim())
      fd.append('category', formCategory)
      fd.append('unit', formUnit)
      fd.append('price', formPrice.trim())
      fd.append('storeId', activeStoreId)
      if (formImage) fd.append('image', formImage)

      const res = await axios.post('/api/admin/add-grocery', fd)
      const newGrocery: Grocery = res.data

      // Update local state
      setStores(prev => prev.map(s =>
        s._id === activeStoreId
          ? { ...s, groceries: [newGrocery, ...s.groceries] }
          : s
      ))
      setSuccess(`"${formName}" added successfully!`)
      resetForm()
      setShowForm(false)
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to add grocery')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (groceryId: string, groceryName: string) => {
    if (!confirm(`Delete "${groceryName}"?`)) return
    setDeletingId(groceryId)
    try {
      await axios.delete(`/api/kirana/groceries?groceryId=${groceryId}`)
      setStores(prev => prev.map(s =>
        s._id === activeStoreId
          ? { ...s, groceries: s.groceries.filter(g => g._id !== groceryId) }
          : s
      ))
      setSuccess(`"${groceryName}" deleted.`)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete grocery')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] text-white font-sans">
      {/* Header */}
      <div className="border-b border-white/10 bg-white/5 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center shadow-lg">
              <StoreIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-white/50 uppercase tracking-widest font-medium">Kirana Admin Panel</p>
              <h1 className="text-sm font-bold text-white leading-tight">Snapcart Dashboard</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-semibold text-white">{adminName}</p>
              <p className="text-xs text-white/50">{adminEmail}</p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="flex items-center gap-1.5 text-xs text-white/60 hover:text-red-400 transition-colors bg-white/5 hover:bg-red-500/10 px-3 py-2 rounded-lg border border-white/10"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col lg:flex-row gap-6">
        {/* Sidebar — Store Switcher */}
        <aside className="lg:w-72 flex-shrink-0">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
            <p className="text-xs uppercase tracking-widest text-white/40 font-semibold mb-3 px-1">Your Stores</p>
            <div className="flex flex-col gap-2">
              {stores.map((store) => (
                <button
                  key={store._id}
                  onClick={() => { setActiveStoreId(store._id); setError(null); setSuccess(null) }}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-all duration-200 flex items-center gap-3 group ${
                    activeStoreId === store._id
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                      : 'border-white/5 hover:bg-white/5 hover:border-white/20 text-white/70'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    activeStoreId === store._id ? 'bg-emerald-500/30' : 'bg-white/10'
                  }`}>
                    {store.logo ? (
                      <Image src={store.logo} alt={store.name} width={32} height={32} className="rounded-lg object-cover w-8 h-8" />
                    ) : (
                      <StoreIcon className="w-4 h-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{store.name}</p>
                    <p className="text-xs opacity-60 font-mono">{store.storeCode}</p>
                  </div>
                  {activeStoreId === store._id && (
                    <ChevronRight className="w-4 h-4 ml-auto flex-shrink-0 text-emerald-400" />
                  )}
                </button>
              ))}
            </div>

            {/* Stats */}
            {activeStore && (
              <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 gap-2">
                <div className="bg-white/5 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-emerald-400">{activeStore.groceries.length}</p>
                  <p className="text-xs text-white/50 mt-0.5">Items</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-blue-400">
                    {[...new Set(activeStore.groceries.map(g => g.category))].length}
                  </p>
                  <p className="text-xs text-white/50 mt-0.5">Categories</p>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Main Panel */}
        <main className="flex-1 min-w-0">
          {/* Alerts */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start justify-between gap-3 text-sm text-red-300"
              >
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
                <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
              </motion.div>
            )}
            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-start justify-between gap-3 text-sm text-emerald-300"
              >
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{success}</span>
                </div>
                <button onClick={() => setSuccess(null)}><X className="w-4 h-4" /></button>
              </motion.div>
            )}
          </AnimatePresence>

          {activeStore && (
            <>
              {/* Store Header */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      {activeStore.storeCode}
                    </span>
                    <span className="text-xs text-white/30">•</span>
                    <span className="text-xs text-white/40 truncate max-w-[200px]">{activeStore.address}</span>
                  </div>
                  <h2 className="text-xl font-bold text-white">{activeStore.name}</h2>
                  {activeStore.locality && (
                    <p className="text-sm text-white/50 mt-0.5">{activeStore.locality}</p>
                  )}
                </div>
                <button
                  onClick={() => { resetForm(); setShowForm(true) }}
                  className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-semibold px-5 py-2.5 rounded-xl shadow-lg hover:shadow-emerald-500/30 hover:scale-105 active:scale-95 transition-all text-sm whitespace-nowrap"
                >
                  <PlusCircle className="w-4 h-4" />
                  Add Grocery
                </button>
              </div>

              {/* Add Grocery Modal/Inline Form */}
              <AnimatePresence>
                {showForm && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
                  >
                    <motion.div
                      initial={{ y: 30 }}
                      animate={{ y: 0 }}
                      className="bg-[#1e293b] border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
                    >
                      <div className="p-6">
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                              <PlusCircle className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div>
                              <h3 className="font-bold text-white">Add Grocery Item</h3>
                              <p className="text-xs text-white/40">to {activeStore.name}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => { setShowForm(false); resetForm() }}
                            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                          >
                            <X className="w-4 h-4 text-white/60" />
                          </button>
                        </div>

                        <form onSubmit={handleAddGrocery} className="flex flex-col gap-4">
                          {/* Name */}
                          <div>
                            <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-1.5">
                              Item Name <span className="text-red-400">*</span>
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Amul Milk, Basmati Rice…"
                              value={formName}
                              onChange={e => setFormName(e.target.value)}
                              required
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all text-sm"
                            />
                          </div>

                          {/* Category + Unit */}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-1.5">
                                Category <span className="text-red-400">*</span>
                              </label>
                              <select
                                value={formCategory}
                                onChange={e => setFormCategory(e.target.value)}
                                required
                                className="w-full bg-[#0f172a] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500/60 transition-all text-sm"
                              >
                                <option value="">Select…</option>
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-1.5">
                                Unit <span className="text-red-400">*</span>
                              </label>
                              <select
                                value={formUnit}
                                onChange={e => setFormUnit(e.target.value)}
                                required
                                className="w-full bg-[#0f172a] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500/60 transition-all text-sm"
                              >
                                <option value="">Select…</option>
                                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                              </select>
                            </div>
                          </div>

                          {/* Price */}
                          <div>
                            <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-1.5">
                              Price (₹) <span className="text-red-400">*</span>
                            </label>
                            <input
                              type="number"
                              placeholder="e.g. 65"
                              value={formPrice}
                              onChange={e => setFormPrice(e.target.value)}
                              required
                              min="0"
                              step="0.01"
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all text-sm"
                            />
                          </div>

                          {/* Image */}
                          <div>
                            <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-1.5">
                              Image (Optional)
                            </label>
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-emerald-500/40 text-white/70 hover:text-white px-4 py-2.5 rounded-xl transition-all text-sm"
                              >
                                <Upload className="w-4 h-4" />
                                {formPreview ? 'Change Image' : 'Upload Image'}
                              </button>
                              {formPreview && (
                                <div className="relative">
                                  <Image src={formPreview} alt="preview" width={52} height={52} className="rounded-xl object-cover w-[52px] h-[52px] border border-white/10" />
                                  <button
                                    type="button"
                                    onClick={() => { setFormImage(null); setFormPreview(null) }}
                                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors"
                                  >
                                    <X className="w-3 h-3 text-white" />
                                  </button>
                                </div>
                              )}
                            </div>
                            <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleImageChange} />
                          </div>

                          {error && (
                            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                              {error}
                            </p>
                          )}

                          <div className="flex gap-3 pt-2">
                            <button
                              type="button"
                              onClick={() => { setShowForm(false); resetForm() }}
                              className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 font-medium py-3 rounded-xl transition-all text-sm"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={loading}
                              className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-emerald-500/30 disabled:opacity-60 transition-all flex items-center justify-center gap-2 text-sm"
                            >
                              {loading ? (
                                <><Loader className="w-4 h-4 animate-spin" /> Adding…</>
                              ) : (
                                <><PlusCircle className="w-4 h-4" /> Add Item</>
                              )}
                            </button>
                          </div>
                        </form>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Grocery List */}
              {activeStore.groceries.length === 0 ? (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
                  <ShoppingBasket className="w-12 h-12 text-white/20 mx-auto mb-4" />
                  <h3 className="text-white/60 font-semibold mb-2">No groceries yet</h3>
                  <p className="text-white/30 text-sm mb-5">Start adding items to your store inventory.</p>
                  <button
                    onClick={() => { resetForm(); setShowForm(true) }}
                    className="inline-flex items-center gap-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 px-5 py-2.5 rounded-xl transition-all text-sm font-medium"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Add First Grocery
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {activeStore.groceries.map((grocery, i) => (
                    <motion.div
                      key={grocery._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all group"
                    >
                      {/* Image */}
                      <div className="h-40 bg-white/5 flex items-center justify-center relative overflow-hidden">
                        {grocery.image ? (
                          <Image
                            src={grocery.image}
                            alt={grocery.name}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                            <ImageIcon className="w-10 h-10 text-white/10" />
                            <span className="text-xs text-white/20">No image</span>
                          </div>
                        )}
                        {/* Category badge */}
                        <span className="absolute top-2 left-2 text-[10px] font-semibold bg-black/60 backdrop-blur-sm text-white/80 px-2 py-1 rounded-lg border border-white/10 max-w-[140px] truncate">
                          {grocery.category}
                        </span>
                      </div>

                      {/* Info */}
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="font-semibold text-white text-sm leading-snug line-clamp-2">
                            {grocery.name}
                          </h4>
                          <button
                            onClick={() => handleDelete(grocery._id, grocery.name)}
                            disabled={deletingId === grocery._id}
                            className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-lg bg-red-500/10 hover:bg-red-500/25 text-red-400 transition-all disabled:opacity-40"
                            title="Delete"
                          >
                            {deletingId === grocery._id
                              ? <Loader className="w-3.5 h-3.5 animate-spin" />
                              : <Trash2 className="w-3.5 h-3.5" />
                            }
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-emerald-400">₹{grocery.price}</span>
                          <span className="text-xs text-white/40 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                            per {grocery.unit}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
