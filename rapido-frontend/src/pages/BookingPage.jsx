import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api, { rideApi, getUser } from '../services/api.js'
import RateDriverModal from '../components/RateDriverModal.jsx'
import PaymentModal from '../components/PaymentModal.jsx'
import DriverChatModal from '../components/DriverChatModal.jsx'
import DriverDetailsModal from '../components/DriverDetailsModal.jsx'
import {
  IconBike, IconAuto, IconCab,
  IconMap, IconGPS, IconArrowLeft,
  IconLocationPin, IconPhone, IconSurge, IconClock,
  IconHome, IconWork, IconGym, IconSchool, IconHospital, IconMarket, IconLocation,
} from '../components/icons.jsx'

// ── Quick location label config (mirrors ProfilePage) ─────────────────────────
const LABEL_CONFIG = {
  HOME:     { Icon: IconHome,     color: '#2563EB', bg: '#DBEAFE', label: 'Home' },
  WORK:     { Icon: IconWork,     color: '#059669', bg: '#D1FAE5', label: 'Work' },
  GYM:      { Icon: IconGym,      color: '#7C3AED', bg: '#EDE9FE', label: 'Gym' },
  SCHOOL:   { Icon: IconSchool,   color: '#EA580C', bg: '#FFEDD5', label: 'School' },
  HOSPITAL: { Icon: IconHospital, color: '#DC2626', bg: '#FEE2E2', label: 'Hospital' },
  MARKET:   { Icon: IconMarket,   color: '#F59E0B', bg: '#FEF3C7', label: 'Market' },
  OTHER:    { Icon: IconLocation, color: '#6B7280', bg: '#F3F4F6', label: 'Other' },
}

// ── Fix Leaflet default icon ───────────────────────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const pickupIcon = new L.DivIcon({
  html: `<div style="width:20px;height:20px;border-radius:50%;background:#059669;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>`,
  iconSize:[20,20],iconAnchor:[10,10],className:'',
})
const dropIcon = new L.DivIcon({
  html: `<div style="width:20px;height:20px;border-radius:50%;background:#DC2626;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>`,
  iconSize:[20,20],iconAnchor:[10,10],className:'',
})
const makeDriverIcon = (emoji) => new L.DivIcon({
  html: `<div style="font-size:24px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,.3))">${emoji}</div>`,
  iconSize:[28,28],iconAnchor:[14,14],className:'',
})
const makePOIIcon = () => new L.DivIcon({
  html: `<div style="width:16px;height:16px;border-radius:50%;background:#2563EB;border:2px solid white;box-shadow:0 1px 6px rgba(0,0,0,.3)"></div>`,
  iconSize:[16,16],iconAnchor:[8,8],className:'',
})

const VEHICLES = [
  { type:'BIKE', emoji:'🏍️', Icon: IconBike,  name:'CABkaro Bike', fareKey:'bikeFare', eta:'2-3 min', color:'#F59E0B' },
  { type:'AUTO', emoji:'🛺',  Icon: IconAuto,  name:'Auto',         fareKey:'autoFare', eta:'4-6 min', color:'#2563EB' },
  { type:'CAB',  emoji:'🚕',  Icon: IconCab,   name:'Prime Cab',    fareKey:'cabFare',  eta:'4-7 min', color:'#059669' },
]
const DEFAULT_CENTER = [25.2677, 82.9913] // BHU, Varanasi

// ── Haversine distance in km ──────────────────────────────────────────────────
function haversineKm(a,b,c,d){
  const R=6371,dl=(c-a)*Math.PI/180,dm=(d-b)*Math.PI/180,
        e=Math.sin(dl/2)**2+Math.cos(a*Math.PI/180)*Math.cos(c*Math.PI/180)*Math.sin(dm/2)**2
  return R*2*Math.atan2(Math.sqrt(e),Math.sqrt(1-e))
}

// ── Google Maps Routes API (road distance) ────────────────────────────────────
// Uses Routes API v2 (computeRoutes) — free 10k requests/month
// Falls back to OSRM if key is missing
const GMAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY || ''

async function getRoadDistanceKm(lat1, lng1, lat2, lng2) {
  // Try Google Maps Routes API first
  if (GMAPS_KEY) {
    try {
      const body = {
        origin:      { location: { latLng: { latitude: lat1, longitude: lng1 } } },
        destination: { location: { latLng: { latitude: lat2, longitude: lng2 } } },
        travelMode:  'DRIVE',
        routingPreference: 'TRAFFIC_AWARE',
        computeAlternativeRoutes: false,
        languageCode: 'en-US',
        units: 'METRIC',
      }
      const r = await fetch(
        `https://routes.googleapis.com/directions/v2:computeRoutes?key=${GMAPS_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline',
          },
          body: JSON.stringify(body),
        }
      )
      const data = await r.json()
      if (data.routes && data.routes[0]?.distanceMeters) {
        const km = data.routes[0].distanceMeters / 1000
        const encodedPolyline = data.routes[0].polyline?.encodedPolyline
        return { km, encodedPolyline }
      }
    } catch (e) {
      console.warn('Google Maps Routes API failed, falling back to OSRM:', e.message)
    }
  }

  // Fallback: OSRM open-source routing (free, no key needed)
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${lng1},${lat1};${lng2},${lat2}?overview=full&geometries=geojson`
    const r = await fetch(url)
    const data = await r.json()
    if (data.routes && data.routes[0]) {
      const km = data.routes[0].distance / 1000
      const coords = data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng])
      return { km, coords }
    }
  } catch {}

  // Last resort: Haversine × 1.3 road factor
  const km = haversineKm(lat1, lng1, lat2, lng2) * 1.3
  return { km, coords: null }
}

// ── Decode Google encoded polyline to [lat,lng] array ─────────────────────────
function decodePolyline(encoded) {
  const points = []
  let index = 0, lat = 0, lng = 0
  while (index < encoded.length) {
    let b, shift = 0, result = 0
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5 } while (b >= 0x20)
    lat += result & 1 ? ~(result >> 1) : result >> 1
    shift = 0; result = 0
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5 } while (b >= 0x20)
    lng += result & 1 ? ~(result >> 1) : result >> 1
    points.push([lat / 1e5, lng / 1e5])
  }
  return points
}

// ── Nominatim helpers ─────────────────────────────────────────────────────────
async function reverseGeocode(lat,lng){
  try{const r=await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,{headers:{'Accept-Language':'en'}});const d=await r.json();return d.display_name?.split(',').slice(0,3).join(', ')||`${lat.toFixed(4)},${lng.toFixed(4)}`}catch{return `${lat.toFixed(4)},${lng.toFixed(4)}`}
}
async function forwardGeocode(q){
  try{const r=await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5`,{headers:{'Accept-Language':'en'}});return await r.json()}catch{return[]}
}
async function searchPOI(q,lat,lng){
  try{
    const vb=`${lng-0.1},${lat+0.1},${lng+0.1},${lat-0.1}`
    const r=await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=6&bounded=1&viewbox=${vb}`,{headers:{'Accept-Language':'en'}})
    return await r.json()
  }catch{return[]}
}

// ── Nearby drivers — 100m radius, snapped to roads via OSRM ─────────────────
// We generate candidate points around the pickup, then snap each one to
// the nearest road using OSRM's nearest endpoint so drivers appear on roads.
async function generateNearbyDriversOnRoad(lat, lng) {
  const types = [{ emoji:'🏍️', type:'BIKE' }, { emoji:'🛺', type:'AUTO' }, { emoji:'🚕', type:'CAB' }]
  const names = ['Ravi','Suresh','Mohan','Arjun','Kumar','Sanjay','Raj','Ramesh','Vinay']

  // Place 9 candidate points evenly around the pickup within 50–100m
  const candidates = Array.from({ length: 9 }, (_, i) => {
    const angle  = (i / 9) * 2 * Math.PI
    const radius = 0.0005 + (i % 3) * 0.0002  // 55m, 75m, 95m
    return {
      rawLat: lat + radius * Math.cos(angle),
      rawLng: lng + radius * Math.sin(angle),
      index: i,
    }
  })

  // Snap each candidate to nearest road using OSRM /nearest
  const snapped = await Promise.all(candidates.map(async (c) => {
    try {
      const url = `https://router.project-osrm.org/nearest/v1/driving/${c.rawLng},${c.rawLat}?number=1`
      const r   = await fetch(url)
      const d   = await r.json()
      if (d.waypoints?.[0]?.location) {
        const [sLng, sLat] = d.waypoints[0].location
        return { ...c, lat: sLat, lng: sLng }
      }
    } catch {}
    // Fallback: use raw point if OSRM fails
    return { ...c, lat: c.rawLat, lng: c.rawLng }
  }))

  return snapped.map((d, i) => ({
    id: i,
    lat: d.lat,
    lng: d.lng,
    ...types[i % 3],
    name: names[i % names.length],
    rating: (4.2 + (i * 0.09) % 0.7).toFixed(1),
    distKm: haversineKm(lat, lng, d.lat, d.lng),
  })).filter(d => d.distKm <= 0.12) // keep within ~120m after snapping
}

// ── Map helpers ───────────────────────────────────────────────────────────────
function MapClickHandler({active,selectingFor,onPickup,onDrop}){
  useMapEvents({click(e){
    // always active — if both pins set, re-set the drop
    onPickup && onDrop && (selectingFor==='pickup'?onPickup(e.latlng):onDrop(e.latlng))
  }})
  return null
}
function FitBounds({pickup,drop}){
  const map=useMap()
  useEffect(()=>{
    const p=pickup?.lat&&pickup?.lng,d=drop?.lat&&drop?.lng
    if(p&&d)map.fitBounds([[pickup.lat,pickup.lng],[drop.lat,drop.lng]],{padding:[80,80]})
    else if(p)map.setView([pickup.lat,pickup.lng],15)
  },[pickup,drop,map])
  return null
}

