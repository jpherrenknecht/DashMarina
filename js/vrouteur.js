 var NumpyLoader = (function () {
    function asciiDecode(buf) {
      return String.fromCharCode.apply(null, new Uint8Array(buf));
    }
    function readUint16LE(buffer) {
      var view = new DataView(buffer);
      return view.getUint8(0) | (view.getUint8(1) << 8);
    }



function fromArrayBuffer(buf) {
  var magic = asciiDecode(buf.slice(0, 6));
  if (magic.slice(1, 6) !== 'NUMPY') throw new Error('Not a .npy file');

  var headerLength = readUint16LE(buf.slice(8, 10));
  var headerStr = asciiDecode(buf.slice(10, 10 + headerLength));
  var offset = 10 + headerLength;

  // Extraire infos par regex
  let descrMatch = headerStr.match(/'descr': *'([^']+)'/);
  let fortranMatch = headerStr.match(/'fortran_order': *(True|False)/);
  let shapeMatch = headerStr.match(/'shape': *\(([^)]*)\)/);

  let descr = descrMatch[1];
  let fortran_order = (fortranMatch[1] === "True");

  let shape = shapeMatch[1]
    .split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .map(Number);

  let data;
  if (descr === "<f4") {
    data = new Float32Array(buf, offset);
  } else if (descr === "<f8") {
    data = new Float64Array(buf, offset);
  } else if (descr === "<u2") {
    data = new Uint16Array(buf, offset);
  } else if (descr === "|u1") { // uint8 cas fréquent
    data = new Uint8Array(buf, offset);
  } else {
    throw new Error("dtype not supported: " + descr);
  }

  return { descr, fortran_order, shape, data };
}




function ajax(url, cb) {
      var xhr = new XMLHttpRequest();
      xhr.open("GET", url);
      xhr.responseType = "arraybuffer";
      xhr.onload = () => cb(fromArrayBuffer(xhr.response));
      xhr.send();
    }
    return { ajax };
  })();




function pos_dec_mn(pos)
			{  // transforme les degres decimaux en mn sec
			 	abs=Math.abs(pos)
				deg=Math.floor(abs)
				min=Math.floor((abs-deg)*60)
				sec=Math.round(((abs-deg)*60-min)*60)
				return deg+'°'+min+'mn'+sec+'s'
			}  

function pos_dec_mn_lat(pos)
			{  // transforme les degres decimaux en mn sec
			 	abs=Math.abs(pos)
				deg=Math.floor(abs)
				min=Math.floor((abs-deg)*60)
				sec=Math.round(((abs-deg)*60-min)*60)
				if (pos>0) {var hem='N' }
				else {var hem='S'}
				return deg+'°'+min+"'"+sec+"''"+hem+"  "
			}  

function pos_dec_mn_lng(pos)
			{  // transforme les degres decimaux en mn sec
			 	abs=Math.abs(pos)
				deg=Math.floor(abs)
				min=Math.floor((abs-deg)*60)
				sec=Math.round(((abs-deg)*60-min)*60)
				if (pos>0) {var hem='E'}
				else{var hem='W'}
				return deg+'°'+min+"'"+sec+"''"+hem+"  "
			}  


function dec_to_mn_lat(pos)
			{  // transforme les degres decimaux en mn sec
				var tab=new Array;
			 	var abs=Math.abs(pos)
				var  deg=Math.floor(abs)
				var  min=Math.floor((abs-deg)*60)
				var  sec=Math.round(((abs-deg)*60-min)*60)
				if (pos>0) {hem='N' }
				else {hem='S'}
				tab=[deg,min,sec,hem]
				return tab
			}  

function dec_to_mn_lng(pos)
			{  // transforme les degres decimaux en mn sec
				var tab=new Array;
			 	var abs=Math.abs(pos)
				var  deg=Math.floor(abs)
				var  min=Math.floor((abs-deg)*60)
				var  sec=Math.round(((abs-deg)*60-min)*60)
				if (pos>0) {hem='E' }
				else {hem='W'}
				tab=[deg,min,sec,hem]
				return tab
			}  




function dec_to_mn_lat_n(pos)
			{  // transforme les degres decimaux en mn sec
				var tab=new Array;
			 	var abs=Math.abs(pos)
				var  deg=Math.floor(abs)
				var  min=Math.floor((abs-deg)*60)
				var  sec=Math.round(((abs-deg)*60-min)*60)
				if (pos>0) {hem=+1 }
				else {hem=-1}
				tab=[deg,min,sec,hem]
				return tab
			}  

function dec_to_mn_lng_n(pos)
			{  // transforme les degres decimaux en mn sec
				var tab=new Array;
			 	var abs=Math.abs(pos)
				var  deg=Math.floor(abs)
				var  min=Math.floor((abs-deg)*60)
				var  sec=Math.round(((abs-deg)*60-min)*60)
				if (pos>0) {hem=1 }
				else {hem=-1}
				tab=[deg,min,sec,hem]
				return tab
			}  



