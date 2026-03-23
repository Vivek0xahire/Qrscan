"use client"

import { useEffect, useState, use, useRef, useCallback } from "react"
import { supabase } from "@/utils/supabase/client"
import { Category, CategoryMedia } from "@/lib/types"
import { Loader2, Instagram, Link as LinkIcon, Share2, ChevronLeft, MapPin, Video, Sparkles, X, ChevronRight, ChevronDown, MessageCircle, Copy, Check, ZoomIn } from "lucide-react"

// Read from environment variables (.env.local)
const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || ""
const SHOP_NAME = process.env.NEXT_PUBLIC_SHOP_NAME || "Our Collection"

// Confetti colors - festive Indian palette
const CONFETTI_COLORS = [
  '#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', 
  '#FF9F43', '#EE5A24', '#A29BFE', '#FD79A8',
  '#00CEC9', '#E17055', '#FDCB6E', '#E84393'
]

function ConfettiEffect() {
  const [particles, setParticles] = useState<{ id: number; left: string; color: string; delay: string; size: number; shape: string }[]>([])

  useEffect(() => {
    const items = Array.from({ length: 40 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      delay: `${Math.random() * 1.2}s`,
      size: 6 + Math.random() * 10,
      shape: Math.random() > 0.5 ? '50%' : '2px'
    }))
    setParticles(items)
    const timer = setTimeout(() => setParticles([]), 3500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <>
      {particles.map(p => (
        <div
          key={p.id}
          className="confetti-particle"
          style={{
            left: p.left,
            backgroundColor: p.color,
            animationDelay: p.delay,
            width: p.size,
            height: p.size,
            borderRadius: p.shape,
          }}
        />
      ))}
    </>
  )
}

// ===== LIGHTBOX COMPONENT =====
function Lightbox({ items, startIndex, onClose }: { items: CategoryMedia[], startIndex: number, onClose: () => void }) {
  const [currentIndex, setCurrentIndex] = useState(startIndex)
  const touchStartX = useRef(0)
  const touchEndX = useRef(0)
  const item = items[currentIndex]

  const goNext = useCallback(() => {
    if (currentIndex < items.length - 1) setCurrentIndex(currentIndex + 1)
  }, [currentIndex, items.length])

  const goPrev = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1)
  }, [currentIndex])

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') goNext()
      if (e.key === 'ArrowLeft') goPrev()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [goNext, goPrev, onClose])

  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX }
  const handleTouchEnd = (e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].clientX
    const diff = touchStartX.current - touchEndX.current
    if (Math.abs(diff) > 60) {
      if (diff > 0) goNext()
      else goPrev()
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col lightbox-enter">
      {/* Top bar */}
      <div className="flex items-center justify-between p-4 text-white">
        <span className="text-sm font-bold bg-white/10 px-3 py-1.5 rounded-full">
          {currentIndex + 1} / {items.length}
        </span>
        <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Image area */}
      <div 
        className="flex-1 flex items-center justify-center px-4 relative"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Left arrow */}
        {currentIndex > 0 && (
          <button onClick={goPrev} className="absolute left-2 z-10 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {item.media_type === 'video' ? (
          <video src={item.url} controls autoPlay className="max-w-full max-h-[75vh] rounded-lg" />
        ) : (
          <img 
            src={item.url} 
            alt="Full view"
            className="max-w-full max-h-[75vh] object-contain rounded-lg lightbox-image-enter select-none"
            draggable={false}
          />
        )}

        {/* Right arrow */}
        {currentIndex < items.length - 1 && (
          <button onClick={goNext} className="absolute right-2 z-10 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Thumbnail strip */}
      <div className="p-4 flex gap-2 overflow-x-auto justify-center">
        {items.filter(i => i.media_type === 'image').map((thumb, idx) => (
          <button
            key={thumb.id}
            onClick={() => setCurrentIndex(items.indexOf(thumb))}
            className={`w-14 h-14 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-all ${items.indexOf(thumb) === currentIndex ? 'border-white scale-110' : 'border-transparent opacity-50 hover:opacity-80'}`}
          >
            <img src={thumb.url} alt="" className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  )
}

// ===== AUTO-PLAY VIDEO OBSERVER HOOK =====
function useVideoAutoplay(videoRef: React.RefObject<HTMLVideoElement | null>) {
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {})
        } else {
          video.pause()
        }
      },
      { threshold: 0.5 }
    )
    observer.observe(video)
    return () => observer.disconnect()
  }, [videoRef])
}

