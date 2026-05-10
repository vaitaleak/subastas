export interface Auction {
  id: string;
  source: string;
  source_id: string;
  tipo_bien: string;
  provincia: string;
  municipio: string;
  direccion: string;
  valor_subasta: number;
  puja_minima: number;
  puja_actual: number | null;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
  descripcion: string;
  organismo: string;
  url_detalle: string;
  referencia_catastral: string;
  lat: number | null;
  lng: number | null;
  imagen_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuctionFilters {
  provincia?: string;
  tipo_bien?: string;
  precio_min?: number;
  precio_max?: number;
  query?: string;
  source?: string;
  estado?: string;
  page?: number;
  sort?: string;
}

export interface AuctionsResponse {
  auctions: Auction[];
  total: number;
  page: number;
  totalPages: number;
}

export interface Alert {
  id: string;
  email: string;
  filters: AuctionFilters;
  frequency: 'diaria' | 'semanal';
  active: boolean;
  created_at: string;
}