var tabLignesCheckPoints    = new Array ();
var  zonesExclusions        = new Array ();
var messagejph 
var fleetboatinfos
var fleetmessage
let fleetQueue = [];
let raceQueue  = [];
var globalMap  = null;
var map = globalMap;
var popup               = L.popup(); 

// création d’un layer group pour stocker la grille
let grilleLayer = L.layerGroup();




var colors = ["blue", "green", "red", "orange", "yellow", "violet", "grey", "black"];


var icons = {};

colors.forEach(function(c) {
  // Génère un objet "icons" avec toutes les couleurs
    icons[c] = new L.Icon({
        iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${c}.png`,
    
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });
});


//    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.3/images/marker-shadow.png',



 function createBezierPath(points) {
        console.log(' on est dans create bezier')

				var path = [];
				path.push('M', points[0]); // Commencez avec le premier point
		
				for (var i = 1; i < points.length - 1; i++) {
					var p0 = points[i - 1];
					var p1 = points[i];
					var p2 = points[i + 1];
		
					// Calculer les points de contrôle pour la courbe de Bézier
					var control1 = [   
						(p0[0] + p1[0]) / 2,
						(p0[1] + p1[1]) / 2
					];
					var control2 = [
						(p1[0] + p2[0]) / 2,
						(p1[1] + p2[1]) / 2
					];
		
					// Ajouter la courbe de Bézier au chemin
					path.push('C', control1, p1, control2);
				}
		
				// Ajouter le dernier point au chemin
				path.push('L', points[points.length - 1]);
		
				return path;
			}




function couperPolyligneLongitude(points) {
  const troncons = [];
  let tronconCourant = [];

  for (let i = 0; i < points.length - 1; i++) {
    const [lat1, lon1] = points[i];
    const [lat2, lon2] = points[i + 1];

    // Ajouter le point actuel au tronçon courant
    tronconCourant.push([lat1, lon1]);

    // Vérifier si une coupure au niveau de l'antiméridien est détectée
    if (Math.abs(lon1 - lon2) > 180) {
      // Calculer le point d'intersection avec le méridien
      const t = (180 - Math.abs(lon1)) / (Math.abs(lon2 - lon1));
      const latIntersection = lat1 + t * (lat2 - lat1);
      const lonIntersection = lon1 > 0 ? 180 : -180;

      // Ajouter le point d'intersection et terminer le tronçon courant
      tronconCourant.push([latIntersection, lonIntersection]);
      troncons.push(tronconCourant);

      // Démarrer un nouveau tronçon à partir de l'autre côté du méridien
      const newLon = lon1 > 0 ? -180 : 180;
      tronconCourant = [[latIntersection, newLon]];
    }
  }

  // Ajouter le dernier point et le dernier tronçon
  tronconCourant.push(points[points.length - 1]);
  troncons.push(tronconCourant);

  return troncons;
}



function trierParLongitude(points) {
  return points.sort((a, b) => a[1] - b[1]); // Trier par longitude (index 1)
}




function updateMapCheckpoints (race) {
        if (!race) return;        
        var map = race.gmap;
        var bounds = race.gbounds;

        // checkpoints
        if (!race.legdata) return;
        if (!map) return;
        clearTrack(map,"_db_cp");
        
        // Fonctionnalité non utilisée par Michel
        //var groupColors = [];
        for (var i = 0; i < race.legdata.checkpoints.length; i++) {

            var cp = race.legdata.checkpoints[i];
            var cp_name = "invsible";
            if (cp.display != "none") cp_name = cp.display;

        }}



function tracearc(y0,x0,y1,x1,map)               
    { //trace un arc entre les points 1 et 2
        L.Polyline.Arc([y0,x0],[y1,x1],{color:'white',weight:1,vertices:50,dashArray: '5, 5' // 5 pixels de ligne, 5 pixels d'espace
        }).addTo(map)
    }


function formatTime(seconds) {
    if (seconds < 60) {
        return `+${seconds} s`;
    } else if (seconds < 3600) {
        return `+${Math.floor(seconds/60)} min`;
    } else {
        const h = Math.floor(seconds/3600);
        const m = Math.floor((seconds%3600)/60);
        return m > 0 ? `+${h} h ${m} min` : `+${h} h`;
    }
}




function destinationPoint(lat, lon, distanceNM, bearingDeg) {

  // Calcule le point  a la distance et au cap du point d 'origine 
    const R = 3440.065; // rayon Terre en milles nautiques
    const δ = distanceNM / R; // distance angulaire
    const θ = bearingDeg * Math.PI / 180;
    const φ1 = lat * Math.PI / 180;
    const λ1 = lon * Math.PI / 180;
    const φ2 = Math.asin(Math.sin(φ1) * Math.cos(δ) +  Math.cos(φ1) * Math.sin(δ) * Math.cos(θ));
    const λ2 = λ1 + Math.atan2(Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),  Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2));
    return [φ2 * 180 / Math.PI, λ2 * 180 / Math.PI];
}







function plotFuturePositions(map, lat, lon, capDeg, speedKnots) {
    const times = [];
   
    for (let t=10; t<=600; t+=10) times.push(t); // toutes les 10 s jusqu'à 10 min
    for (let t=660; t<=1200; t+=60) times.push(t);// toutes les minutes jusqu'à 20 min
    for (let t=1800; t<=3600; t+=600) times.push(t); // toutes les 10 min jusqu'à 1 h
    for (let t=7200; t<=86400; t+=3600) times.push(t); // toutes les heures jusqu'à 24 h
    const latlngs = [[lat, lon]];  // inclure la position de départ
    times.forEach(t => {
        const hours = t / 3600;                // temps en heures
        const dNM = speedKnots * hours;        // distance parcourue en milles nautiques
        const [lat2, lon2] = destinationPoint(lat, lon, dNM, capDeg);
        latlngs.push([lat2, lon2]);
        // style du point
        let radius = .5;
        if (t % 600 === 0) radius = 1;   // toutes les 10 min plus gros
        else if (t % 60 === 0) radius = 1.5; // toutes les minutes moyen
        // créer le marqueur avec popup
        L.circleMarker([lat2, lon2], {color: "purple",radius: radius,weight: 1,fillOpacity: 0.3}).bindTooltip(`Temps écoulé : ${formatTime(t)}`).addTo(map);
    });

    // tracer la polyline violette
    L.polyline(latlngs, {color: "purple",weight: .5,opacity: 0.3}).addTo(map);
}



function toRad(deg) {
    return deg * Math.PI / 180;
}




// Calcule un déplacement (en NM) à partir d'un point
function movePoint(lat, lon, distNM, bearingDeg) {
    const R = 3440.065;
    const δ = distNM / R;
    const θ = toRad(bearingDeg);
    const φ1 = toRad(lat);
    const λ1 = toRad(lon);
    const φ2 = Math.asin(Math.sin(φ1) * Math.cos(δ) +  Math.cos(φ1) * Math.sin(δ) * Math.cos(θ));
    const λ2 = λ1 + Math.atan2(Math.sin(θ) * Math.sin(δ) * Math.cos(φ1), Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2));
    return [φ2 * 180 / Math.PI, λ2 * 180 / Math.PI];
}




 function updateMapFleet(race) {
        if (!race) return;
        var map = race.gmap;
        var bounds = race.gbounds;

        clearTrack(map, "_db_op");
        clearTrack(map, "_db_fl");

        // opponents/followed
        var fleet = raceFleetMap.get(race.id);

        globalfleet =fleet
        
        Object.keys(fleet.uinfo).forEach(function (key) {
            var elem = fleet.uinfo[key];
            var bi = boatinfo(key, elem);

            });
          
          };




// Dessiner une flèche "météo" (trait + empennage)
function drawArrow(map, lat, lon, dirDeg, lengthNM=30, color="blue") {
    // extrémité de la flèche (vent venant de dirDeg)
    const [lat2, lon2] = movePoint(lat, lon, lengthNM, dirDeg);

    // trace le corps
    L.polyline([[lat, lon], [lat2, lon2]], {
        color: color,
        weight: 1
    }).addTo(map);

    // empennage = petit trait perpendiculaire à l’extrémité
    const empLen = lengthNM / 8;  // longueur relative empennage
    const [latE1, lonE1] = movePoint(lat2, lon2, empLen, dirDeg + 20);
    const [latE2, lonE2] = movePoint(lat2, lon2, empLen, dirDeg - 20);

    L.polyline([[latE1, lonE1], [lat2, lon2], [latE2, lonE2]], {
        color: color,
        weight: 1
    }).addTo(map);
}





function updatefleetJP(map,fleetboatinfos){
console.log ('\non est dans updatefleetjp\n')
console.log ('fleetboatinfos '+fleetboatinfos)
fleetboatinfos=JSON.parse(fleetboatinfos)
fleet=fleetboatinfos['res']
fleet.forEach(item => {

  displayname=item.displayName
  lat=item.pos.lat
  lon=item.pos.lon
  heading=item.heading
  speed=item.speed
  twa=item.twa
  tws=item.tws
  twd=item.twd
  sail=item.sail  
  typeb=item.type


  console.log(item.displayName);
  console.log ('lat :'+item.pos.lat+' lon  '+item.pos.lon+ 'cap '+item.heading + 'speed' +item.speed+ 'type '+item.type)

  var couleur;
  if (typeb=='normal') {couleur='grey'} 
  else if (typeb=='top') {couleur = '#ffd700'}
  else if (typeb=='friend')   {couleur = '#32cd32'}
  else if (typeb=='sponsor')   {couleur = '#4169e1'}
  else if (typeb=='real')   {couleur = '#87ceeb'}
  else {couleur = 'white'}


  addBoatMarkerZoomable(map, displayname, lat, lon, {
        color: couleur,
        heading: heading,
        speed: speed,
        twa: twa,
        twd: twd,
        tws: tws,
        sail:sail,
        baseSize: 25,
        zoomRef: 13
      });



});

}




function updatePosition(map,race)
{  // met a jour la position du bateau pour la race passee en argument 
  //  met egalement a jour les projections de ligne de vent 

  var curlat      = race.curr.pos.lat
  var curlon      = race.curr.pos.lon
  var curheading  = race.curr.heading
  var curspeed    = race.curr.speed
  var curtwd      = race.curr.twd
  var name        = race.curr.displayName

  name    = race.curr.displayName 
  heading = race.curr.heading
  twa     = race.curr.twa
  tws     = race.curr.tws 
  twd     = race.curr.twd 
  sail    = race.curr.sail
  speed   = race.curr.speed
  stamina = race.curr.stamina


  console.log ('name    '+name) 
  console.log ('cap     '+heading) 
  console.log ('twa     '+twa) 
  console.log ('tws     '+tws) 
  console.log ('twd     '+twd) 
  console.log ('sail    '+sail) 
  console.log ('speed   '+speed) 
  console.log ('stamina '+stamina) 



const boat=addBoatMarkerZoomable(map, name, curlat, curlon, {
        color: "blue",
        heading: heading,
        speed: speed,
        twa: twa,
        twd: twd,
        tws: tws,
        baseSize: 25,
        zoomRef: 13
      });




// Ligne de projection violette avec points 
  plotFuturePositions(map, curlat, curlon, curheading, curspeed);
// fleche vent et perpendiculaires 

  drawArrow(map, curlat, curlon, curtwd       , 15, 'blue');
  drawArrow(map, curlat, curlon, curtwd + 90  , 25, 'purple');
  drawArrow(map, curlat, curlon, curtwd - 90  , 25, 'purple');
// Deux flèches perpendiculaires au cap 
  drawArrow(map, curlat, curlon, curheading + 90,40, 'green');
  drawArrow(map, curlat, curlon, curheading - 90,40, 'red');

// drawWind(map, curlat,curlon, curtwd, "blue"); // vent twd

race.lboat = boat


}









function initializeVrouteur(race) {
   const divVrouteur = document.getElementById("tab-content9");  //Vrouteur
   var polylineCurve           = new Array ();
   divVrouteur.classList.add('Vrouteur');

   var leginfos=race.legdata
   
   console.log('********************************')
   console.log ('chargement leaflet')
   console.log('********************************')  
    // Nettoyage éventuel
    if (divVrouteur._leaflet_id) {
      divVrouteur._leaflet_id = null;
      divVrouteur.innerHTML = '';
    }

   // Coordonneees du bateau pour centrage de la carte sur le bateau  
   var lat = race.curr.pos.lat         //race.legdata.start.lat
   var lon = race.curr.pos.lon         //race.legdata.start.lon

   
var map = L.map('tab-content9', {
    center: [lat, lon],  // Bateau
    zoom: 13,
    minZoom: 1,
    maxZoom: 22    // 22 permet d’aller plus loin
});

// Ajout d’un fond OSM avec une limite fixée
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    minZoom: 1,
    maxZoom: 19    // OSM n’a que jusqu’à 19
}).addTo(map);




  
    //  // Création de la carte
    // map = L.map('tab-content9').setView([lat,lon], 12); // Paris

   
    // L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    //   attribution: '© OpenStreetMap contributors'
    // }).addTo(map);

 var myRenderer = L.canvas({ padding: 0.5 });


// Chargement de la carte locale
   chargement (lat,lon)
  
 // Marqueurs depart et arrivee
  var depart = [race.legdata.start.lat, race.legdata.start.lon];
  var arrivee = [race.legdata.end.lat, race.legdata.end.lon]
  L.marker(depart,    {icon: icons.green}).bindTooltip('Depart').addTo(map)
  L.marker(arrivee,   {icon: icons.red  }).bindTooltip('Arrivee').addTo(map)
 
 
 // Representation trajectoire theorique de la course
  var cpath = [];   // C est le chemin de la course mais sous forme de droites a passer sous forme de courbe
            for (var i = 0; i < race.legdata.course.length; i++) {
                cpath.push([race.legdata.course[i].lat, race.legdata.course[i].lon]);
            }         
//   avec les arrondis courbes de bezier 
    troncons=couperPolyligneLongitude(cpath)
    troncons.forEach(troncon => {
      var bezierPath = createBezierPath(troncon);
    try     {   L.curve(bezierPath, { color: 'blue', weight: 2 }).addTo(map);}
    catch   {   console.log('Le trace a echoué')}
    });



// lignes de checkpoints pour la course
 var   nombreLignes=leginfos['checkpoints'].length
tabLignesCheckPoints.length=nombreLignes
for ( var i=0 ; i<nombreLignes ; i++ )
    { var starti=[ leginfos['checkpoints'][i]['start']['lat'],  leginfos['checkpoints'][i]['start']['lon'],  leginfos['checkpoints'][i]['name']   ]
            var   endi=[ leginfos['checkpoints'][i]['end']['lat'],  leginfos['checkpoints'][i]['end']['lon'] ,leginfos['checkpoints'][i]['name']   ]
            var   displayi=    leginfos['checkpoints'][i]['display']  
            tabLignesCheckPoints[i]=[starti,endi,displayi]
    }
// Trace
for (var i=0;i< tabLignesCheckPoints.length;i++) 
        {y0=tabLignesCheckPoints[i][0][0]
        x0=tabLignesCheckPoints[i][0][1]
        y1=tabLignesCheckPoints[i][1][0]
        x1=tabLignesCheckPoints[i][1][1]
        tracearc(y0,x0,y1,x1,map)
        // on va mettre un marqueur a chaque point de depart  
        L.marker([y0,x0 ],    {icon: icons.black }).bindTooltip(tabLignesCheckPoints[i][0][2]).addTo(map)       }




 // on recupere les zones d exclusions  si elles existent 
   
    try{    
        nbzones=leginfos['restrictedZones'].length
        zonesExclusions.length = (nbzones)
        for ( var i=0 ; i<nbzones ; i++ )
        {   vertices=leginfos['restrictedZones'][i]['vertices']
            nbPoints=vertices.length
            pointsvertice=new Array(nbPoints+1)
            for ( var j=0 ; j<nbPoints ; j++ )
                { pointsvertice[j]=[vertices[j]['lat'],vertices[j]['lon']]}    
                pointsvertice[nbPoints]=[vertices[0]['lat'],vertices[0]['lon']]  // on referme le polygone
                zonesExclusions[i]= pointsvertice
        }
      // Trace 
       L.polyline(zonesExclusions).setStyle({ color: 'red', weight:1, opacity:1, }).addTo(map); 
      }
      catch {console.log ('Pas de zone d exclusions')}


// on recupere la zone de glace si elle existe 
    try{
        tabicelimits=leginfos['ice_limits']['south']
        const polyicelimit = tabicelimits.map(({ lat, lon }) => [lat, lon]);
        console.log ('Limite des glaces')
        console.log(polyicelimit);
        Lpolyicelimit=L.polyline(polyicelimit).setStyle({ color: 'red', weight:2, opacity:1, }).addTo(map)
    }
    catch {console.log ('Pas de zone de glaces')}


// On trace la position du bateau     
updatePosition(map,race)
updatefleetJP(map,fleetboatinfos); // ⚡ ça vide la queue et installe la référence globale
updateMapWaypointsJP(map,race);




map.on('contextmenu', function(e) {
  const lat = e.latlng.lat;
  const lng = e.latlng.lng;

  const content = document.createElement('div');
  content.style.fontSize = "10px";   // 👈 police réduite
  content.innerHTML =
    "<b>Latitude : " + pos_dec_mn(lat) + " (" + lat.toFixed(4) + ")" +
    "<br>Longitude : " + pos_dec_mn(lng) + " (" + lng.toFixed(4) + ")<br><br>";

  // bouton 1
  const btn1 = document.createElement('button');
  btn1.type = 'button';
  btn1.textContent = 'Chargement carte locale';
  btn1.className = 'popup-btn';
  btn1.addEventListener('click', function() {
    chargement(lat, lng);
  });

  // bouton 2
  const btn2 = document.createElement('button');
  btn2.type = 'button';
  btn2.textContent = 'Grille pour WPT';
  btn2.className = 'popup-btn';
  btn2.addEventListener('click', function() {
    grille(map, lat, lng);
  });

  // ajouter les boutons au contenu
  content.appendChild(btn1);
  content.appendChild(document.createElement('br')); // saut de ligne
  content.appendChild(btn2);

  popup.setLatLng(e.latlng)
       .setContent(content)
       .openOn(map);
});






function pinSymbolLeaflet(color) {
    return L.divIcon({
        className: "custom-pin",
        html: `<div style="width:8px;height:8px;background:${color};
                        border-radius:50%;border:1px solid black;"></div>`,
        iconSize: [8, 8],
        iconAnchor: [4, 4]
    });
}



var pointIcon = L.divIcon({
    className: "custom-point",
    html: '<div style="width:4px; height:4px; background: black; border-radius:50%;"></div>',
    iconSize: [4, 4]
});



function grille(map,lat,lng){
  //delta=0.001

        var minLat = Math.abs(lat < 10  ? 6 : 5);
				// var minLng = Math.abs(event.latLng.lng() ) < 10 ? 6 : ( ( Math.abs(event.latLng.lng() ) > 100 ) ? 4 : 5 );
				var minLng = 5;
				var lat0 =     Number(lat.toFixed(minLat));
				var lng0 =     Number(lng.toFixed(minLng));
				var pasLat =   Number(Math.pow(10, -1 * minLat).toFixed(minLat));
				var pasLng =   Number(Math.pow(10, -1 * minLng).toFixed(minLng));	
				// var deltaLat = Number(lat - Number(myLat));
				// var deltaLng = Number(lng - Number(myLng));


// double boucle pour remplir le layer
for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 10; j++) {
        let lat = lat0 + (i - 5) * pasLat;
        let lng = lng0 + (j - 5) * pasLng;
     //  L.circle([lat, lng], {radius: 0.1, color: "black", }) .addTo(grilleLayer);
       L.marker([lat,lng], {icon: pointIcon}).addTo(grilleLayer);
        };     
    }

 