function AutoPlayVideo({ url }: { url: string }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  useVideoAutoplay(videoRef)
  return (
    <video
      ref={videoRef}
      src={url}
      controls
      muted
      loop
      playsInline
      className="absolute inset-0 w-full h-full object-contain"
    />
  )
}

// ===== SHARE SHEET COMPONENT =====
function ShareSheet({ url, name, onClose }: { url: string, name: string, onClose: () => void }) {
  const [copied, setCopied] = useState(false)

  const copyLink = async () => {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const shareWhatsApp = () => {
    const text = encodeURIComponent(`Check out this amazing fabric collection: ${name}\n${url}`)
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-t-3xl w-full max-w-md p-6 pb-10 share-sheet-enter" onClick={e => e.stopPropagation()}>
        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6" />
        <h3 className="font-bold text-gray-900 text-lg mb-4">Share this Collection</h3>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={shareWhatsApp} className="flex items-center justify-center gap-2 p-4 rounded-2xl bg-green-50 border border-green-100 text-green-700 font-bold hover:bg-green-100 active:scale-95 transition-all">
            <MessageCircle className="w-5 h-5" /> WhatsApp
          </button>
          <button onClick={copyLink} className="flex items-center justify-center gap-2 p-4 rounded-2xl bg-gray-50 border border-gray-200 text-gray-700 font-bold hover:bg-gray-100 active:scale-95 transition-all">
            {copied ? <Check className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5" />}
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
        </div>
      </div>
    </div>
  )
}


export default function SectionView({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params)
  const categoryId = unwrappedParams.id
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState<Category | null>(null)
  const [mediaItems, setMediaItems] = useState<CategoryMedia[]>([])
  const [showConfetti, setShowConfetti] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [showShareSheet, setShowShareSheet] = useState(false)
  const [headerOffset, setHeaderOffset] = useState(0)
  const [isSpeaking, setIsSpeaking] = useState(false)

  // Voice Functionality
  const speakSectionInfo = useCallback((cat: Category) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return

    // Cancel any ongoing speech
    window.speechSynthesis.cancel()

    const priceText = cat.discount_price 
      ? `Special offer price, only ${cat.discount_price} rupees` 
      : cat.price ? `Price, ${cat.price} rupees` : ""
    
    const textToSpeak = `Welcome to ${SHOP_NAME}. Now viewing ${cat.name}. ${priceText}`
    
    const utterance = new SpeechSynthesisUtterance(textToSpeak)
    utterance.rate = 0.9 // Slightly slower for clarity
    utterance.pitch = 1
    utterance.lang = 'en-IN' // Indian English accent if available

    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)

    window.speechSynthesis.speak(utterance)
  }, [])

  // Parallax scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setHeaderOffset(window.scrollY * 0.35)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    async function loadSection() {
      const { data: cData } = await supabase.from("categories").select("*").eq("id", categoryId).single()
      if (cData) {
        setCategory(cData)
        
        // Advanced Analytics: Increment view count
        const currentViews = cData.views || 0
        await supabase.from("categories").update({ views: currentViews + 1 }).eq("id", categoryId)
        
        const { data: mData } = await supabase.from("category_media").select("*").eq("category_id", categoryId).order('created_at', { ascending: false })
        if (mData) setMediaItems(mData)
      }
      setLoading(false)
      setTimeout(() => setShowConfetti(true), 200)
      
      // Attempt to speak (may be blocked by browser until first interaction)
      if (cData) {
        setTimeout(() => speakSectionInfo(cData), 1000)
      }
    }
    loadSection()
  }, [categoryId, speakSectionInfo])

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="anim-bounce-in">
        <Sparkles className="w-12 h-12 text-indigo-500 mb-4 mx-auto" />
      </div>
      <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-4" />
      <p className="text-gray-500 font-medium tracking-wide anim-fade-up">Loading Fabric Section...</p>
    </div>
  )

  if (!category) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 text-center">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 max-w-sm w-full anim-scale-in">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Section Not Found</h2>
        <p className="text-gray-500">The scanned section might be unavailable.</p>
      </div>
    </div>
  )

  const hasDiscount = category.discount_price && category.price
  const discountPercent = hasDiscount ? Math.round(((Number(category.price) - Number(category.discount_price)) / Number(category.price)) * 100) : 0
  const imageCount = mediaItems.filter(i => i.media_type === 'image').length
  const videoCount = mediaItems.filter(i => i.media_type === 'video').length
  const pageUrl = typeof window !== 'undefined' ? window.location.href : ''

  const openWhatsAppInquiry = () => {
    const msg = encodeURIComponent(
      `Hi! I'm interested in *${category.name}*` +
      (category.discount_price ? ` (₹${category.discount_price})` : category.price ? ` (₹${category.price})` : '') +
      `\n\nI saw it here: ${pageUrl}\n\nPlease share more details.`
    )
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, '_blank')
  }

  return (
    <div className="min-h-screen bg-white max-w-md mx-auto relative shadow-2xl overflow-hidden pb-28 font-sans">
       {/* Confetti Burst */}
       {showConfetti && <ConfettiEffect />}
       
       {/* Lightbox */}
       {lightboxIndex !== null && (
         <Lightbox items={mediaItems} startIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />
       )}

       {/* Share Sheet */}
       {showShareSheet && (
         <ShareSheet url={pageUrl} name={category.name} onClose={() => setShowShareSheet(false)} />
       )}

       {/* Top Nav Overlay */}
       <div className="absolute top-0 w-full p-4 flex justify-between z-50">
         <button className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-black/50 transition-colors anim-slide-left" onClick={() => window.history.back()}>
           <ChevronLeft className="w-6 h-6" />
         </button>
         <button className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-black/50 transition-colors anim-slide-right" onClick={() => setShowShareSheet(true)}>
           <Share2 className="w-5 h-5" />
         </button>
       </div>

       {/* Header Title Section with Parallax */}
       <div 
         className="pt-24 pb-8 px-6 bg-gradient-to-b from-indigo-50 leading-tight relative overflow-hidden"
         style={{ transform: `translateY(${headerOffset}px)` }}
       >
          <span className="text-xs font-black tracking-[0.2em] text-indigo-500 uppercase mb-2 block anim-fade-up">
            {SHOP_NAME}
          </span>
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight anim-fade-up-delay-1 flex items-center gap-3">
            {category.name}
            <button 
              onClick={() => speakSectionInfo(category)}
              className={`p-2 rounded-full transition-all ${isSpeaking ? 'bg-indigo-100 text-indigo-600 animate-pulse' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
              title="Listen to details"
            >
              {isSpeaking ? (
                <div className="flex gap-0.5 items-center px-0.5">
                  <div className="w-1 h-3 bg-current rounded-full animate-[bounce_1s_infinite_0s]" />
                  <div className="w-1 h-4 bg-current rounded-full animate-[bounce_1s_infinite_0.1s]" />
                  <div className="w-1 h-3 bg-current rounded-full animate-[bounce_1s_infinite_0.2s]" />
                </div>
              ) : (
                <MessageCircle className="w-5 h-5" />
              )}
            </button>
          </h1>
          
          {/* Pricing info with celebration animations */}
          {(category.price || category.discount_price) && (
            <div className="flex items-end gap-3 mt-4 anim-fade-up-delay-2 flex-wrap">
              {hasDiscount ? (
                <>
                  <span className="text-3xl font-extrabold text-indigo-600 leading-none anim-price-glow">
                    ₹{category.discount_price}
                  </span>
                  <span className="text-lg font-bold text-gray-400 line-through decoration-2 mb-0.5">
                    ₹{category.price}
                  </span>
                  {/* Auto-calculated Discount % Badge */}
                  <span className="bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg items-center flex gap-1 anim-sale-pulse shadow-lg shadow-red-200/50">
                     🔥 {discountPercent}% OFF
                  </span>
                </>
              ) : (
                <span className="text-3xl font-extrabold text-gray-900 leading-none anim-price-glow">
                  ₹{category.price}
                </span>
              )}
            </div>
          )}

          {/* Image & Video Counter */}
          {(imageCount > 0 || videoCount > 0) && (
            <div className="flex gap-2 mt-4 anim-fade-up-delay-3">
              {imageCount > 0 && (
                <span className="text-xs font-bold bg-white/80 backdrop-blur-sm border border-gray-100 text-gray-600 px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
                  📸 {imageCount} {imageCount === 1 ? 'Photo' : 'Photos'}
                </span>
              )}
              {videoCount > 0 && (
                <span className="text-xs font-bold bg-white/80 backdrop-blur-sm border border-gray-100 text-gray-600 px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
                  🎬 {videoCount} {videoCount === 1 ? 'Video' : 'Videos'}
                </span>
              )}
            </div>
          )}
       </div>

       {/* The Infinite Media Explorer feed */}
       <div className="bg-white">
         {mediaItems.length > 0 ? (
           <div className="flex flex-col gap-1 pb-4">
             {mediaItems.map((item, idx) => (
               <div 
                 key={item.id} 
                 className="relative w-full bg-gray-100 flex items-center justify-center overflow-hidden media-card-enter cursor-pointer group"
                 style={{ animationDelay: `${0.3 + idx * 0.12}s` }}
                 onClick={() => setLightboxIndex(idx)}
               >
                 {item.media_type === 'video' ? (
                    <div className="w-full relative pt-[120%] bg-black" onClick={e => e.stopPropagation()}>
                      {(item.url.includes("youtube") || item.url.includes("youtu.be")) ? (
                          <iframe 
                            src={item.url.replace("watch?v=", "embed/")} 
                            className="absolute inset-0 w-full h-full"
                            allowFullScreen
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          />
                      ) : (
                          <AutoPlayVideo url={item.url} />
                      )}
                    </div>
                 ) : (
                    <>
                      <img 
                        src={item.url} 
                        alt={`Fabric design ${idx + 1}`} 
                        className="w-full object-contain" 
                        loading="lazy"
                      />
                      {/* Tap to zoom overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <ZoomIn className="w-5 h-5 text-white" />
                        </div>
                      </div>
                      {/* Image counter badge */}
                      <span className="absolute bottom-2 right-2 bg-black/50 backdrop-blur-sm text-white text-[11px] font-bold px-2.5 py-1 rounded-full">
                        {idx + 1} / {mediaItems.length}
                      </span>
                    </>
                 )}
               </div>
             ))}
           </div>
         ) : (
           <div className="p-12 text-center border-t border-gray-50 anim-fade-up-delay-3">
             <Video className="w-12 h-12 text-gray-200 mx-auto mb-3" />
             <p className="font-semibold text-gray-400">No showcase media yet for this section.</p>
           </div>
         )}
       </div>

       {/* General Info & Links block */}
       <div className="px-6 py-8 bg-gray-50 border-t border-gray-100 rounded-t-[40px] shadow-[0_-10px_30px_rgba(0,0,0,0.03)] relative -mt-6 z-10 anim-fade-up-delay-3">
         <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-8" />
         
         {category.info_details && (
           <div className="space-y-4 mb-8">
             <h3 className="font-bold text-gray-900 text-lg">Section Details</h3>
             <p className="text-gray-600 text-[15px] leading-relaxed whitespace-pre-line font-medium border-l-2 border-indigo-200 pl-4 py-1">
               {category.info_details}
             </p>
           </div>
         )}
         
         {(category.instagram_link || category.pinterest_link) && (
           <div className="space-y-4 pb-8">
             <h3 className="font-bold text-gray-900 text-lg">More Inspiration</h3>
             <div className="grid grid-cols-2 gap-3">
               {category.instagram_link && (
                 <a href={category.instagram_link} target="_blank" rel="noreferrer" className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border border-pink-100 bg-gradient-to-br from-pink-50 to-orange-50 text-pink-700 font-bold hover:scale-105 active:scale-95 transition-all shadow-sm">
                   <Instagram className="w-6 h-6" /> Explore IG
                 </a>
               )}
               {category.pinterest_link && (
                 <a href={category.pinterest_link} target="_blank" rel="noreferrer" className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border border-red-100 bg-gradient-to-br from-red-50 to-rose-50 text-red-700 font-bold hover:scale-105 active:scale-95 transition-all shadow-sm">
                   <LinkIcon className="w-6 h-6" /> Pinterest
                 </a>
               )}
             </div>
           </div>
         )}
       </div>

       {/* Floating Bottom Bar — WhatsApp Inquiry + Share */}
       <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-4 bg-white/90 backdrop-blur-xl border-t border-gray-100 z-50 anim-bottom-slide">
         <div className="flex gap-2">
           <button 
             className="flex-1 py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold rounded-2xl shadow-xl shadow-green-200/50 transition-all text-base flex items-center justify-center gap-2 group active:scale-[0.97]" 
             onClick={openWhatsAppInquiry}
           >
             <MessageCircle className="w-5 h-5 group-hover:animate-bounce" /> Inquire on WhatsApp
           </button>
           <button 
             className="w-14 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl transition-all flex items-center justify-center active:scale-95"
             onClick={() => setShowShareSheet(true)}
           >
             <Share2 className="w-5 h-5" />
           </button>
         </div>
       </div>
    </div>
  )
}
