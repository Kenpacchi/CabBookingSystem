import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { rideApi, getUser } from '../services/api.js'
import RateDriverModal from '../components/RateDriverModal.jsx'

// ── Fix Leaflet default icon ───────────────────────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const pickupIcon = new L.DivIcon({
  html: `<div style="width:20px;height:20px;border-radius:50%;background:#4CAF50;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.5)"></div>`,
  iconSize:[20,20],iconAnchor:[10,10],className:'',
})
const dropIcon = new L.DivIcon({
  html: `<div style="width:20px;height:20px;border-radius:50%;background:#FF5252;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.5)"></div>`,
  iconSize:[20,20],iconAnchor:[10,10],className:'',
})
const makeDriverIcon = (emoji) => new L.DivIcon({
  html: `<div style="font-size:24px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,.6))">${emoji}</div>`,
  iconSize:[28,28],iconAnchor:[14,14],className:'',
})
const makePOIIcon = () => new L.DivIcon({
  html: `<div style="width:16px;height:16px;border-radius:50%;background:#4FC3F7;border:2px solid white;box-shadow:0 1px 6px rgba(0,0,0,.5)"></div>`,
  iconSize:[16,16],iconAnchor:[8,8],className:'',
})

const VEHICLES = [
  { type:'BIKE', emoji:'🏍️', name:'CABkaro Bike', fareKey:'bikeFare', eta:'2-3 min' },
  { type:'AUTO', emoji:'🛺',  name:'Auto',         fareKey:'autoFare', eta:'4-6 min' },
  { type:'CAB',  emoji:'🚕',  name:'Prime Cab',    fareKey:'cabFare',  eta:'4-7 min' },
]
const DEFAULT_CENTER = [12.9716, 77.5946]

// ── Haversine ─────────────────────────────────────────────────────────────────
function haversineKm(a,b,c,d){const R=6371,dl=(c-a)*Math.PI/180,dm=(d-b)*Math.PI/180,e=Math.sin(dl/2)**2+Math.cos(a*Math.PI/180)*Math.cos(c*Math.PI/180)*Math.sin(dm/2)**2;return R*2*Math.atan2(Math.sqrt(e),Math.sqrt(1-e))}