// ajouter la grille à la carte
grilleLayer.addTo(map);

}





function chargement (lat,lon)
{
  
  //angle superieur gauche 
    
  let lat0 = Math.floor(lat / 10) * 10 + 10;
  let lon0 = Math.floor(lon / 10) * 10;
  console.log ('latitude'+lat0 + 'longitude '+lon0)
  let filename = `maps2/carteoffset_${lat0}_${lon0}.npy`;

 NumpyLoader.ajax(filename, function(result) {
      // console.log("shape =", result.shape);
      // console.log("data =", result.data);
      console.log( 'carte chargee'+`maps2/carteoffset_${lat0}_${lon0}.npy`)

  var N = result.shape[0];
      for (let i = 0; i < N; i++) {
        let lat1 = lat0 - result.data[i*4 + 0]/730;
        let lon1 = lon0 + result.data[i*4 + 1]/730;
        let lat2 = lat0 - result.data[i*4 + 2]/730;
        let lon2 = lon0 + result.data[i*4 + 3]/730;

        L.polyline([[lat1, lon1], [lat2, lon2]], {color: 'blue', weight:.5, opacity:1, renderer: myRenderer, }).addTo(map);
      }


 });


}
              



race.lmap  = map;      // on ajoute a race la variable lmap pour pouvoir la recuperer 


