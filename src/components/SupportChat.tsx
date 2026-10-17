'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  Bot,
  Copy,
  Check,
  Headphones,
  Loader2,
  PhoneCall,
  Send,
  Sparkles,
  Trash2,
  X,
  ChevronDown
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import axios from 'axios'

interface Message {
  id: string
  role: 'user' | 'assistant'
  text: string
  escalate?: boolean
  phone?: string
  timestamp: string
}

const CUSTOMER_SERVICE_PHONE = "7794830754"

const CUSTOMER_SUGGESTIONS = [
  "Where is my order?",
  "My order is delayed.",
  "I received the wrong item.",
  "I have a payment problem.",
  "I need help with a cancellation."
]

const DELIVERY_SUGGESTIONS = [
  "I cannot complete my delivery.",
  "The customer is not answering.",
  "The address seems incorrect.",
  "I have an earnings question.",
  "My assignment is not showing."
]

export default function SupportChat() {
  const { data: session, status } = useSession()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const role = session?.user?.role || "user"
  const isDelivery = role === "deliveryBoy"
  const suggestions = isDelivery ? DELIVERY_SUGGESTIONS : CUSTOMER_SUGGESTIONS

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (isOpen) {
      scrollToBottom()
    }
  }, [messages, isOpen, loading])

  // Listen for global open-snapcart-support custom event (from Nav or Dashboard)
  useEffect(() => {
    const handleOpenEvent = (e: any) => {
      setIsOpen(true)
      if (e.detail?.initialQuestion) {
        handleSendMessage(e.detail.initialQuestion)
      }
    }
    window.addEventListener('open-snapcart-support', handleOpenEvent)
    return () => window.removeEventListener('open-snapcart-support', handleOpenEvent)
  }, [])

  // Initialize welcome message once session is resolved
  useEffect(() => {
    if (status === "authenticated" && messages.length === 0) {
      const welcome: Message = {
        id: "welcome-1",
        role: "assistant",
        text: isDelivery
          ? `👋 Hello ${session?.user?.name || "Partner"}! I'm Snapcart AI Assistant for Delivery Partners. How can I assist you with your active deliveries, address verification, or earnings today?`
          : `👋 Hi ${session?.user?.name || "there"}! I'm Snapcart AI Support Assistant. I can help you track your recent orders, report item or delivery issues, or guide you through payments. What can I help you with today?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
      setMessages([welcome])
    }
  }, [status, isDelivery, session?.user?.name])

  const handleCopyNumber = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(CUSTOMER_SERVICE_PHONE)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleClearChat = () => {
    const resetMsg: Message = {
      id: `welcome-${Date.now()}`,
      role: "assistant",
      text: "Conversation cleared. How else can I help you today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    setMessages([resetMsg])
  }

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim()
    if (!query || loading) return

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    setMessages(prev => [...prev, userMsg])
    setInput("")
    setLoading(true)

    try {
      const historyPayload = messages.slice(-6).map(m => ({
        role: m.role,
        text: m.text
      }))

      const res = await axios.post('/api/support/chat', {
        message: query,
        history: historyPayload
      })

      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        text: res.data.reply || "I am here to help.",
        escalate: res.data.escalate,
        phone: res.data.phone || (res.data.escalate ? CUSTOMER_SERVICE_PHONE : undefined),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }

      setMessages(prev => [...prev, aiMsg])
    } catch (err: any) {
      console.error("[SUPPORT-UI] Error sending message:", err)
      const errorMsg: Message = {
        id: `err-${Date.now()}`,
        role: "assistant",
        text: "I'm having difficulty connecting right now. Please call Snapcart Customer Service at 7794830754 for immediate help.",
        escalate: true,
        phone: CUSTOMER_SERVICE_PHONE,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setLoading(false)
    }
  }

  if (status !== "authenticated") {
    return null
  }

  return (
    <>
      {/* Floating launcher button */}
      {!isOpen && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40"
        >
          <button
            onClick={() => setIsOpen(true)}
            aria-label="Open AI Support Chat"
            className="group flex items-center gap-2.5 bg-gradient-to-r from-green-600 via-emerald-600 to-green-700 hover:from-green-500 hover:to-emerald-600 text-white px-4 py-3 sm:px-5 sm:py-3.5 rounded-full shadow-2xl hover:shadow-green-500/30 hover:scale-105 active:scale-95 transition-all duration-200 border border-green-400/40"
          >
            <div className="relative">
              <Sparkles className="w-5 h-5 text-amber-300 animate-spin-slow" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full animate-ping" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs sm:text-sm font-bold tracking-wide flex items-center gap-1">
                AI Support
              </span>
              <span className="text-[10px] text-green-100 opacity-90 hidden sm:inline">
                Instant Order Help
              </span>
            </div>
          </button>
        </motion.div>
      )}

      {/* Chat Window Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[94vw] sm:w-[420px] max-w-[440px] h-[580px] max-h-[85vh] bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col overflow-hidden backdrop-blur-xl"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-green-700 via-emerald-700 to-green-800 p-4 text-white flex items-center justify-between shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
                  <Bot className="w-6 h-6 text-green-200" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-base leading-tight">Snapcart AI</h2>
                    <span className="text-[10px] font-semibold bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 px-2 py-0.5 rounded-full">
                      24/7 Support
                    </span>
                  </div>
                  <p className="text-xs text-green-200/90 flex items-center gap-1.5 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Online & Scoped to your account
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={handleClearChat}
                  title="Clear conversation"
                  className="p-2 hover:bg-white/15 rounded-xl transition text-white/80 hover:text-white"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  title="Minimize chat"
                  className="p-2 hover:bg-white/15 rounded-xl transition text-white/80 hover:text-white"
                >
                  <ChevronDown className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-gray-50/60 dark:bg-gray-950/40 text-sm">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 leading-relaxed shadow-sm ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-tr-xs'
                        : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-tl-xs border border-gray-100 dark:border-gray-700/80'
                    }`}
                  >
                    <p className="whitespace-pre-line text-[13px] sm:text-sm">{msg.text}</p>

                    {/* Human Escalation Card */}
                    {msg.escalate && (
                      <div className="mt-3 pt-3 border-t border-red-200/60 dark:border-red-900/40 bg-red-50/80 dark:bg-red-950/30 rounded-xl p-3 border">
                        <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-bold text-xs mb-1.5">
                          <Headphones className="w-4 h-4" />
                          <span>Direct Customer Service</span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-300 mb-2.5">
                          Speak with our dedicated support team directly:
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <a
                            href={`tel:${CUSTOMER_SERVICE_PHONE}`}
                            className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition active:scale-95"
                          >
                            <PhoneCall className="w-3.5 h-3.5" />
                            <span>Call {CUSTOMER_SERVICE_PHONE}</span>
                          </a>
                          <button
                            type="button"
                            onClick={handleCopyNumber}
                            className="flex items-center gap-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 px-3 py-1.5 rounded-lg text-xs font-medium transition"
                          >
                            {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copied ? "Copied!" : "Copy Number"}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-400 mt-1 px-1">
                    {msg.timestamp}
                  </span>
                </div>
              ))}

              {/* Typing indicator */}
              {loading && (
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs py-1">
                  <div className="w-7 h-7 rounded-full bg-green-100 dark:bg-green-950/60 flex items-center justify-center">
                    <Loader2 className="w-4 h-4 text-green-600 animate-spin" />
                  </div>
                  <span>Snapcart AI is typing...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Role-Specific Suggested Quick Chips */}
            <div className="px-3 pt-2 pb-1 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 text-xs">
                {suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    disabled={loading}
                    onClick={() => handleSendMessage(s)}
                    className="shrink-0 bg-gray-100 dark:bg-gray-800 hover:bg-green-50 dark:hover:bg-green-950/50 hover:text-green-700 dark:hover:text-green-400 border border-gray-200 dark:border-gray-700 rounded-full px-3 py-1 text-[11px] font-medium transition text-gray-600 dark:text-gray-300"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSendMessage()
              }}
              className="p-3 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex items-center gap-2"
            >
              <input
                type="text"
                placeholder={isDelivery ? "Ask about orders, delivery, OTP, earnings..." : "Ask about your order, delivery delay, refund..."}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                maxLength={500}
                disabled={loading}
                className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-sm px-4 py-2.5 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 border border-transparent transition"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                aria-label="Send message"
                className="w-10 h-10 rounded-2xl bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:hover:bg-green-600 text-white flex items-center justify-center transition shadow-md shrink-0 active:scale-95"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
