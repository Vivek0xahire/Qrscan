"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/utils/supabase/client"
import { Category, CategoryMedia } from "@/lib/types"
import { useRouter } from "next/navigation"
import { Loader2, ArrowLeft, UploadCloud, Link as LinkIcon, Instagram, Trash2, Check, Video, Image as ImageIcon, Plus } from "lucide-react"
import Link from "next/link"
import { QRCodeSVG } from "qrcode.react"

export default function CategoryForm({ categoryId }: { categoryId?: string }) {
  const router = useRouter()
  const isNew = !categoryId || categoryId === "new"

  // Pre-generate a UUID for the category so QR code works instantly and files can be associated later.
  const [activeId] = useState<string>(() => {
    if (isNew && typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return categoryId || "new";
  });

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Media from DB
  const [mediaItems, setMediaItems] = useState<CategoryMedia[]>([])
  
  // Newly added media that haven't been saved to DB yet
  const [pendingFiles, setPendingFiles] = useState<{ id: string, file: File, type: string, localUrl: string }[]>([])
  const [pendingLinks, setPendingLinks] = useState<{ id: string, url: string, type: string }[]>([])

  const [formData, setFormData] = useState({
    name: "",
    info_details: "",
    price: "",
    discount_price: "",
    instagram_link: "",
    pinterest_link: "",
  })

  const [addingLink, setAddingLink] = useState(false)
  
  // State for direct link addition
  const [directLinkUrl, setDirectLinkUrl] = useState("")
  const [directLinkType, setDirectLinkType] = useState<"image" | "video">("image")
  
  // QR Note state
  const [qrNote, setQrNote] = useState("cotton dekhne ke liye muje scan karo.")
  
  // Category stats (Advanced Analytics)
  const [views, setViews] = useState(0)

  useEffect(() => {
    let active = true;
    async function init() {
      if (!isNew) {
        // Fetch Category
        const { data: cData } = await supabase.from("categories").select("*").eq("id", categoryId).single()
        if (active && cData) {
          setFormData({
            name: cData.name,
            info_details: cData.info_details || "",
            price: cData.price ? String(cData.price) : "",
            discount_price: cData.discount_price ? String(cData.discount_price) : "",
            instagram_link: cData.instagram_link || "",
            pinterest_link: cData.pinterest_link || "",
          })
          setQrNote(cData.qr_note || "")
          setViews(cData.views || 0)
        }
        
        // Fetch Media
        const { data: mData } = await supabase.from("category_media").select("*").eq("category_id", categoryId).order("created_at", { ascending: true })
        if (active && mData) setMediaItems(mData as CategoryMedia[])
      }
      if (active) setLoading(false)
    }
    init()
    return () => { active = false }
  }, [categoryId, isNew])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const payload = {
      id: activeId,
      ...formData,
      qr_note: qrNote,
      price: formData.price ? parseFloat(formData.price) : null,
      discount_price: formData.discount_price ? parseFloat(formData.discount_price) : null,
    }

    // 1. Save or Update the Category
    let savedCategoryId = activeId;
    if (isNew) {
      const { data, error } = await supabase.from("categories").insert([payload]).select().single()
      if (error) {
        alert("Error saving category: " + error.message)
        setSaving(false)
        return
      }
      if (data) Object.assign(data, payload); // ensure local var continues
    } else {
      const { error } = await supabase.from("categories").update(payload).eq("id", categoryId)
      if (error) {
        alert("Error updating section: " + error.message)
        setSaving(false)
        return
      }
    }

    // 2. Upload and Save Pending Files
    for (const pFile of pendingFiles) {
      const extension = pFile.file.name.split('.').pop()
      const fileName = `${Math.random()}.${extension}`
      const { error: uploadError } = await supabase.storage.from("Category").upload(`sections/${activeId}/${fileName}`, pFile.file)
      
      if (!uploadError) {
        const { data: publicURLData } = supabase.storage.from("Category").getPublicUrl(`sections/${activeId}/${fileName}`)
        if (publicURLData) {
          const { error: insertError } = await supabase.from("category_media").insert([{
            category_id: activeId,
            url: publicURLData.publicUrl,
            media_type: pFile.type
          }]);
          if (insertError) {
             alert(`Failed to save image info to database: ${insertError.message}`);
          }
        }
      } else {
         alert(`Storage Upload Failed for ${pFile.file.name}: ${uploadError.message}`);
      }
    }

    // 3. Save Pending Direct Links
    for (const pLink of pendingLinks) {
       const { error: linkErr } = await supabase.from("category_media").insert([{
         category_id: activeId,
         url: pLink.url,
         media_type: pLink.type
       }]);
       if (linkErr) {
          alert(`Failed to save direct link: ${linkErr.message}`);
       }
    }

    setSaving(false)
    if (isNew) {
      router.push(`/admin/categories/${activeId}`)
    } else {
      alert("Section details updated successfully!")
      // Refresh media items logic could go here, or just let user stay
      window.location.reload(); 
    }
  }

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    const newPendingFiles = []
    for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i]
        const isVideo = file.type.startsWith('video/')
        newPendingFiles.push({
            id: Math.random().toString(),
            file,
            type: isVideo ? 'video' : 'image',
            localUrl: URL.createObjectURL(file)
        })
    }
    setPendingFiles([...pendingFiles, ...newPendingFiles])
  }

  const handleAddDirectLink = async () => {
    if (!directLinkUrl) return
    setPendingLinks([...pendingLinks, { id: Math.random().toString(), url: directLinkUrl, type: directLinkType }])
    setDirectLinkUrl("")
  }

  const handleRemoveMedia = async (id: string, url: string, isLocal?: string) => {
    if(!confirm("Are you sure?")) return;
    
    if (isLocal === 'file') {
        setPendingFiles(pendingFiles.filter(i => i.id !== id))
        return
    }
    if (isLocal === 'link') {
        setPendingLinks(pendingLinks.filter(i => i.id !== id))
        return
    }
    
    await supabase.from("category_media").delete().eq("id", id)
    setMediaItems(mediaItems.filter(i => i.id !== id))
  }

  const downloadQR = () => {
    const svg = document.getElementById('qr-code-section');
    if (svg) {
        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const img = new Image();
        
        const scale = 3; // Even higher resolution for ultra-sharp prints

        img.onload = () => {
            const qrSize = img.width * scale;
            const padding = 50 * scale;
            const fontSize = 16 * scale;
            const lineHeight = fontSize * 1.4;
            
            // Helper function to wrap text
            const wrapText = (context: CanvasRenderingContext2D, text: string, maxWidth: number) => {
                const words = text.split(' ');
                const lines = [];
                let currentLine = words[0];

                for (let i = 1; i < words.length; i++) {
                    const word = words[i];
                    const width = context.measureText(currentLine + " " + word).width;
                    if (width < maxWidth) {
                        currentLine += " " + word;
                    } else {
                        lines.push(currentLine);
                        currentLine = word;
                    }
                }
                lines.push(currentLine);
                return lines;
            };

            if (ctx) {
                ctx.font = `bold ${fontSize}px sans-serif`;
                const maxWidth = qrSize + padding; // Allow some slack but keep it neat
                const lines = qrNote ? wrapText(ctx, qrNote, maxWidth) : [];
                const textSpace = lines.length * lineHeight + (20 * scale);
                
                canvas.width = qrSize + (padding * 2);
                canvas.height = qrSize + (padding * 2) + textSpace;
                
                // Redraw with correct dimensions
                ctx.fillStyle = "white";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                // Draw wrapped text
                if (qrNote) {
                    ctx.fillStyle = "black";
                    ctx.font = `bold ${fontSize}px sans-serif`;
                    ctx.textAlign = "center";
                    ctx.textBaseline = "top";
                    
                    lines.forEach((line, index) => {
                        ctx.fillText(line, canvas.width / 2, padding + (index * lineHeight));
                    });
                }
                
                // Draw QR Code below text
                ctx.drawImage(img, padding, padding + textSpace, qrSize, qrSize);
                
                // Download
                const pngFile = canvas.toDataURL("image/png", 1.0);
                const downloadLink = document.createElement("a");
                downloadLink.download = `QR-${formData.name || activeId}.png`;
                downloadLink.href = pngFile;
                downloadLink.click();
            }
        };
        const svgBlob = new Blob([svgData], {type: 'image/svg+xml;charset=utf-8'});
        const url = URL.createObjectURL(svgBlob);
        img.src = url;
    }
  }

  const categoryUrl = typeof window !== "undefined" ? `${window.location.origin}/category/${activeId}` : ""

  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/categories" className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-50 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{isNew ? "Create Shop Section" : "Edit Shop Section"}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSubmit} className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Section / Category Name</label>
              <input
                name="name" value={formData.name} onChange={handleChange} required
                className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-lg"
                placeholder="e.g. Premium Cotton Saree"
              />
            </div>

            <div className="grid grid-cols-2 gap-5">
               <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Base Price / Starting At (₹)</label>
                  <input
                    name="price" type="number" step="0.01" value={formData.price} onChange={handleChange}
                    className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-gray-500"
                    placeholder="2000"
                  />
               </div>
               <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Discount Price (₹)</label>
                  <input
                    name="discount_price" type="number" step="0.01" value={formData.discount_price} onChange={handleChange}
                    className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-indigo-700 bg-indigo-50"
                    placeholder="1500"
                  />
               </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">General info for this entire section</label>
              <textarea
                name="info_details" value={formData.info_details} onChange={handleChange} rows={5}
                className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                placeholder="Characteristics of these fabrics, wash tags, materials..."
              />
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 border-b pb-2">Social Links</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1"><Instagram className="w-4 h-4" /> Instagram Post URL</label>
                  <input
                    name="instagram_link" value={formData.instagram_link} onChange={handleChange}
                    className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-pink-500 transition-all"
                    placeholder="https://instagram.com/p/..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1"><LinkIcon className="w-4 h-4" /> Pinterest URL</label>
                  <input
                    name="pinterest_link" value={formData.pinterest_link} onChange={handleChange}
                    className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-red-500 transition-all"
                    placeholder="https://pin.it/..."
                  />
                </div>
              </div>
            </div>

            <button 
              type="submit" disabled={saving}
              className="mt-4 w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center justify-center gap-2 font-bold text-lg shadow-lg shadow-indigo-200 transition-all disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Check className="w-6 h-6" />}
              {isNew ? "Save All & Create Section" : "Save Section Info"}
            </button>
          </form>
        </div>

        {/* Sidebar Panel for Media and QR Code */}
        <div className="lg:col-span-1 space-y-6">
            <>
             {/* QR Code Card */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
                <div className="w-full mb-4">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 text-left">QR Code Note (Top)</label>
                  <input
                    value={qrNote}
                    onChange={(e) => setQrNote(e.target.value)}
                    placeholder="e.g. cotton dekhne ke liye muje scan karo."
                    className="w-full border border-gray-100 bg-gray-50 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                  />
                </div>
                
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-0.5 rounded-3xl shadow-lg mb-4 relative overflow-hidden group">
                  <div className="bg-white p-4 rounded-[22px] transition-transform group-hover:scale-[1.02]">
                    <div className="mb-2 text-[10px] font-bold text-gray-400 uppercase tracking-tight truncate max-w-[160px]">
                       {qrNote || "Scan Me"}
                    </div>
                    <QRCodeSVG id="qr-code-section" value={categoryUrl} size={160} level="H" fgColor="#1e1e2f" />
                  </div>
                </div>
                <h3 className="font-bold text-gray-900 mb-1">Section QR Code</h3>
                <p className="text-sm text-gray-500 mb-4 px-2">Print this. Scan it to view all media and info for this section.</p>
                <div className="flex gap-2 w-full">
                  <button 
                    onClick={downloadQR}
                    className="flex-1 py-2.5 bg-gray-900 hover:bg-black text-white rounded-lg flex items-center justify-center gap-2 font-medium text-sm transition-colors"
                  >
                    Download QR
                  </button>
                  <a target="_blank" href={categoryUrl} className="flex-1 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg flex items-center justify-center gap-2 font-medium text-sm transition-colors">
                    Preview
                  </a>
                </div>
              </div>

              {/* Analytics Card */}
              {!isNew && (
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-indigo-100 bg-gradient-to-br from-white to-indigo-50/30">
                  <h3 className="text-sm font-bold text-indigo-900 mb-3 flex items-center gap-2 uppercase tracking-wider">
                    <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                    Live Analytics
                  </h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-indigo-700">{views}</span>
                    <span className="text-gray-500 font-medium text-sm">Total Scans / Views</span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-2 font-medium">Real-time engagement for this fabric section.</p>
                </div>
              )}

             {/* Media Manager Card */}
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
               <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                 Media Gallery
                 <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs">{mediaItems.length}</span>
               </h3>

               {/* Manual Upload */}
               <div className="mb-4">
                 <label className="cursor-pointer bg-gray-50 border border-dashed border-gray-300 hover:border-indigo-400 hover:bg-indigo-50 w-full p-4 rounded-xl flex flex-col items-center justify-center gap-2 transition-all">
                   <UploadCloud className="w-6 h-6 text-indigo-500" />
                   <span className="text-sm font-medium text-gray-700">Upload Image / Video</span>
                   <input type="file" multiple accept="image/*,video/*" className="hidden" onChange={handleMediaUpload} />
                 </label>
               </div>

               <div className="flex items-center gap-2 my-2 text-xs font-semibold uppercase tracking-wider text-gray-400 before:flex-1 before:h-px before:bg-gray-100 after:flex-1 after:h-px after:bg-gray-100">
                 Or Link Direct
               </div>

               {/* Add via direct link */}
               <div className="flex gap-2 flex-col sm:flex-row mb-6">
                 <div className="flex flex-col gap-2 flex-2">
                   <select 
                     value={directLinkType} onChange={(e) => setDirectLinkType(e.target.value as any)}
                     className="bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm outline-none"
                   >
                     <option value="image">Image URL</option>
                     <option value="video">Video URL</option>
                   </select>
                   <input 
                     value={directLinkUrl} onChange={(e) => setDirectLinkUrl(e.target.value)}
                     placeholder="https://..."
                     className="bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm outline-none"
                   />
                 </div>
                 <button 
                  disabled={addingLink || !directLinkUrl} onClick={handleAddDirectLink}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg p-2 flex items-center justify-center h-full sm:h-auto"
                 >
                   {addingLink ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-5 h-5" />}
                 </button>
               </div>

                            {mediaItems.length === 0 && pendingFiles.length === 0 && pendingLinks.length === 0 ? (
                 <div className="py-6 text-center">
                   <p className="text-sm text-gray-400">No media added yet.</p>
                 </div>
               ) : (
                 <div className="grid grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1 mt-2">
                   
                   {/* Render DB Items */}
                   {mediaItems.map((item) => (
                     <div key={item.id} className="relative group aspect-square rounded-xl overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center">
                       {item.media_type === 'video' ? (
                         <>
                            {item.url.includes("youtube") || item.url.includes("youtu.be") ? (
                               <iframe src={item.url.replace("watch?v=", "embed/")} className="w-full h-full pointer-events-none" />
                            ) : (
                               <video src={item.url} className="w-full h-full object-cover" />
                            )}
                            <div className="absolute inset-0 bg-black/20" />
                            <Video className="absolute w-8 h-8 text-white opactiy-80" />
                         </>
                       ) : (
                         <img src={item.url} alt="Media thumbnail" className="w-full h-full object-cover" />
                       )}
                       
                       <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                         <button onClick={() => handleRemoveMedia(item.id, item.url)} className="p-2.5 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-md scale-75 group-hover:scale-100 transition-transform">
                           <Trash2 className="w-4 h-4" />
                         </button>
                       </div>
                       
                       <span className="absolute top-1.5 left-1.5 bg-black/60 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded-full backdrop-blur-md">
                         {item.media_type}
                       </span>
                     </div>
                   ))}

                   {/* Render Pending Files */}
                   {pendingFiles.map((item) => (
                     <div key={item.id} className="relative group aspect-square rounded-xl overflow-hidden bg-indigo-50 border-2 border-indigo-200 border-dashed flex items-center justify-center">
                       {item.type === 'video' ? (
                         <>
                            <video src={item.localUrl} className="w-full h-full object-cover opacity-70" />
                            <div className="absolute inset-0 bg-black/20" />
                            <Video className="absolute w-8 h-8 text-white opactiy-80" />
                         </>
                       ) : (
                         <img src={item.localUrl} alt="Pending thumbnail" className="w-full h-full object-cover opacity-70" />
                       )}
                       
                       <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                         <button onClick={() => handleRemoveMedia(item.id, item.localUrl, 'file')} className="p-2.5 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-md scale-75 group-hover:scale-100 transition-transform">
                           <Trash2 className="w-4 h-4" />
                         </button>
                       </div>
                       
                       <span className="absolute top-1.5 left-1.5 bg-indigo-500 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded-full backdrop-blur-md shadow-sm">
                         New {item.type}
                       </span>
                     </div>
                   ))}

                   {/* Render Pending Links */}
                   {pendingLinks.map((item) => (
                     <div key={item.id} className="relative group aspect-square rounded-xl overflow-hidden bg-purple-50 border-2 border-purple-200 border-dashed flex items-center justify-center">
                       {item.type === 'video' ? (
                         <>
                            {item.url.includes("youtube") || item.url.includes("youtu.be") ? (
                               <iframe src={item.url.replace("watch?v=", "embed/")} className="w-full h-full pointer-events-none opacity-70" />
                            ) : (
                               <video src={item.url} className="w-full h-full object-cover opacity-70" />
                            )}
                            <div className="absolute inset-0 bg-black/20" />
                            <Video className="absolute w-8 h-8 text-white opactiy-80" />
                         </>
                       ) : (
                         <img src={item.url} alt="Pending link thumbnail" className="w-full h-full object-cover opacity-70" />
                       )}
                       
                       <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                         <button onClick={() => handleRemoveMedia(item.id, item.url, 'link')} className="p-2.5 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-md scale-75 group-hover:scale-100 transition-transform">
                           <Trash2 className="w-4 h-4" />
                         </button>
                       </div>
                       
                       <span className="absolute top-1.5 left-1.5 bg-purple-500 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded-full backdrop-blur-md shadow-sm">
                         New Link
                       </span>
                     </div>
                   ))}

                 </div>
               )}
             </div>
            </>
        </div>
      </div>
    </div>
  )
}