setTimeout(() => {  map.invalidateSize();  }, 100);  // Pour eviter probleme affichage voir si necessaire 
window._vrouteurMap = map;
return map

  }












//*********************************************************************************************** */

function addBoatMarkerZoomable(map, name, lat, lon, options = {}) {
  const {
          color = "blue",
          heading = 0,
          baseSize = 25,
          zoomRef = 13,
          speed = null,
          twa = null,
          twd = null,
          tws = null,
          sail =null
        } = options;


  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="-50 -100 100 190" class="boat-marker" pointer-events="none">
    <path d="M 0,-100 C 30,-70 40,-30 40,-10 L 40,70 Q 20,85 0,90 Q -20,85 -40,70 L -40,-10 C -40,-30 -30,-70 0,-100 Z"
          fill="currentColor" stroke="black" stroke-width="4"/>
  </svg>`;

  

  const marker = L.marker([lat, lon], {
    icon: L.divIcon({
      className: '',
      html: `<div style="
        color: ${color};
        transform: rotate(${heading}deg);
        width: ${baseSize / 2}px;
        height: ${baseSize}px;
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: none;
      ">${svg}</div>`,
      iconSize: [baseSize / 2, baseSize],
      iconAnchor: [baseSize / 4, baseSize / 2]
    })
  }).addTo(map);


  // Popup enrichi avec toutes les infos
  marker.bindPopup(`
    <div class="tooltip-bateau">
    <b>${name}</b><br>
    Lat: ${lat.toFixed(5)}<br>
    Lon: ${lon.toFixed(5)}<br>
    HDG: ${heading}<br>
    TWA: ${twa ?? "-"}<br>
    SPD: ${speed ?? "-"} nds<br>
    TWD: ${twd ?? "-"}<br>
    TWS: ${tws ?? "-"}<br>
    </div>
  `);

