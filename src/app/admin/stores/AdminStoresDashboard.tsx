'use client'
import React, { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import axios from 'axios'
import { CheckCircle2, Copy, Loader2, Package, Plus, QrCode, Store, X } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

interface IAdminUser {
  _id: string
  name: string
  email: string
  role?: string
}

interface IStore {
  _id: string
  name: string
  address: string
  locality?: string
  contactInfo?: string
  logo?: string
  storeCode: string
  status: 'pending' | 'approved' | 'rejected'
  owner?: IAdminUser | string
  assignedAdmins?: IAdminUser[]
}

interface Props {
  stores: IStore[]
  isSuperAdmin?: boolean
  currentUserId?: string
}

// We'll generate QR as a data URL using the qrcode package (already in package.json)
async function generateQR(text: string): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const QRCode = require('qrcode')
  return QRCode.toDataURL(text, { width: 280, margin: 2, color: { dark: '#166534', light: '#fff' } })
}

export default function AdminStoresDashboard({ stores: initialStores, isSuperAdmin = false, currentUserId }: Props) {
  const [stores, setStores] = useState<IStore[]>(initialStores)
  const [showQR, setShowQR] = useState<{ store: IStore; qrUrl: string } | null>(null)
  const [qrLoading, setQrLoading] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  // New store form (Super Admin only)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', address: '', locality: '', contactInfo: '', adminEmail: '' })
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState('')

  // Assign Kirana Admin modal (Super Admin only)
  const [assignModal, setAssignModal] = useState<{ store: IStore } | null>(null)
  const [assignEmail, setAssignEmail] = useState('')
  const [assignLoading, setAssignLoading] = useState(false)
  const [assignError, setAssignError] = useState('')
  const [assignSuccess, setAssignSuccess] = useState('')

  const handleOpenQR = async (store: IStore) => {
    setQrLoading(true)
    try {
      const qrUrl = await generateQR(store.storeCode)
      setShowQR({ store, qrUrl })
    } finally {
      setQrLoading(false)
    }
  }

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code).catch(() => {})
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)
    setFormError('')
    try {
      const res = await axios.post('/api/admin/store/create', form)
      setStores(prev => [res.data.store, ...prev])
      setForm({ name: '', address: '', locality: '', contactInfo: '', adminEmail: '' })
      setShowForm(false)
    } catch (err: any) {
      setFormError(err?.response?.data?.message ?? 'Failed to create store')
    } finally {
      setFormLoading(false)
    }
  }

  const handleAssignAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!assignModal?.store?._id || !assignEmail.trim()) return
    setAssignLoading(true)
    setAssignError('')
    setAssignSuccess('')
    try {
      const res = await axios.post('/api/admin/store/assign-admin', {
        storeId: assignModal.store._id,
        email: assignEmail.trim(),
      })
      setAssignSuccess(res.data.message)
      // Update local store state
      setStores(prev => prev.map(s => {
        if (s._id === assignModal.store._id) {
          const currentAdmins = s.assignedAdmins || []
          return {
            ...s,
            assignedAdmins: [...currentAdmins.filter(a => a.email !== res.data.user.email), res.data.user]
          }
        }
        return s
      }))
      setTimeout(() => {
        setAssignModal(null)
        setAssignEmail('')
        setAssignSuccess('')
      }, 1800)
    } catch (err: any) {
      setAssignError(err?.response?.data?.message || 'Failed to authenticate Kirana admin')
    } finally {
      setAssignLoading(false)
    }
  }

  const statusColor = (s: IStore['status']) =>
    s === 'approved' ? 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400'
    : s === 'pending' ? 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400'
    : 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400'

  return (
    <div className="w-full min-h-screen bg-gray-50 dark:bg-gray-950 pt-24 sm:pt-28 pb-16">
      {/* QR Modal */}
      <AnimatePresence>
        {showQR && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
            onClick={e => { if (e.target === e.currentTarget) setShowQR(null) }}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-7 max-w-xs w-full border border-gray-100 dark:border-gray-800 text-center"
            >
              <button onClick={() => setShowQR(null)} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition">
                <X className="w-5 h-5" />
              </button>

              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-1">{showQR.store.name}</h2>
              <p className="text-xs text-gray-400 mb-4">Show this QR to your customers</p>

              <div className="flex justify-center mb-4">
                <Image src={showQR.qrUrl} alt="QR Code" width={200} height={200} className="rounded-xl" />
              </div>

              <div className="flex items-center justify-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-2 border border-gray-200 dark:border-gray-700 mb-4">
                <span className="font-mono font-bold text-green-700 dark:text-green-400 text-lg tracking-widest">
                  {showQR.store.storeCode}
                </span>
                <button onClick={() => handleCopy(showQR.store.storeCode)} className="text-gray-400 hover:text-green-600 transition">
                  {copied === showQR.store.storeCode ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <p className="text-xs text-gray-400 leading-relaxed">
                Customers can scan this QR or type the code <span className="font-semibold">{showQR.store.storeCode}</span> in the Snapcart app to shop from your store.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Assign Kirana Admin Modal (Super Admin only) */}
      <AnimatePresence>
        {assignModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
            onClick={e => { if (e.target === e.currentTarget) setAssignModal(null) }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-6 sm:p-7 max-w-md w-full border border-gray-100 dark:border-gray-800"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">👑 Authenticate Kirana Admin</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Store: <span className="font-semibold text-green-600">{assignModal.store.name}</span></p>
                </div>
                <button onClick={() => setAssignModal(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAssignAdmin} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 block">
                    Kirana Admin Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="kiranaowner@example.com"
                    value={assignEmail}
                    onChange={e => setAssignEmail(e.target.value)}
                    className="w-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 text-gray-800 dark:text-gray-100"
                  />
                  <p className="text-[11px] text-gray-400 mt-1.5">
                    This user will receive full Kirana Admin access to add groceries and manage orders for this store.
                  </p>
                </div>

                {assignError && <p className="text-xs text-red-500 font-medium">{assignError}</p>}
                {assignSuccess && <p className="text-xs text-green-600 font-medium">{assignSuccess}</p>}

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setAssignModal(null)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-medium text-xs hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={assignLoading}
                    className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs shadow transition flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {assignLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Authenticate Admin"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
                {isSuperAdmin ? "👑 Store Control Center" : "🏪 My Kirana Store"}
              </h1>
              {isSuperAdmin && (
                <span className="text-xs bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-bold px-2.5 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
                  Super Admin
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {isSuperAdmin
                ? "Register Kirana stores and authenticate store owners"
                : "Manage your Kirana store, add groceries, and serve customers"}
            </p>
          </div>
          {/* Only Super Admin can register new stores */}
          {isSuperAdmin && (
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm shadow transition"
            >
              <Plus className="w-4 h-4" />
              Register Kirana Store
            </motion.button>
          )}
        </div>

        {/* Create Store Form (Super Admin only) */}
        <AnimatePresence>
          {showForm && isSuperAdmin && (
            <motion.form
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              onSubmit={handleCreateStore}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-md border border-gray-100 dark:border-gray-800 p-6 mb-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-gray-800 dark:text-gray-100 text-lg">Register New Kirana Store</h2>
                <button type="button" onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">Store Name *</label>
                  <input required placeholder="Owais Kirana Store" value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    className="w-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 text-gray-800 dark:text-gray-100" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">Full Address *</label>
                  <input required placeholder="123, MG Road" value={form.address}
                    onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                    className="w-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 text-gray-800 dark:text-gray-100" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">Locality / Area</label>
                  <input placeholder="Koramangala, Bangalore" value={form.locality}
                    onChange={e => setForm(p => ({ ...p, locality: e.target.value }))}
                    className="w-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 text-gray-800 dark:text-gray-100" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">Contact / Phone</label>
                  <input placeholder="9876543210" value={form.contactInfo}
                    onChange={e => setForm(p => ({ ...p, contactInfo: e.target.value }))}
                    className="w-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 text-gray-800 dark:text-gray-100" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">
                    Assign Kirana Admin (Email) <span className="text-gray-400 font-normal">(Optional, or assign later)</span>
                  </label>
                  <input
                    type="email"
                    placeholder="kiranaadmin@example.com"
                    value={form.adminEmail}
                    onChange={e => setForm(p => ({ ...p, adminEmail: e.target.value }))}
                    className="w-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 text-gray-800 dark:text-gray-100"
                  />
                </div>
              </div>
              {formError && <p className="text-red-500 text-sm mt-3">{formError}</p>}
              <div className="flex gap-3 mt-5">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition text-sm">
                  Cancel
                </button>
                <button type="submit" disabled={formLoading}
                  className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold transition shadow text-sm flex items-center justify-center gap-2 disabled:opacity-60">
                  {formLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {formLoading ? 'Creating...' : 'Register Store'}
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Stores list */}
        {stores.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-gray-400 dark:text-gray-500">
            <Store className="w-12 h-12 opacity-40" />
            <p className="font-medium">
              {isSuperAdmin
                ? "No kirana stores registered yet. Click 'Register Kirana Store' above."
                : "You don't have an assigned Kirana store yet. Contact the Super Admin."}
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            {stores.map((store, i) => {
              const assignedCount = (store.assignedAdmins || []).length
              return (
                <motion.div
                  key={store._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm hover:shadow-md transition-all border border-gray-100 dark:border-gray-800 p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                        <Store className="w-6 h-6 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="font-bold text-gray-800 dark:text-gray-100 truncate">{store.name}</h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{store.locality ?? store.address}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 capitalize ${statusColor(store.status)}`}>
                      {store.status}
                    </span>
                  </div>

                  {/* Super Admin Assigned Admins Info */}
                  {isSuperAdmin && (
                    <div className="mt-3 bg-purple-50 dark:bg-purple-950/30 rounded-xl p-3 border border-purple-100 dark:border-purple-900/40">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-[11px] font-bold text-purple-700 dark:text-purple-300">
                          👥 Kirana Admin(s): {assignedCount}
                        </p>
                        <button
                          onClick={() => setAssignModal({ store })}
                          className="text-[11px] font-bold text-purple-700 dark:text-purple-300 hover:underline"
                        >
                          + Authenticate Admin
                        </button>
                      </div>
                      {assignedCount === 0 ? (
                        <p className="text-[11px] text-gray-400 italic">No Kirana admin assigned yet</p>
                      ) : (
                        <div className="space-y-1">
                          {store.assignedAdmins?.map(admin => (
                            <div key={admin._id} className="text-xs text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                              <span className="font-semibold">{admin.name}</span>
                              <span className="text-[11px] text-gray-400 font-mono">({admin.email})</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Store code row */}
                  <div className="flex items-center justify-between mt-3 bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-2.5 border border-gray-100 dark:border-gray-700">
                    <div>
                      <p className="text-[10px] text-gray-400 font-medium mb-0.5">Store Code</p>
                      <span className="font-mono font-bold text-green-700 dark:text-green-400 tracking-widest text-base">
                        {store.storeCode}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopy(store.storeCode)}
                        title="Copy code"
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition"
                      >
                        {copied === store.storeCode
                          ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                          : <Copy className="w-4 h-4 text-gray-500 dark:text-gray-400" />}
                      </button>
                      <button
                        onClick={() => handleOpenQR(store)}
                        title="Show QR code"
                        disabled={qrLoading}
                        className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition shadow-sm"
                      >
                        {qrLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <QrCode className="w-3.5 h-3.5" />}
                        QR Code
                      </button>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-3">
                    {/* Only Kirana Admins (non-superAdmin) have Add Grocery */}
                    {!isSuperAdmin ? (
                      <Link
                        href={`/admin/add-grocery?storeId=${store._id}`}
                        className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40 rounded-xl py-2.5 transition border border-green-100 dark:border-green-900/50"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Grocery
                      </Link>
                    ) : (
                      <button
                        onClick={() => setAssignModal({ store })}
                        className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/60 rounded-xl py-2.5 transition border border-purple-200 dark:border-purple-800"
                      >
                        👥 Authenticate Admin
                      </button>
                    )}
                    <Link
                      href={`/store/${store._id}`}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl py-2.5 transition border border-gray-100 dark:border-gray-700"
                    >
                      <Package className="w-3.5 h-3.5" /> View Storefront
                    </Link>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
