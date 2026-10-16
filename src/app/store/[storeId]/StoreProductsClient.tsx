'use client'
import React, { FormEvent, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '@/redux/store'
import { addToCart, clearCartForNewStore, decreaseQuantity, increaseQuantity } from '@/redux/cartSlice'
import Image from 'next/image'
import { ArrowLeft, Minus, Package, Plus, Search, ShoppingCart, Store, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface IGrocery {
  _id: string
  name: string
  category: string
  price: string
  unit: string
  image?: string
  store: string
}

interface IStore {
  _id: string
  name: string
  address: string
  locality?: string
  contactInfo?: string
  logo?: string
  storeCode: string
}

interface Props {
  store: IStore
  groceries: IGrocery[]
}

// All 10 grocery categories
const CATEGORIES = [
  "All",
  "Fruits & Vegetables",
  "Dairy & Eggs",
  "Rice, Atta & Grains",
  "Snacks & Biscuits",
  "Spices & Masalas",
  "Beverages & Drinks",
  "Personal Care",
  "Household Essentials",
  "Instant & Packaged Food",
  "Baby & Pet Care",
]

export default function StoreProductsClient({ store, groceries }: Props) {
  const dispatch = useDispatch<AppDispatch>()
  const { cartData, cartStoreId, cartStoreName } = useSelector((s: RootState) => s.cart)
  const router = useRouter()

  const [search, setSearch] = useState("")
  const [activeCategory, setActiveCategory] = useState("All")
  // Cross-store confirmation modal state
  const [pendingItem, setPendingItem] = useState<IGrocery | null>(null)
  const [showSwitchModal, setShowSwitchModal] = useState(false)

  // Filter groceries
  const filtered = groceries.filter((g) => {
    const matchesSearch =
      !search ||
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      g.category.toLowerCase().includes(search.toLowerCase())
    const matchesCat = activeCategory === "All" || g.category === activeCategory
    return matchesSearch && matchesCat
  })

  const handleAddToCart = (item: IGrocery) => {
    // If cart has items from a different store, show confirmation
    if (cartStoreId && cartStoreId !== store._id && cartData.length > 0) {
      setPendingItem(item)
      setShowSwitchModal(true)
      return
    }
    dispatch(addToCart({ ...item, quantity: 1, storeId: store._id, storeName: store.name }))
  }

  const handleConfirmSwitch = () => {
    if (!pendingItem) return
    dispatch(clearCartForNewStore({
      storeId: store._id,
      storeName: store.name,
      item: { ...pendingItem, quantity: 1 }
    }))
    setPendingItem(null)
    setShowSwitchModal(false)
  }

  const getCartItem = (id: string) => cartData.find(i => i._id === id)

  return (
    <div className="w-full min-h-screen bg-gray-50 dark:bg-gray-950 pt-24 sm:pt-28 pb-16">
      {/* Cross-store Switch Modal */}
      <AnimatePresence>
        {showSwitchModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-7 max-w-sm w-full border border-gray-100 dark:border-gray-700"
            >
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/40 mx-auto mb-4">
                <ShoppingCart className="text-amber-600 dark:text-amber-400 w-7 h-7" />
              </div>
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 text-center">Start a new cart?</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-2 leading-relaxed">
                Your cart has items from <span className="font-semibold text-green-600">{cartStoreName}</span>. Adding from{" "}
                <span className="font-semibold text-green-600">{store.name}</span> will clear your current cart.
              </p>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => { setPendingItem(null); setShowSwitchModal(false) }}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                >
                  Keep cart
                </button>
                <button
                  onClick={handleConfirmSwitch}
                  className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold transition shadow"
                >
                  Yes, switch
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl xl:max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-green-700 dark:text-green-400 font-medium mb-6 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> Back to My Stores
        </button>

        {/* Store header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-5 bg-white dark:bg-gray-900 rounded-2xl shadow-md p-5 mb-8 border border-gray-100 dark:border-gray-800"
        >
          <div className="w-16 h-16 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center overflow-hidden flex-shrink-0 shadow">
            {store.logo ? (
              <Image src={store.logo} alt={store.name} width={64} height={64} className="object-cover w-full h-full" />
            ) : (
              <Store className="w-8 h-8 text-green-600 dark:text-green-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100 truncate">{store.name}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{store.locality ?? store.address}</p>
            {store.contactInfo && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">📞 {store.contactInfo}</p>
            )}
          </div>
          <div className="hidden sm:flex flex-col items-end gap-1">
            <span className="text-xs font-mono bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 px-3 py-1 rounded-full border border-green-200 dark:border-green-800">
              {store.storeCode}
            </span>
            <span className="text-[11px] text-gray-400">Store Code</span>
          </div>
        </motion.div>

        {/* Search */}
        <div className="flex items-center bg-white dark:bg-gray-900 rounded-full shadow px-4 py-2.5 mb-5 border border-gray-100 dark:border-gray-800 max-w-lg">
          <Search className="text-gray-400 w-4 h-4 mr-2 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search products in this store..."
            className="flex-1 outline-none text-sm text-gray-700 dark:text-gray-200 bg-transparent placeholder-gray-400"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch("")}>
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-none">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all border ${
                activeCategory === cat
                  ? "bg-green-600 text-white border-green-600 shadow"
                  : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-green-50 dark:hover:bg-gray-800"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Products grid */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-gray-400 dark:text-gray-500">
            <Package className="w-14 h-14 opacity-40" />
            <p className="text-lg font-medium">No products found</p>
            <p className="text-sm">Try a different category or search term.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-5">
            {filtered.map((item, idx) => {
              const cartItem = getCartItem(item._id)
              return (
                <motion.div
                  key={item._id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.03 }}
                  viewport={{ once: true }}
                  className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-100 dark:border-gray-800 flex flex-col"
                >
                  {/* Image */}
                  <div className="relative w-full aspect-4/3 bg-gray-50 dark:bg-gray-800 overflow-hidden group flex items-center justify-center p-2">
                    {item.image ? (
                      <Image
                        src={item.image}
                        fill
                        alt={item.name}
                        sizes="(max-width: 640px) 50vw, 25vw"
                        className="object-contain p-2 transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex flex-col items-center text-gray-300">
                        <Package size={32} className="text-green-500/40" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-3 flex flex-col flex-1 justify-between">
                    <div>
                      <p className="text-[10px] text-gray-400 font-medium mb-0.5 truncate">{item.category}</p>
                      <h3 className="text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-100 line-clamp-2 leading-snug">{item.name}</h3>
                    </div>

                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">{item.unit}</span>
                        <span className="text-green-700 dark:text-green-400 font-bold text-sm">₹{item.price}</span>
                      </div>

                      {!cartItem ? (
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleAddToCart(item)}
                          className="w-full flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 text-white rounded-full py-2 text-xs font-medium transition-all"
                        >
                          <ShoppingCart size={13} />
                          Add
                        </motion.button>
                      ) : (
                        <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-full py-1.5 px-2">
                          <button
                            onClick={() => dispatch(decreaseQuantity(item._id))}
                            className="w-6 h-6 flex items-center justify-center rounded-full bg-green-100 dark:bg-green-800 hover:bg-green-200 transition"
                          >
                            <Minus size={12} className="text-green-700 dark:text-green-300" />
                          </button>
                          <span className="text-xs font-semibold text-gray-800 dark:text-gray-100">{cartItem.quantity}</span>
                          <button
                            onClick={() => dispatch(increaseQuantity(item._id))}
                            className="w-6 h-6 flex items-center justify-center rounded-full bg-green-100 dark:bg-green-800 hover:bg-green-200 transition"
                          >
                            <Plus size={12} className="text-green-700 dark:text-green-300" />
                          </button>
                        </div>
                      )}
                    </div>
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