marker.bindTooltip(`
  <div class="tooltip-bateau">
    <b>${name}</b><br>
    HDG: ${heading.toFixed(2)} ||   TWA: ${twa.toFixed(2) ?? "-"} || SPD: ${speed.toFixed(2)?? "-"} nds<br>
    TWD: ${twd  ?? "-"}|| TWS: ${tws.toFixed(5) ?? "-"} || sail:${sail ?? "-"}<br>
    </div>
  `);


  return marker;
}

 


//*********************************************************************************************** */

// fonctions jp

function drawFleet(map, fleetboatinfos) {
  console.log("\n→ drawFleet\n");

  fleetboatinfos = JSON.parse(fleetboatinfos);
  var fleet = fleetboatinfos["res"];

  fleet.forEach(item => {
    var displayname = item.displayName;
    var lat = item.pos.lat;
    var lon = item.pos.lon;
    let heading = item.heading;
    let speed = item.speed;
    let twa = item.twa;
    let tws = item.tws;
    let twd = item.twd;
    let sail = item.sail;
    let typeb = item.type;



    console.log(
      `${displayname} lat:${lat} lon:${lon} cap:${heading} speed:${speed} type:${typeb}`
    );

    var couleur;
    if (typeb == "normal") couleur = "grey";
    else if (typeb == "top") couleur = "#ffd700";
    else if (typeb == "friend") couleur = "#32cd32";
    else if (typeb == "sponsor") couleur = "#4169e1";
    else if (typeb == "real") couleur = "#87ceeb";
    else couleur = "white";

    if (typeb == "pilotBoat") {displayname='Fregate';twa=0;tws=0;twd=0;sail=0;}


      addBoatMarkerZoomable(map, displayname, lat, lon, {
        color: couleur,
        heading: heading,
        speed: speed,
        twa: twa,
        twd: twd,
        tws: tws,
        sail: sail,
        baseSize: 25,
        zoomRef: 13,
      });
    
  });
}