// Re-fits map to pickup→drop when journey starts (driver arrived + 2s)
function MapRefitOnRideStart({ pickup, drop, rideStarted }) {
  const map = useMap()
  useEffect(() => {
    if (!rideStarted || !pickup || !drop) return
    map.fitBounds(
      [[pickup.lat, pickup.lng], [drop.lat, drop.lng]],
      { padding: [60, 60], animate: true, duration: 1.2 }
    )
  }, [rideStarted]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

// ── localStorage key for persisting active ride ───────────────────────────────
const RIDE_STORAGE_KEY = 'cabkaro_active_ride'

function saveRideToStorage(data) {
  try { localStorage.setItem(RIDE_STORAGE_KEY, JSON.stringify(data)) } catch {}
}

function loadRideFromStorage() {
  try {
    const raw = localStorage.getItem(RIDE_STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function clearRideFromStorage() {
  try { localStorage.removeItem(RIDE_STORAGE_KEY) } catch {}
}

// ── Map click handler (reusable) ──────────────────────────────────────────────
function MapClickHandler2({ onMapClick }) {
  useMapEvents({ click(e) { onMapClick(e.latlng.lat, e.latlng.lng) } })
  return null
}

// ── Colored pin icon ──────────────────────────────────────────────────────────
const makePinIcon2 = (color) => new L.DivIcon({
  html: `<div style="width:22px;height:22px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.35)"></div>`,
  iconSize: [22,22], iconAnchor: [11,11], className: '',
})

// ── Location Picker Modal (same UX as ProfilePage quick-location modal) ────────
function LocationPickerModal({ forField, onClose, onConfirm }) {
  const isPickup = forField === 'pickup'
  const color    = isPickup ? '#059669' : '#DC2626'
  const label    = isPickup ? 'Pickup' : 'Drop-off'

  const [pinLat,    setPinLat]    = useState(null)
  const [pinLng,    setPinLng]    = useState(null)
  const [address,   setAddress]   = useState('')
  const [locating,  setLocating]  = useState(false)
  const [mapCenter, setMapCenter] = useState([20.5937, 78.9629])
  const [searchQ,   setSearchQ]   = useState('')
  const [results,   setResults]   = useState([])
  const [searching, setSearching] = useState(false)
  const searchTimer = useRef(null)

  // Auto-GPS on open for pickup
  useEffect(() => {
    if (isPickup && navigator.geolocation) {
      setLocating(true)
      navigator.geolocation.getCurrentPosition(async pos => {
        const { latitude: lat, longitude: lng } = pos.coords
        setPinLat(lat); setPinLng(lng)
        setMapCenter([lat, lng])
        setAddress('Loading address…')
        const addr = await reverseGeocode(lat, lng)
        setAddress(addr)
        setLocating(false)
      }, () => setLocating(false))
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleMapClick = useCallback(async (lat, lng) => {
    setPinLat(lat); setPinLng(lng)
    setAddress('Loading address…')
    const addr = await reverseGeocode(lat, lng)
    setAddress(addr)
    setResults([])
    setSearchQ('')
  }, [])

  const handleGPS = () => {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(async pos => {
      const { latitude: lat, longitude: lng } = pos.coords
      setPinLat(lat); setPinLng(lng)
      setMapCenter([lat, lng])
      setAddress('Loading address…')
      const addr = await reverseGeocode(lat, lng)
      setAddress(addr)
      setLocating(false)
    }, () => setLocating(false))
  }

  const handleSearchInput = (q) => {
    setSearchQ(q)
    clearTimeout(searchTimer.current)
    if (q.length < 3) { setResults([]); return }
    setSearching(true)
    searchTimer.current = setTimeout(async () => {
      const r = await forwardGeocode(q)
      setResults(r)
      setSearching(false)
    }, 400)
  }

  const handleResultClick = async (r) => {
    const lat = parseFloat(r.lat), lng = parseFloat(r.lon)
    const addr = r.display_name.split(',').slice(0, 3).join(', ')
    setPinLat(lat); setPinLng(lng)
    setMapCenter([lat, lng])
    setAddress(addr)
    setSearchQ(addr)
    setResults([])
  }

  const handleConfirm = () => {
    if (!pinLat || !pinLng) return
    onConfirm({ lat: pinLat, lng: pinLng, address: address || `${pinLat.toFixed(4)}, ${pinLng.toFixed(4)}` })
    onClose()
  }

  return (
    <div style={LM.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={LM.sheet}>
        {/* Header */}
        <div style={LM.header}>
          <div style={LM.headerLeft}>
            <div style={{ ...LM.dot, background: color }} />
            <div>
              <div style={LM.title}>Set {label} Location</div>
              <div style={LM.sub}>Search or tap the map to pin</div>
            </div>
          </div>
          <button style={LM.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Search bar */}
        <div style={LM.searchWrap}>
          <div style={LM.searchRow}>
            <IconLocationPin size={15} color="#A0AEC0" />
            <input
              style={LM.searchInput}
              placeholder={`Search ${label.toLowerCase()} address…`}
              value={searchQ}
              onChange={e => handleSearchInput(e.target.value)}
              autoFocus
            />
            {searching && <span style={{fontSize:12,color:'#A0AEC0'}}>…</span>}
          </div>
          {results.length > 0 && (
            <div style={LM.resultsList}>
              {results.map((r, i) => (
                <div key={i} style={LM.resultItem} onClick={() => handleResultClick(r)}>
                  <IconLocationPin size={12} color="#A0AEC0" />
                  <span>{r.display_name.substring(0, 65)}…</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* GPS button */}
        <button style={LM.gpsBtn} onClick={handleGPS} disabled={locating}>
          <IconGPS size={15} color="#2563EB" />
          <span>{locating ? 'Getting location…' : 'Use my current location'}</span>
        </button>

        {/* Map */}
        <div style={LM.mapWrap}>
          <MapContainer
            center={mapCenter}
            zoom={pinLat ? 15 : 5}
            style={{ height: '100%', width: '100%' }}
            key={`${mapCenter[0]}-${mapCenter[1]}`}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap contributors'
            />
            <MapClickHandler2 onMapClick={handleMapClick} />
            {pinLat && pinLng && (
              <Marker position={[pinLat, pinLng]} icon={makePinIcon2(color)} />
            )}
          </MapContainer>
          {!pinLat && (
            <div style={LM.mapHint}>
              <IconMap size={16} color="#A0AEC0" />
              <span>Tap the map to drop a pin</span>
            </div>
          )}
        </div>

        {/* Address display */}
        {pinLat && (
          <div style={{ ...LM.addressBox, borderColor: color + '55', background: isPickup ? '#F0FFF4' : '#FFF5F5' }}>
            <IconLocationPin size={14} color={color} />
            <span style={{ ...LM.addressText, color: isPickup ? '#276749' : '#9B1C1C' }}>
              {address || `${pinLat.toFixed(5)}, ${pinLng.toFixed(5)}`}
            </span>
          </div>
        )}

        {/* Confirm button */}
        <button
          style={{ ...LM.confirmBtn, background: color, opacity: !pinLat ? 0.5 : 1 }}
          onClick={handleConfirm}
          disabled={!pinLat}
        >
          Confirm {label}
        </button>
      </div>
    </div>
  )
}

// Modal styles
const LM = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
    zIndex: 3000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
  },
  sheet: {
    background: '#FFFFFF', borderRadius: '20px 20px 0 0',
    width: '100%', maxWidth: 540,
    maxHeight: '92vh', overflowY: 'auto',
    padding: '0 0 24px',
    boxShadow: '0 -4px 40px rgba(0,0,0,0.2)',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 18px 12px', borderBottom: '1px solid #F0F2F5',
    position: 'sticky', top: 0, background: '#FFFFFF', zIndex: 10,
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 12 },
  dot: { width: 16, height: 16, borderRadius: '50%', border: '3px solid white', boxShadow: '0 2px 8px rgba(0,0,0,0.2)', flexShrink: 0 },
  title: { fontSize: 16, fontWeight: 700, color: '#1A202C' },
  sub:   { fontSize: 12, color: '#A0AEC0', marginTop: 2 },
  closeBtn: {
    background: '#F5F7FA', border: 'none', borderRadius: 8,
    width: 34, height: 34, cursor: 'pointer', fontSize: 16,
    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#718096',
  },
  searchWrap: { padding: '12px 18px 0', position: 'relative' },
  searchRow: {
    display: 'flex', alignItems: 'center', gap: 8,
    background: '#F5F7FA', border: '1px solid #E2E8F0',
    borderRadius: 12, padding: '10px 14px',
  },
  searchInput: {
    flex: 1, border: 'none', background: 'transparent',
    fontSize: 14, color: '#1A202C', outline: 'none',
  },
  resultsList: {
    position: 'absolute', top: '100%', left: 18, right: 18,
    background: '#FFFFFF', border: '1px solid #E2E8F0',
    borderRadius: 12, zIndex: 9999, maxHeight: 220, overflowY: 'auto',
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)', marginTop: 4,
  },
  resultItem: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '10px 14px', fontSize: 13, color: '#1A202C',
    cursor: 'pointer', borderBottom: '1px solid #F0F2F5',
  },
  gpsBtn: {
    display: 'flex', alignItems: 'center', gap: 8,
    margin: '12px 18px 0',
    background: '#EFF6FF', border: '1px solid #BFDBFE',
    color: '#2563EB', borderRadius: 10, padding: '10px 14px',
    cursor: 'pointer', fontSize: 13, fontWeight: 600, width: 'calc(100% - 36px)',
  },
  mapWrap: {
    position: 'relative', height: 270, margin: '12px 18px 0',
    borderRadius: 14, overflow: 'hidden', border: '1px solid #E2E8F0',
  },
  mapHint: {
    position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
    background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(4px)',
    border: '1px solid #E2E8F0', borderRadius: 20,
    padding: '8px 14px', fontSize: 12, color: '#718096',
    display: 'flex', alignItems: 'center', gap: 6,
    whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 1000,
  },
  addressBox: {
    display: 'flex', alignItems: 'flex-start', gap: 8,
    margin: '12px 18px 0', border: '1px solid',
    borderRadius: 10, padding: '10px 14px',
  },
  addressText: { fontSize: 13, lineHeight: 1.4, flex: 1, fontWeight: 500 },
  confirmBtn: {
    display: 'block', width: 'calc(100% - 36px)', margin: '14px 18px 0',
    color: 'white', border: 'none', borderRadius: 14,
    padding: '14px', fontSize: 15, fontWeight: 700, cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
  },
}

// ─────────────────────────────────────────────────────────────────────────────
export default function BookingPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const poi         = searchParams.get('poi')
  const vehicleParam = searchParams.get('vehicle')?.toUpperCase() || null  // BIKE|AUTO|CAB from home
  const dropLatParam  = searchParams.get('dropLat')
  const dropLngParam  = searchParams.get('dropLng')
  const dropAddrParam = searchParams.get('dropAddr')

  // If vehicle came from home page, it's pre-locked (hide selector)
  const vehiclePreLocked = !!vehicleParam && ['BIKE','AUTO','CAB'].includes(vehicleParam)

  const [pickup, setPickup]               = useState(null)
  const [drop, setDrop]                   = useState(null)
  const [selectingFor, setSelecting]      = useState('pickup')
  const [clickMode, setClickMode]         = useState(false)
  const [pickupQuery, setPickupQ]         = useState('')
  const [dropQuery, setDropQ]             = useState('')
  const [pickupResults, setPickupR]       = useState([])
  const [dropResults, setDropR]           = useState([])
  const [searchTimer, setSearchTimer]     = useState(null)
  const [estimates, setEstimates]         = useState(null)
  const [selectedVehicle, setVehicle]     = useState(vehicleParam || 'BIKE')
  const [loadingFare, setLoadingFare]     = useState(false)
  const [booking, setBooking]             = useState(false)
  const [stage, setStage]                 = useState('map') // map|select|searching|riding|rating
  const [driverFound, setDriverFound]     = useState(null)
  const [rideInfo, setRideInfo]           = useState(null)
  const [routePoints, setRoutePoints]     = useState([])
  const [nearbyDrivers, setNearbyDrivers] = useState([])
  const [poiMarkers, setPOIMarkers]       = useState([])
  const [elapsed, setElapsed]             = useState(0)
  const [showPayment, setShowPayment]     = useState(false)
  const [showChat, setShowChat]           = useState(false)
  const [showDriverInfo, setShowDriverInfo] = useState(false)
  const [roadDistKm, setRoadDistKm]       = useState(null)
  const [currentTime, setCurrentTime]     = useState(new Date())
  const [cancelSecondsLeft, setCancelSecondsLeft] = useState(0)   // counts 60→0 after booking
  const [cancelling, setCancelling]               = useState(false)
  const [etaMinutes, setEtaMinutes]               = useState(null) // ETA to destination in minutes
  const [rideOtp, setRideOtp]                     = useState(null) // 4-digit OTP per ride
  const [driverPos, setDriverPos]                 = useState(null) // animated driver marker {lat,lng}
  const [driverRoutePoints, setDriverRoutePoints] = useState([])   // road path driver→pickup (live)
  const [driverArrived, setDriverArrived]         = useState(false) // true once driver reaches pickup
  const [rideStarted, setRideStarted]             = useState(false) // true once journey begins (after arrival)
  // ── Quick location shortcuts ──────────────────────────────────────────────
  const [quickLocs, setQuickLocs]         = useState([])
  const [showQuickLocs, setShowQuickLocs] = useState(true)
  const timerRef         = useRef(null)
  const clockRef         = useRef(null)
  const restoredRef      = useRef(false)
  const cancelStartedRef = useRef(false)   // tracks if countdown has started this session
  const cancelTimerRef   = useRef(null)
  const driverAnimRef    = useRef(null)    // interval for driver marker animation
  const cancelInitRef    = useRef(null)    // holds restored remaining seconds synchronously (bypasses async state)
  const rideBookedAtRef  = useRef(null)    // wall-clock ms when ride was booked — survives re-renders
  const rideOtpRef       = useRef(null)    // OTP set on booking/restore — read synchronously before setStage

  // ── Live clock (updates every minute) ─────────────────────────────────────
  useEffect(() => {
    clockRef.current = setInterval(() => setCurrentTime(new Date()), 30000)
    return () => clearInterval(clockRef.current)
  }, [])

  // ── Fetch saved quick locations (Home / Work / etc.) ──────────────────────
  useEffect(() => {
    api.get('/user/quick-locations')
      .then(res => setQuickLocs(res.data || []))
      .catch(() => {}) // not logged in or no locations saved — silently ignore
  }, [])

  // ── Cancel countdown — starts when stage becomes 'riding' ────────────────
  useEffect(() => {
    if (stage === 'riding' && !cancelStartedRef.current) {
      cancelStartedRef.current = true

      // Determine starting value:
      //   cancelInitRef.current is set synchronously in the restore block before setStage fires,
      //   so it's always the correct remaining seconds (or null for a fresh booking → use 60).
      const startVal = cancelInitRef.current !== null ? cancelInitRef.current : 60
      cancelInitRef.current = null  // consume it

      setCancelSecondsLeft(startVal)

      // If already expired, don't start a countdown
      if (startVal <= 0) return

      const id = setInterval(() => {
        setCancelSecondsLeft(prev => {
          if (prev <= 1) { clearInterval(id); return -1 }
          return prev - 1
        })
      }, 1000)
      cancelTimerRef.current = id

      return () => {
        clearInterval(id)
        cancelTimerRef.current = null
        cancelStartedRef.current = false
      }
    }
    if (stage !== 'riding') {
      cancelStartedRef.current = false
      setCancelSecondsLeft(0)
      clearInterval(cancelTimerRef.current)
      setDriverArrived(false)
      setDriverRoutePoints([])
      setRideStarted(false)
    }
  }, [stage]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Set OTP when ride starts ───────────────────────────────────────────────
  // Reads rideOtpRef (set synchronously before setStage) so refresh never regenerates the OTP.
  useEffect(() => {
    if (stage === 'riding') {
      if (rideOtpRef.current) {
        setRideOtp(rideOtpRef.current)
        // Do NOT null the ref here — the persist effect may not have re-run yet with the new state value
      }
    } else {
      setRideOtp(null)
    }
  }, [stage])

  // ── Driver animation: runs ONCE per ride, stable across re-renders/refresh ─
  // Guard ref ensures the effect body only executes once per rideId.
  // Route + progress are persisted in localStorage keyed by rideId.
  const animationStartedRef = useRef(false)

  useEffect(() => {
    if (stage !== 'riding' || !pickup || !rideInfo) return

    // ── Guard: only start once per component lifecycle ───────────────────────
    if (animationStartedRef.current) return
    animationStartedRef.current = true

    const rideKey = `cabkaro_driver_anim_${rideInfo.rideId || 'ride'}`

    const stored = (() => {
      try { return JSON.parse(localStorage.getItem(rideKey) || 'null') } catch { return null }
    })()

    // Already arrived before refresh — restore final state immediately
    if (stored?.arrived) {
      const lastSaved = stored.route?.[stored.route.length - 1]
      setDriverPos(lastSaved ? { lat: lastSaved.lat, lng: lastSaved.lng } : { lat: pickup.lat, lng: pickup.lng })
      setDriverRoutePoints([])
      setDriverArrived(true)
      return
    }

    // ── Deterministic 700m start point based on pickup coords ────────────────
    // Using a fixed angle derived from pickup lat so it's always the same
    // for this pickup location — no randomness.
    const DIST_DEG = 0.0063  // ~700m in degrees (~0.009° per km)
    const fixedAngle = ((pickup.lat * 1000) % 360) * (Math.PI / 180)
    const fixedStartLat = pickup.lat + DIST_DEG * Math.cos(fixedAngle)
    const fixedStartLng = pickup.lng + DIST_DEG * Math.sin(fixedAngle)

    const savedRoute = stored?.route  // [{lat, lng}] — saved on first fetch
    const savedTick  = stored?.tick || 0

    // ── Core animation function — runs on saved or freshly fetched route ─────
    const runAnimation = (roadPoints) => {
      // Compute total road distance once
      let totalDistKm = 0
      for (let i = 1; i < roadPoints.length; i++) {
        totalDistKm += haversineKm(
          roadPoints[i-1].lat, roadPoints[i-1].lng,
          roadPoints[i].lat,   roadPoints[i].lng
        )
      }

      const SPEED_KM_S = 25 / 3600  // 25 km/h city speed
      const TICK_MS    = 500
      const totalTicks = Math.max(20, Math.ceil((totalDistKm / SPEED_KM_S * 1000) / TICK_MS))

      // Returns driver position and remaining route at a given tick.
      // done=true only when driver has walked the full road distance to the
      // last coordinate of the OSRM route (= exact pickup pin on road).
      const lastPt = roadPoints[roadPoints.length - 1]
      const getStateAtTick = (t) => {
        const walkedKm   = Math.min(t * SPEED_KM_S * (TICK_MS / 1000), totalDistKm)
        const atEnd      = walkedKm >= totalDistKm

        if (atEnd) {
          return { pos: lastPt, remaining: [], done: true }
        }

        let acc = 0
        for (let i = 1; i < roadPoints.length; i++) {
          const seg = haversineKm(
            roadPoints[i-1].lat, roadPoints[i-1].lng,
            roadPoints[i].lat,   roadPoints[i].lng
          )
          if (acc + seg >= walkedKm) {
            const r = seg > 0 ? (walkedKm - acc) / seg : 0
            const pos = {
              lat: roadPoints[i-1].lat + (roadPoints[i].lat - roadPoints[i-1].lat) * r,
              lng: roadPoints[i-1].lng + (roadPoints[i].lng - roadPoints[i-1].lng) * r,
            }
            // Remaining route: from current position to last OSRM point
            const remaining = [
              [pos.lat, pos.lng],
              ...roadPoints.slice(i).map(p => [p.lat, p.lng]),
            ]
            return { pos, remaining, done: false }
          }
          acc += seg
        }

        // Fallback — snapped to last point
        return { pos: lastPt, remaining: [], done: true }
      }

      // Show full remaining route from restored tick immediately
      const { pos: initPos, remaining: initRemaining } = getStateAtTick(savedTick)
      setDriverPos({ lat: initPos.lat, lng: initPos.lng })
      setDriverRoutePoints(
        savedTick === 0
          ? roadPoints.map(p => [p.lat, p.lng])
          : initRemaining
      )

      let tick = savedTick

      driverAnimRef.current = setInterval(() => {
        tick++
        const { pos, remaining, done } = getStateAtTick(tick)

        setDriverPos({ lat: pos.lat, lng: pos.lng })
        setDriverRoutePoints(remaining)

        // Save progress every 4 ticks (~2s) so refresh resumes close to here
        if (tick % 4 === 0) {
          try {
            const cur = JSON.parse(localStorage.getItem(rideKey) || '{}')
            localStorage.setItem(rideKey, JSON.stringify({ ...cur, tick }))
          } catch {}
        }

        if (done) {
          clearInterval(driverAnimRef.current)
          // Snap to exact last coordinate of OSRM route (road-snapped pickup)
          setDriverPos({ lat: lastPt.lat, lng: lastPt.lng })
          setDriverRoutePoints([])
          setDriverArrived(true)
          try {
            localStorage.setItem(rideKey, JSON.stringify({ arrived: true, route: roadPoints }))
          } catch {}
        }
      }, TICK_MS)
    }

    if (savedRoute && savedRoute.length >= 2) {
      // ── Refresh path: use exact saved route — no re-fetch, no re-spawn ──
      runAnimation(savedRoute)
    } else {
      // ── First booking: fetch OSRM route from real driver location → pickup
      const driverLat = (rideInfo.driverLatitude != null && !isNaN(Number(rideInfo.driverLatitude)))
        ? Number(rideInfo.driverLatitude)
        : fixedStartLat

      const driverLng = (rideInfo.driverLongitude != null && !isNaN(Number(rideInfo.driverLongitude)))
        ? Number(rideInfo.driverLongitude)
        : fixedStartLng

      ;(async () => {
        let roadPoints = null
        try {
          const url = `https://router.project-osrm.org/route/v1/driving/${driverLng},${driverLat};${pickup.lng},${pickup.lat}?overview=full&geometries=geojson&steps=false`
          const r    = await fetch(url)
          const data = await r.json()
          if (data.routes?.[0]?.geometry?.coordinates?.length > 1) {
            roadPoints = data.routes[0].geometry.coordinates.map(([lng, lat]) => ({ lat, lng }))
          }
        } catch {}

        // Fallback: straight line
        if (!roadPoints || roadPoints.length < 2) {
          const steps = 30
          roadPoints = Array.from({ length: steps + 1 }, (_, i) => ({
            lat: driverLat + (pickup.lat - driverLat) * (i / steps),
            lng: driverLng + (pickup.lng - driverLng) * (i / steps),
          }))
        }

        // Save route keyed by rideId — this is the single source of truth
        try {
          localStorage.setItem(rideKey, JSON.stringify({ route: roadPoints, tick: 0, arrived: false }))
        } catch {}

        runAnimation(roadPoints)
      })()
    }

    return () => clearInterval(driverAnimRef.current)
  }, [stage, pickup, rideInfo]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reset guard when ride ends so next booking can start fresh
  useEffect(() => {
    if (stage !== 'riding') {
      animationStartedRef.current = false
    }
  }, [stage])

  // ── Auto-start journey 2s after driver arrives ────────────────────────────
  useEffect(() => {
    if (!driverArrived) return
    const t = setTimeout(() => setRideStarted(true), 2000)
    return () => clearTimeout(t)
  }, [driverArrived])

  // ── ETA fetch — Google Maps Routes API duration when both pins set ─────────
  // Runs on pickup/drop change (including during riding stage after restore)
  useEffect(() => {
    if (!pickup || !drop || !GMAPS_KEY) return
    const fetchEta = async () => {
      try {
        const body = {
          origin:      { location: { latLng: { latitude: pickup.lat, longitude: pickup.lng } } },
          destination: { location: { latLng: { latitude: drop.lat,   longitude: drop.lng   } } },
          travelMode: 'DRIVE',
          routingPreference: 'TRAFFIC_AWARE',
          languageCode: 'en-US', units: 'METRIC',
        }
        const r = await fetch(
          `https://routes.googleapis.com/directions/v2:computeRoutes?key=${GMAPS_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Goog-FieldMask': 'routes.duration' },
            body: JSON.stringify(body),
          }
        )
        const data = await r.json()
        if (data.routes?.[0]?.duration) {
          // duration comes as "Xs" e.g. "1245s"
          const secs = parseInt(data.routes[0].duration.replace('s', ''), 10)
          setEtaMinutes(Math.ceil(secs / 60))
        }
      } catch {}
    }
    fetchEta()
  }, [pickup, drop]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── ETA from OSRM when no Google key ──────────────────────────────────────
  useEffect(() => {
    if (!pickup || !drop || GMAPS_KEY) return
    const fetchOsrmEta = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${pickup.lng},${pickup.lat};${drop.lng},${drop.lat}?overview=false`
        const r = await fetch(url)
        const data = await r.json()
        if (data.routes?.[0]?.duration) {
          setEtaMinutes(Math.ceil(data.routes[0].duration / 60))
        }
      } catch {}
    }
    fetchOsrmEta()
  }, [pickup, drop]) // eslint-disable-line react-hooks/exhaustive-deps


  // ── Pre-set drop from query params (Quick Go saved location) ──────────────
  useEffect(() => {
    if (dropLatParam && dropLngParam) {
      const lat = parseFloat(dropLatParam)
      const lng = parseFloat(dropLngParam)
      const addr = dropAddrParam ? decodeURIComponent(dropAddrParam) : `${lat.toFixed(4)}, ${lng.toFixed(4)}`
      setDrop({ lat, lng, address: addr })
      setDropQ(addr)
      setShowQuickLocs(false) // drop already set from URL, hide chips
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Restore active ride from localStorage on mount ─────────────────────────
  useEffect(() => {
    const saved = loadRideFromStorage()
    if (saved && saved.stage === 'riding') {
      // ── Compute cancel remaining FIRST, write to ref synchronously ──
      // This MUST happen before setStage('riding') so the countdown useEffect
      // reads cancelInitRef.current before it fires.
      if (saved.rideBookedAt) {
        const elapsedSec = Math.floor((Date.now() - saved.rideBookedAt) / 1000)
        const remaining  = 60 - elapsedSec
        cancelInitRef.current   = remaining > 0 ? remaining : -1
        rideBookedAtRef.current = saved.rideBookedAt  // keep in ref for subsequent saves
      } else {
        // Old entry with no timestamp — don't punish the user, treat as expired
        // so the cancelled window row is simply hidden (not shown as "unavailable")
        cancelInitRef.current = -1
      }

      // Re-hydrate all ride state
      setRideInfo(saved.rideInfo)
      setDriverFound(saved.driverFound)
      setPickup(saved.pickup)
      setDrop(saved.drop)
      setPickupQ(saved.pickupQuery || '')
      setDropQ(saved.dropQuery || '')
      setEstimates(saved.estimates)
      setVehicle(saved.selectedVehicle || vehicleParam || 'BIKE')
      setRoadDistKm(saved.roadDistKm || null)
      setRoutePoints(saved.routePoints || [])
      if (saved.rideOtp) setRideOtp(saved.rideOtp)
      if (saved.rideOtp) rideOtpRef.current = saved.rideOtp  // sync ref so OTP effect doesn't regenerate

      // setStage LAST — triggers the countdown useEffect, which now reads the correct ref
      setStage('riding')
    }
    restoredRef.current = true
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Persist ride to localStorage whenever stage is 'riding' ───────────────
  useEffect(() => {
    // Skip clearing on initial render before restore has been attempted
    if (!restoredRef.current) return
    if (stage === 'riding' && rideInfo) {
      saveRideToStorage({
        stage: 'riding',
        rideInfo,
        driverFound,
        pickup,
        drop,
        pickupQuery,
        dropQuery,
        estimates,
        selectedVehicle,
        roadDistKm,
        routePoints,
        rideOtp: rideOtp || rideOtpRef.current,  // fallback to ref if state hasn't settled yet
        rideBookedAt: rideBookedAtRef.current,  // always correct — set on booking or restore
      })
    }
    if (stage === 'rating' || stage === 'map' || stage === 'select') {
      clearRideFromStorage()
    }
  }, [stage, rideInfo, rideOtp])

  // ── Auto-detect GPS ────────────────────────────────────────────────────────
  useEffect(() => {
    // Don't override pickup if we restored a ride from storage (stage already set to 'riding')
    if (stage === 'riding') return

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async pos => {
        const { latitude: lat, longitude: lng } = pos.coords
        const address = await reverseGeocode(lat, lng)
        setPickup({ lat, lng, address })
        setPickupQ(address)
      })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Nearby drivers — snapped to roads, within 100m ───────────────────────
  useEffect(() => {
    if (!pickup || !(stage === 'map' || stage === 'select')) {
      setNearbyDrivers([])
      return
    }
    generateNearbyDriversOnRoad(pickup.lat, pickup.lng).then(drivers => {
      setNearbyDrivers(vehiclePreLocked ? drivers.filter(d => d.type === selectedVehicle) : drivers)
    })
  }, [pickup, selectedVehicle]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── POI search ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!poi || !pickup) return
    searchPOI(poi, pickup.lat, pickup.lng).then(results => {
      setPOIMarkers(results.map(r => ({
        lat: parseFloat(r.lat), lng: parseFloat(r.lon),
        name: r.display_name.split(',')[0],
      })))
    })
  }, [poi, pickup])

  // ── Road route + road distance when both pins set ─────────────────────────
  useEffect(() => {
    // Don't re-fetch if we're in riding stage (restored from localStorage)
    if (!pickup || !drop || stage === 'riding') return

    getRoadDistanceKm(pickup.lat, pickup.lng, drop.lat, drop.lng).then(({ km, encodedPolyline, coords }) => {
      setRoadDistKm(km)

      if (encodedPolyline) {
        // Google Maps polyline
        setRoutePoints(decodePolyline(encodedPolyline))
      } else if (coords) {
        // OSRM coords already [lat,lng]
        setRoutePoints(coords)
      } else {
        setRoutePoints([[pickup.lat, pickup.lng], [drop.lat, drop.lng]])
      }
    })
  }, [pickup, drop]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fare estimate — using road distance ───────────────────────────────────
  useEffect(() => {
    // Don't re-run fare estimate if we're in riding stage (restored from localStorage)
    if (!pickup || !drop || stage === 'riding') return
    setLoadingFare(true)
    const t = setTimeout(async () => {
      try {
        const r = await rideApi.estimateFare(
          { address: pickup.address, latitude: pickup.lat, longitude: pickup.lng },
          { address: drop.address,   latitude: drop.lat,   longitude: drop.lng   }
        )
        // Merge road distance into the response if we have it
        setEstimates(prev => ({
          ...r.data,
          distanceKm: roadDistKm ? roadDistKm.toFixed(1) : r.data.distanceKm,
        }))
        setStage('select')
      } catch {
        // Fallback using road distance or haversine
        const km = roadDistKm || haversineKm(pickup.lat, pickup.lng, drop.lat, drop.lng) * 1.3
        setEstimates({
          bikeFare: Math.max(30, Math.round(20 + km * 9)),
          autoFare: Math.max(40, Math.round(30 + km * 13)),
          cabFare:  Math.max(70, Math.round(50 + km * 18)),
          distanceKm: km.toFixed(1),
          surgeMultiplier: 1.0,
        })
        setStage('select')
      } finally {
        setLoadingFare(false)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [pickup, drop, roadDistKm]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Search debounce ────────────────────────────────────────────────────────
  const handleSearch = useCallback((q, isPickup) => {
    if (searchTimer) clearTimeout(searchTimer)
    if (q.length < 3) { isPickup ? setPickupR([]) : setDropR([]); return }
    const t = setTimeout(async () => {
      const r = await forwardGeocode(q)
      isPickup ? setPickupR(r) : setDropR(r)
    }, 400)
    setSearchTimer(t)
  }, [searchTimer])

  const selectResult = useCallback(async (r, isPickup) => {
    const lat = parseFloat(r.lat), lng = parseFloat(r.lon)
    const address = r.display_name.split(',').slice(0, 3).join(', ')
    const loc = { lat, lng, address }
    if (isPickup) { setPickup(loc); setPickupQ(address); setPickupR([]) }
    else          { setDrop(loc);   setDropQ(address);   setDropR([]) }
  }, [])

  const handleMapPickup = useCallback(async ({ lat, lng }) => {
    const a = await reverseGeocode(lat, lng)
    setPickup({ lat, lng, address: a }); setPickupQ(a)
    setClickMode(false)
    // auto-advance to drop selection after pickup is set
    setSelecting('drop')
  }, [])
  const handleMapDrop = useCallback(async ({ lat, lng }) => {
    const a = await reverseGeocode(lat, lng)
    setDrop({ lat, lng, address: a }); setDropQ(a)
    setClickMode(false); setShowQuickLocs(false)
  }, [])

  // ── Select a saved quick location as the drop point ───────────────────────
  const handleQuickLocSelect = useCallback((loc) => {
    const lat = loc.latitude
    const lng = loc.longitude
    const addr = loc.address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`
    setDrop({ lat, lng, address: addr })
    setDropQ(addr)
    setDropR([])
    setShowQuickLocs(false) // hide chips once a shortcut is chosen
  }, [])

  // ── Book ride ──────────────────────────────────────────────────────────────
  const handleBook = async () => {
    if (!pickup || !drop) return
    setBooking(true); setStage('searching'); setElapsed(0)
    timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000)
    try {
      const r = await rideApi.bookRide(
        { address: pickup.address, latitude: pickup.lat,  longitude: pickup.lng },
        { address: drop.address,   latitude: drop.lat,    longitude: drop.lng   },
        selectedVehicle
      )
      clearInterval(timerRef.current)
      const ride = r.data
      const newRideInfo = { ...ride, rideId: ride.rideId || ride.id }
      const newDriverFound = {
        name:   ride.driverName    || 'Rahul Kumar',
        vehicle: ride.vehicleNumber || 'UP 65 MV 1100',
        rating: (4.5 + Math.random() * 0.4).toFixed(1),
        phone:  ride.driverPhone   || ride.driverMobileNumber || '',
      }
      setRideInfo(newRideInfo)
      setDriverFound(newDriverFound)
      setNearbyDrivers([])

      // Generate OTP and store in ref BEFORE setStage so the OTP effect reads it
      const newOtp = String(Math.floor(1000 + Math.random() * 9000))
      rideOtpRef.current = newOtp

      // Persist to localStorage immediately — clear any old driver route
      const bookedAt = Date.now()
      rideBookedAtRef.current = bookedAt
      saveRideToStorage({
        stage: 'riding',
        rideInfo: newRideInfo,
        driverFound: newDriverFound,
        pickup, drop, pickupQuery, dropQuery, estimates,
        selectedVehicle, roadDistKm, routePoints,
        rideOtp: newOtp,
        rideBookedAt: bookedAt,
        driverRoadRoute: null,   // will be fetched fresh by animation effect
        driverTick: 0,
        driverArrived: false,
      })

      setStage('riding')   // ← triggers countdown + OTP effects (refs already set)
    } catch (e) {
      clearInterval(timerRef.current)
      alert(e.response?.data?.message || 'No drivers available. Try again.')
      setStage('select')
    } finally {
      setBooking(false)
    }
  }

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])

  // ── Cancel ride ────────────────────────────────────────────────────────────
  const handleCancelRide = async () => {
    if (!rideInfo?.rideId || cancelling) return
    // Always allow cancel while the cancel row is visible (cancelSecondsLeft > 0)
    if (!window.confirm('Cancel this ride? You will not be charged.')) return
    setCancelling(true)
    try {
      await rideApi.cancelRide(rideInfo.rideId)
      clearRideFromStorage()
      // Clear per-ride animation key
      try { localStorage.removeItem(`cabkaro_driver_anim_${rideInfo.rideId}`) } catch {}
      animationStartedRef.current = false
      rideBookedAtRef.current = null
      rideOtpRef.current = null
      setCancelSecondsLeft(0)
      setStage('map')
      setRideInfo(null)
      setDriverFound(null)
      setPickup(null)
      setDrop(null)
      setPickupQ('')
      setDropQ('')
      setEstimates(null)
      setRoutePoints([])
    } catch (e) {
      const msg = e.response?.data?.message || 'Could not cancel ride. Please try again.'
      alert(msg)
    } finally {
      setCancelling(false)
    }
  }


  // ── Derived ────────────────────────────────────────────────────────────────
  const fare         = estimates ? estimates[VEHICLES.find(v => v.type === selectedVehicle)?.fareKey] : null
  const displayDistKm = roadDistKm
    ? roadDistKm.toFixed(1)
    : (estimates?.distanceKm || (pickup && drop ? haversineKm(pickup.lat, pickup.lng, drop.lat, drop.lng).toFixed(1) : null))
  const mapCenter    = pickup ? [pickup.lat, pickup.lng] : DEFAULT_CENTER
  const activeVehicle = VEHICLES.find(v => v.type === selectedVehicle)

  // ══ STAGE: SEARCHING ══════════════════════════════════════════════════════
  if (stage === 'searching') {
    const v = VEHICLES.find(v => v.type === selectedVehicle)
    return (
      <div style={SS.searchingOverlay}>
        <div style={SS.searchingCard}>
          <div style={SS.radarWrap}>
            <div style={SS.ring1}/><div style={SS.ring2}/><div style={SS.ring3}/>
            <div style={SS.radarCenter}><v.Icon size={28} color={v.color}/></div>
          </div>
          <h2 style={{color:'#1A202C',fontSize:22,margin:'0 0 8px',fontWeight:700}}>Finding your driver…</h2>
          <p style={{color:'#718096',fontSize:13,margin:'0 0 20px'}}>Looking for nearby {v.name}</p>
          <div style={SS.timerPill}>{elapsed}s</div>
          <div className="dotLoader" style={{justifyContent:'center',gap:6,marginBottom:24,display:'flex'}}>
            <span/><span/><span/>
          </div>
          <div style={SS.routeBox}>
            <div style={SS.routeRow}><div style={{...SS.rDot,background:'#059669'}}/><span style={{fontSize:12,color:'#718096'}}>{pickup?.address?.substring(0,40)}</span></div>
            <div style={{width:2,height:12,background:'#E2E8F0',margin:'4px 0 4px 4px'}}/>
            <div style={SS.routeRow}><div style={{...SS.rDot,background:'#DC2626'}}/><span style={{fontSize:12,color:'#718096'}}>{drop?.address?.substring(0,40)}</span></div>
          </div>
          <button style={SS.cancelBtn} onClick={() => { setStage('select'); clearInterval(timerRef.current) }}>Cancel</button>
        </div>
      </div>
    )
  }

  // ══ STAGE: RIDING ═════════════════════════════════════════════════════════
  if (stage === 'riding' && rideInfo) {
    const v = VEHICLES.find(v => v.type === selectedVehicle)

    // Clean driver icon — no blinking, just a styled vehicle marker
    const liveDriverIcon = new L.DivIcon({
      html: `<div style="
        background:${v?.color || '#F59E0B'};
        border:3px solid #fff;
        border-radius:50%;
        width:36px;height:36px;
        display:flex;align-items:center;justify-content:center;
        box-shadow:0 3px 10px rgba(0,0,0,0.35);
        font-size:18px;line-height:1;
      ">${v?.emoji || '🚗'}</div>`,
      iconSize: [36, 36], iconAnchor: [18, 18], className: '',
    })

    return (
      <div style={{height:'100vh',display:'flex',flexDirection:'column',background:'#F5F7FA'}}>
        <div style={{flex:1,position:'relative'}}>
          <MapContainer center={pickup ? [pickup.lat, pickup.lng] : DEFAULT_CENTER} zoom={14} style={{width:'100%',height:'100%'}} zoomControl={false}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'/>
            {pickup && <Marker position={[pickup.lat, pickup.lng]} icon={pickupIcon}><Popup>Pickup</Popup></Marker>}
            {drop    && <Marker position={[drop.lat,   drop.lng]}   icon={dropIcon}><Popup>Drop-off</Popup></Marker>}

            {/* Phase 1 — driver approaching: blue dashed shrinking line driver→pickup */}
            {!driverArrived && driverRoutePoints.length > 1 && (
              <Polyline
                positions={driverRoutePoints}
                pathOptions={{ color:'#2563EB', weight:5, opacity:0.85, dashArray:'10,6' }}
              />
            )}

            {/* Phase 2 & 3 — driver arrived / journey started: green route pickup→drop */}
            {driverArrived && routePoints.length > 1 && (
              <Polyline
                positions={routePoints}
                pathOptions={{ color:'#059669', weight:5, opacity:0.9 }}
              />
            )}

            {/* Driver marker — hidden once driver arrives */}
            {!driverArrived && driverPos && (
              <Marker position={[driverPos.lat, driverPos.lng]} icon={liveDriverIcon}>
                <Popup>
                  <b>{driverFound?.name}</b> · {v?.emoji} {v?.name}<br/>
                  📍 Heading to your pickup
                </Popup>
              </Marker>
            )}

            {/* Re-fit map to full route when journey starts */}
            <MapRefitOnRideStart pickup={pickup} drop={drop} rideStarted={rideStarted} />
            {!rideStarted && pickup && drop && <FitBounds pickup={pickup} drop={drop}/>}
          </MapContainer>

          {/* Status badge — 3 phases */}
          {rideStarted ? (
            <div style={{ ...SS.rideBadge, background:'rgba(5,150,105,0.95)', letterSpacing:0.5 }}>
              <span style={{marginRight:6}}>🚗</span>JOURNEY IN PROGRESS
            </div>
          ) : driverArrived ? (
            <div style={{ ...SS.rideBadge, background:'rgba(124,58,237,0.92)' }}>
              <span style={{marginRight:6}}>✅</span>DRIVER AT PICKUP · STARTING RIDE…
            </div>
          ) : (
            <div style={SS.rideBadge}>
              <span style={{color:'#60A5FA',marginRight:6}}>●</span>DRIVER APPROACHING
            </div>
          )}
        </div>

        <div style={{...SS.driverCard, overflowY:'auto', maxHeight:'55vh'}}>
          <div style={SS.driverTop}>
            <div style={SS.driverAva}><v.Icon size={26} color={v.color}/></div>
            <div style={{flex:1}}>
              <div style={SS.driverName}>{driverFound?.name}</div>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <span style={SS.starBadge}>⭐ {driverFound?.rating}</span>
                <span style={SS.plateBadge}>{driverFound?.vehicle}</span>
                {rideStarted
                  ? <span style={{fontSize:11,fontWeight:700,color:'#059669',background:'#D1FAE5',borderRadius:20,padding:'2px 8px'}}>Ride started</span>
                  : driverArrived
                  ? <span style={{fontSize:11,fontWeight:700,color:'#7C3AED',background:'#EDE9FE',borderRadius:20,padding:'2px 8px'}}>At pickup</span>
                  : <span style={{fontSize:11,fontWeight:600,color:'#2563EB',background:'#DBEAFE',borderRadius:20,padding:'2px 8px'}}>On the way</span>
                }
              </div>
            </div>
            {/* ℹ️ Driver Info button */}
            <button
              style={SS.infoBtn}
              onClick={() => setShowDriverInfo(true)}
              title="Driver details"
            >ℹ️</button>
            <div style={SS.fareBig}>₹{fare}</div>
          </div>

          {/* ── Ride OTP — share this with your driver ── */}
          {rideOtp && (
            <div style={SS.otpCard}>
              <div style={{flex:1}}>
                <div style={{fontSize:11,fontWeight:700,color:'#7C3AED',textTransform:'uppercase',letterSpacing:1,marginBottom:4}}>
                  🔐 Ride OTP
                </div>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  {rideOtp.split('').map((digit, i) => (
                    <div key={i} style={SS.otpDigit}>{digit}</div>
                  ))}
                </div>
                <div style={{fontSize:11,color:'#6B7280',marginTop:5}}>
                  Share this OTP with your driver to start the ride
                </div>
              </div>
              <button
                style={SS.otpShareBtn}
                title="Share OTP"
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({ title: 'Ride OTP', text: `Your CABkaro ride OTP is: ${rideOtp}` })
                  } else {
                    navigator.clipboard?.writeText(rideOtp)
                    alert(`OTP ${rideOtp} copied to clipboard!`)
                  }
                }}
              >
                <span style={{fontSize:18}}>📤</span>
                <span style={{fontSize:11,fontWeight:600}}>Share</span>
              </button>
            </div>
          )}

          {/* ── Cancel ride row — shown right below driver header ── */}
          {cancelSecondsLeft > 0 && (
            <div style={SS.cancelRideRow}>
              <div style={SS.cancelRideInfo}>
                <span style={{
                  ...SS.cancelRideTimer,
                  color: cancelSecondsLeft <= 10 ? '#DC2626' : '#EA580C',
                }}>
                  {cancelSecondsLeft}s
                </span>
                <div style={{display:'flex',flexDirection:'column',gap:1}}>
                  <span style={{fontSize:13,fontWeight:600,color:'#9A3412'}}>Cancel window open</span>
                  <span style={SS.cancelRideHint}>Free cancellation · closes in {cancelSecondsLeft}s</span>
                </div>
              </div>
              <button
                style={{ ...SS.cancelRideBtn, opacity: cancelling ? 0.6 : 1 }}
                onClick={handleCancelRide}
                disabled={cancelling}
              >
                {cancelling ? 'Cancelling…' : '✕ Cancel'}
              </button>
            </div>
          )}
          {cancelSecondsLeft === -1 && (
            <div style={SS.cancelRideExpired}>
              <span style={{fontSize:16}}>🔒</span>
              <div style={{flex:1}}>
                <div style={{fontSize:12,fontWeight:600,color:'#6B7280'}}>Cancellation unavailable</div>
                <div style={{fontSize:11,color:'#9CA3AF'}}>Free cancel window (60s) expired</div>
              </div>
              <button style={SS.cancelRideBtnDisabled} disabled>✕ Cancel</button>
            </div>
          )}

          <div style={SS.routeSummary}>
            <div style={SS.routeRow2}><div style={{...SS.rDot,background:'#059669'}}/><div><div style={{fontSize:10,color:'#A0AEC0',marginBottom:2}}>PICKUP</div><div style={{fontSize:13,color:'#1A202C'}}>{pickup?.address?.substring(0,45)}</div></div></div>
            <div style={{width:2,height:14,background:'#E2E8F0',margin:'3px 0 3px 4px'}}/>
            <div style={SS.routeRow2}><div style={{...SS.rDot,background:'#DC2626'}}/><div><div style={{fontSize:10,color:'#A0AEC0',marginBottom:2}}>DROP</div><div style={{fontSize:13,color:'#1A202C'}}>{drop?.address?.substring(0,45)}</div></div></div>
          </div>

          <div style={SS.statsRow}>
            <div style={SS.statBox}>
              <div style={SS.statV}>{displayDistKm} km</div>
              <div style={SS.statL}>
                Road Dist {roadDistKm ? <span style={{fontSize:9,color:'#059669'}}>📍</span> : ''}
              </div>
            </div>
            <div style={SS.statBox}>
              <div style={SS.statV}>{estimates?.surgeMultiplier > 1 ? `${estimates.surgeMultiplier}×` : '—'}</div>
              <div style={SS.statL}>Surge</div>
            </div>
            <div style={SS.statBox}>
              <div style={{...SS.statV, color:'#2563EB', fontSize:15}}>
                {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div style={SS.statL}>Now</div>
            </div>
            {/* Enhanced ETA stat box */}
            <div style={{
              ...SS.statBox,
              background: etaMinutes ? 'linear-gradient(135deg,#F3E8FF,#EDE9FE)' : '#F5F7FA',
              border: etaMinutes ? '1px solid #C4B5FD' : '1px solid #E2E8F0',
            }}>
              {etaMinutes ? (
                <>
                  <div style={{fontSize:11,color:'#7C3AED',fontWeight:700,marginBottom:2}}>
                    🏁 ETA
                  </div>
                  <div style={{fontSize:17,fontWeight:800,color:'#6D28D9',lineHeight:1.1}}>
                    {etaMinutes} min
                  </div>
                  <div style={{fontSize:11,color:'#7C3AED',marginTop:3,fontWeight:500}}>
                    ~{new Date(currentTime.getTime() + etaMinutes * 60000)
                        .toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </>
              ) : (
                <>
                  <div style={{...SS.statV, color:'#059669', fontSize:13}}>ACTIVE</div>
                  <div style={SS.statL}>Status</div>
                </>
              )}
            </div>
          </div>

          <div style={{display:'flex',gap:10}}>
            {(rideInfo?.driverPhone || rideInfo?.driverMobileNumber || driverFound?.phone) ? (
              <a
                href={`tel:${rideInfo?.driverPhone || rideInfo?.driverMobileNumber || driverFound?.phone}`}
                style={{...SS.callBtn,textDecoration:'none',display:'flex',alignItems:'center',justifyContent:'center'}}
              >
                <IconPhone size={15} color="#718096" style={{marginRight:6}}/>
                Call Driver
              </a>
            ) : (
              <button style={SS.callBtn}><IconPhone size={15} color="#718096" style={{marginRight:6}}/>Call Driver</button>
            )}
            <button style={SS.chatBtn} onClick={() => setShowChat(true)}>💬 Chat</button>
            <button style={SS.payNowBtn} onClick={() => setShowPayment(true)}>💳 Pay</button>
            <button style={SS.doneBtn} onClick={() => {
              clearRideFromStorage()
              try { localStorage.removeItem(`cabkaro_driver_anim_${rideInfo?.rideId}`) } catch {}
              animationStartedRef.current = false
              rideBookedAtRef.current = null
              setStage('rating')
            }}>✓ Done</button>
          </div>
        </div>

        {/* Driver Info Modal */}
        {showDriverInfo && (
          <DriverDetailsModal
            rideInfo={rideInfo}
            driverFound={driverFound}
            onClose={() => setShowDriverInfo(false)}
          />
        )}

        {/* Driver Chat Modal */}
        {showChat && (
          <DriverChatModal
            rideInfo={{...rideInfo, pickupAddress: pickup?.address}}
            driverFound={{
              ...driverFound,
              phone: rideInfo?.driverPhone || rideInfo?.driverMobileNumber || driverFound?.phone || '',
            }}
            onClose={() => setShowChat(false)}
          />
        )}

        {showPayment && (
          <PaymentModal
            rideInfo={rideInfo}
            fare={fare || 0}
            onSuccess={() => { setShowPayment(false); clearRideFromStorage(); rideBookedAtRef.current = null; setStage('rating') }}
            onClose={() => setShowPayment(false)}
          />
        )}
      </div>
    )
  }

  // ══ STAGE: RATING ═════════════════════════════════════════════════════════
  if (stage === 'rating') {
    return (
      <RateDriverModal
        rideInfo={rideInfo}
        fare={fare || 0}
        onDone={() => { clearRideFromStorage(); navigate('/history') }}
      />
    )
  }

  // ══ STAGE: MAP / SELECT (main) ════════════════════════════════════════════
  return (
    <div style={{height:'100vh',display:'flex',flexDirection:'column',background:'#F5F7FA',overflow:'hidden'}}>
      <div style={{position:'relative',flex:1}}>
        <MapContainer center={mapCenter} zoom={14} style={{width:'100%',height:'100%'}} zoomControl={false}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'/>
          <MapClickHandler
            active={true}
            selectingFor={clickMode ? selectingFor : (!pickup ? 'pickup' : 'drop')}
            onPickup={handleMapPickup}
            onDrop={handleMapDrop}
          />
          {pickup && <Marker position={[pickup.lat, pickup.lng]} icon={pickupIcon}><Popup>{pickup.address}</Popup></Marker>}
          {drop   && <Marker position={[drop.lat,   drop.lng]}   icon={dropIcon}><Popup>{drop.address}</Popup></Marker>}
          {routePoints.length > 1 && <Polyline positions={routePoints} pathOptions={{color:'#1A202C',weight:4,opacity:0.8,dashArray:'8,4'}}/>}
          {/* Only show driver emojis when no drop set and within 1km (already filtered) */}
          {!drop && pickup && routePoints.length === 0 && nearbyDrivers.map(d => (
            <Marker key={d.id} position={[d.lat, d.lng]} icon={makeDriverIcon(d.emoji)}>
              <Popup><b>{d.name}</b> · {d.emoji} {d.type} · ⭐{d.rating} · {(d.distKm * 1000).toFixed(0)}m away</Popup>
            </Marker>
          ))}
          {poiMarkers.map((p, i) => (
            <Marker key={i} position={[p.lat, p.lng]} icon={makePOIIcon()}><Popup>{p.name}</Popup></Marker>
          ))}
          <FitBounds pickup={pickup} drop={drop}/>
        </MapContainer>

        {/* ── Always-visible map tap instruction banner ── */}
        <div style={{
          ...SS.clickBanner,
          borderColor: clickMode
            ? (selectingFor === 'pickup' ? '#BBF7D0' : '#FECACA')
            : (!pickup ? '#BBF7D0' : '#FECACA'),
          background: clickMode
            ? (selectingFor === 'pickup' ? '#F0FFF4' : '#FFF5F5')
            : (!pickup ? '#F0FFF4' : (!drop ? '#FFF5F5' : '#FFFBEB')),
        }}>
          <div style={{
            width: 10, height: 10, borderRadius: '50%', marginRight: 8, flexShrink: 0,
            background: clickMode
              ? (selectingFor === 'pickup' ? '#059669' : '#DC2626')
              : (!pickup ? '#059669' : (!drop ? '#DC2626' : '#F59E0B')),
          }}/>
          <span style={{fontSize:13, fontWeight:600, color:'#374151'}}>
            {clickMode
              ? `Tap map to set ${selectingFor === 'pickup' ? 'pickup 📍' : 'drop-off 📍'}`
              : !pickup
                ? 'Tap map to set pickup 📍'
                : !drop
                  ? 'Tap map to set drop-off 📍'
                  : '✓ Both locations set — tap map to change drop-off'}
          </span>
          {clickMode && (
            <button style={{background:'none',border:'none',color:'#718096',cursor:'pointer',marginLeft:8,fontSize:16,lineHeight:1}} onClick={() => setClickMode(false)}>✕</button>
          )}
        </div>
        {poi && poiMarkers.length > 0 && (
          <div style={SS.poiBanner}>
            <IconLocationPin size={13} color="#2563EB" style={{marginRight:4}}/>
            {poiMarkers.length} {poi}(s) found nearby
          </div>
        )}
        {/* 100m driver notice */}
        {!drop && pickup && nearbyDrivers.length > 0 && (
          <div style={SS.nearbyBadge}>
            🚗 {nearbyDrivers.length} drivers within 100m
          </div>
        )}
        <button style={SS.backBtn} onClick={() => navigate('/')}>
          <IconArrowLeft size={16} color="#1A202C"/>
        </button>
      </div>

      {/* ── Bottom panel ── */}
      <div style={SS.panel}>
        <div style={SS.handle}/>
        <div style={SS.panelTitle}>
          <div style={{width:8,height:8,borderRadius:'50%',background:'#059669'}}/>
          <span style={{color:'#1A202C'}}>Book a Ride</span>
          {loadingFare && <span style={{fontSize:12,color:'#F59E0B',marginLeft:'auto'}}>Getting fares…</span>}
        </div>

        {/* Pickup */}
        <div style={SS.locRow}>
          <div style={{...SS.locDot, background:'#059669'}}/>
          <div style={{flex:1, position:'relative'}}>
            <input
              style={{
                ...SS.locInput,
                borderColor: pickup ? '#BBF7D0' : '#E2E8F0',
                background: pickup ? '#F0FFF4' : '#FFFFFF',
              }}
              placeholder="Pickup location"
              value={pickupQuery}
              onChange={e => {
                setPickupQ(e.target.value)
                handleSearch(e.target.value, true)
                if (!e.target.value) setPickup(null)
              }}
              onFocus={() => setSelecting('pickup')}
            />
            {pickupResults.length > 0 && (
              <div style={SS.suggestions}>
                {pickupResults.map((r, i) => (
                  <div key={i} style={SS.suggestion} onClick={() => selectResult(r, true)}>
                    <IconLocationPin size={12} color="#A0AEC0" style={{marginRight:6,flexShrink:0}}/>
                    {r.display_name.substring(0, 60)}…
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Pin on map toggle */}
          <button
            style={{
              ...SS.mapPinBtn,
              background: (clickMode && selectingFor==='pickup') ? '#059669' : '#F0FFF4',
              borderColor: '#BBF7D0',
            }}
            title="Tap map to set pickup"
            onClick={() => { setSelecting('pickup'); setClickMode(c => !(c && selectingFor==='pickup')) }}
          >
            <span style={{fontSize:14, filter:(clickMode && selectingFor==='pickup')?'brightness(10)':'none'}}>📍</span>
          </button>
          {/* GPS */}
          <button style={SS.gpsBtn} title="Use my location" onClick={() =>
            navigator.geolocation?.getCurrentPosition(async p => {
              const { latitude: lat, longitude: lng } = p.coords
              const a = await reverseGeocode(lat, lng)
              setPickup({ lat, lng, address: a }); setPickupQ(a)
            })
          }>
            <IconGPS size={16} color="#F59E0B"/>
          </button>
        </div>

        {/* Drop */}
        <div style={SS.locRow}>
          <div style={{...SS.locDot, background:'#DC2626'}}/>
          <div style={{flex:1, position:'relative'}}>
            <input
              style={{
                ...SS.locInput,
                borderColor: drop ? '#FECACA' : '#E2E8F0',
                background: drop ? '#FFF5F5' : '#FFFFFF',
              }}
              placeholder="Where to?"
              value={dropQuery}
              onChange={e => {
                setDropQ(e.target.value)
                handleSearch(e.target.value, false)
                if (!e.target.value) { setDrop(null); setShowQuickLocs(true) }
              }}
              onFocus={() => setSelecting('drop')}
            />
            {dropResults.length > 0 && (
              <div style={SS.suggestions}>
                {dropResults.map((r, i) => (
                  <div key={i} style={SS.suggestion}
                    onClick={() => { selectResult(r, false); setShowQuickLocs(false) }}>
                    <IconLocationPin size={12} color="#A0AEC0" style={{marginRight:6,flexShrink:0}}/>
                    {r.display_name.substring(0, 60)}…
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Pin on map toggle */}
          <button
            style={{
              ...SS.mapPinBtn,
              background: (clickMode && selectingFor==='drop') ? '#DC2626' : '#FFF5F5',
              borderColor: '#FECACA',
            }}
            title="Tap map to set drop-off"
            onClick={() => { setSelecting('drop'); setClickMode(c => !(c && selectingFor==='drop')) }}
          >
            <span style={{fontSize:14, filter:(clickMode && selectingFor==='drop')?'brightness(10)':'none'}}>📍</span>
          </button>
          {/* Clear drop */}
          {drop && (
            <button style={{...SS.iconBtn, borderColor:'#FECACA', background:'#FFF5F5'}}
              title="Clear destination"
              onClick={() => { setDrop(null); setDropQ(''); setShowQuickLocs(true) }}>
              <span style={{fontSize:14, color:'#DC2626', lineHeight:1}}>✕</span>
            </button>
          )}
        </div>

        {/* ── Quick location shortcut chips ── */}
        {quickLocs.length > 0 && !showQuickLocs && drop && (
          /* Drop is set — show a small "Change destination" link to re-expose chips */
          <div style={SS.quickLocChangeRow}>
            <span style={{fontSize:12,color:'#718096'}}>Quick locations:</span>
            <button
              style={SS.quickLocChangeBtn}
              onClick={() => { setDrop(null); setDropQ(''); setShowQuickLocs(true) }}
            >
              ✕ Clear &amp; change
            </button>
          </div>
        )}
        {quickLocs.length > 0 && showQuickLocs && (
          <div style={SS.quickLocRow}>
            {quickLocs.map(loc => {
              const cfg = LABEL_CONFIG[loc.label] || LABEL_CONFIG.OTHER
              return (
                <button
                  key={loc.id || loc.label}
                  style={{
                    ...SS.quickLocChip,
                    background: cfg.bg,
                    borderColor: cfg.color + '55',
                  }}
                  onClick={() => handleQuickLocSelect(loc)}
                  title={loc.address || cfg.label}
                >
                  <cfg.Icon size={13} color={cfg.color} />
                  <span style={{color: cfg.color, fontWeight: 600, fontSize: 12}}>{cfg.label}</span>
                </button>
              )
            })}
          </div>
        )}

        {/* Vehicle selector — hidden when vehicle was pre-selected from home page */}
        {stage === 'select' && estimates && (
          <>
            {/* Road distance badge */}
            {roadDistKm && (
              <div style={SS.roadDistBadge}>
                📍 Road distance: <strong>{roadDistKm.toFixed(1)} km</strong>
                {GMAPS_KEY ? <span style={{color:'#059669',marginLeft:6,fontSize:11}}>via Google Maps</span>
                           : <span style={{color:'#718096',marginLeft:6,fontSize:11}}>via OSRM</span>}
              </div>
            )}

            {vehiclePreLocked ? (
              /* Pre-selected vehicle badge (from home page) */
              <div style={SS.preSelectedBadge}>
                <span style={{fontSize:20,marginRight:8}}>{VEHICLES.find(v=>v.type===selectedVehicle)?.emoji}</span>
                <div>
                  <div style={{fontWeight:700,color:'#1A202C',fontSize:14}}>
                    {VEHICLES.find(v=>v.type===selectedVehicle)?.name}
                  </div>
                  <div style={{fontSize:11,color:'#718096'}}>Selected from home · Tap to change</div>
                </div>
                <div style={{marginLeft:'auto',fontSize:22,fontWeight:800,color:VEHICLES.find(v=>v.type===selectedVehicle)?.color}}>
                  ₹{fare}
                </div>
              </div>
            ) : (
              <div style={SS.vehicleRow}>
                {VEHICLES.map(v => (
                  <div
                    key={v.type}
                    style={{
                      ...SS.vCard,
                      ...(selectedVehicle===v.type ? {
                        ...SS.vCardActive,
                        borderColor: v.color,
                        boxShadow: `0 0 0 3px ${v.color}22`,
                      } : {})
                    }}
                    onClick={() => setVehicle(v.type)}
                  >
                    <div style={{
                      width:40, height:40, borderRadius:10, marginBottom:4,
                      background: selectedVehicle===v.type ? v.color+'15' : '#F5F7FA',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      border: `1.5px solid ${selectedVehicle===v.type ? v.color+'40' : '#E2E8F0'}`,
                    }}>
                      <v.Icon size={22} color={selectedVehicle===v.type ? v.color : '#718096'}/>
                    </div>
                    <div style={{fontSize:11,fontWeight:600,color:'#1A202C',marginBottom:2}}>{v.name}</div>
                    <div style={{fontSize:10,color:'#A0AEC0',marginBottom:6}}>{v.eta}</div>
                    <div style={{fontSize:15,fontWeight:700,color: selectedVehicle===v.type ? v.color : '#1A202C'}}>₹{estimates[v.fareKey]}</div>
                  </div>
                ))}
              </div>
            )}

            {displayDistKm && (
              <div style={{display:'flex',alignItems:'center',gap:12,fontSize:13,color:'#718096',marginBottom:14}}>
                <span style={{display:'flex',alignItems:'center',gap:4}}>
                  <IconLocationPin size={13} color="#A0AEC0"/>{displayDistKm} km
                </span>
                {estimates.surgeMultiplier > 1 && (
                  <span style={{color:'#EA580C',display:'flex',alignItems:'center',gap:4}}>
                    <IconSurge size={13} color="#EA580C"/>Surge active
                  </span>
                )}
                <span style={{marginLeft:'auto',color:'#F59E0B',fontWeight:700}}>₹{fare}</span>
              </div>
            )}
            <button style={SS.bookBtn} onClick={handleBook} disabled={booking}>
              {booking ? 'Booking…' : `Book ${VEHICLES.find(v => v.type === selectedVehicle)?.name} · ₹${fare}`}
            </button>
          </>
        )}
        {(!pickup || !drop) && (
          <p style={{color:'#A0AEC0',fontSize:13,textAlign:'center',padding:'8px 0 4px'}}>
            {!pickup ? 'Tap above to set your pickup location' : 'Tap above to set your destination'}
          </p>
        )}
      </div>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const SS = {
  backBtn: {
    position:'absolute',top:14,left:14,zIndex:999,
    background:'#FFFFFF',border:'1px solid #E2E8F0',
    borderRadius:10,padding:'8px 10px',cursor:'pointer',
    display:'flex',alignItems:'center',justifyContent:'center',
    boxShadow:'0 2px 8px rgba(0,0,0,0.12)',
  },
  clickBanner: {
    position:'absolute',top:14,left:'50%',transform:'translateX(-50%)',zIndex:999,
    background:'#FFFFFF',border:'1.5px solid #E2E8F0',color:'#1A202C',
    borderRadius:20,padding:'9px 18px',fontSize:13,
    display:'flex',alignItems:'center',whiteSpace:'nowrap',
    boxShadow:'0 4px 16px rgba(0,0,0,0.1)',
    transition:'all 0.2s',
  },
  poiBanner: {
    position:'absolute',bottom:10,left:'50%',transform:'translateX(-50%)',zIndex:999,
    background:'#DBEAFE',border:'1px solid #93C5FD',color:'#2563EB',
    borderRadius:20,padding:'6px 16px',fontSize:13,whiteSpace:'nowrap',
    display:'flex',alignItems:'center',
  },
  nearbyBadge: {
    position:'absolute',top:14,right:14,zIndex:999,
    background:'#FFFFFF',border:'1px solid #E2E8F0',
    borderRadius:20,padding:'6px 12px',fontSize:12,color:'#374151',
    boxShadow:'0 2px 8px rgba(0,0,0,0.1)',
  },
  panel: {
    background:'#FFFFFF',borderTop:'1px solid #E2E8F0',
    borderRadius:'20px 20px 0 0',padding:'12px 16px 24px',
    boxShadow:'0 -4px 20px rgba(0,0,0,0.08)',
    position:'relative',zIndex:100,maxHeight:'60vh',overflowY:'auto',
  },
  handle: {width:40,height:4,background:'#E2E8F0',borderRadius:2,margin:'0 auto 14px'},
  panelTitle: {display:'flex',alignItems:'center',gap:8,fontSize:16,fontWeight:700,color:'#1A202C',marginBottom:14},
  locRow: {display:'flex',alignItems:'center',gap:10,marginBottom:10},
  locDot: {width:12,height:12,borderRadius:'50%',flexShrink:0},
  mapPinBtn: {
    width:36, height:36, border:'1.5px solid', borderRadius:10,
    display:'flex', alignItems:'center', justifyContent:'center',
    cursor:'pointer', flexShrink:0, transition:'all 0.15s',
  },
  locInput: {
    width:'100%',background:'#FFFFFF',border:'1px solid #E2E8F0',
    borderRadius:12,padding:'10px 14px',color:'#1A202C',fontSize:14,
    outline:'none',boxSizing:'border-box',
  },
  suggestions: {
    position:'absolute',top:'100%',left:0,right:0,
    background:'#FFFFFF',border:'1px solid #E2E8F0',
    borderRadius:12,zIndex:9999,maxHeight:200,overflowY:'auto',
    boxShadow:'0 8px 24px rgba(0,0,0,0.12)',
  },
  suggestion: {
    padding:'10px 14px',color:'#1A202C',cursor:'pointer',fontSize:13,
    borderBottom:'1px solid #F0F2F5',display:'flex',alignItems:'center',
  },
  iconBtn: {
    background:'#F5F7FA',border:'1px solid #E2E8F0',color:'#718096',
    borderRadius:10,padding:'8px 10px',cursor:'pointer',fontSize:16,
    flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',
  },
  gpsBtn: {
    background:'#FEF3C7',border:'1px solid #FCD34D',color:'#F59E0B',
    borderRadius:10,padding:'8px 10px',cursor:'pointer',fontSize:16,
    flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',
  },
  roadDistBadge: {
    background:'#F0FFF4',border:'1px solid #9AE6B4',borderRadius:10,
    padding:'7px 12px',fontSize:12,color:'#276749',marginBottom:10,
    display:'flex',alignItems:'center',gap:4,
  },
  preSelectedBadge: {
    display:'flex',alignItems:'center',gap:12,
    background:'#F5F7FA',border:'2px solid #E2E8F0',borderRadius:14,
    padding:'12px 16px',marginBottom:14,cursor:'pointer',
  },
  vehicleRow: {display:'flex',gap:10,margin:'4px 0 14px'},
  vCard: {
    flex:1,background:'#F5F7FA',border:'1.5px solid #E2E8F0',
    borderRadius:14,padding:'12px 8px',textAlign:'center',
    cursor:'pointer',transition:'all 0.2s',userSelect:'none',
    display:'flex',flexDirection:'column',alignItems:'center',
  },
  vCardActive: {background:'#FFFFFF',borderColor:'#F59E0B',boxShadow:'0 0 0 3px rgba(245,158,11,0.12)'},
  bookBtn: {
    width:'100%',background:'linear-gradient(135deg, #F59E0B, #D97706)',
    color:'#fff',border:'none',borderRadius:14,padding:'14px',
    fontSize:16,fontWeight:800,cursor:'pointer',
    boxShadow:'0 4px 20px rgba(245,158,11,0.3)',
  },
  // Searching
  searchingOverlay: {
    position:'fixed',inset:0,background:'rgba(245,247,250,0.97)',
    display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999,
  },
  searchingCard: {
    textAlign:'center',padding:'40px 30px',width:'100%',maxWidth:380,
    background:'#FFFFFF',borderRadius:24,
    boxShadow:'0 20px 60px rgba(0,0,0,0.1)',border:'1px solid #E2E8F0',
  },
  radarWrap: {position:'relative',width:120,height:120,margin:'0 auto 24px',display:'flex',alignItems:'center',justifyContent:'center'},
  ring1: {position:'absolute',inset:0,borderRadius:'50%',border:'2px solid rgba(245,158,11,0.5)',animation:'radarPulse 2s ease-out infinite'},
  ring2: {position:'absolute',inset:15,borderRadius:'50%',border:'2px solid rgba(245,158,11,0.35)',animation:'radarPulse 2s ease-out infinite 0.5s'},
  ring3: {position:'absolute',inset:30,borderRadius:'50%',border:'2px solid rgba(245,158,11,0.2)',animation:'radarPulse 2s ease-out infinite 1s'},
  radarCenter: {
    position:'relative',zIndex:2,background:'#FEF3C7',borderRadius:'50%',
    width:56,height:56,display:'flex',alignItems:'center',justifyContent:'center',
    border:'2px solid #FCD34D',
  },
  timerPill: {
    display:'inline-block',background:'#F5F7FA',border:'1px solid #E2E8F0',
    color:'#718096',borderRadius:20,padding:'4px 16px',fontSize:14,
    marginBottom:16,fontFamily:'monospace',
  },
  routeBox: {
    background:'#F5F7FA',border:'1px solid #E2E8F0',
    borderRadius:14,padding:'14px 16px',marginBottom:20,textAlign:'left',
  },
  routeRow: {display:'flex',alignItems:'center',gap:10},
  rDot: {width:10,height:10,borderRadius:'50%',flexShrink:0},
  cancelBtn: {
    background:'none',border:'1px solid #E2E8F0',color:'#718096',
    borderRadius:12,padding:'10px 28px',cursor:'pointer',fontSize:14,
  },
  // Riding
  rideBadge: {
    position:'absolute',top:14,left:'50%',transform:'translateX(-50%)',zIndex:999,
    background:'#FFFFFF',border:'1px solid #6EE7B7',color:'#1A202C',
    borderRadius:20,padding:'8px 18px',fontSize:13,fontWeight:700,letterSpacing:1,
    display:'flex',alignItems:'center',boxShadow:'0 2px 8px rgba(0,0,0,0.1)',
  },
  driverCard: {
    background:'#FFFFFF',padding:'16px 16px 28px',
    borderTop:'1px solid #E2E8F0',boxShadow:'0 -4px 20px rgba(0,0,0,0.08)',
  },
  driverTop: {display:'flex',alignItems:'center',gap:12,marginBottom:14},
  driverAva: {
    width:52,height:52,background:'#FEF3C7',border:'2px solid #FCD34D',
    borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',
  },
  driverName: {fontSize:17,fontWeight:700,color:'#1A202C',marginBottom:4},
  starBadge: {background:'#FEF3C7',color:'#D97706',borderRadius:6,padding:'2px 8px',fontSize:12,fontWeight:700},
  plateBadge: {background:'#F0F2F5',color:'#718096',borderRadius:6,padding:'2px 8px',fontSize:12,letterSpacing:1},
  infoBtn: {
    background:'#EFF6FF',border:'1px solid #BFDBFE',color:'#1D4ED8',
    borderRadius:10,padding:'8px 12px',cursor:'pointer',fontSize:18,flexShrink:0,
    display:'flex',alignItems:'center',justifyContent:'center',
  },
  fareBig: {fontSize:26,fontWeight:800,color:'#F59E0B'},
  routeSummary: {background:'#F5F7FA',borderRadius:12,padding:'12px 14px',marginBottom:12,border:'1px solid #E2E8F0'},
  routeRow2: {display:'flex',alignItems:'flex-start',gap:10,color:'#1A202C'},
  statsRow: {display:'flex',gap:10,marginBottom:14},
  statBox: {flex:1,background:'#F5F7FA',border:'1px solid #E2E8F0',borderRadius:10,padding:10,textAlign:'center'},
  statV: {fontSize:16,fontWeight:700,color:'#1A202C',marginBottom:2},
  statL: {fontSize:11,color:'#A0AEC0',textTransform:'uppercase',letterSpacing:0.5,display:'flex',alignItems:'center',justifyContent:'center',gap:2},
  callBtn: {
    flex:1,background:'#F5F7FA',border:'1px solid #E2E8F0',
    color:'#718096',borderRadius:12,padding:12,fontSize:13,cursor:'pointer',
    display:'flex',alignItems:'center',justifyContent:'center',
  },
  chatBtn: {
    flex:1,background:'#EFF6FF',border:'1px solid #BFDBFE',
    color:'#1D4ED8',borderRadius:12,padding:12,fontSize:14,fontWeight:700,cursor:'pointer',
    display:'flex',alignItems:'center',justifyContent:'center',gap:4,
  },
  payNowBtn: {
    flex:1,background:'linear-gradient(135deg,#1A1A2E,#16213E)',border:'none',
    color:'#FFD700',borderRadius:12,padding:12,fontSize:14,fontWeight:700,cursor:'pointer',
    display:'flex',alignItems:'center',justifyContent:'center',gap:6,
    boxShadow:'0 4px 16px rgba(0,0,0,0.25)',
  },
  doneBtn: {flex:1.5,background:'linear-gradient(135deg, #059669, #047857)',border:'none',color:'white',borderRadius:12,padding:12,fontSize:14,fontWeight:700,cursor:'pointer'},
  // Cancel ride row
  cancelRideRow: {
    display:'flex',alignItems:'center',justifyContent:'space-between',
    background:'#FFF7ED',border:'1px solid #FED7AA',borderRadius:12,
    padding:'10px 14px',marginBottom:12,gap:10,
  },
  cancelRideInfo: {display:'flex',alignItems:'center',gap:8,flex:1,minWidth:0},
  cancelRideTimer: {
    fontSize:18,fontWeight:800,color:'#EA580C',
    minWidth:36,textAlign:'center',fontFamily:'monospace',
  },
  cancelRideHint: {fontSize:12,color:'#9A3412',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'},
  cancelRideBtn: {
    background:'#DC2626',border:'none',color:'#FFFFFF',
    borderRadius:10,padding:'9px 14px',fontSize:13,fontWeight:700,
    cursor:'pointer',whiteSpace:'nowrap',flexShrink:0,
    boxShadow:'0 2px 8px rgba(220,38,38,0.3)',transition:'opacity 0.2s',
  },
  cancelRideExpired: {
    display:'flex',alignItems:'center',gap:10,
    background:'#F9FAFB',border:'1px solid #E5E7EB',borderRadius:12,
    padding:'10px 14px',marginBottom:12,
  },
  cancelRideBtnDisabled: {
    background:'#E5E7EB',border:'none',color:'#9CA3AF',
    borderRadius:10,padding:'9px 14px',fontSize:13,fontWeight:700,
    cursor:'not-allowed',whiteSpace:'nowrap',flexShrink:0,
  },
  // ── Quick location shortcut chips ──────────────────────────────────────────
  quickLocRow: {
    display:'flex',gap:8,flexWrap:'wrap',
    padding:'0 0 10px',
  },
  quickLocChip: {
    display:'flex',alignItems:'center',gap:5,
    padding:'7px 12px',borderRadius:20,
    border:'1.5px solid transparent',
    cursor:'pointer',transition:'all 0.15s',
    outline:'none',
  },
  quickLocChangeRow: {
    display:'flex',alignItems:'center',justifyContent:'space-between',
    padding:'2px 0 8px',
  },
  quickLocChangeBtn: {
    background:'none',border:'none',color:'#F59E0B',
    fontSize:12,fontWeight:600,cursor:'pointer',
    padding:'2px 0',
  },
  // ── Ride OTP card ──────────────────────────────────────────────────────────
  otpCard: {
    display:'flex', alignItems:'center', justifyContent:'space-between',
    background:'linear-gradient(135deg,#F5F3FF,#EDE9FE)',
    border:'2px solid #C4B5FD', borderRadius:14,
    padding:'12px 14px', marginBottom:12,
    boxShadow:'0 2px 12px rgba(124,58,237,0.12)',
  },
  otpDigit: {
    width:36, height:44, background:'#FFFFFF',
    border:'2px solid #7C3AED', borderRadius:10,
    display:'flex', alignItems:'center', justifyContent:'center',
    fontSize:22, fontWeight:800, color:'#4C1D95',
    boxShadow:'0 2px 8px rgba(124,58,237,0.15)',
  },
  otpShareBtn: {
    display:'flex', flexDirection:'column', alignItems:'center', gap:3,
    background:'#7C3AED', border:'none', color:'white',
    borderRadius:12, padding:'10px 14px', cursor:'pointer',
    boxShadow:'0 4px 12px rgba(124,58,237,0.3)', flexShrink:0,
  },
}
