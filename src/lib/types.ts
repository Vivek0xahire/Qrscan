export interface Category {
  id: string
  name: string
  info_details: string | null
  price: number | null
  discount_price: number | null
  instagram_link: string | null
  pinterest_link: string | null
  views: number | null
  qr_note: string | null
  created_at: string
}

export interface CategoryMedia {
  id: string
  category_id: string
  url: string
  media_type: 'image' | 'video'
  created_at: string
}