// --- fonction publique à appeler ---
function updatefleetJP(map, fleetboatinfos) {
  // si on n'a pas encore de map → on met en attente
  if (!map && !globalMap) {
    console.log("⏳ map pas encore dispo, on met en attente");
    fleetQueue.push(fleetboatinfos);
    return;
  }
  // si la map vient d'arriver → on garde une référence globale
  if (map) {
    globalMap = map;
  }

  // si on a des choses en attente → on les dessine
  if (fleetQueue.length > 0 && globalMap) {
    console.log("✅ map prête, on vide la file d’attente");
    fleetQueue.forEach(fleet => drawFleet(globalMap, fleet));
    fleetQueue = [];
  }

  // si on a des infos directes à traiter
  if (fleetboatinfos && globalMap) {
    drawFleet(globalMap, fleetboatinfos);
  }
}












  function updateMapWaypointsJP(map,race){

console.log ('On est dans  updateMapWaypointsJP pour race '+ race)


 if (!map && !globalMap) {
    console.log("⏳ map pas encore dispo, on met en attente");
    raceQueue.push(race);
    return;
  }
  // si la map vient d'arriver → on garde une référence globale
  if (map) {
    globalMap = map;
  }


 if (raceQueue.length > 0 && globalMap) {
    console.log("✅ map prête, on vide la file d’attente");
     raceQueue.forEach(race => drawWaypoints(globalMap, race));
    fleetQueue = [];
   
  }


// si on a des infos directes à traiter
  if (race && globalMap) {

      console.log("✅ map prête, on peut tracer directement");
 drawWaypoints(globalMap,race)

    // 
  }
  }







