'use client'
import React, { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import axios from 'axios'
import Image from 'next/image'
import Link from 'next/link'
import {
  Camera,
  ChevronRight,
  Loader2,
  Package,
  Plus,
  QrCode,
  Store,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'

interface ISavedStore {
  _id: string
  name: string
  address: string
  locality?: string
  contactInfo?: string
  logo?: string
  storeCode: string
}

export default function MyStoresSection() {
  const [stores, setStores] = useState<ISavedStore[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [inputCode, setInputCode] = useState("")
  const [joinLoading, setJoinLoading] = useState(false)
  const [joinResult, setJoinResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [scanMode, setScanMode] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Fetch saved stores
  const fetchStores = async () => {
    setLoading(true)
    try {
      const res = await axios.get('/api/user/my-stores')
      setStores(res.data.stores ?? [])
    } catch {
      setStores([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchStores() }, [])

  // Close modal cleanup
  const closeModal = () => {
    setShowModal(false)
    setInputCode("")
    setJoinResult(null)
    setScanMode(false)
    stopCamera()
  }

  // Camera helpers
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
      setScanMode(true)
      // Poll for QR using BarcodeDetector (Chrome/Edge) or fall back to manual input
      if ('BarcodeDetector' in window) {
        const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] })
        scanIntervalRef.current = setInterval(async () => {
          if (!videoRef.current) return
          try {
            const barcodes = await detector.detect(videoRef.current)
            if (barcodes.length > 0) {
              const raw: string = barcodes[0].rawValue
              stopCamera()
              setInputCode(raw.trim().toUpperCase())
              setScanMode(false)
            }
          } catch { /* ignore */ }
        }, 600)
      }
    } catch {
      alert("Camera not accessible. Please enter the code manually.")
    }
  }

  const stopCamera = () => {
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current)
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setScanMode(false)
  }

  // Join store by code
  const handleJoin = async () => {
    if (!inputCode.trim()) return
    setJoinLoading(true)
    setJoinResult(null)
    try {
      const res = await axios.post('/api/user/join-store', { storeCode: inputCode.trim() })
      setJoinResult({ type: 'success', message: res.data.message ?? 'Store joined!' })
      await fetchStores()
      // Auto close after 1.5s
      setTimeout(closeModal, 1500)
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Invalid code or store not found.'
      setJoinResult({ type: 'error', message: msg })
    } finally {
      setJoinLoading(false)
    }
  }

  // Remove a saved store
  const handleRemove = async (storeId: string) => {
    setRemovingId(storeId)
    try {
      await axios.delete('/api/user/my-stores', { data: { storeId } })
      setStores(prev => prev.filter(s => s._id !== storeId))
    } catch { /* ignore */ }
    finally { setRemovingId(null) }
  }

  return (
    <section className="w-full max-w-7xl xl:max-w-[1550px] 2xl:max-w-[1750px] mx-auto px-3 sm:px-6 lg:px-8 mt-10 mb-6">
      {/* Section header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100">
            🏪 My Kirana Stores
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {stores.length === 0
              ? "Add a store by entering its unique code"
              : `${stores.length} store${stores.length > 1 ? 's' : ''} saved`}
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm shadow transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Store
        </motion.button>
      </div>

      {/* Store cards grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-green-500" />
        </div>
      ) : stores.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-14 gap-4 bg-white dark:bg-gray-900 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700"
        >
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <Store className="w-8 h-8 text-green-500" />
          </div>
          <p className="text-gray-500 dark:text-gray-400 font-medium text-center max-w-xs">
            No stores yet. Ask your kirana store owner for their store code and add it here.
          </p>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow"
          >
            <QrCode className="w-4 h-4" /> Add your first store
          </motion.button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {stores.map((store, i) => (
            <motion.div
              key={store._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="group relative bg-white dark:bg-gray-900 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-800 overflow-hidden"
            >
              {/* Remove button */}
              <button
                onClick={(e) => { e.preventDefault(); handleRemove(store._id) }}
                className="absolute top-3 right-3 z-10 w-7 h-7 flex items-center justify-center rounded-full bg-white/80 dark:bg-gray-800/80 shadow opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50 dark:hover:bg-red-900/30"
                disabled={removingId === store._id}
              >
                {removingId === store._id
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin text-red-400" />
                  : <Trash2 className="w-3.5 h-3.5 text-red-400" />}
              </button>

              <Link href={`/store/${store._id}`} className="flex flex-col h-full">
                {/* Store logo / banner */}
                <div className="w-full h-28 bg-gradient-to-br from-green-100 to-emerald-200 dark:from-green-900/30 dark:to-emerald-900/30 flex items-center justify-center relative overflow-hidden">
                  {store.logo ? (
                    <Image src={store.logo} alt={store.name} fill className="object-cover opacity-80" />
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <Store className="w-10 h-10 text-green-600/60 dark:text-green-400/60" />
                    </div>
                  )}
                  {/* Store code badge */}
                  <span className="absolute bottom-2 right-2 text-[10px] font-mono bg-white/80 dark:bg-gray-900/80 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full shadow">
                    {store.storeCode}
                  </span>
                </div>

                {/* Info */}
                <div className="p-4 flex flex-col flex-1 justify-between">
                  <div>
                    <h3 className="font-bold text-gray-800 dark:text-gray-100 text-base leading-tight line-clamp-1">
                      {store.name}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
                      📍 {store.locality ?? store.address}
                    </p>
                    {store.contactInfo && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">📞 {store.contactInfo}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <span className="text-xs text-green-600 dark:text-green-400 font-semibold flex items-center gap-1">
                      <Package className="w-3.5 h-3.5" /> View Products
                    </span>
                    <ChevronRight className="w-4 h-4 text-green-500 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}

          {/* Add more store card */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: stores.length * 0.07 }}
            onClick={() => setShowModal(true)}
            className="group bg-white dark:bg-gray-900 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-green-400 dark:hover:border-green-600 transition-all duration-300 flex flex-col items-center justify-center gap-3 py-10 px-4"
          >
            <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Plus className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
              Add another store
            </span>
          </motion.button>
        </div>
      )}

      {/* ——— Add Store Modal ——— */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
            onClick={(e) => { if (e.target === e.currentTarget) closeModal() }}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0, y: 30 }}
              transition={{ type: "spring", stiffness: 220, damping: 22 }}
              className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-md border border-gray-100 dark:border-gray-800 overflow-hidden"
            >
              {/* Modal header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-green-600 to-emerald-700">
                <div className="flex items-center gap-3">
                  <QrCode className="w-5 h-5 text-white" />
                  <h2 className="text-lg font-bold text-white">Add Kirana Store</h2>
                </div>
                <button onClick={closeModal} className="text-white/80 hover:text-white transition">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6">
                {/* QR camera view */}
                <AnimatePresence>
                  {scanMode && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 240 }}
                      exit={{ opacity: 0, height: 0 }}
                      className="relative rounded-2xl overflow-hidden mb-5 bg-black"
                    >
                      <video
                        ref={videoRef}
                        autoPlay
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                      />
                      {/* Scan overlay */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-40 h-40 border-4 border-green-400 rounded-2xl shadow-lg" />
                      </div>
                      <button
                        onClick={stopCamera}
                        className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1.5 hover:bg-black/80 transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <p className="absolute bottom-2 left-0 right-0 text-center text-white/70 text-xs">
                        Point camera at QR code
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Instruction */}
                {!scanMode && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 leading-relaxed">
                    Enter the <span className="font-semibold text-gray-700 dark:text-gray-200">unique store code</span> given by your kirana store owner, or scan the QR code displayed at the shop.
                  </p>
                )}

                {/* Code input */}
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    placeholder="e.g. SNAP-A3B7"
                    value={inputCode}
                    onChange={e => setInputCode(e.target.value.toUpperCase())}
                    onKeyDown={e => e.key === 'Enter' && handleJoin()}
                    className="flex-1 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 text-sm font-mono text-gray-800 dark:text-gray-100 placeholder-gray-400 outline-none focus:ring-2 focus:ring-green-500 transition tracking-wider uppercase"
                    maxLength={10}
                  />
                  <button
                    type="button"
                    onClick={() => scanMode ? stopCamera() : startCamera()}
                    title="Scan QR code"
                    className={`flex items-center justify-center w-12 h-12 rounded-xl border transition ${
                      scanMode
                        ? 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700 text-red-500'
                        : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
                    }`}
                  >
                    {scanMode ? <Camera className="w-5 h-5" /> : <QrCode className="w-5 h-5" />}
                  </button>
                </div>

                {/* Result feedback */}
                <AnimatePresence>
                  {joinResult && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium mb-4 ${
                        joinResult.type === 'success'
                          ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
                          : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800'
                      }`}
                    >
                      {joinResult.type === 'success'
                        ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                        : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                      {joinResult.message}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={closeModal}
                    className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleJoin}
                    disabled={joinLoading || !inputCode.trim()}
                    className="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition flex items-center justify-center gap-2 shadow"
                  >
                    {joinLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    {joinLoading ? 'Joining...' : 'Join Store'}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