// ── OSRM real-road route ───────────────────────────────────────────────────────
async function getOsrmRoute(lat1,lng1,lat2,lng2){
  try{
    const url=`https://router.project-osrm.org/route/v1/driving/${lng1},${lat1};${lng2},${lat2}?overview=full&geometries=geojson`
    const r=await fetch(url)
    const d=await r.json()
    if(d.routes&&d.routes[0]){
      return d.routes[0].geometry.coordinates.map(([lng,lat])=>[lat,lng])
    }
  }catch{}
  return null
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

// ── Sample nearby drivers ─────────────────────────────────────────────────────
function generateDrivers(lat,lng){
  const types=[{emoji:'🏍️',type:'BIKE'},{emoji:'🛺',type:'AUTO'},{emoji:'🚕',type:'CAB'}]
  const names=['Ravi','Suresh','Mohan','Arjun','Kumar','Sanjay','Raj']
  return Array.from({length:7},(_,i)=>({
    id:i, lat:lat+(Math.random()-.5)*.04, lng:lng+(Math.random()-.5)*.04,
    ...types[i%3], name:names[i], rating:(4.2+Math.random()*.7).toFixed(1),
  }))
}

// ── Map helpers ───────────────────────────────────────────────────────────────
function MapClickHandler({active,selectingFor,onPickup,onDrop}){
  useMapEvents({click(e){if(!active)return;selectingFor==='pickup'?onPickup(e.latlng):onDrop(e.latlng)}})
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

// ─────────────────────────────────────────────────────────────────────────────
export default function BookingPage(){
  const navigate=useNavigate()
  const [searchParams]=useSearchParams()
  const poi=searchParams.get('poi')

  const[pickup,setPickup]         =useState(null)
  const[drop,setDrop]             =useState(null)
  const[selectingFor,setSelecting]=useState('pickup')
  const[clickMode,setClickMode]   =useState(false)
  const[pickupQuery,setPickupQ]   =useState('')
  const[dropQuery,setDropQ]       =useState('')
  const[pickupResults,setPickupR] =useState([])
  const[dropResults,setDropR]     =useState([])
  const[searchTimer,setSearchTimer]=useState(null)
  const[estimates,setEstimates]   =useState(null)
  const[selectedVehicle,setVehicle]=useState('BIKE')
  const[loadingFare,setLoadingFare]=useState(false)
  const[booking,setBooking]       =useState(false)
  const[stage,setStage]           =useState('map') // map|select|searching|riding|rating
  const[driverFound,setDriverFound]=useState(null)
  const[rideInfo,setRideInfo]     =useState(null)
  const[routePoints,setRoutePoints]=useState([])
  const[nearbyDrivers,setNearbyDrivers]=useState([])
  const[poiMarkers,setPOIMarkers] =useState([])
  const[elapsed,setElapsed]       =useState(0)
  const timerRef=useRef(null)

  // ── Auto-detect GPS ────────────────────────────────────────────────────────
  useEffect(()=>{
    if(navigator.geolocation)navigator.geolocation.getCurrentPosition(async pos=>{
      const{latitude:lat,longitude:lng}=pos.coords
      const address=await reverseGeocode(lat,lng)
      setPickup({lat,lng,address});setPickupQ(address)
    })
  },[])

  // ── Show nearby drivers when pickup is set ─────────────────────────────────
  useEffect(()=>{if(pickup&&stage==='map'||stage==='select')setNearbyDrivers(generateDrivers(pickup?.lat||DEFAULT_CENTER[0],pickup?.lng||DEFAULT_CENTER[1]))},[pickup])

  // ── POI search ─────────────────────────────────────────────────────────────
  useEffect(()=>{
    if(!poi||!pickup)return
    searchPOI(poi,pickup.lat,pickup.lng).then(results=>{
      setPOIMarkers(results.map(r=>({lat:parseFloat(r.lat),lng:parseFloat(r.lon),name:r.display_name.split(',')[0]})))
    })
  },[poi,pickup])

  // ── OSRM route when both pins set ─────────────────────────────────────────
  useEffect(()=>{
    if(!pickup||!drop)return
    getOsrmRoute(pickup.lat,pickup.lng,drop.lat,drop.lng).then(pts=>{
      setRoutePoints(pts||[[pickup.lat,pickup.lng],[drop.lat,drop.lng]])
    })
  },[pickup,drop])

  // ── Fare estimate ──────────────────────────────────────────────────────────
  useEffect(()=>{
    if(!pickup||!drop)return
    setLoadingFare(true)
    const t=setTimeout(async()=>{
      try{
        const r=await rideApi.estimateFare(
          {address:pickup.address,latitude:pickup.lat,longitude:pickup.lng},
          {address:drop.address,latitude:drop.lat,longitude:drop.lng}
        )
        setEstimates(r.data);setStage('select')
      }catch{
        const km=haversineKm(pickup.lat,pickup.lng,drop.lat,drop.lng)*1.3
        setEstimates({bikeFare:Math.max(30,Math.round(20+km*9)),autoFare:Math.max(40,Math.round(30+km*13)),cabFare:Math.max(70,Math.round(50+km*18)),distanceKm:km.toFixed(1),surgeMultiplier:1.0})
        setStage('select')
      }finally{setLoadingFare(false)}
    },300)
    return()=>clearTimeout(t)
  },[pickup,drop])

  // ── Search debounce ────────────────────────────────────────────────────────
  const handleSearch=useCallback((q,isPickup)=>{
    if(searchTimer)clearTimeout(searchTimer)
    if(q.length<3){isPickup?setPickupR([]):setDropR([]);return}
    const t=setTimeout(async()=>{const r=await forwardGeocode(q);isPickup?setPickupR(r):setDropR(r)},400)
    setSearchTimer(t)
  },[searchTimer])

  const selectResult=useCallback(async(r,isPickup)=>{
    const lat=parseFloat(r.lat),lng=parseFloat(r.lon)
    const address=r.display_name.split(',').slice(0,3).join(', ')
    const loc={lat,lng,address}
    if(isPickup){setPickup(loc);setPickupQ(address);setPickupR([])}
    else{setDrop(loc);setDropQ(address);setDropR([])}
  },[])

  const handleMapPickup=useCallback(async({lat,lng})=>{
    const a=await reverseGeocode(lat,lng);setPickup({lat,lng,address:a});setPickupQ(a);setClickMode(false)
  },[])
  const handleMapDrop=useCallback(async({lat,lng})=>{
    const a=await reverseGeocode(lat,lng);setDrop({lat,lng,address:a});setDropQ(a);setClickMode(false)
  },[])

  // ── Book ride ──────────────────────────────────────────────────────────────
  const handleBook=async()=>{
    if(!pickup||!drop)return
    setBooking(true);setStage('searching');setElapsed(0)
    timerRef.current=setInterval(()=>setElapsed(s=>s+1),1000)
    try{
      const r=await rideApi.bookRide(
        {address:pickup.address,latitude:pickup.lat,longitude:pickup.lng},
        {address:drop.address,latitude:drop.lat,longitude:drop.lng},
        selectedVehicle
      )
      clearInterval(timerRef.current)
      const ride=r.data
      setRideInfo({...ride,rideId:ride.rideId||ride.id})
      setDriverFound({name:ride.driverName||'Rahul Kumar',vehicle:ride.vehicleNumber||'KA01AB1234',rating:(4.5+Math.random()*.4).toFixed(1)})
      setNearbyDrivers([])
      setStage('riding')
    }catch(e){
      clearInterval(timerRef.current)
      alert(e.response?.data?.message||'No drivers available. Try again.')
      setStage('select')
    }finally{setBooking(false)}
  }

  useEffect(()=>()=>{if(timerRef.current)clearInterval(timerRef.current)},[])

  const fare=estimates?estimates[VEHICLES.find(v=>v.type===selectedVehicle)?.fareKey]:null
  const distKm=estimates?.distanceKm||(pickup&&drop?haversineKm(pickup.lat,pickup.lng,drop.lat,drop.lng).toFixed(1):null)
  const mapCenter=pickup?[pickup.lat,pickup.lng]:DEFAULT_CENTER

  // ══ STAGE: SEARCHING ══════════════════════════════════════════════════════
  if(stage==='searching'){
    const v=VEHICLES.find(v=>v.type===selectedVehicle)
    return(
      <div style={SS.searchingOverlay}>
        <div style={SS.searchingCard}>
          <div style={SS.radarWrap}>
            <div style={SS.ring1}/><div style={SS.ring2}/><div style={SS.ring3}/>
            <div style={SS.radarEmoji}>{v.emoji}</div>
          </div>
          <h2 style={{color:'#FFD700',fontSize:22,margin:'0 0 8px',fontWeight:700}}>Finding your driver…</h2>
          <p style={{color:'rgba(255,255,255,0.5)',fontSize:13,margin:'0 0 20px'}}>Looking for nearby {v.name}</p>
          <div style={SS.timerPill}>{elapsed}s</div>
          <div className="dotLoader" style={{justifyContent:'center',gap:6,marginBottom:24,display:'flex'}}>
            <span style={SS.dot}/><span style={{...SS.dot,animationDelay:'0.2s'}}/><span style={{...SS.dot,animationDelay:'0.4s'}}/>
          </div>
          <div style={SS.routeBox}>
            <div style={SS.routeRow}><div style={{...SS.rDot,background:'#4CAF50'}}/><span style={{fontSize:12,color:'rgba(255,255,255,0.6)'}}>{pickup?.address?.substring(0,40)}</span></div>
            <div style={{width:2,height:12,background:'rgba(255,255,255,0.1)',margin:'4px 0 4px 4px'}}/>
            <div style={SS.routeRow}><div style={{...SS.rDot,background:'#FF5252'}}/><span style={{fontSize:12,color:'rgba(255,255,255,0.6)'}}>{drop?.address?.substring(0,40)}</span></div>
          </div>
          <button style={SS.cancelBtn} onClick={()=>{setStage('select');clearInterval(timerRef.current)}}>Cancel</button>
        </div>
      </div>
    )
  }

  // ══ STAGE: RIDING ═════════════════════════════════════════════════════════
  if(stage==='riding'&&rideInfo){
    const v=VEHICLES.find(v=>v.type===selectedVehicle)
    return(
      <div style={{height:'100vh',display:'flex',flexDirection:'column',background:'#0a0a0a'}}>
        <div style={{flex:1,position:'relative'}}>
          <MapContainer center={pickup?[pickup.lat,pickup.lng]:DEFAULT_CENTER} zoom={14} style={{width:'100%',height:'100%'}} zoomControl={false}>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution='&copy; OpenStreetMap &copy; CartoDB'/>
            {pickup&&<Marker position={[pickup.lat,pickup.lng]} icon={pickupIcon}><Popup>Pickup</Popup></Marker>}
            {drop&&<Marker position={[drop.lat,drop.lng]} icon={dropIcon}><Popup>Drop</Popup></Marker>}
            {routePoints.length>1&&<Polyline positions={routePoints} pathOptions={{color:'#FFD700',weight:5,opacity:0.9}}/>}
            {pickup&&drop&&<FitBounds pickup={pickup} drop={drop}/>}
          </MapContainer>
          <div style={SS.rideBadge}><span style={{color:'#4CAF50',marginRight:6}}>●</span>RIDE IN PROGRESS</div>
        </div>
        <div style={SS.driverCard}>
          <div style={SS.driverTop}>
            <div style={SS.driverAva}>{v.emoji}</div>
            <div style={{flex:1}}>
              <div style={SS.driverName}>{driverFound?.name}</div>
              <div style={{display:'flex',gap:8}}>
                <span style={SS.starBadge}>⭐ {driverFound?.rating}</span>
                <span style={SS.plateBadge}>{driverFound?.vehicle}</span>
              </div>
            </div>
            <div style={SS.fareBig}>₹{fare}</div>
          </div>
          <div style={SS.routeSummary}>
            <div style={SS.routeRow2}><div style={{...SS.rDot,background:'#4CAF50'}}/><div><div style={{fontSize:10,color:'rgba(255,255,255,0.4)',marginBottom:2}}>PICKUP</div><div style={{fontSize:13}}>{pickup?.address?.substring(0,45)}</div></div></div>
            <div style={{width:2,height:14,background:'rgba(255,255,255,0.1)',margin:'3px 0 3px 4px'}}/>
            <div style={SS.routeRow2}><div style={{...SS.rDot,background:'#FF5252'}}/><div><div style={{fontSize:10,color:'rgba(255,255,255,0.4)',marginBottom:2}}>DROP</div><div style={{fontSize:13}}>{drop?.address?.substring(0,45)}</div></div></div>
          </div>
          <div style={SS.statsRow}>
            <div style={SS.statBox}><div style={SS.statV}>{distKm} km</div><div style={SS.statL}>Distance</div></div>
            <div style={SS.statBox}><div style={SS.statV}>{estimates?.surgeMultiplier>1?`${estimates.surgeMultiplier}×`:'—'}</div><div style={SS.statL}>Surge</div></div>
            <div style={SS.statBox}><div style={{...SS.statV,color:'#4CAF50'}}>ACTIVE</div><div style={SS.statL}>Status</div></div>
          </div>
          <div style={{display:'flex',gap:10}}>
            <button style={SS.callBtn}>📞 Call Driver</button>
            <button style={SS.doneBtn} onClick={()=>setStage('rating')}>✓ Complete Ride</button>
          </div>
        </div>
      </div>
    )
  }

  // ══ STAGE: RATING ═════════════════════════════════════════════════════════
  if(stage==='rating'){
    return(
      <RateDriverModal
        rideInfo={rideInfo}
        fare={fare||0}
        onDone={()=>navigate('/history')}
      />
    )
  }

  // ══ STAGE: MAP / SELECT (main) ════════════════════════════════════════════
  return(
    <div style={{height:'100vh',display:'flex',flexDirection:'column',background:'#0a0a0a',overflow:'hidden'}}>
      <div style={{position:'relative',flex:1}}>
        <MapContainer center={mapCenter} zoom={14} style={{width:'100%',height:'100%'}} zoomControl={false}>
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution='&copy; OpenStreetMap &copy; CartoDB'/>
          <MapClickHandler active={clickMode} selectingFor={selectingFor} onPickup={handleMapPickup} onDrop={handleMapDrop}/>
          {pickup&&<Marker position={[pickup.lat,pickup.lng]} icon={pickupIcon}><Popup>{pickup.address}</Popup></Marker>}
          {drop&&<Marker position={[drop.lat,drop.lng]} icon={dropIcon}><Popup>{drop.address}</Popup></Marker>}
          {routePoints.length>1&&<Polyline positions={routePoints} pathOptions={{color:'#FFD700',weight:4,opacity:0.85}}/>}
          {!drop&&pickup&&routePoints.length===0&&nearbyDrivers.map(d=>(
            <Marker key={d.id} position={[d.lat,d.lng]} icon={makeDriverIcon(d.emoji)}>
              <Popup><b>{d.name}</b> · {d.emoji} {d.type} · ⭐{d.rating}</Popup>
            </Marker>
          ))}
          {poiMarkers.map((p,i)=>(
            <Marker key={i} position={[p.lat,p.lng]} icon={makePOIIcon()}>
              <Popup>{p.name}</Popup>
            </Marker>
          ))}
          <FitBounds pickup={pickup} drop={drop}/>
        </MapContainer>

        {clickMode&&(
          <div style={SS.clickBanner}>
            <span style={{fontSize:16,marginRight:8}}>{selectingFor==='pickup'?'🟢':'🔴'}</span>
            Tap map to set {selectingFor==='pickup'?'pickup':'drop'}
            <button style={{background:'none',border:'none',color:'rgba(255,255,255,0.6)',cursor:'pointer',marginLeft:10}} onClick={()=>setClickMode(false)}>✕</button>
          </div>
        )}
        {poi&&poiMarkers.length>0&&(
          <div style={SS.poiBanner}>📍 {poiMarkers.length} {poi}(s) found nearby</div>
        )}
        <button style={SS.backBtn} onClick={()=>navigate('/')}>‹ Back</button>
      </div>

      {/* ── Bottom panel ── */}
      <div style={SS.panel}>
        <div style={SS.handle}/>
        <div style={SS.panelTitle}>
          <span>📍</span><span>Book a Ride</span>
          {loadingFare&&<span style={{fontSize:12,color:'#FFD700',marginLeft:'auto'}}>Getting fares…</span>}
        </div>

        {/* Pickup */}
        <div style={SS.locRow}>
          <div style={{...SS.locDot,background:'#4CAF50'}}/>
          <div style={{flex:1,position:'relative'}}>
            <input style={SS.locInput} placeholder="Pickup location" value={pickupQuery}
              onChange={e=>{setPickupQ(e.target.value);handleSearch(e.target.value,true)}}/>
            {pickupResults.length>0&&(
              <div style={SS.suggestions}>
                {pickupResults.map((r,i)=>(
                  <div key={i} style={SS.suggestion} onClick={()=>selectResult(r,true)}>
                    📍 {r.display_name.substring(0,60)}…
                  </div>
                ))}
              </div>
            )}
          </div>
          <button style={SS.iconBtn} title="Pin on map" onClick={()=>{setSelecting('pickup');setClickMode(true)}}>🗺️</button>
          <button style={SS.gpsBtn} title="Detect GPS" onClick={()=>navigator.geolocation?.getCurrentPosition(async p=>{const{latitude:lat,longitude:lng}=p.coords;const a=await reverseGeocode(lat,lng);setPickup({lat,lng,address:a});setPickupQ(a)})}>📡</button>
        </div>

        {/* Drop */}
        <div style={SS.locRow}>
          <div style={{...SS.locDot,background:'#FF5252'}}/>
          <div style={{flex:1,position:'relative'}}>
            <input style={SS.locInput} placeholder="Where to?" value={dropQuery}
              onChange={e=>{setDropQ(e.target.value);handleSearch(e.target.value,false)}}/>
            {dropResults.length>0&&(
              <div style={SS.suggestions}>
                {dropResults.map((r,i)=>(
                  <div key={i} style={SS.suggestion} onClick={()=>selectResult(r,false)}>
                    📍 {r.display_name.substring(0,60)}…
                  </div>
                ))}
              </div>
            )}
          </div>
          <button style={SS.iconBtn} title="Pin on map" onClick={()=>{setSelecting('drop');setClickMode(true)}}>🗺️</button>
        </div>

        {/* Vehicle selector */}
        {stage==='select'&&estimates&&(
          <>
            <div style={SS.vehicleRow}>
              {VEHICLES.map(v=>(
                <div key={v.type} style={{...SS.vCard,...(selectedVehicle===v.type?SS.vCardActive:{})}} onClick={()=>setVehicle(v.type)}>
                  <div style={{fontSize:26,marginBottom:4}}>{v.emoji}</div>
                  <div style={{fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.7)',marginBottom:2}}>{v.name}</div>
                  <div style={{fontSize:10,color:'rgba(255,255,255,0.4)',marginBottom:6}}>{v.eta}</div>
                  <div style={{fontSize:15,fontWeight:700,color:'#FFD700'}}>₹{estimates[v.fareKey]}</div>
                </div>
              ))}
            </div>
            {distKm&&(
              <div style={{display:'flex',alignItems:'center',gap:12,fontSize:13,color:'rgba(255,255,255,0.5)',marginBottom:14}}>
                <span>📍 {distKm} km</span>
                {estimates.surgeMultiplier>1&&<span style={{color:'#FF9800'}}>⚡ Surge active</span>}
                <span style={{marginLeft:'auto',color:'#FFD700',fontWeight:700}}>₹{fare}</span>
              </div>
            )}
            <button style={SS.bookBtn} onClick={handleBook} disabled={booking}>
              {booking?'Booking…':`Book ${VEHICLES.find(v=>v.type===selectedVehicle)?.name} · ₹${fare}`}
            </button>
          </>
        )}
        {(!pickup||!drop)&&(
          <p style={{color:'rgba(255,255,255,0.4)',fontSize:13,textAlign:'center',padding:'8px 0 4px'}}>
            {!pickup?'Set your pickup location':'Set destination to see fares'}
          </p>
        )}
      </div>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const SS={
  backBtn:{position:'absolute',top:14,left:14,zIndex:999,background:'rgba(10,10,10,0.85)',backdropFilter:'blur(8px)',border:'1px solid rgba(255,255,255,0.1)',color:'white',borderRadius:12,padding:'8px 14px',fontSize:14,cursor:'pointer',fontWeight:600},
  clickBanner:{position:'absolute',top:14,left:'50%',transform:'translateX(-50%)',zIndex:999,background:'rgba(10,10,10,0.9)',backdropFilter:'blur(8px)',border:'1px solid #FFD700',color:'white',borderRadius:20,padding:'10px 20px',fontSize:14,display:'flex',alignItems:'center',whiteSpace:'nowrap'},
  poiBanner:{position:'absolute',bottom:10,left:'50%',transform:'translateX(-50%)',zIndex:999,background:'rgba(79,195,247,0.15)',border:'1px solid rgba(79,195,247,0.4)',color:'#4FC3F7',borderRadius:20,padding:'6px 16px',fontSize:13,whiteSpace:'nowrap'},
  panel:{background:'#111',borderTop:'1px solid rgba(255,255,255,0.07)',borderRadius:'20px 20px 0 0',padding:'12px 16px 24px',boxShadow:'0 -4px 30px rgba(0,0,0,0.5)',position:'relative',zIndex:100,maxHeight:'60vh',overflowY:'auto'},
  handle:{width:40,height:4,background:'rgba(255,255,255,0.15)',borderRadius:2,margin:'0 auto 14px'},
  panelTitle:{display:'flex',alignItems:'center',gap:8,fontSize:16,fontWeight:700,color:'white',marginBottom:14},
  locRow:{display:'flex',alignItems:'center',gap:10,marginBottom:10},
  locDot:{width:12,height:12,borderRadius:'50%',flexShrink:0},
  locInput:{width:'100%',background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:12,padding:'10px 14px',color:'white',fontSize:14,outline:'none',boxSizing:'border-box'},
  suggestions:{position:'absolute',top:'100%',left:0,right:0,background:'#1a1a1a',border:'1px solid rgba(255,255,255,0.1)',borderRadius:12,zIndex:9999,maxHeight:200,overflowY:'auto',boxShadow:'0 8px 32px rgba(0,0,0,0.5)'},
  suggestion:{padding:'10px 14px',color:'rgba(255,255,255,0.8)',cursor:'pointer',fontSize:13,borderBottom:'1px solid rgba(255,255,255,0.05)'},
  iconBtn:{background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',color:'white',borderRadius:10,padding:'8px 10px',cursor:'pointer',fontSize:16,flexShrink:0},
  gpsBtn:{background:'rgba(255,215,0,0.1)',border:'1px solid rgba(255,215,0,0.3)',color:'#FFD700',borderRadius:10,padding:'8px 10px',cursor:'pointer',fontSize:16,flexShrink:0},
  vehicleRow:{display:'flex',gap:10,margin:'14px 0'},
  vCard:{flex:1,background:'rgba(255,255,255,0.05)',border:'1.5px solid rgba(255,255,255,0.08)',borderRadius:14,padding:'12px 8px',textAlign:'center',cursor:'pointer',transition:'all 0.2s',userSelect:'none'},
  vCardActive:{background:'rgba(255,215,0,0.1)',border:'1.5px solid #FFD700',boxShadow:'0 0 14px rgba(255,215,0,0.2)'},
  bookBtn:{width:'100%',background:'linear-gradient(135deg, #FFD700, #FFA000)',color:'#111',border:'none',borderRadius:14,padding:'14px',fontSize:16,fontWeight:800,cursor:'pointer',boxShadow:'0 4px 20px rgba(255,215,0,0.3)'},
  // Searching
  searchingOverlay:{position:'fixed',inset:0,background:'rgba(5,5,5,0.97)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999},
  searchingCard:{textAlign:'center',padding:'40px 30px',width:'100%',maxWidth:380},
  radarWrap:{position:'relative',width:120,height:120,margin:'0 auto 24px',display:'flex',alignItems:'center',justifyContent:'center'},
  ring1:{position:'absolute',inset:0,borderRadius:'50%',border:'2px solid rgba(255,215,0,0.6)',animation:'radarPulse 2s ease-out infinite'},
  ring2:{position:'absolute',inset:15,borderRadius:'50%',border:'2px solid rgba(255,215,0,0.4)',animation:'radarPulse 2s ease-out infinite 0.5s'},
  ring3:{position:'absolute',inset:30,borderRadius:'50%',border:'2px solid rgba(255,215,0,0.2)',animation:'radarPulse 2s ease-out infinite 1s'},
  radarEmoji:{position:'relative',zIndex:2,fontSize:34,background:'rgba(255,215,0,0.1)',borderRadius:'50%',width:56,height:56,display:'flex',alignItems:'center',justifyContent:'center',border:'2px solid rgba(255,215,0,0.5)'},
  timerPill:{display:'inline-block',background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',color:'rgba(255,255,255,0.7)',borderRadius:20,padding:'4px 16px',fontSize:14,marginBottom:16,fontFamily:'monospace'},
  dot:{display:'inline-block',width:9,height:9,background:'#FFD700',borderRadius:'50%',animation:'dotBounce 1.4s ease-in-out infinite'},
  routeBox:{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,padding:'14px 16px',marginBottom:20,textAlign:'left'},
  routeRow:{display:'flex',alignItems:'center',gap:10},
  rDot:{width:10,height:10,borderRadius:'50%',flexShrink:0},
  cancelBtn:{background:'none',border:'1px solid rgba(255,255,255,0.15)',color:'rgba(255,255,255,0.6)',borderRadius:12,padding:'10px 28px',cursor:'pointer',fontSize:14},
  // Riding
  rideBadge:{position:'absolute',top:14,left:'50%',transform:'translateX(-50%)',zIndex:999,background:'rgba(10,10,10,0.9)',border:'1px solid rgba(76,175,80,0.5)',color:'white',borderRadius:20,padding:'8px 18px',fontSize:13,fontWeight:700,letterSpacing:1,display:'flex',alignItems:'center'},
  driverCard:{background:'#111',padding:'16px 16px 28px',borderTop:'1px solid rgba(255,255,255,0.07)',boxShadow:'0 -4px 30px rgba(0,0,0,0.5)'},
  driverTop:{display:'flex',alignItems:'center',gap:12,marginBottom:14},
  driverAva:{width:52,height:52,background:'rgba(255,215,0,0.1)',border:'2px solid rgba(255,215,0,0.3)',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:26},
  driverName:{fontSize:17,fontWeight:700,color:'white',marginBottom:4},
  starBadge:{background:'rgba(255,215,0,0.1)',color:'#FFD700',borderRadius:6,padding:'2px 8px',fontSize:12,fontWeight:700},
  plateBadge:{background:'rgba(255,255,255,0.07)',color:'rgba(255,255,255,0.7)',borderRadius:6,padding:'2px 8px',fontSize:12,letterSpacing:1},
  fareBig:{fontSize:26,fontWeight:800,color:'#FFD700'},
  routeSummary:{background:'rgba(255,255,255,0.04)',borderRadius:12,padding:'12px 14px',marginBottom:12,border:'1px solid rgba(255,255,255,0.06)'},
  routeRow2:{display:'flex',alignItems:'flex-start',gap:10,color:'white'},
  statsRow:{display:'flex',gap:10,marginBottom:14},
  statBox:{flex:1,background:'rgba(255,255,255,0.04)',borderRadius:10,padding:10,textAlign:'center'},
  statV:{fontSize:16,fontWeight:700,color:'white',marginBottom:2},
  statL:{fontSize:11,color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:0.5},
  callBtn:{flex:1,background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',color:'white',borderRadius:12,padding:12,fontSize:14,cursor:'pointer'},
  doneBtn:{flex:2,background:'linear-gradient(135deg, #4CAF50, #2E7D32)',border:'none',color:'white',borderRadius:12,padding:12,fontSize:14,fontWeight:700,cursor:'pointer'},
}