function drawWaypoints(globalMap,race){
  
 var tpath = [];
 tpath.push([race.curr.pos.lat, race.curr.pos.lon,0]); // boat


         if (race.waypoints) 
        {
            var action = race.waypoints
            console.log ('action' + JSON.stringify(action))

            if (action.pos)
                {

                    for (var i = 0; i < action.pos.length; i++)
                    {
                            tpath.push([action.pos[i].lat, action.pos[i].lon, action.pos[i].idx]);

                    }

                        console.log ('tpath avant tracage '+tpath)

                  }


            // On peut tracer la polyline et les points 

            //Créer un tableau de coordonnées lat/lon pour la polyline
            let latlngs = tpath.map(tpath => [tpath[0], tpath[1]]);   


            L.polyline(latlngs, {color: "red",weight: .5,opacity: 1}).addTo(globalMap);


// Ajouter les cercles avec tooltip
            tpath.forEach(tpath => {
              L.circleMarker([tpath[0], tpath[1]], {
                radius: 2,
                color: "black",
                fillColor: "black",
                fillOpacity: 1
              })
              .bindTooltip("point " + tpath[2], { permanent: false }) // permanent:true si tu veux toujours visible
              .addTo(globalMap);

              }

)}};

   

function updateBoatMarker(marker, lat, lon, heading, color = null) {
  // Mettre à jour la position
  marker.setLatLng([lat, lon]);

  const el = marker.getElement();
  if (!el) return;

  // Récupère le conteneur div qui contient le SVG
  const container = el.querySelector('div');
  if (container) {
    container.style.transform = `rotate(${heading}deg)`;

    if (color !== null) {
      container.style.color = color;
    }
  }
}





function removeBoatMarker(marker, map) {
  if (!marker) return;
  map.off('zoom'); // supprime le listener (au cas où)
  map.removeLayer(marker);
}





function resizeBoatMarker(marker, zoom) {
  const scale = Math.pow(2, zoom - marker._zoomRef);
  const size = marker._baseSize * scale;
  const width = size / 2;

  const svg = marker._boatElement.querySelector('svg');
  svg.setAttribute('width', `${width}`);
  svg.setAttribute('height', `${size}`);

  const iconEl = marker._boatElement;
  iconEl.style.width = `${width}px`;
  iconEl.style.height = `${size}px`;

  marker.setIcon(
    L.divIcon({
      className: '',
      html: iconEl.outerHTML,
      iconSize: [width, size],
      iconAnchor: [width / 2, size / 2]
    })
  );
}





























function addBoatMarker(map, lat, lon, options = {}) {
  const {
    color = 'red',
    heading = 0,
    size = 25 // ↘ taille réduite : hauteur = 25px, largeur = 12.5px
  } = options;

  const width = size / 2;

  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="-50 -100 100 190" width="${width}" height="${size}" preserveAspectRatio="xMidYMid meet">
    <path d="
      M 0,-100
      C 30,-70 40,-30 40,-10
      L 40,70
      Q 20,85 0,90
      Q -20,85 -40,70
      L -40,-10
      C -40,-30 -30,-70 0,-100
      Z"
      fill="currentColor" stroke="black" stroke-width="4"/>
  </svg>`;

  const icon = L.divIcon({
    className: '',
    html: `<div class="boat-marker" style="
              color: ${color};
              transform: rotate(${heading}deg);
              width: ${width}px;
              height: ${size}px;
              display: flex;
              align-items: center;
              justify-content: center;
          ">${svg}</div>`,
    iconSize: [width, size],
    iconAnchor: [width / 2, size / 2]
  });

  const marker = L.marker([lat, lon], { icon }).addTo(map);

  // On stocke une référence à l’élément HTML pour modifier ensuite rotation/couleur
  marker._boatElement = marker.getElement().querySelector('.boat-marker');

  return marker;
}







function updateBoatMarker(marker, lat, lon, heading, color) {
  if (!marker) return;

  marker.setLatLng([lat, lon]);

  if (marker._boatElement) {
    marker._boatElement.style.transform = `rotate(${heading}deg)`;
    if (color) {
      marker._boatElement.style.color = color;
    }
  }
}


// function addBoatMarker(map, lat, lon, options = {}) {
//   const {
//     color = 'red',      // Couleur du bateau
//     heading = 0,        // Cap en degrés (0 = nord)
//     size = 50           // Taille du bateau (hauteur en pixels)
//   } = options;

//   const width = size / 2;

//   const svg = `
//   <svg xmlns="http://www.w3.org/2000/svg" viewBox="-50 -100 100 190" width="${width}" height="${size}" preserveAspectRatio="xMidYMid meet">
//     <path d="
//       M 0,-100
//       C 30,-70 40,-30 40,-10
//       L 40,70
//       Q 20,85 0,90
//       Q -20,85 -40,70
//       L -40,-10
//       C -40,-30 -30,-70 0,-100
//       Z"
//       fill="currentColor" stroke="black" stroke-width="4"/>
//   </svg>`;

//   const icon = L.divIcon({
//     className: '',
//     html: `<div style="
//               color: ${color};
//               transform: rotate(${heading}deg);
//               width: ${width}px;
//               height: ${size}px;
//               display: flex;
//               align-items: center;
//               justify-content: center;
//           ">${svg}</div>`,
//     iconSize: [width, size],
//     iconAnchor: [width / 2, size / 2]
//   });

//   return L.marker([lat, lon], { icon }).addTo(map);
// }





// function addBoatMarker(map, lat, lon, heading = 0, color = 'mediumpurple') {


//     console.log("Ajout du marqueur bateau");
//   // SVG du bateau
//   const boatSvg = (color) => `
//     <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 200" width="40" height="80">
//       <path d="M10,180 Q50,0 90,180 Q50,200 10,180 Z" fill="${color}" stroke="black" stroke-width="4"/>
//     </svg>`;

//   // Création du divIcon avec rotation et couleur
//   const icon = L.divIcon({
//     className: '',
//     html: `<div class="boat-icon" style="
//       transform: rotate(${heading}deg);
//       width: 40px;
//       height: 80px;
//     ">${boatSvg(color)}</div>`,
//     iconSize: [40, 80],
//     iconAnchor: [20, 40] // milieu bas
//   });

//   // Création du marqueur
//   const marker = L.marker([lat, lon], { icon }).addTo(map);

//   // Méthode pour mettre à jour cap et couleur
//   marker.updateBoat = function (newHeading, newColor) {
//     const el = marker.getElement();
//     if (el) {
//       el.innerHTML = boatSvg(newColor || color);
//       el.style.transform = `rotate(${newHeading}deg)`;
//     }
//   };

//   return marker;
// }











// function updateBoat(marker, heading, color) {
//   const element = marker.getElement();
//   if (element) {
//     element.innerHTML = boatSvg(color);
//     element.style.transform = `rotate(${heading}deg)`;
//   }
// }






  function buildMarker( pos, layer, icond,title, zi, op,heading)
{ 
    var ret = [];
    for(var i=0;i<pos.length;i++)
    {
    /*    if(pos.lng > -270 && pos.lng < 270)*/
        {
            if(!heading) heading=0;
            if(heading == 180) heading = 179.9; //or boat icon are drawn at 0° when 180° :s
            var marker1 = L.marker(pos[i],{icon:icond,rotationAngle: heading/2});
            if(op) marker1.opacity = op;
            if(zi)  marker1.zIndexOffset = zi;
            if(title)
            {
        
                marker1.bindPopup(title);    
                marker1.on('mouseover', function(e){
                    e.target.bindPopup(title).openPopup();
                
                    });        
                marker1.on('mouseout', function(e){  
                    e.target.closePopup();
                
                });
            }
            marker1.addTo(layer);
            ret.push(marker1);
        }
        
    }                   
    return ret;
}