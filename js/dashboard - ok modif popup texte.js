// v7.8

import * as Util from './util.js';
import * as NMEA from './nmea.js';
import * as Perso from './perso.js';

( function () {

	//**********************
	//* Variables communes *
	//**********************

    var tabId = parseInt(window.location.search.substring(1));

    // Events:
    var ignoredMessages = [
        "Ad_getInterstitial",
        "Ad_GetPOIs",
        "Game_SaveLastRank",
        "Game_GetWeather",
        "Game_GetSettings",
        "Meta_GetMapInfo",
        "Meta_GetCountries",
        "Shop_GetPacks",
        "Shop_GetSubscriptions",
        "Social_GetCommunityMessages",
        "Social_getVRmsg",
        "Social_GetPlayers",
        "Social_GetNbUnread",
        "User_GetInfos"];
    var handledMessages = [
        ".AccountDetailsResponse",
        "getboatinfos",
        "getfleet",
        "Game_GetGhostTrack",
        "Game_AddBoatAction",
        "Leg_GetList",
        "Meta_GetPolar",
        "User_GetCard",
        "Leg_GetHistory",
        "Team_GetList",     // Message à vérifier...
        "Team_Get"];

    var xhrMap = new Map();
    var currentCycle = 0;

    // ToDo: clear stats if user/boat changes
    var currentUserId, currentTeam;
    var requests = new Map();
	
	// ajout Manel pour alerte TEAM
	var alerteTEAM;
	var alerteTeamBlack = [ // Exclusions de l'affichage de la course en rouge si hors VMG
		"Martinalaplage BSP" 
	];
	
	// Ajout Manel pour Cycles météo - Merci Phil
    var currentCycle_live = 0, currentCycle_fine = 0;
	var cycle_live, cycle_fine;

	// ajout Manel pour alertes mauvaise voile
	var lastSailAlert = 0;
	var delaiSailAlert = 3600000; // 60 minutes

    // Polars and other game parameters, indexed by polar._id
    var polars = [];
    var races = new Map();
    var raceFleetMap = new Map();
    var comPort;
	var infoWindow = new google.maps.InfoWindow();
    var showMarkers = new Map();
    var sortField = "none";
    var currentSortField = "none";
    var currentSortOrder = 0;
    const sailNames = [0, "Jib", "Spi", "Stay", "LJ", "C0", "HG", "LG", 8, 9,
		 // VR sends sailNo + 10 to indicate autoSail. We use sailNo mod 10 to find the sail name sans Auto indication.
		 "Auto", "Jib &#x24B6;", "Spi &#x24B6;", "Stay &#x24B6;", "LJ &#x24B6;", "C0 &#x24B6;", "HG &#x24B6;", "LG &#x24B6;"
		 ];
    const category = ["real", "certified", "top", "sponsor", "normal", "pilotBoat", "team"];
    const category2 = ["followed", "team", "certified", "normal", "real"];
    const categoryStyle = [
        /* real */ {bcolor: '#87ceeb', bbcolor: '#000000'},
		/* certified */ {bcolor: '#1E90FF', bbcolor: '#000000'}, 
        /* top*/ {bcolor: '#ffd700', bbcolor: '#000000'}, 
        /* sponsor */ {bcolor: '#4169e1', bbcolor: '#000000'}, 
        /* normal */ {bcolor: '#a9a9a9', bbcolor: '#000000'}, 
        /* pilot */ {bcolor: '#000000'}
		];
	
    // Add Guy - import routage zezo
    // var reqdatas = [];
    // var tabzezo = [];

    var notifications = [];     // Notifications Michel
    var markersRT = [];
    var zzpaths = [];
    var RacesHistory = [];
    var FrozenList = [];
    var VSRRank = [];
    VSRRank.uinfo = [];
    VSRRank.table = [];
    var SeasonRank = [];
    SeasonRank.uinfo = [];
    SeasonRank.table = [];
    var RaceRank = [];
    RaceRank.uinfo = [];
    RaceRank.table = [];
    var HOFRank = [];
    HOFRank.uinfo = [];
    HOFRank.table = [];
    var HOFRace = []
    HOFRace.uinfo = [];
    HOFRace.table = [];    
    var TeamList = [];
    TeamList.uinfo = [];
    TeamList.table = [];
    var TeamMembers = [];
    TeamMembers.uinfo = [];
    TeamMembers.table = [];
    var Record = false;
    var leaderTime;
    var leaderDist;
    var origin;
    var stringToCopy = "";
    var nbdigits = 0;
	
    //***************************************
    //*	Ajout Michel - Teamname in csv file *
    //***************************************
    // var teamCSV = [];
    var teamnameCSV = [];
    var file = readTextFile("./data/teams.csv").split('\n');
    for ( var i = 1; i < file.length-1; i++) {
        var dataTeam = file[i].split(";");
        teamnameCSV[dataTeam[0]] = dataTeam[3]; // nom complet
        // teamCSV[dataTeam[0]] = dataTeam[2]; // abréviation
    }
	
    //***************************************
    //*	Ajout Manel - liste blanche VRZ     *
    //***************************************	
    var whiteVRZen = []
    var file = readTextFile("./data/SkippersBSP.csv").split('\n');
    for ( var i = 1; i < file.length-1; i++) {
        var dataSkipper = file[i].split(";");
		whiteVRZen[dataSkipper[0]] = dataSkipper[2]; 
    }
	
    //*******************************
    //* Onglet : NOTIFICATIONS Push *
    //*******************************
	
    Notification.requestPermission(function (status) {
        if (Notification.permission !== status) {
            Notification.permission = status;
        }
        console.log(status);
    });

    function GoNotif(TitreNotif, TextNotif, TextNotifMail, icon, i) {
        var options = {
            "lang": "FR",
            "icon": "./img/" + icon + ".png",
            "image": "./img/bandeau.jpg",
            "body": TextNotif
        };
		// send mail with ex PHP file on Manel's server (need to be created now on BSP vrzen server) !!!
        if ( ( adresse != "indique_ton_email_ici" ) && ( notifications[i].repet == 1) ) {
			var contientDieze = TitreNotif.indexOf('#');
			if (contientDieze !== -1) {
				var objetMail = TitreNotif.substr(0,contientDieze);
			} else {
				var objetMail = TitreNotif;
			}
			objetMail += " : " + TextNotifMail;
			var SNSM_url ="http://blacksailingpolars.vrzen.org/alerte_boat_bsp.php?authkey="+currentUserId+"&adresse="+adresse+"&course="+objetMail;
			// Les 3 lignes suivantes en commentaire car le PHP alerte_boat_bsp.php n'existe pas !!!
			// console.log(SNSM_url);
			// window.open(SNSM_url,"envoi alerte", "_blank");
			// console.log("Alerte mail : " + adresse + " | notification: " + TextNotif + " | envoyée ");
        }
        // End send mail
        var notif = new Notification(TitreNotif, options);
        notif.onclick = function(x) {
            notifications[i].repet = 4;
            window.focus();
            this.close();
        };
    } 
	// Fin Notifications
	
    // Traitement JSON archives des bateaux
	
	function getCoeffStamina(race, boatLabel) {
		var boatInfos = boatsInf[boatLabel];
		if (boatInfos != undefined) {
            race.coeff_sta = boatInfos.coeff_sta;
		} else {
            console.warn(boatLabel, "est absent de boats.json")
			race.coeff_sta = 1;
		}
		console.log(boatLabel, race.coeff_sta);
    }
	
    // Fin traitement JSON

    
    //******************
    //* INITIALISATION *
    //******************
	
    function isShowMarkers (userId) {
        if (showMarkers.get(userId) == undefined) {
            showMarkers.set(userId, true);
        }
        return showMarkers.get(userId);
    }

    function addSelOption (race, beta, disabled) {
        var option = document.createElement("option");
        option.text = race.name + (beta ? " beta" : "") + " (" + race.id.substr(0, 3) + ")";
        option.value = race.id;
        option.betaflag = beta;
        option.disabled = disabled;
        selRace.appendChild(option);
        // Ajout Michel - Notifications -------------------
        var optionNotif = document.createElement("option");
        optionNotif.text = race.name;
        lbRaceNotif.appendChild(optionNotif);
        // Fin ajout Michel -------------------------------
    }

    function initRace (race, disabled) {
        race.tableLines = [];
        race.kmzLayer = [];
        races.set(race.id, race);
        var fleetData = new Map();
        fleetData.table = new Array();
        fleetData.uinfo = new Object();
        raceFleetMap.set(race.id, fleetData);
        addSelOption(race, false, disabled);
        if (race.has_beta) {
            addSelOption(race, true, disabled);
        }
    }

    function initRaces () {
        var xhr = new XMLHttpRequest();
        xhr.onload = function () {
            var json = xhr.responseText;
            json = JSON.parse(json);
            for (var i = 0; i < json.races.length; i++) {
                console.log("Race: " + JSON.stringify(json.races[i]));
                json.races[i].source = "zezo";
                initRace(json.races[i], true);
            }
        }
        xhr.open("GET", "http://zezo.org/races2.json");
        //xhr.open("GET", "./data/races2.json");
        xhr.send();

        nbdigits=(cb2digits.checked?1:0);
		divRaceStatus = document.getElementById("raceStatus");
		// divRaceStatus.innerHTML = makeRaceStatusHTML();
		divFriendList = document.getElementById("friendList");
		divFriendList.innerHTML = "No boats positions received yet";
		divWaypointsList = document.getElementById("waypoints");
		makeRaceStatusHTML();
		
    }

    var selRace, selNmeaport, selFriends, selWaitDelay;
    var cbFriends, cbOpponents, cbCertified, cbTeam, cbTop, cbReals, cbSponsors, cbSelect, cbInRace, cbRouter, cbZenRouter, cbDark, cbReuseTab, cbMarkers, cbLocalTime, cbRawLog, cbNMEAOutput;
    var lbBoatname, lbRace, lbCycle, lbCurTime, lbCurPos, lbHeading, lbTWS, lbTWD, lbTWA, lbDeltaD, lbDeltaT, lbSpeedC, lbSpeedR, lbSpeedT, selGefs;
    var divPositionInfo, divRaceStatus, divRecordLog, divFriendList, divWaypointsList, divRawLog, divVRRanking /*, divClsmntList*/;
    var lbRaceNotif, divNotif, lbType1Notif, lbType2Notif, lbValNotif, lbMinNotif, TitreNotif, TextNotif, TextNotifMail, selBlocKmz;
    var cb2digits, cbBSPDown, cbvrouteur, lbLegname, makeRanking, lbRankingVSR, lbRankingSeason, lbRankingHOF, lbRankingHOFRace, lbTeamMembers, lbBoattype, lbTeamname;
    var importRoute, cbDelete, btstop;
    var myLat, myLng;
    var initialized = false;

	//**************************
	//* Onglet : RACE LOG (me) *
	//**************************
	
    function tableHeader() {
        return '<tr>'
            + '<th>' + "Time" + dateUTC() + '</th>'
            + commonHeaders()
            + '<th title="Auto Sail time remaining">' + "aSail" + '</th>'
            + '<th title="Reported speed">' + "Speed" + '</th>'
            + '<th title="Calculated speed (Δd/Δt)">' + "vC (kn)" + '</th>'
            + '<th title="Polar-derived speed">' + "vT (sail) boost%" + '</th>'
            + '<th title="Foiling factor">' + "Foils" + '</th>'
            + '<th title="Calculated distance">' + "Δd (nm)" + '</th>'
            + '<th title="Time between positions">' + "Δt" + '</th>'
            + '<th>' + "Position" + '</th>'
            + '<th title="Sail change penalty incl. stamina factor">' + "Sail" + '</th>'
            + '<th title="Gybing penalty incl. stamina factor">' + "Gybe" + '</th>'
            + '<th title="Tacking penalty incl. stamina factor">' + "Tack" + '</th>'
            + '</tr>';
    }

    function raceStatusHeader() {
        return '<tr>'
        + '<th title="Call Router">' + "RT" + '</th>'
        + '<th title="Call Polars">' + "PL" + '</th>'
        + '<th title="Call WindInfo">' + "WI" + '</th>'
        + '<th>' + "Race" + '</th>'
        + '<th>' + "Time" + '</th>'
        + commonHeaders()
        + '<th title="Auto Sail time remaining">' + "aSail" + '</th>'
        + '<th title="Boat speed">' + "Speed" + '</th>'
        + '<th title="Boat VMG">' + "VMG" + '</th>'
        + '<th>' + "Best VMG" + '</th>'
        + '<th>' + "Sail" + '</th>'
        + '<th>' + "Gybe" + '</th>'
        + '<th>' + "Tack" + '</th>'
        + '<th title="Etat du bateau">' + "Etat" + '</th>'
        // +  '<th title="Boat is maneuvering, half speed">' + "Mnvr" + '</th>'
        // + '<th>' + "Last Command" + '</th>'
        + '</tr>';
	}

    function friendListHeader () {
        return '<tr>'
            + genth("th_rt", "RT", "Call Router", sortField == "none", undefined)
            + genth("th_lu", "Date" + dateUTC(), undefined)
            + genth("th_name", "Skipper", undefined, sortField == "displayName", currentSortOrder)
            + genth("th_rank", "Rank", undefined, sortField == "rank", currentSortOrder)
			// + genth("th_sta", "Sta", undefined, sortField == "sta", currentSortOrder)
            + genth("th_dtu", "DTU", "Distance to Us", sortField == "distanceToUs", currentSortOrder)
			+ genth("th_brg", "BRG", "Bearing from Us", undefined)
            + genth("th_dtf", "DTF", "Distance to Finish", sortField == "dtf", currentSortOrder)
            + genth("th_twd", "TWD", "True Wind Direction", sortField == "twd", currentSortOrder)
            + genth("th_tws", "TWS", "True Wind Speed", sortField == "tws", currentSortOrder)
            + genth("th_twa", "TWA", "True Wind Angle", sortField == "twa", currentSortOrder)
            + genth("th_hdg", "HDG", "Heading", sortField == "heading", currentSortOrder)
            + genth("th_speed","Speed","Boat Speed", sortField == 'speed', currentSortOrder)
            + genth("th_vmg","VMG","Velocity Made Goog", sortField == 'vmg', currentSortOrder)
            + genth("th_sail", "Sail", "Sail Used", sortField == "sail", currentSortOrder)
            + genth("th_factor", "Factor", "Speed factor over no-options boat", undefined)
            + genth("th_foils", "Foils", "Boat assumed to have Foils. Unknown if no foiling conditions", undefined)
            + recordRaceColumns()
            + genth("th_psn", "Position", undefined)
            // + genth("th_options", "Options", "Options according to Usercard",  sortField == "xoption_options", currentSortOrder)
            + genth("th_state", "State", "Waiting or Staying, Racing, Arrived, Aground or Bad TWA", sortField == "state", currentSortOrder)
            + '</tr>';
    }

    function recordRaceColumns () {
        var race = races.get(selRace.value);
        if (race.type === "record") {
            return  '<th title="Current Race Time">Race Time</th>'
                + genth("th_eRT","ERT", "Estimated Total Race Time", sortField == "eRT", currentSortOrder)
                + genth("th_avgS","avgS", "Average Speed", sortField == "avgSpeed", currentSortOrder);
        } else {
            return "";
        }
    }

    function genth (id, content, title, sortfield, sortmark, hidden) {
        if (sortfield && sortmark != undefined) {
            content = content + " " + (sortmark ? "&#x25b2;" : "&#x25bc;");
        }
        return '<th id="' + id + '"'
            + (sortfield ? ' class="highlightTH"' : "")
            + (title ? (' title="' + title + '"') : "")
            + '>' + content + '</th>';
    }

    function commonHeaders () {
        return '<th>Rank</th>'
            + '<th title="Stamina % et time (min) to 100%">NRJ</th>'
            + '<th title="Distance To Leader">DTL</th>'
			+ '<th title="Distance To Finish">DTF</th>'
            + '<th title="True Wind Direction">TWD</th>'
            + '<th title="True Wind Speed">TWS</th>'
            + '<th title="True Wind Angle">TWA</th>'
            + '<th title="Heading">HDG</th>';
    }

    function printLastCommand (lcActions) {
        var lastCommand = "";

        lcActions.map(function (action) {
            if (action.type == "heading") {
                lastCommand += (action.autoTwa ? " TWA" : " HDG") + " = " + Util.roundTo(action.value, 0) + "° | ";
            } else if (action.type == "sail") {
                lastCommand += " Sail = " + sailNames[action.value];
            } else if (action.type == "prog") {
                action.values.map(function (progCmd) {
                    var progTime = Perso.formatDateUTC(progCmd.ts+.000002);
                    lastCommand += (progCmd.autoTwa ? " TWA" : " HDG") + "=" + Util.roundTo(progCmd.heading, 0) + "° @ " + progTime + " | ";
                });
            } else if (action.type == "wp") {
                action.values.map(function (waypoint) {
                    lastCommand += " WP : " + Util.formatPosition(waypoint.lat, waypoint.lon) + " | ";
                });
            }
        });
        return lastCommand;
    }

    function commonTableLines(r) {
		
		// asail
        var sailInfo = sailNames[r.curr.sail % 10];
		var time_left = r.curr.tsEndOfAutoSail - r.curr.lastCalcDate;
        var isAutoSail = r.curr.hasPermanentAutoSails || (r.curr.tsEndOfAutoSail && time_left > 0)
        var autoSailTime = r.curr.hasPermanentAutoSails?'∞' : Util.formatHMS(time_left);
        var sailNameBG = 'class="asail bglightGreen"';
		if (isAutoSail) {
            sailInfo = sailInfo + " (A " + autoSailTime + ")";
			if (time_left < 7200000) sailNameBG = 'class="asail FinVoilesAuto"';
        } else {
            sailInfo = sailInfo + " (Man)";
			sailNameBG = 'class="asail VoilesManuelles"';
        }
		
		// tooltip TWA / HDG
		var entTwa = Math.floor(r.curr.twa);
		var entHdg = Math.floor(r.curr.heading);
		var amure = ( Math.sign(r.curr.twa) == -1 ) ? "bâbord" : "tribord"; 
		if ( r.curr.twa == entTwa ) {
			var hdgMin = entHdg;
			var hdgMax = hdgMin + 1;
			var twaMin = Math.round((r.curr.twa - ( entHdg - r.curr.heading ))*100)/100;
			var twaMax = twaMin - 1 ;
			var popUpTwaHdg = "Tip pour les ajustements de TWA / HDG :\nOn navigue " + amure + " amures, au TWA fixe = " + Math.abs(r.curr.twa) +"\nLe passage au cap fixe HDG = " + hdgMin + " donnerait un TWA de = " + Math.abs(twaMin) + "\nPour un cap = " + hdgMax + " le TWA deviendrait = " + Math.abs(twaMax);
		} else if ( r.curr.heading == entHdg ) {
			var twaMin = entTwa;
			var twaMax = entTwa + 1;
			var hdgMin = Math.round((r.curr.heading - ( entTwa - r.curr.twa ))*100)/100;
			var hdgMax = hdgMin - 1;			
			var popUpTwaHdg = "Tip pour les ajustements de TWA / HDG :\nOn navigue " + amure + " amures, au cap fixe HDG = " + r.curr.heading +"\nLe passage au TWA fixe = " + twaMin + " donnerait un cap HDG = " + hdgMin + "\nPour un TWA = " + twaMax + " le cap deviendrait = " + hdgMax;
		} else {
			var popUpTwaHdg = "Navigation actuelle aux WPs";
		}
		
		// Tooltip speedWarning
		var speedWarning = "";
        if (r.curr.speed > 0 ) {
			speedWarning = speedwarning(r);	
		}
		if ( speedWarning != "" ) { 
			sailNameBG = 'class="asail bgSpeedWarning"';
		}
        
		/* mauvaise voile */
        if (r.curr.badSail) sailNameBG = 'class="asail bgLightRed"';
		
        // Remember when this message was received ...
        if (! r.curr.receivedTS) {
            r.curr.receivedTS = new Date();
        }
        // ... so we can tell if lastCalcDate was outdated (by more than 15min) already when we received it.
        var lastCalcDelta = r.curr.receivedTS - r.curr.lastCalcDate;
        var lastCalcStyle = (lastCalcDelta > 900000)?  'class="bgRed"':'';

        // No need to infer TWA mode, except that we might want to factor in the last command
        var isTWAMode = r.curr.isRegulated;
        var twaFG = (r.curr.twa < 0) ? "red" : "green";
        var twaBold = isTWAMode ? "font-weight: bold;" : "";
        var hdgFG = isTWAMode ? "black" : "blue";
        var hdgBold = isTWAMode ? "font-weight: normal;" : "font-weight: bold;";
		
		// Stamina et time to 100%
		var stam = r.curr.stamina;
		var rtws = (r.curr.tws >=30) ? 1 : bezier(r.curr.tws / 30);
		var timeTo100 = ( stam == 100 ) ? "" : '&nbsp;'+(( 100 - stam ) * (5 + 10 * rtws )).toFixed(0);

        return '<td class="rank">' + (r.curr.rank ? r.curr.rank : "-") + '</td>' // Manel
			+ '<td class="sta">' + Util.roundTo(stam, nbdigits) + '%' + timeTo100 + '</td>'
            + '<td class="dtl">' + Util.roundTo(r.curr.distanceToEnd - r.bestDTF, 2+nbdigits) + '</td>'
            + '<td class="dtf">' + Util.roundTo(r.curr.distanceToEnd, nbdigits) + '</td>'
            + '<td class="twd">' + Util.roundTo(r.curr.twd, 2+nbdigits) + '</td>'
            + '<td class="tws">' + Util.roundTo(r.curr.tws, 2+nbdigits) + '</td>'
            + '<td class="twa" title="' + popUpTwaHdg + '" style="cursor:zoom-in;  color:' + twaFG + ";" + twaBold + '">' + Util.roundTo(Math.abs(r.curr.twa), 2+nbdigits) + '</td>'
            + '<td class="hdg" title="' + popUpTwaHdg + '" style="cursor:zoom-in; ' + hdgFG + ";" + hdgBold + '">' + Util.roundTo(r.curr.heading, 2+nbdigits) + '</td>'
            + '<td ' + sailNameBG + '>' + sailInfo +  speedWarning + '</td>';
    }

	function speedwarning (r) {
		/* recherche et affichage de possibles recouvrements */
		var speedWarning = "";
		var speedInfo = r.curr.speed.toFixed(3);
		var boatPolars = polars[r.curr.boat.polar_id];
		var tableau = [];
		var nblignes = 0;
		var speedLimit = .9862	; // seuil de déclenchement de la comparaison = 1 / 1.014
		for (var i = 1; i < 8; i++) {
			var speedSaili = Number ( theoreticalSpeed(r.curr.tws, r.curr.twa, r.curr.options, boatPolars, i).sailspeed ) ; 
			if ( ( speedSaili > ( speedLimit * speedInfo ) ) && ( speedSaili < speedInfo ) && ( i != ( r.curr.sail % 10 ) ) ) {
				tableau.push ({
					"sail": sailNames[i], 
					"speed": speedSaili});		
				nblignes += 1;
			}
		}
		if (nblignes > 0) {
			tableau.sort(function compare(a, b) {
				return b.speed - a.speed;
			});
			speedWarning = '<span class="tooltiptext">Vitesse > '+ (speedLimit *100).toFixed(2) + '%<table><tr><th>Sail</th><th>Speed</th><th>%</th></tr>';
			for (var i = 0; i < nblignes; i++) {
				speedWarning += '<tr><td>' + tableau[i].sail + '</td><td>' + tableau[i].speed +'</td><td>' + (( tableau[i].speed / speedInfo ) *100).toFixed(1) + '%</tr>';
			}
			speedWarning += '</table></span>		';
		}
		return speedWarning;
	}		

	function recouvrement (r) {
		/* recherche et affichage des limites (twa et tws) du recouvrement */
		var speedInfo = r.curr.speed.toFixed(4);
		var boatPolars = polars[r.curr.boat.polar_id];
		var voileActuel = r.curr.sail % 10;
		var twaActuel = Math.abs(r.curr.twa);
		var twsActuel = r.curr.tws;
		var voileBoost = r.curr.speedT.sail;
		
		// Recherche des limites de twa
		var twaMini = (Math.trunc(10 * twaActuel) + 1) / 10;
		var voileMini = voileBoost ;
		var estBoost = Number (theoreticalSpeed(twsActuel, twaMini, r.curr.options, boatPolars, voileActuel).boost);
		while (estBoost > 1 && estBoost <= 1.014 && twaMini > 0) {
			twaMini -= 0.1;
			var res = theoreticalSpeed(twsActuel, twaMini, r.curr.options, boatPolars, voileActuel );
			var estBoost = Number ( res.boost );
			var voileMini = res.sail;
			// console.log("twamini", twaMini, estBoost, voileMini);
		}
		twaMini += .1;

		var twaMaxi = Math.trunc(10 * twaActuel) / 10;
		var voileMaxi = voileBoost;
		var estBoost = Number (theoreticalSpeed(twsActuel, twaMaxi, r.curr.options, boatPolars, voileActuel).boost);
		while (estBoost > 1 && estBoost <= 1.014 && twaMaxi < 180) {
			twaMaxi += 0.1;
			var res = theoreticalSpeed(twsActuel, twaMaxi, r.curr.options, boatPolars, voileActuel);
			var estBoost = Number (res.boost);
			var voileMaxi = res.sail;
			// console.log("twamaxi", twaMaxi, estBoost, voileMaxi);
		}
		twaMaxi -= .1;

		if (voileMini == sailNames[voileActuel]) {
				var twaLimite = twaMaxi;
				var voileLimiteTwa = voileMaxi;
				var sensTwa = '<b>&le;</b>&nbsp;';
		} else {
				var twaLimite = twaMini;
				var voileLimiteTwa = voileMini;
				var sensTwa = '<b>&ge;</b>&nbsp;';
		}

		// Recherche des limites de tws
		var twsMini = (Math.trunc(10 * twsActuel) + 1) / 10;
		var estBoost = Number(theoreticalSpeed(twsMini, twaActuel, r.curr.options, boatPolars, voileActuel).boost);
		while (estBoost > 1 && estBoost <= 1.014 && twsMini > 0) {
			var estBoost = Number(theoreticalSpeed(twsActuel, twaMaxi, r.curr.options, boatPolars, voileActuel).boost);
			twsMini -= 0.1;
			var res = theoreticalSpeed(twsMini, twaActuel, r.curr.options, boatPolars, voileActuel);
			var estBoost = Number(res.boost);
			var voileMini = res.sail;
			// console.log("twsmini", twsMini, estBoost, voileMini);
		} 
		twsMini += 0.1;

		var twsMaxi = Math.trunc(10 * twsActuel) / 10;
		var estBoost = Number(theoreticalSpeed(twsMaxi, twaActuel, r.curr.options, boatPolars, voileActuel).boost);
		while (estBoost > 1 && estBoost <= 1.014 && twsMaxi < 70) {
			twsMaxi += 0.1;
			var res = theoreticalSpeed(twsMaxi, twaActuel, r.curr.options, boatPolars, voileActuel);
			var estBoost = Number (res.boost);
			var voileMaxi = res.sail;
			// console.log("twsmaxi", twsMaxi, estBoost, voileMaxi);
		} 
		twsMaxi -= 0.1;

		if (voileMini == sailNames[voileActuel] || twsMini < 0) {
				var twsLimite = twsMaxi;
				var voileLimiteTws = voileMaxi;
				var sensTws = '<b>&le;</b>&nbsp;';
		} else {
				var twsLimite = twsMini;
				var voileLimiteTws = voileMini;
				var sensTws = '<b>&ge;</b>&nbsp;';
		}	

		// création tooltip
		var tooltipBoost = '<span class="tooltiptext">Limites boost<table>'
			+ '<tr><th></th><th>limite</th><th>voile</th></tr>'
			+ '<tr><td>TWA</td><td>' + sensTwa + twaLimite.toFixed(1) + '</td><td>' + voileLimiteTwa + '</td></tr>'
			+ '<tr><td>TWS</td><td>' + sensTws + twsLimite.toFixed(1) + '</td><td>' + voileLimiteTws + '</td></tr>'
			+ '</table></span>';

		return tooltipBoost; 
	}		

    function makeRaceStatusLine (pair) {
        var r = pair[1];
        if (r.curr == undefined) {
            return "";
        } else {
            var agroundBG = r.curr.aground ? ' class="agrd bgLightRed"' : ' class="agrd bglightgreen"';
            var manoeuvering = (r.curr.tsEndOfSailChange > r.curr.lastCalcDate)
                || (r.curr.tsEndOfGybe > r.curr.lastCalcDate)
                || (r.curr.tsEndOfTack > r.curr.lastCalcDate);
            var lastCommand = "-";
            var lastCommandBG = "";
            if (r.lastCommand != undefined) {
                // ToDo: error handling; multiple commands; expiring?
                var lcTime = formatTime(r.lastCommand.request.ts);
                lastCommand = printLastCommand(r.lastCommand.request.actions);
                lastCommand = "T:" + lcTime + " Actions:" + lastCommand;
                if (r.lastCommand.rc != "ok") {
                    lastCommandBG = 'class="bgLightRed"';
                }
            }

            var info = "-";
            if (r.type === "leg") {
                info = '<span>' + r.legName + '</span>';
            } else if (r.type === "record") {
                if (r.record) {
                    info = '<span>Record, Attempt ' + parseInt(r.record.attemptCounter) + '</span>';
                } else {
                    info = '<span>-</span>'
                }
            }
            if (r.record && r.record.lastRankingGateName) {
                info += '<br/><span>@ ' + r.record.lastRankingGateName + '</span>';
            }

            var trstyle = "hov notsel";
            if (r.id === selRace.value) trstyle = "hov sel";
            var best = bestVMG(r.curr.tws, polars[r.curr.boat.polar_id], r.curr.options);
			var bvmgClass = 'class="bvmg"';
			if ( Math.abs(r.curr.twa) < best.twaUp || Math.abs(r.curr.twa) > best.twaDown ) bvmgClass = 'class="bvmg bgLightYellow"';
            var bestVMGString = best.twaUp + "|" + best.twaDown + "<br>" + best.btwa;
            var bestVMGTilte = Util.roundTo(best.vmgUp, 1+nbdigits) + "|" + Util.roundTo(Math.abs(best.vmgDown), 1+nbdigits);

            var penalties = manoeuveringPenalties(r);
            var tack = penalties.tack.dist + "nm&nbsp;|&nbsp;" + penalties.tack.time + "s<br>" + penalties.tack.energy + "%&nbsp;|&nbsp;" + penalties.tack.recovery + "min";
            var gybe = penalties.gybe.dist + "nm&nbsp;|&nbsp;" + penalties.gybe.time + "s<br>" + penalties.gybe.energy + "%&nbsp;|&nbsp;" + penalties.gybe.recovery + "min";
            var sail = penalties.sail.dist + "nm&nbsp;|&nbsp;" + penalties.sail.time + "s<br>" + penalties.sail.energy + "%&nbsp;|&nbsp;" + penalties.sail.recovery + "min";
			
            // ... so we can tell if lastCalcDate was outdated (by more than 15min) already when we received it.
            var lastCalcDelta = r.curr.receivedTS - r.curr.lastCalcDate; 
            var lastCalcStyle = (lastCalcDelta > 900000) ? 'class="bgRed"':'';
			
            // Stamina et time to 100%
            var stam = r.curr.stamina;
            var rtws = (r.curr.tws >=30) ? 1 : bezier(r.curr.tws / 30);
            var timeTo100 = ( stam == 100 ) ? "" : '&nbsp;'+(( 100 - stam ) * (5 + 10 * rtws )).toFixed(0);

			// heading et speed pour calculs futurs (DTU)
			// my_heading = r.curr.heading ;
			// my_speed = r.curr.speed;
		
			// Etat du bateau
			var agroundBG = r.curr.aground ? "bgLightRed" : "";
            var manoeuvering = (r.curr.tsEndOfSailChange > r.curr.lastCalcDate)
                || (r.curr.tsEndOfGybe > r.curr.lastCalcDate)
                || (r.curr.tsEndOfTack > r.curr.lastCalcDate);
            var manoeuveringBG = manoeuvering ? "bgLightOrange" : "";

            return '<tr class="' + trstyle + '" id="rs:' + r.id + '">'
				+ '<td class="tdc">' + (r.url ? '<span id="rt:' + r.id + '"><img class="icon" src="./img/zezo.png")></span>&nbsp;' : '' ) + '<span id="rz:' + r.id + '"><img class="icon" src="./img/vrzen.png")></span>&nbsp;<span id="ra:' + r.id + '"><img class="icon" src="./img/sardine.png")></span>&nbsp;<span id="rb:' + r.id + '"><img class="icon" src="./img/bitsailor.png")></span></td>'
                + '<td class="tdc"><span id="pl:' + r.id + '">&#x26F5;</span><span id="py:' + r.id + '"><img class="icon" src="./img/ityc.png")></span></td>'
                + '<td class="tdc"><span id="wi:' + r.id + '"><img class="icon" src="./img/wind.svg"/></span></td>'
                + '<td class="name ' + alerteTEAM + '" title="si cette case est rouge, c\'est qu\'il y a un souci pour l\'un des membres de la team. \nAller dans l\'onglet FLEET pour en savoir plus">' + r.name + '</td>'
                +'<td class="time" ' + lastCalcStyle + '>' + Perso.formatTimeNotif(r.curr.lastCalcDate) + '</td>'
                + commonTableLines(r)
                + '<td class="speed1">' + Util.roundTo(r.curr.speed, 2+nbdigits) + '</td>'
                + '<td class="speed2">' + Util.roundTo(vmg(r.curr.speed, r.curr.twa), 2+nbdigits) + '</td>'
                // + '<td ' + bvmgClass +'>' + bestVMGString + '&nbsp;(' + bestVMGTilte + ')</td>'
				+ '<td ' + bvmgClass +'>' + bestVMGString + '</td>' // seulement les angles
                + '<td class="penality">' + sail + '</td>'
                + '<td class="penality">' + gybe + '</td>'
                + '<td class="penality">' + tack + '</td>'
				+ '<td class="state ' + agroundBG + ' ' + manoeuveringBG + '">' + (r.curr.aground ? "ECHOUE" : (manoeuvering ? "Manvr" : "Ok")) + '</td>'
                // + '<td ' + agroundBG + '>' + (r.curr.aground ? "AGROUND" : "No") + '</td>'
                // + '<td class="man">' + (manoeuvering ? "Yes" : "No") + '</td>'
                // + '<td ' + lastCommandBG + '>' + lastCommand + '</td>'
                + '</tr>';
        }
    }

    function manoeuveringPenalties (record) {
        if (!polars[record.curr.boat.polar_id]){
            return; 
        }
        var winch = polars[record.curr.boat.polar_id].winch;
        var tws = record.curr.tws;
        var speed = record.curr.speed;
        var options = record.curr.options;
		var stam = record.curr.stamina;
        var fraction1, fraction2, fraction3;
		
		// pour bezier "temps de manoeuvre"
        if (tws <= winch.lws) {
            fraction1 = 0;
        } else if (tws >= winch.hws) {
            fraction1 = 1;
        } else {
            fraction1 = (tws - winch.lws) / (winch.hws - winch.lws);
			fraction1 = bezier(fraction1);
		}
		
		// pour courbe "épuisement" 
		if ( tws < 10 ) {
			fraction2 = 1 + tws / 10 * .2;
		} else if ( tws >= 10 && tws < 20 ) {
			fraction2 = 1.2 + ( tws - 10 ) / 10 * .3;
		} else if ( tws >= 20 && tws < 30 ) {		
			fraction2 = 1.5 + ( tws - 20 ) / 10 * .5;
		} else { 		
			fraction2 = 2;
		}
		
		// Pour bezier "récupération" 
        if  ( tws <= 30 ) {
            fraction3 = tws / 30 ;
			fraction3 = bezier(fraction3);
        } else {
            fraction3 = 1;
        }
		
        return {
            "gybe" : penalty(speed, options, fraction1, fraction2, fraction3, winch.gybe, 10, stam),
            "tack" : penalty(speed, options, fraction1, fraction2, fraction3, winch.tack, 10, stam),
            "sail" : penalty(speed, options, fraction1, fraction2, fraction3, winch.sailChange, 20, stam)
        };
    }

	function bezier (x) { // pour x variant entre 0 et +1
		return 8.0885 * Math.pow( x, 5) -20.203 * Math.pow( x, 4) +14.571 * Math.pow( x, 3) -1.6662 * Math.pow( x, 2) + 0.2092 * x -0.00003 ;
	}

    function penalty (speed, options, fraction1, fraction2, fraction3, spec, fatig, stam) {
        if (options.indexOf("winch") >= 0) {
            spec = spec.pro;
        } else {
            spec = spec.std;
        }
		var race = races.get(selRace.value);
		var boatStaminaCoeff = race.coeff_sta;
		
		/* manoeuvre */
        var time = spec.lw.timer + (spec.hw.timer - spec.lw.timer) * fraction1;
		time = time * ( 2 - stam / 100 * 1.5 ); // * boatStaminaCoeff ????
        var dist = speed * time / 3600;
		
		/* épuisement */
		var energyLoss = boatStaminaCoeff * fatig * fraction2;
		
		/* récupération */
		var recover = energyLoss * ( 5 + 10 * fraction3 );
		
        return {
            "time" : time.toFixed(),
            "dist" : (dist * (1- spec.lw.ratio)).toFixed(2),
			"energy" : energyLoss.toFixed(),
			"recovery" : recover.toFixed()
        };
    }
    
    function vmg (speed, twa) {
        var r = Math.abs(Math.cos(twa / 180 * Math.PI));
        return speed * r;
    }

    function bestVMG(tws, polars, options) {
        var best = {"vmgUp": 0, "twaUp": 0, "vmgDown": 0, "twaDown": 0, "bspeed" :0,"btwa":0};
        if(!polars) return best;
        var iS = fractionStep(tws, polars.tws);
        for (var twaIndex10=250; twaIndex10 < 1800; twaIndex10++) {     // Manel : calcul des best au 1/10°
			var twaIndex = twaIndex10 / 10;
            var iA	= fractionStep(twaIndex, polars.twa);
            for (const sail of polars.sail) {
                var f = foilingFactor(options, tws, polars.twa[iA.index], polars.foil);
                var h = options.includes("hull") ? polars.hull.speedRatio : 1.0;
                var rspeed = bilinear(iA.fraction, iS.fraction,
                                      sail.speed[iA.index-1][iS.index - 1],
                                      sail.speed[iA.index][iS.index - 1],
                                      sail.speed[iA.index-1][iS.index],
                                      sail.speed[iA.index][iS.index]);
                var speed = rspeed  * f * h;
                var vmg = speed * Math.cos(twaIndex / 180 * Math.PI);
                if (vmg >= best.vmgUp) {   // Manel ou égal
                    best.twaUp = twaIndex;
                    best.vmgUp = vmg;
                } else if (vmg <= best.vmgDown) {   // Manel ou égal
                    best.twaDown = twaIndex;
                    best.vmgDown = vmg;
                }
                if(speed > best.bspeed) {
                    best.bspeed = speed;
                    best.btwa = twaIndex;
                }
            }
        }
        return  best;
    }

    function boatinfo (uid, uinfo) {
        var res = {
            name: uinfo.displayName,
            speed: uinfo.speed,
            heading: uinfo.heading,
            tws: uinfo.tws,
            twa: Math.abs(uinfo.twa),
			twd: uinfo.twd % 360,
            twaStyle: 'style="color: ' + ((uinfo.twa < 0) ? "red" : "green") + ';"',
            sail: sailNames[uinfo.sail] || "-",
            xfactorStyle: 'style="color:' + ((uinfo.xplained) ? "" : "red") + ';"',
            nameStyle: uinfo.nameStyle,
            nameStyle2 : uinfo.nameStyle2,
            bcolor: uinfo.bcolor,
            bbcolor: uinfo.bbcolor
		};

        
        if (uid == currentUserId) {
            // lbBoatname.innerHTML = res.name;
            res.nameStyle = "color: #b86dff; font-weight: bold; ";
            res.bcolor = '#b86dff';
            if (!uinfo.displayName) {
                res.name = 'Me';
            }
        } else {
            var idx = category.indexOf(uinfo.type);
            var style = categoryStyle[idx];
            res.nameStyle = style.nameStyle;
            res.bcolor = style.bcolor;
            res.bbcolor = style.bbcolor;
			if (uinfo.type == "top") {
				res.bcolor = "#ffd700";
				res.bbcolor = "#000000"; 
			} else {
				if ( uinfo.team == true ) {
					res.bcolor = "#AE1030"; // rouge
					res.bbcolor = "#000000"; // noir
				} else { 	
					if ( uinfo.isFollowed || uinfo.followed ) {
						res.bcolor = "#32cd32"; // vert
						res.bbcolor = "#000000"; // noir   
					} else if ( uinfo.choice == true ) { // selected
						res.bcolor = "#ff69b4"; // rose vif
						res.bbcolor = "#000000"; // noir
					} else {
						res.bcolor = "#a9a9a9";
						res.bbcolor = "#000000";   
					}
				}
			}		
			}
		
        // Modif Michel - Couleur voiles colonne Sail
        uinfo.shortSail = res.sail.slice(0,2);

        function sailColor() {
            switch (res.sail.slice(0,2)) {
                case "Ji":
                    return "#FF6666";
                    break;
                case "LJ":
                    return "#FFF266";
                    break;
                case "St":
                    return "#66FF66";
                    break;
                case "C0":
                    return "#66CCFF";
                    break;
                case "HG":
                    return "#FF66FF";
                    break;
                case "LG":
                    return "#FFC44D";
                    break;
                case "Sp":
                    return "#6666FF";
                    break;
                default:
                    return "#FFFFFF";
            }
        }
        res.sailStyle = 'style="color:' + sailColor() + '" padding: 0px 0px 0px 2px;"';
        // Fin modif Couleur voiles
        return (res);
    }

    function isDisplayEnabled (record, uid) {
        return  (uid == currentUserId)
            || (record.type2 == "followed" && cbFriends.checked)
            || (record.type2 == "team" && cbTeam.checked)
            || (record.type2 == "normal" && cbOpponents.checked)
            || ((record.type == "top" || record.type2 == "top") && cbTop.checked)
            || (record.type2 == "certified" && cbCertified.checked)
            || (record.type2 == "real" && cbReals.checked)
            || ((record.type == "sponsor" || record.type2 == "sponsor") && cbSponsors.checked)
            || (record.choice == true && cbSelect.checked)
            || (record.state == "racing" && cbInRace.checked)
			|| (record.type == "pilotBoat"); // ajout Manel
    }

// --------- Intégration page sur VR ------------------
    
    function makeIntegratedHTML() {
        var raceLine ="";
        var r = races.get(selRace.value);
        var raceId = "";
        
        var bi = boatinfo(currentUserId, r);
        var drawTheme = 'dark'; // force style PVe Provisoire
                        
        var raceStatusHeader = '<tr style="background-color: #FFFFFF"; >'
        + '<th title="Call Router">' + "RT" + '</th>'
        + '<th title="Call Polars">' + "PL" + '</th>'
        + '<th>' + "Time" + '</th>'
        + '<th title="Time to 100% staminia">' + "NRJ" + '</th>'
        + '<th title="True Wind Direction">' + "TWD" + '</th>'
        + '<th title="True Wind Speed">' + "TWS" + '</th>'
        + '<th title="True Wind Angle">' + "TWA" + '</th>'
        + '<th title="Heading">' + "HDG" + '</th>'
        + '<th title="">' + "Sail" + '</th>' 
        + '<th title="Boat speed">' + "Speed" + '</th>'
        + '<th title="Boat VMG">' + "VMG" + '</th>'       
        + '<th title="Best VMG Up | Dw">' + "Best VMG" + '</th>' 
        + '<th title="Best Speed spd | TWA">' + "Best speed" + '</th>'
        + '<th title="Boat assumed to have Foils. Unknown if no foiling conditions">' + "Foils" + '</th>'
        + '<th title="Sail change time remaining">' + "Sail" + '</th>'
        + '<th title="Gybing time remaining">' + "Gybe" + '</th>'
        + '<th title="Tacking time remaining">' + "Tack" + '</th>'
        + '</tr>';
        
        let zUrl = "";
        let pUrl = "";
            
        let rzUrl = "";
        let rpUrl = "";
        
        if(r == undefined || r.curr == undefined) {
            raceLine ="<tr><td>No race loaded</td></tr>";
        } else if(!currentUserId ) {
            raceLine ="<tr><td>No player enabled</td></tr>";
        } else  {
            var p = raceFleetMap.get(r.id).uinfo[currentUserId];
            var raceId = r.id;
            var bestTwa = bestVMG(r.curr.tws, polars[r.curr.boat.polar_id], r.curr.options);
            var bestVMGString = bestTwa.twaUp + " | " + bestTwa.twaDown;
            var bestVMGTilte = Util.roundTo(bestTwa.vmgUp, 2+nbdigits) + "kts | " + Util.roundTo(Math.abs(bestTwa.vmgDown), 2+nbdigits) + "kts";
            var bspeedTitle = Util.roundTo(bestTwa.bspeed, 2+nbdigits) + "kts | " + bestTwa.btwa;
    
            // Date non actualisée
            var lastCalcDelta = r.curr.receivedTS - r.curr.lastCalcDate; 
            var lastCalcStyle = ""
            var lastCalcStyle = (lastCalcDelta > 900000)?  'class="alert"':'';
            
            // No need to infer TWA mode, except that we might want to factor in the last command
            var isTWAMode = r.curr.isRegulated;
            
            var twaFG = (r.curr.twa < 0) ? "red" : "green";
            var twaBold = isTWAMode ? "font-weight: bold;" : "";
            var twaBG = " ";
            if(bestTwa) {
                var currentTWA = Util.roundTo(Math.abs(r.curr.twa), 1);
                if((currentTWA == bestTwa.twaUp) || (currentTWA == bestTwa.twaDown))
					twaBG =  ' background-color:lightgreen;';
            }
            
            var hdgFG = isTWAMode ? "black" : "blue";
            var hdgBold = isTWAMode ? "font-weight: normal;" : "font-weight: bold;";
            if(drawTheme =='dark')
                hdgFG = isTWAMode ? "white" : "darkcyan";
            
            // var beta = selRace.options[selRace.selectedIndex].betaflag;
            
            // zUrl = prepareZezoUrl(r.id, currentUserId, beta, false, false);
            // pUrl = preparePolarUrl(r.id);
            //zUrl = callRouter(r.id, currentUserId, false);
            //pUrl = callPolars(r.id);
            
            //if(r.url) rzUrl = r.url;
            //rpUrl = "http://toxcct.free.fr/polars/?race_id=" + raceId;    
            
            // Stamina et time to 100%
            var stam = r.curr.stamina;
            var rtws = (r.curr.tws >=30) ? 1 : bezier(r.curr.tws / 30);
            var timeTo100 = (stam == 100) ? 'OK' : ((100 - stam) * (5 + 10 * rtws)).toFixed(0) + '&nbsp;mn';
            var bgTimeTo100 = (stam == 100) ? 'class="ok"':'';
            
            // manoeuvres
            var sailChange = Util.formatSeconds(r.curr.tsEndOfSailChange - r.curr.lastCalcDate);
            var gybing = Util.formatSeconds(r.curr.tsEndOfGybe - r.curr.lastCalcDate);
            var tacking = Util.formatSeconds(r.curr.tsEndOfTack - r.curr.lastCalcDate);
            var bgClassSail = (sailChange == "-") ? '' : 'class="alert"';
            var bgClassGybing = (gybing == "-") ? '' : 'class="alert"';		
            var bgClassTacking = (tacking == "-") ? '' : 'class="alert"';
            
            // asail
            var sailInfo = sailNames[r.curr.sail];

            // mauvaise voile
            if (r.curr.badSail) var sailNameBG = 'class="alert"';
            
            // Aground
            var agroundBG = r.curr.aground ? 'class="alert"' : 'class="speed1"';
            var speed = r.curr.aground ? 'Aground': Util.roundTo(r.curr.speed, 2+nbdigits);

            // Last Command
            if (cbLocalTime.checked) {
                var timeHidden = "display: none;";
                var timeLocalHidden = "";
            } else {
                var timeHidden = "";
                var timeLocalHidden = "display: none;";
            }
            
            var lastCommand ="";
            if (r.lastCommand != undefined) {                
                var lcTime = Perso.formatTimeNotif(r.lastCommand.request.ts);
                lastCommand = printLastCommand(r.lastCommand.request.actions);
                lastCommand = "Commande @ " + lcTime + "  |  Actions &#9658; " + lastCommand;
            }
            
            raceLine = '<tr id="rs:' + r.id + '">'
				+ (r.url ? ('<td class="tdc"><span id="rt:' + r.id + '">Zz </span><span id="rz:' + r.id + '">Zen</span></td>') : '<td>&nbsp;</td>')
                + '<td class="tdc"><span id="pl:' + r.id + '">&#x26F5;</span></td>'
                + '<td ' + lastCalcStyle + '>' + Perso.formatTimeNotif(r.curr.lastCalcDate) + '</td>'
                + '<td ' + bgTimeTo100 + '>' + timeTo100 + '</td>'
                + '<td class="twd">' + Util.roundTo(r.curr.twd % 360, 2+nbdigits) + '</td>'
                + '<td class="tws">' + Util.roundTo(r.curr.tws, 2+nbdigits) + '</td>'
                + '<td class="twa" style="color:' + twaFG + ";" + twaBold + '">' + Util.roundTo(Math.abs(r.curr.twa), 2+nbdigits) + '</td>'
                + '<td class="hdg" style="' + hdgFG + ";" + hdgBold + '">' + Util.roundTo(r.curr.heading, 2+nbdigits) + '</td>'
                + '<td ' + sailNameBG + '>' + sailInfo + '</td>'
                + '<td ' + agroundBG + '>' + speed + '</td>'
                + '<td class="speed2">' + Util.roundTo(vmg(r.curr.speed, r.curr.twa), 2+nbdigits) + '</td>'
                + '<td class="bvmg">' + bestVMGString + '</td>'
                + '<td class="bspeed">' + bspeedTitle +'</td>'
                + '<td class="foil"' + bi.xfactorStyle + '>' + (p.xoption_foils || "?") + '</td>'
                + '<td ' + bgClassSail + '>' + sailChange + '</td>'
                + '<td ' + bgClassGybing + '>' + gybing + '</td>'
                + '<td ' + bgClassTacking + '>' + tacking + '</td>'
                + '</tr>';
        }

        var manifest = chrome.runtime.getManifest();
        let outputTable =  '<br><br>'
            + '<style>'
            + '#UTC {' + timeHidden + '}'
            + '#UTCLocal {' + timeLocalHidden + '}'
            + '</style>'
            + '<table style = "background-color:#FFFFFF; color: #FF0000;">'
            + '<thead>'
            + raceStatusHeader
            + '</thead>'
            + '<tbody>'
            + raceLine
            + '<tr><td colspan="17" style="text-align:left;">Dernière commande :<br><b>' + lastCommand + '</b></td></tr>'
            + '</tbody>'
            + '</table>';

        comPort = chrome.tabs.connect(tabId,{name: "DashPortCom" + manifest.version});
        comPort.postMessage({order: "update",
                            content:outputTable,
                            newTab:cbReuseTab.checked,
                            rid:raceId,
                            zurl:zUrl,purl:pUrl,
                            rzurl:rzUrl,rpurl:rpUrl,
                        });

	}
    
	//------ FIN d'intégration sur VR ----------
    
	//******************
	//* Onglet : FLEET *
	//******************
	
    function makeFriendListLine (uid) {
        if (uid == undefined) {
            return "";
        } else {
            var alerteAGD = "";
            var alerteTWA = "";
            var r = this.uinfo[uid];
            var race = races.get(selRace.value);
            if (r == undefined || race.legdata == undefined) return "";
            var bi = boatinfo(uid, r);
            r.dtf = r.distanceToEnd;
            r.dtfC = Util.gcDistance(r.pos, race.legdata.end);
            if (!r.dtf || r.dtf == "null") {
                r.dtf = r.dtfC;
            }
                        						
            // Ajout Michel - Puces colonne State, + modifs Manel
            var iconState = "-";
            var txtTitle="";
            if ( r.state == "racing") {
                iconState = '<span class="colorDodgerBlue">&#x2B24;</span>';
                txtTitle = "Racing";
			} else if (r.state == "arrived") {
                iconState = '<span class="colorLime">&#x2B24;</span>';
                txtTitle = "Arrived";
            } else if (r.state == "waiting") {
                iconState = '<span class="colorDimGray">&#x2a02;</span>';
                txtTitle = "Waiting";
            } else if (r.state == "staying") {
                iconState = '<span class="colorDimGray">&#x2a02;</span>';
                txtTitle = "Staying";
            }
			// nouveau calcul pour Aground / Manel
			var secondes = Perso.formatDateUTC(r.lastCalcDate).substr(26, 1);
			if (r.state == "racing" && ( bi.speed == undefined || secondes ==":" ) ) {
                iconState = '<span class="colorRed">&#x2B24;</span>';
                txtTitle = "AGROUND !";
				if (r.team) { // Alerte Aground pour les membres de la team
					alerteTEAM = "KO" ; 
					alerteAGD = "alerteBSP";
				}
			}
            // Fin Ajout Michel - Puces colonne State
        
			// Ajout Manel : Alerte TWA
				if ( bi.tws && bi.twa) {
				var pasdoption = ['foil'];
				var best = bestVMG(bi.tws, polars[r.boat.polar_id], pasdoption) ;
                if ( r.state == "racing"  && r.team && bi.twa > 10 && ( bi.twa < ( 1*best.twaUp - 5 ) || bi.twa > ( 1*best.twaDown + 5 ) ) ) {
					if ( !alerteTeamBlack.includes(bi.name) ) { // but not balcklist
						alerteTEAM = "KO" ; 
					}
					alerteTWA = "alerteBSP";
				}
			}
		
            // Ajout Michel - Puces colonne Skipper
            var bull = "";
            if (r.choice == true) {
                bull = '<span style="color:HotPink;font-size:16px;"><b>&#9679;</b></span>';
            } else {
                bull = '&nbsp;';
            }                    
            if (r.team == true) {
                bull += '<span style="color:Red;font-size:16px;"><b>&#9679;</b></span>';
            } else if (r.followed == true || r.isFollowed == true) {
                bull += '<span style="color:LimeGreen;font-size:16px;"><b>&#9679</b></span>';
            } else if (r.type == "real") {
                bull = '&nbsp;<span style="color:Chocolate;font-size:16px;"><b>&#9679;</b></span>';
            } else {
                bull += '<span style="color:DarkGrey;font-size:16px;"><b>&#9679;</b></span>';
            }
            if ( r.type == "top") {
                bull += '<span style="color:GoldenRod;font-size:16px;"><b>&#9679;</b></span>';
            }
            if ( r.type == "certified") {
                bull += '<span style="color:DodgerBlue;font-size:16px;"><b>&#9679;</b></span>';
            }
            if ( r.type == "sponsor") {
                bull += '<span style="color:DarkSlateBlue;font-size:16px;"><b>&#9679;</b></span>';
            }  else {
                bull += '&nbsp;';
            }
			var currentUserLine = ""; // ajout Manel, pour format de la ligne 'Me'
            if (uid == currentUserId) {
                bull = '&nbsp;<span>&#11088</span>';
				currentUserLine = ' currentuserline';
            }
            // Fin Ajout Michel - Puces colonne Skipper
        
            var isDisplay = isDisplayEnabled(r, uid) &&  ( !cbInRace.checked || r.state == "racing" );

			// Ajout Manel : popup sur DTU : azimut et distance / vitesse projetée
            var r_me = this.uinfo[currentUserId];
            var bi_me = boatinfo(currentUserId, r_me);
			var my_speed = bi_me.speed;
			var my_heading = bi_me.heading;
			var distanceToUs = r.distanceToUs ;
			var bearingFromUs = r.bearingFromUs ;
			var popUpDTU = "";
			if (distanceToUs && bearingFromUs) {
				var sens = ( distanceToUs > 0 ) ? " est devant" : " est derrière" ;
				var gisement = ( 360 - 1 * my_heading  + 1 * bearingFromUs	 ) % 360 ;
				var gisement2 = (gisement < 180 ) ? "" : '(' + Util.roundTo( (gisement - 360 ), 1) + '°)' ;
				var bord = (gisement < 180 ) ? " à tribord" : " à bâbord" ;
				var ecartVitesse = bi.speed  - my_speed ;
				var rattrape = ( ecartVitesse > 0 ) ? " et plus rapide" : " et plus lent " ;
				var projectionNm = distanceToUs * Math.cos ( gisement /180 * Math.PI ) ;
				var projectionTps = projectionNm / my_speed * 60 ;	
				var angle_beta = ( bi_me.twd - my_heading ) % 180 ;
				var angle_gamma = 180 - angle_beta - gisement ;
				var dist_vent = distanceToUs / Math.sin ( gisement /180 * Math.PI ) * Math.sin ( angle_gamma /180 * Math.PI ) ;
				var popUpDTU = "ma vitesse : " + Util.roundTo(my_speed,3) + " mon cap : " + Util.roundTo(my_heading,3) + "\n" + bi.name + sens + bord + rattrape +' \n - Distance = ' + Util.roundTo(distanceToUs,2) + ' Nm \n - Gisement = ' + Util.roundTo(gisement, 1) + '° ' + gisement2 + '\n - Relèvement = ' + Util.roundTo(bearingFromUs,1) + '°\n - Projection sur ma route = ' + Util.roundTo(projectionNm,2) + ' Nm / ' + Util.roundTo(projectionTps,0) + ' min\n - alpha ' + Util.roundTo(gisement, 0) + " beta " + Util.roundTo(angle_beta,0) + " gamma " + Util.roundTo(angle_gamma,0) + " distance vent " + Util.roundTo(dist_vent,2) ;
			}
			/* fin popup sur DTU */

            if (isDisplay) {
				return '<tr class="hovred ' + currentUserLine + '" id="ui:' + uid + '">'
					+ '<td class="tdc">' + (race.url ? '<span id="rt:' + uid + '"><img class="icon" src="./img/zezo.png")></span>&nbsp;' : '' ) + '<span id="rz:' + uid + '"><img class="icon" src="./img/vrzen.png")></span></td>'
                    + '<td class="time ' + alerteAGD + '">' + Perso.formatDateUTC(r.lastCalcDate) + '</td>'
                    + '<td class=skipper "' + alerteAGD + alerteTWA + '" style="' + bi.nameStyle + '">' + bull + " " + bi.name + '</td>'
                    + '<td class="rank">' + (r.rank ? r.rank : "-") + '</td>'
					// + '<td class="sta">' + Util.roundTo(r.stamina, 0) + '</td>'
                    + '<td class="dtu" title="' + popUpDTU + '">' + Util.roundTo(r.distanceToUs, 1+nbdigits) + '</td>'
					+ '<td class="brg">' + (r.bearingFromUs ? r.bearingFromUs + "&#x00B0;" : "-") + '</td>'
                    + '<td class="dtf">' + ((r.dtf==r.dtfC)?"(" + Util.roundTo(r.dtfC,nbdigits) + ")":Util.roundTo(r.dtf, nbdigits)) + '</td>'
                    + '<td class="twd">' + Util.roundTo(r.twd % 360, 2+nbdigits) + '</td>'
                    + '<td class="tws">' + Util.roundTo(bi.tws, 2+nbdigits) + '</td>'
                    + '<td class="twa ' + alerteTWA + '"' + bi.twaStyle + '>' + Util.roundTo(bi.twa, 2+nbdigits) + '</td>'
                    + '<td class="hdg"' + bi.hdgStyle + '>' + Util.roundTo(bi.heading, 2+nbdigits) + '</td>'
                    + '<td class="speed1 ' + alerteAGD + '">' + Util.roundTo(bi.speed, 2+nbdigits) + '</td>'
                    + '<td class="speed2">' + Util.roundTo(r.vmg, 2+nbdigits) + "</td>"
                    + '<td class="sail"><span ' + bi.sailStyle + '>&#x25e2&#x25e3  </span>' + bi.sail + '</td>'
                    + '<td class="xfactor"' + bi.xfactorStyle + '>' + Util.roundTo(r.xfactor, 4) + '</td>'
                    + '<td class="foil"' + bi.xfactorStyle + '>' + (r.xoption_foils || "?") + '</td>'
                    + recordRaceFields(race, r)
                    + '<td class="position">' + (r.pos ? Util.formatPosition(r.pos.lat, r.pos.lon) : "-") + '</td>'
                    // + '<td class="options">' + (r.xoption_options || "?") + '</td>'
                    + '<td class="state ' + alerteAGD + '" title="' + txtTitle + '">' + iconState + '</td>'
                    + '</tr>';
            }
        }
    }

	//***********************************************
    //* Onglet : RANKING VSR / XP / Races... Michel *
	//***********************************************
	
	function VSRrankingHeader(title) {
        return '<tr>'
            + '<th colspan = 6>' + title + '</th>'
            + '</tr>'
            + '<tr>'
            + genth("th_id", "ID", undefined, sortField == "id", currentSortOrder)
            + genth("th_rank", "Rank", undefined, sortField == "rank", currentSortOrder)
            + genth("th_name2", "Skipper", undefined, sortField == "userName", currentSortOrder)
            + genth("th_gender", "Gender", undefined, sortField == "gender", currentSortOrder)
            + genth("th_teamname", "Team", undefined, sortField == "teamName", currentSortOrder)
            + genth("th_total", "Points", undefined)
            + '</tr>';        
    }

	function SeasonrankingHeader(title) {
        return '<tr>'
            + '<th colspan = 6>' + title + '</th>'
            + '</tr>'
            + '<tr>'
            + genth("th_id", "ID", undefined, sortField == "id", currentSortOrder)
            + genth("th_rank", "Rank", undefined, sortField == "rank", currentSortOrder)
            + genth("th_name2", "Skipper", undefined, sortField == "userName", currentSortOrder)
            + genth("th_gender", "Gender", undefined, sortField == "gender", currentSortOrder)
            + genth("th_teamname", "Team", undefined, sortField == "teamName", currentSortOrder)
            + genth("th_total", "Points", undefined)
            + '</tr>';        
    }

    function HOFrankingHeader(title) {
        return '<tr>'
            + '<th colspan = 5>' + title + '</th>'
            + '</tr>'
            + '<tr>'
            + genth("th_rank", "Rank", undefined, sortField == "rank", currentSortOrder)
            + genth("th_teamname", "Team", undefined, sortField == "teamName", currentSortOrder)
            + genth("th_flag2", "Country", undefined, sortField == "country", currentSortOrder)
            + genth("th_total", "Points", undefined)
            + genth("th_teamsize", "Team size", undefined, sortField == "teamsize", currentSortOrder)
            + '</tr>';
    }

    function HOFRacerankingHeader(title) {
        return '<tr>'
            + '<th colspan = 5>' + title + '</th>'
            + '</tr>'
            + '<tr>'
            + genth("th_rank", "Rank", undefined, sortField == "rank", currentSortOrder)
            + genth("th_teamname", "Team", undefined, sortField == "teamName", currentSortOrder)
            + genth("th_flag2", "Country", undefined, sortField == "country", currentSortOrder)
            + genth("th_total", "Points", undefined)
            + '<th>Boats in race</th>'
            + '</tr>';
    }

    function RacerankingHeader(title) {        
        return '<tr>'
            + '<th colspan = 10>'+ title + '</th>'
            + '</tr>'
            + '<tr>'
            + genth("th_id", "ID", undefined, sortField == "id", currentSortOrder)
            + genth("th_rank", "Rank", undefined, sortField == "rank", currentSortOrder)
            + genth("th_name2", "Skipper", undefined, sortField == "displayName", currentSortOrder)
            + genth("th_flag", "Flag", undefined, sortField == "dispCountry", currentSortOrder)
            + genth("th_teamname", "Team", undefined, sortField == "teamName", currentSortOrder)
            + '<th>Gap</th>'
            + '<th>VSR Points</th>'
            + '<th>Credits</th>'
            + '</tr>';
    }

    function TeamListHeader(title) {
        return '<tr>'
            + '<th colspan = 6>' + title + '</th>'
            + '</tr>'
            + '<tr>'
            + genth("th_teamname", "Team", undefined, sortField == "teamName", currentSortOrder)
            + genth("th_teamsize", "Size", undefined, sortField == "teamsize", currentSortOrder)
            + genth("th_type", "Type", undefined, sortField == "type", currentSortOrder)
            + '<th width="60%">Description</th>'
            + '</tr>';
    }

    function TeamMemberstHeader(title) {
        return '<tr>'
            + '<th colspan = 9>' + title + '</th>'
            + '</tr>'
            + '<tr>'
            + genth("th_id", "ID", undefined, sortField == "id", currentSortOrder)
            + genth("th_name", "Skipper", undefined, sortField == "displayName", currentSortOrder)
            + genth("th_teamname", "Team", undefined, sortField == "teamName", currentSortOrder)
            + genth("th_gender2", "Gender", undefined, sortField == "genderType", currentSortOrder)
            + genth("th_flag2", "Flag", undefined, sortField == "country", currentSortOrder)
            + genth("th_role", "Rôle", undefined, sortField == "role", currentSortOrder)
            + genth("th_vsr", "VSR Pts", undefined, sortField == "vsrPoints", currentSortOrder)
            + genth("th_level", "level", undefined, sortField == "level", currentSortOrder)
            + '</tr>';
    }    

    function makeVSRranking(id_data) {
        var dataRanking = VSRRank.uinfo[id_data];
        return '<tr>'
			+ '<td class="username">' + dataRanking.userId + '</td>'	
            + '<td class="rank">' + dataRanking.rank + '</td>'
            + '<td class="username">' + dataRanking.userName + '</td>'
            + '<td class="gender">' + dataRanking.gender + '</td>'
            + '<td class="team">' + dataRanking.team + '</td>'
            + '<td class="points">' + dataRanking.points + '</td>'
            + '</tr>';
    }

    function makeSeasonranking(id_data) {
        var dataRanking = SeasonRank.uinfo[id_data];
        return '<tr>'
			+ '<td class="username">' + dataRanking.userId + '</td>'
            + '<td class="rank">' + dataRanking.rank + '</td>'
            + '<td class="username">' + dataRanking.userName + '</td>'
            + '<td class="gender">' + dataRanking.gender + '</td>'
            + '<td class="team">' + dataRanking.team + '</td>'
            + '<td class="points">' + dataRanking.points + '</td>'
            + '</tr>';
    }

    function makeHOFranking(id_data) {
        var dataRanking = HOFRank.uinfo[id_data];
        return '<tr class="hov">'
            + '<td class="rank">' + dataRanking.rank + '</td>'
            + '<td class="username">' + dataRanking.teamName + '</td>'
            + '<td class="flag">' + dataRanking.country + '</td>'
            + '<td class="points">' + Util.roundTo(dataRanking["SUM-score"]/1000000, 1) + '</td>'
            + '<td class="members">' + dataRanking["SUPPLEMENTAL-teamsize"] + '</td>'
            + '</tr>';
    }

    function makeHOFRaceranking(id_data) {
        var dataRanking = HOFRace.uinfo[id_data];
        return '<tr class="hov">'
            + '<td class="rank">' + dataRanking.rank + '</td>'
            + '<td class="username">' + dataRanking.teamName + '</td>'
            + '<td class="flag">' + dataRanking.country + '</td>'
            + '<td class="points">' + Util.roundTo(dataRanking.score, 1) + '</td>'
            + '<td class="flag">' + dataRanking.racing + "/" + dataRanking.teamsize + '</td>'
            + '</tr>';
    }

    function makeRaceranking(id_data) {
        var dataRanking = RaceRank.uinfo[id_data];
        if (dataRanking.time ==0) {
            var gap = "+ " + Util.roundTo(dataRanking.distance, 2) + " milles";
			
        } else {
            if (dataRanking.rank == 1) {
                leaderTime = dataRanking.time;
                var gap = formatDHMSRanking(leaderTime);
            } else {
                var gap = formatDHMSRanking(dataRanking.time - leaderTime);
            }
            if (dataRanking.rank != 1) {
                gap = "+ " + gap;
            }
        }
		dataRanking["teamName"] = teamnameCSV[dataRanking.userId];
		return '<tr class="hov">'
			+ '<td class="username">' + dataRanking.userId + '</td>'
			+ '<td class="rank">' + dataRanking.rank + '</td>'
			+ '<td class="username">' + dataRanking.userName + '</td>'
			+ '<td class="flag">' + dataRanking.dispCountry + '</td>'
			+ '<td class="team">' + dataRanking.teamName + '</td>' 
			// + '<td class="team">' + dataRanking.team + '</td>' 
			+ '<td class="rank">' + gap + '</td>'
			+ '<td class="rank">' + Util.roundTo(dataRanking.vsrpoints, 1) + '</td>'
			+ '<td class="rank">' + Util.roundTo(dataRanking.credits,1) + '</td>'
			+ '</tr>';
    }
    
    function makeTeamList(id_data) {
        var dataRanking = TeamList.uinfo[id_data];
        return '<tr class="hov">'
            + '<td class="username">' + dataRanking.teamName + '</td>'
            + '<td class="flag">' + dataRanking.teamsize + '</td>'
            + '<td class="type">' + dataRanking.type + '</td>'
            + '<td class="desc">' + dataRanking.desc + '</td>'
            + '</tr>';
    }

    function makeTeamMembersList(idMember) {        
        var Member = TeamMembers.uinfo[idMember];
		var colorgender = "gender";
		if (Member.genderType == "F") {
			colorgender = "genderF";                
		} else if (Member.genderType == "M") {
			colorgender = "genderM";                                
		} else {
			colorgender = "hov";                                
			Member.genderType = "-";    
		}
		if (Member.role == "coach") {
			var style = 'style="font-weight:bold; background:#fff4d2;"';
		} else {
			var style ="";
		}
		return '<tr ' + style + ' class="' + colorgender + '">'
			+ '<td class="username">' + Member.id + '</td>'
			+ '<td class="username">' + Member.displayName + '</td>'
			+ '<td class="username">' + Member.teamName + '</td>'
			+ '<td class="gender">' + Member.genderType + '</td>'
			+ '<td class="flag">' + Member.country + '</td>'
			+ '<td class="role">' + Member.role + '</td>'
			+ '<td class="points">' + Member.vsrPoints + '</td>'
			+ '<td class="points">' + Member.xpLevel + '</td>'
			+ '</tr>';
    }
    // Fin Classement
    
	//*******************************
	//* Onglet : WAYPOINTS - Michel *
	//*******************************

    function friendWaypointsHeader() {
        return '<tr>'
            + '<th>Date</th>'
            + '<th>Skipper</th>'
            + '<th><span id="wp:ALL">&#10060;</span></th>'
            + '<th>Waypoint 1</th>'        
            + '<th>Waypoint 2</th>'        
            + '<th>Waypoint 3</th>'        
            + '<th>Waypoint 4</th>'        
            + '<th>Waypoint 5</th>'        
            + '<th>Waypoint 6</th>'        
            + '<th>Waypoint 7</th>'        
            + '<th>Waypoint 8</th>'
            + '</tr>';        
    }    
	
	function makeFriendWaypoints (uid) {
        if (uid == undefined) {
            return "";
        } else {
            var line ="";
            var bull = "";
            var r = this.uinfo[uid];
            var race = races.get(selRace.value);
            if (r == undefined || race.legdata == undefined) return "";
            var bi = boatinfo(uid, r);
        }
        if(r.choice == true && r.waypoints){
            if (r.team == true) {
                bull += '<span style="color:Red;font-size:16px;"><b>&#9679;</b></span>';
            } else if (r.followed == true || r.isFollowed == true) {
                bull += '<span style="color:LimeGreen;font-size:16px;"><b>&#9679</b></span>';
            } else if (r.type == "real") {
                bull = '&nbsp;<span style="color:Chocolate;font-size:16px;"><b>&#9679;</b></span>';
            } else {
                bull += '<span style="color:LightGrey;font-size:16px;"><b>&#9679;</b></span>';
            }
            if ( r.type == "top") {
                bull += '<span style="color:GoldenRod;font-size:16px;"><b>&#9679;</b></span>';
            }
            if ( r.type == "certified") {
                bull += '<span style="color:DodgerBlue;font-size:16px;"><b>&#9679;</b></span>';
            }
            if ( r.type == "sponsor") {
                bull += '<span style="color:DarkSlateBlue;font-size:16px;"><b>&#9679;</b></span>';
            }  else {
                bull += '&nbsp;';
            }
			
			var origin = r.pos;
            for (var i = 0; i <= 7; i++) {
                if(r.waypoints[i]){
					var icap = Util.courseAngle(origin.lat, origin.lon, r.waypoints[i].lat, r.waypoints[i].lon)/Math.PI*180;
                    line += '<td class="position">' + (r.waypoints[i] ? Util.formatPosition(r.waypoints[i].lat, r.waypoints[i].lon) + " - " + icap.toFixed(1) + "°" : "-") + '</td>';
					origin = r.waypoints[i]
                } else {
                    line += '<td class="position">---</td>';
                }   
            }                
            return '<tr class="hovred">'
                + '<td class="time">' + formatTime(r.lastCalcDate) + '</td>'
                + '<td style="' + bi.nameStyle + '">' + bull + " " + r.displayName + '</td>'
                + '<td class="tdc"><span id="wp:' + uid + '">&#10060;</span></td>'
                + line
                + '</tr>';
        }
    }
    // Fin Waypoints
    
	//*******************************
	//* Construction des blocs HTML *
	//*******************************
	
    function recordRaceFields (race, r) {
        if (race.type === "record") {
            if (r.state === "racing" && r.distanceToEnd) {
                try {
                    var raceTime = (r.tsRecord - r.startDate);
                    var estimatedSpeed = r.distanceFromStart / (raceTime / 3600000);
                    var eTtF = (r.distanceToEnd / estimatedSpeed) * 3600000;
                    var eRT = raceTime + eTtF;
                    r.avgSpeed = estimatedSpeed;
                    r.eRT = eRT;    // Modif Michel - eRT remplacé par Race Time...
                } catch (e) {
                    r.eRT = e.toString();
                }
                return '<td class="eRT" title= "Start : ' + formatShortDate(r.startDate) + '">' + Util.formatDHMS(raceTime) + '</td>'  // Modif Michel Class
                    + '<td class="eRT">' + Util.formatDHMS(r.eRT, 1+nbdigits) + '</td>'
                    + '<td class="avg">' + Util.roundTo(r.avgSpeed, 1+nbdigits) + '</td>';
            } else {
                return '<td class="eRT"> - </td>'  // Modif Michel Class
                    + '<td class="eRT"> - </td>'
                    + '<td class="avg"> - </td>';
            }
        } else {
            return "";
        }
    }

    function makeRaceStatusHTML () {
        return '<table>'
            + '<thead>'
            + raceStatusHeader()
            + '</thead>'
            + '<tbody>'
            + Array.from(races || []).map(makeRaceStatusLine).join(" ");
            + '</tbody>'
            + '</table>'
            + '<p class="alertteam ' + alertTeam + '"><span >&#x2B24;</span></p>';
        makeIntegratedHTML();
    }

    function updateFleetHTML (rf) {
        if (rf === undefined) {
             "No friend positions received yet";
        } else {
            sortFriends(rf);
			alerteTEAM = "OK"; // reset AlerteTEAM avant d'afficher fleet
            var fleetHTML =
                '<table>'
                + '<thead class="sticky">'
                + friendListHeader()
                + '</thead>'
                + '<tbody>'
                + Array.from(rf.table || []).map(makeFriendListLine, rf).join(" ");
                + '</tbody>'
                + '</table>';
            divFriendList.innerHTML = fleetHTML;
			makeIntegratedHTML();
        }
    }

    function makeLineToCopy2(id_data) {
        if (origin == 61) {
            var dataRanking = VSRRank.uinfo[id_data];
            var stringToCopy = dataRanking.userId + ";" + dataRanking.rank + ";" + dataRanking.userName.replace(';', '') + ";" + dataRanking.team.replace(';', '') + ";" + dataRanking.points + ";\n";
        } else if (origin == 62) {
            var dataRanking = SeasonRank.uinfo[id_data];
            var stringToCopy = dataRanking.userId + "\t" + dataRanking.rank + "\t" + dataRanking.userName + "\t" + dataRanking.team + "\t" + dataRanking.points + "\n";
        } else if (origin == 63) {
            var dataRanking = HOFRank.uinfo[id_data];
            var stringToCopy = dataRanking.teamId + "\t" + dataRanking.rank + "\t" + dataRanking.teamName + "\t" + Util.roundTo(dataRanking.score, 2) + "\n";
        } else if (origin == 64) {
            var dataRanking = HOFRace.uinfo[id_data];
            var stringToCopy = dataRanking.teamId + "\t" + dataRanking.rank + "\t" + dataRanking.teamName + "\t" + Util.roundTo(dataRanking.score, 2) + "\t"
                            + dataRanking.racing + "//" + dataRanking.teamsize + "\n";        
        } else if (origin == 65) {
            var dataRanking = RaceRank.uinfo[id_data];
            if (dataRanking.time ==0) {
                var gap = "+ " + Util.roundTo(dataRanking.distance, 2) + " mille";
            } else {
                if (dataRanking.rank == 1) {
                    leaderTime = dataRanking.time;
                    var gap = formatDHMSRanking(leaderTime);
                } else {
                    var gap = formatDHMSRanking(dataRanking.time - leaderTime);
                }
                if (dataRanking.rank != 1) {
                    gap = "+ " + gap;
                }
            }
            var stringToCopy = dataRanking.userId + ";" + dataRanking.rank + ";" + dataRanking.userName.replace(';', '') + ";" + (teamnameCSV[dataRanking.userId]) + ";" + gap + ";" + Util.roundTo(dataRanking.vsrpoints, 2) + ";" + Util.roundTo(dataRanking.credits, 2) + ";\n";
        } else if (origin == 66) {
            var dataRanking = TeamList.uinfo[id_data];
            var stringToCopy = dataRanking.teamName + "\t" + dataRanking.teamsize + "\t" + dataRanking.desc + "\n";
        } else if (origin == 67) {
            var dataRanking = TeamMembers.uinfo[id_data];
            var stringToCopy = dataRanking.id + "\t" + dataRanking.displayName + "\t" + dataRanking.teamName + "\t" + dataRanking.role + "\t" + dataRanking.vsrPoints + "\t" + dataRanking.xpLevel + "\n";
        }
        return stringToCopy;
    }
    
    // Ranking Michel
    function ranking(button) {
        divVRRanking.innerHTML = "<p></p><p align='center' style ='font-size:15px'>Pas de données à afficher !</p>"
        switch (button.srcElement.id) {
            case "lbl_VSR":
				divVRRanking.innerHTML = "<p align='center' style ='font-size:15px'>Ouvrir le classement VSR sur la page d'accueil de l\'UI pour voir le classement ici !<br>Faire défiler les pages pour avoir plus de boats</p>";
                if (VSRRank.table.length != 0) {
                    origin = 61;
                    divVRRanking.innerHTML += makeVSR_HTML();
                }
                break;
            case "lbl_Season":
				divVRRanking.innerHTML = "<p align='center' style ='font-size:15px'>Ouvrir le classement VSR / Saison sur la page d'accueil de l\'UI pour voir le classement ici !<br>Faire défiler les pages pour avoir plus de boats</p>";
                if (SeasonRank.table.length != 0) {
                    origin = 62;
                    divVRRanking.innerHTML += makeSeason_HTML();
                }
                break;
            case "lbl_HOF":
				divVRRanking.innerHTML = "<p align='center' style ='font-size:15px'>Ouvrir le classement VSR / Team sur la page d'accueil de l\'UI pour voir le classement ici !<br>Faire défiler les pages pour avoir plus de boats</p>";
                if (HOFRank.table.length != 0) {
                    origin = 63;
                    divVRRanking.innerHTML += makeHOF_HTML();
                }
                break;
            case "lbl_HOFRace":
				divVRRanking.innerHTML = "<p align='center' style ='font-size:15px'>Ouvrir le classement de la course / inter-team sur l\'UI pour voir le classement ici !<br>Faire défiler les pages pour avoir plus de teams</p>";
                if (HOFRace.table.length != 0) {
                    origin = 64;
                    divVRRanking.innerHTML += makeHOFRace_HTML();                
                }
                break;
            case "lbl_Races":
				divVRRanking.innerHTML = "<p align='center' style ='font-size:15px'>Ouvrir le classement de la course sur l\'UI pour voir le classement ici !<br>Faire défiler les pages pour avoir plus de boats<br>NB : les noms d\'équipes ne sont pas disponibles</p>";
				if (RaceRank.table.length != 0) {
                    origin = 65;                        
                    divVRRanking.innerHTML += makeRace_HTML();
                }
                break;
            case "lbl_Teams":
				divVRRanking.innerHTML = "<p align='center' style ='font-size:15px'>Ouvrir la liste des teams / Recherche sur la page d'accueil de l\'UI<br>Faire défiler les pages pour avoir plus de teams</p>";
                if (TeamList.table.length != 0) {
                    origin = 66;
                    divVRRanking.innerHTML += makeTeams_HTML();
                }
                break;
            case "lbl_TeamMb":
				divVRRanking.innerHTML = "<p align='center' style ='font-size:15px'>Par défaut : les membres de notre team<br>Pour voir les autres teams / boats : ouvrir la liste des teams / Recherche sur la page d'accueil de l\'UI<br>et sélectionner les teams souhaitées</p>";
                if (TeamMembers.table.length != 0) {
                    origin = 67;
                    divVRRanking.innerHTML += makeTeamMembers_HTML();
                }
                break;    
        }
		
        // Copy data to clipboard
        var el = document.createElement('textarea');
        el.value = stringToCopy;
        el.setAttribute('readonly', '');
        el.style = {position: 'absolute', left: '-9999px'};
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
    }
    // Fin Ranking Michel

    // Fonctions classement Michel    
	function makeVSR_HTML() {
		var title = "VSR - " + VSRRank.dt + " after " + VSRRank.legname;
		sortField = "rank";
		sortFriends(VSRRank);
		stringToCopy = "VSR - " + VSRRank.dt + " after " + VSRRank.legname + "\n";
		stringToCopy += "User ID;Rank;Skipper;Team;Points;\n";
		stringToCopy += Array.from(VSRRank.table || []).map(makeLineToCopy2).join("");                    
		return '<br><table class="tableVSRXP">'
			+ '<thead class="sticky">'
			+ VSRrankingHeader(title)
			+ '</thead>'
			+ '<tbody>'
			+ Array.from(VSRRank.table || []).map(makeVSRranking).join(" ");
			+ '</tbody>'
			+ '</table>';
	}

	function makeSeason_HTML() {
		var title = "VSR Season - " + SeasonRank.dt + " after " + SeasonRank.legname;
		sortField = "rank";
		sortFriends(SeasonRank);
		stringToCopy = "VSR - " + SeasonRank.dt + " after " + SeasonRank.legname + "\n\n";
		stringToCopy += "User ID\tRank\tSkipper\tTeam\tPoints\n";
		stringToCopy += Array.from(SeasonRank.table || []).map(makeLineToCopy2).join("");                    
		return '<p>&nbsp;</p><table class="tableVSRXP">'
			+ '<thead class="sticky">'
			+ SeasonrankingHeader(title)
			+ '</thead>'
			+ '<tbody>'
			+ Array.from(SeasonRank.table || []).map(makeSeasonranking).join(" ");
			+ '</tbody>'
			+ '</table>';
	}

	function makeHOF_HTML() {
        var title = "VSR Team - " + HOFRank.dt + " after " + HOFRank.legname;
		sortField = "rank";
		sortFriends(HOFRank);
		stringToCopy = "VSR Team - " + HOFRank.dt + "\n\n";
		stringToCopy += "Team ID\tRank\tTeam\tPoints\n";
		stringToCopy += Array.from(HOFRank.table || []).map(makeLineToCopy2).join("");                    
		return '<table class="tableHOF">'
			+ '<thead class="sticky">'
			+ HOFrankingHeader(title)
			+ '</thead>'
			+ '<tbody>'
			+ Array.from(HOFRank.table || []).map(makeHOFranking).join(" ");
			+ '</tbody>'
			+ '</table>';
	}

	function makeHOFRace_HTML() {
		var title = HOFRace.legName + " (" + Util.formatLongDate(HOFRace.ts) + ")";
		sortField = "rank";
        sortFriends(HOFRace);
		stringToCopy = "VSR Team - " + Util.formatLongDate(HOFRace.ts) + "\n\n";
		stringToCopy += "Team ID\tRank\tTeam\tPoints\tBoats in race\n";
		stringToCopy += Array.from(HOFRace.table || []).map(makeLineToCopy2).join("");                    
		return '<table class="tableHOF">'
			+ '<thead class="sticky">'
			+ HOFRacerankingHeader(title)
			+ '</thead>'
			+ '<tbody>'
			+ Array.from(HOFRace.table || []).map(makeHOFRaceranking).join(" ");
			+ '</tbody>'
			+ '</table>';
	}

	function makeRace_HTML() {
		if (RaceRank.legName) {
            var title = RaceRank.legName + " (" + Util.formatLongDate(RaceRank.ts) + ")";            
            stringToCopy = RaceRank.legName + " (" + Util.formatLongDate(RaceRank.ts) + ")\n";
        } else {
            var title = "";
        }
		sortField = "rank";
		sortFriends(RaceRank);
		stringToCopy += "User ID;rank;Skipper;Team;Gap;VSR Points;Credits (anciens);\n";
		stringToCopy += Array.from(RaceRank.table || []).map(makeLineToCopy2).join("");

		return '<table class="tableRaceRanking">'
			+ '<thead class="sticky">'
			+ RacerankingHeader(title)
			+ '</thead>'
			+ '<tbody>'
			+ Array.from(RaceRank.table || []).map(makeRaceranking).join(" ");
			+ '</tbody>'
			+ '</table>';
	}

	function makeTeams_HTML() {
		var title = "Team List";
		sortFriends(TeamList);
		stringToCopy += "Team\tSize\tDescription\n";
		stringToCopy += Array.from(TeamList.table || []).map(makeLineToCopy2).join("");                    
		return '<table class="tableTeams">'
			+ '<thead class="sticky">'
			+ TeamListHeader(title)
			+ '</thead>'
			+ '<tbody>'
			+ Array.from(TeamList.table || []).map(makeTeamList).join(" ");
			+ '</tbody>'
			+ '</table>';
	}

	function makeTeamMembers_HTML() {
		var title = "Team Members";
		sortFriends(TeamMembers);
		stringToCopy += "ID\tSkipper\tTeam\tRôle\tVSR Pts\tLevel\n";
		stringToCopy += Array.from(TeamMembers.table || []).map(makeLineToCopy2).join("");                    
		return '<table class="tableTeamsMb">'
			+ '<thead class="sticky">'
			+ TeamMemberstHeader(title)
			+ '</thead>'
			+ '<tbody>'
			+ Array.from(TeamMembers.table || []).map(makeTeamMembersList).join(" ");
			+ '</tbody>'
			+ '</table>';
	}    
    // Fin fonctions classement Michel

    // Tab Waypoints - Michel
    function makeWaypointsHTML (rf) {
        if (rf === undefined) {
             "No friend positions received yet";
        } else {
            sortFriends(rf);
            var WaypointsHTML =
                '<table>'
                + '<thead class="sticky">'
                + friendWaypointsHeader()
                + '</thead>'
                + '<tbody>'
                + Array.from(rf.table || []).map(makeFriendWaypoints, rf).join(" ");
                + '</tbody>'
                + '</table>';
            divWaypointsList.innerHTML = WaypointsHTML;
        }
    }
    // Fin Tab Waypoints
    
    function makeTableHTML(r) {
        // Modif Michel - display: none pour date locale / UTC
        if (cbLocalTime.checked) {
            var timeHidden = "display: none;";
            var timeLocalHidden = "";
        } else {
            var timeHidden = "";
            var timeLocalHidden = "display: none;";
        }
        // Fin Modif Michel

        return '<style>'                    // Modif Michel
            + '#UTC {' + timeHidden + '}'
            + '#UTCLocal {' + timeLocalHidden + '}'
            + '</style>'                    // Fin Modif Michel
            + '<table>'
            + '<thead class="sticky">'
            + tableHeader()
            + '</thead>'
            + '<tbody>'
            + (r === undefined ? "" : r.tableLines.join(" "))
            + '</tbody>'
            + '</table>';
    }

	//***************************
	//* Préparation des données *
	//***************************

    // mergeBoatInfo
    //
    // Boat info comes from two sources:
    // - fleet messages
    // - boatinfo messages
    // We store all the information in one place and update fields,
    // assuming same-named fields have the same meaning in both messages.
	
    var elemList = ["_id",                                     //  boatinfo
                    "userId",                                  //  getfleet 
                    "baseInfos",                               //  UserCard - .team.name
                    "boat",                                    //  baotinfo, fleet
                    "displayName",                             //  boatinfo, fleet
                    "distanceFromStart",                       //  boatinfo
                    "distanceToEnd",                           //  boatinfo
                    "extendedInfos",                           //  UserCard, fleet (real boat)
                    "isFollowed",                              //  UserCard, fleet
                    "followed",                                //  fleet
                    "fullOptions",                             //  boatinfo
                    "gateGroupCounters",                       //  boatinfo
                    "hasPermanentAutoSails",                   //  boatinfo
                    "heading",                                 //  boatinfo, fleet
                    "isRegulated",                             //  boatinfo, UserCard
                    "lastCalcDate",                            //  boatinfo, fleet
                    "legStartDate",                            //  boatinfo
                    "mode",
                    "options",                                 //  boatinfo
                    "personal",                                //  boatinfo
                    "pos",                                     //  boatinfo, fleet
                    "rank",                                    //  boatinfo, fleet
                    "sail",                                    //  boatinfo, fleet (null)
                    "speed",                                   //  boatinfo, fleet
                    "startDate",                               //  boatinfo, fleet (null)
                    "state",                                   //  boatinfo, fleet, UserCard (!= boatinfo state!)
                    // Don't copy team &  teamnane, special handling.
                    "team",                                 //  fleet
                    "teamname",                             //  UserCard.baseInfos, AccountDetails
                    "track",                                   //  [track], fleet
                    "tsRecord",
                    "tsEndOfAutoSail",                         //  ?
                    "tsLastEngine",                            //  boatinfo
                    "twa",                                     //  boatinfo, fleet (null)
                    "tws",                                     //  boatinfo, fleet (null)
                    "type",                                    //  boatinfo, fleet (normal, real, certified, top, sponsor)
                    "type2",                                   //  (team, followed, certified, normal, real)
                    "choice",
                    "twd",                                     //
                    "vmg",                                     // 
                    "action",                                  //  WP, heading or autoTwa...
                    "race_id",
                    "user_id",
                    "preferredMapPreset",                      //  boatinfo
                    "waypoints",                               //  boatinfo    
				    "stamina"                                 //  boatinfo
                   ];

    function mergeBoatInfo (rid, mode, uid, data) {
        var fleet = raceFleetMap.get(rid);

        if (!fleet) {
            console.log("raceInfo not initialized");
            return;
        }

        var race = races.get(rid);
        lbBoattype.innerHTML = race.curr.boat.label;
        
        var storedInfo = fleet.uinfo[uid];
        var boatPolars = (data.boat) ? polars[data.boat.polar_id] : undefined;

        if (!storedInfo) {
            storedInfo = new Object();
            fleet.uinfo[uid] = storedInfo;
            fleet.table.push(uid); 
        }

        if (mode == "usercard") {
            if( storedInfo.choice == true) {
                storedInfo.choice == false;    
            } else {
                storedInfo.choice = true;
            }
            storedInfo.isRegulated = false;
        }

        if (data.team && data.team.name) {
            storedInfo.teamname = data.team.name;
        } else if (data.team) {
            storedInfo.team = data.team;
            storedInfo.teamname = currentTeam;
        }

        // copy elems from data to uinfo
        elemList.forEach( function (tag) {
            if (tag in data && (data[tag] || data[tag] == 0)) { // Manel sur info Phil v6.0.5
                storedInfo[tag] = data[tag];
                if (tag == "baseInfos") {
                    storedInfo.displayName = data["baseInfos"].displayName;
                } else if (tag == "pos") { // calc gc distance to us
                    storedInfo.distanceToUs = Util.roundTo(Util.gcDistance(race.curr.pos, data.pos), 1+nbdigits);
                    storedInfo.bearingFromUs = Util.roundTo(Util.courseAngle(race.curr.pos.lat, race.curr.pos.lon, data.pos.lat, data.pos.lon) * 180 / Math.PI, 1+nbdigits);
                    var ad = storedInfo.bearingFromUs - race.curr.heading + 90;
                    if (ad < 0) ad += 360;
                    if (ad > 360) ad -= 360;
                    if (ad > 180) storedInfo.distanceToUs = -storedInfo.distanceToUs; // "behind" us
                }
            }
        });

        fixMessageData(storedInfo, uid);

        if (boatPolars) {
            // var sailDef = getSailDef(boatPolars.sail, data.sail % 10);
            var sailDef = boatPolars.sail[data.sail % 10 - 1];

            // "Real" boats have no sail info
            // "Waiting" boats have no TWA
            if (data.state == "racing" && sailDef && data.twa && data.tws) {
                var iA = fractionStep(data.twa, boatPolars.twa);
                var iS = fractionStep(data.tws, boatPolars.tws);

                // "Plain" speed
                var speedT = pSpeed(iA, iS, sailDef.speed);
                // Speedup factors
                var foilFactor = foilingFactor(["foil"], data.tws, data.twa, boatPolars.foil);
                var hullFactor = boatPolars.hull.speedRatio;

                // Explain storedInfo.speed from plain speed and speedup factors
                explain(storedInfo, foilFactor, hullFactor, speedT);
            }
        } else {
            storedInfo.xplained = true;
            storedInfo.xfactor = 1.0;
            storedInfo.xoption_foils = "---";
            storedInfo.xoption_options = "---";
        }
        if (data["rank"] > 0) storedInfo["rank"] = data["rank"];

        // Ajout Michel - Calcul TWD
        if (storedInfo.twa !== 0) {
            storedInfo.twd = storedInfo.twa + storedInfo.heading;
            if (storedInfo.twd < 0) {
                storedInfo.twd = 360 + storedInfo.twd;
            }
        } else {
            storedInfo.twd = "-";
        }
        
        // Ajout Michel - Calcul VMG
        storedInfo.vmg = Math.abs(storedInfo.speed * Math.cos(Util.toRad(storedInfo.twa)));
        
        // Ajout Michel - type2 pour tri par catégories
        if (storedInfo.team) {
            storedInfo.type2 = "team";
        } else if (storedInfo.followed || storedInfo.isFollowed) {
            storedInfo.type2 = "followed";
        } else {
            storedInfo.type2 = storedInfo.type;  
        }
		
		// Ajout Michel - Team à partir d'un CSV
        storedInfo.teamnameCSV = teamnameCSV[data.userId];
        // storedInfo.teamCSV = teamCSV[data.userId];
    }

    function fixMessageData (message, userId) {
        if (message.type == "pilotBoat") {
            message.displayName = "Frégate";
        } else if (message.type == "real") {
            message.displayName = message.extendedInfos.boatName;
            message.rank = message.extendedInfos.rank;
        }
        message.tsRecord = message.lastCalcDate || Date.now();
    }

	//************************
	//* fonctions de calculs *
	//************************

    function initFoils (boatData) {
        if (boatData.options) {
            for (const feature of boatData.options) {
                if (feature == "foil") {
                    return "0%";
                }
            }
            return "no";
        } else {
            return "?";
        }
    }

    function explain (info, foilFactor, hullFactor, speedT) {
        info.xfactor = info.speed / speedT;
        info.xoption_foils = initFoils(info);
        info.xoption_options = "---";
        info.xplained = false;
        var foils = ((foilFactor - 1) * 100) / 4 * 100;
        if (epsEqual(info.xfactor, 1.0)) {
            // Speed agrees with "plain" speed.
            // Explanation: 1. no hull and 2. foiling condition => no foils.
            info.xplained = true;
            // info.xoption_options = "no";
            if (foilFactor > 1.0) {
                info.xoption_foils = "no";
            }
        } else {
            // Speed does not agree with plain speed.
            // Check if hull, foil or hull+foil can explain the observed speed.
            if (epsEqual(info.speed, speedT * hullFactor)) {
                info.xplained = true;
                if (epsEqual(hullFactor, foilFactor)) {
                    // Both hull and foil match.
                    // info.xoption_options = "(hull), ?";
                    info.xoption_foils = "(" + Util.roundTo(foils, 0) + "%)";
                } else {
                    // info.xoption_options = "hull, ?";
                    if (foilFactor > 1.0) {
                        info.xoption_foils = "no";
                    }
                }
            } else if (epsEqual(info.speed, speedT * foilFactor)) {
                info.xplained = true;
                // info.xoption_options = "hull=no, ?";
                info.xoption_foils = Util.roundTo(foils, 0) + "%";
            } else if (epsEqual(info.speed, speedT * foilFactor * hullFactor)) {
                info.xplained = true;
                // info.xoption_options = "hull, ?";
                info.xoption_foils = Util.roundTo(foils, 0) + "%";
            }
        }

        if (info.fullOptions === true) {
            info.xoption_options = "Full Pack";
        } else if (info.options) {
            if (info.options.length == 8) {
                info.xoption_options = "All Options";
            } else {
                var opt_sail = "[";
                var opt_perf = "[";
                var opt_Tsail;
                var opt_Tperf;
                for (const opt of info.options) {
                    if (opt == "light") opt_sail += "Li,"; opt_Tsail += "Light,";
                    if (opt == "reach") opt_sail += "C0,"; opt_Tsail += "Reach,";
                    if (opt == "heavy") opt_sail += "He,"; opt_Tsail += "Heavy,";
                    if (opt == "winch") opt_perf += "W,"; opt_Tperf += "Winch,";
                    if (opt == "foil") opt_perf += "F,"; opt_Tperf += "foil,";
                    if (opt == "hull") opt_perf += "P,"; opt_Tperf += "hull,";
                }
                opt_sail = opt_sail.substring(0,opt_sail.length-1);
                opt_perf = opt_perf.substring(0,opt_perf.length-1);
                if (opt_sail.length != "") opt_sail += "]";
                if (opt_perf.length != "") opt_perf += "]";                
                info.xoption_options = opt_sail + " " + opt_perf /*+ " " + vip*/;
            }
        }
    }

	function epsEqual (a, b) {
		return Math.abs(b - a) < 0.00001;
	}

    function sortFriends(fleet) {
        if (sortField != "none" || origin >= 5) {
            sortFriendsByField(fleet, sortField);
        } else {
            sortFriendsByCategory(fleet);
        }
    }

    function sortFriendsByField (rf, field) {
        rf.table.sort(function (uidA, uidB) {
            // Check if we have values at all
            if (rf.uinfo[uidA] == undefined && rf.uinfo[uidB] == undefined) return 0;
            if (rf.uinfo[uidB] == undefined) return -1;
            if (rf.uinfo[uidA] == undefined) return 1;

            // Fetch value of sort field and convert to number.
            var entryA = rf.uinfo[uidA][field];
            var entryB = rf.uinfo[uidB][field];

            // Prefer defined values over undefined values
            if (entryA == undefined && entryB == undefined) return 0;
            if (entryB == undefined) return -1;
            if (entryA == undefined) return 1;

            // Cast to number if possible
            entryA = numeric(entryA);
            entryB = numeric(entryB);

            // Compare values.
            if (currentSortOrder == 0) {
                if (entryA < entryB) return -1;
                if (entryA > entryB) return 1;
            } else {
                if (entryA > entryB) return -1;
                if (entryA < entryB) return 1;
            }
            return 0;
        });
    }

    function numeric (s) {
        var r = String(s);
        if ( r.substr(0, 1) == "(" ) {
            r = r.slice(1, -1);
        }
        if ( isNaN(r) ) {
            r = r.toUpperCase();
        } else {
            r = Number(r);
        }
        return r;
    }

    // generate sorted list, expire old entries
    function sortFriendsByCategory (fleet) {
        var fln = new Array();

        function sortPrio (uinfo) {
            return category2.indexOf(uinfo.type2);
        }

        Object.keys(fleet.uinfo).forEach( function (key) {
            fln.push(key);
        });

        fln.sort(function (a, b) {
            var au = fleet.uinfo[a];
            var bu = fleet.uinfo[b];
            // Team before opponents
            if (au.team == bu.team) {
                if (sortPrio(au) == sortPrio(bu)) {
                    if (au.rank == bu.rank) {
                        return (au.displayName && au.displayName.localeCompare(bu.displayName)) || 0;
                    } else if (au.rank < bu.rank) {
                        return -1;
                    } else {
                        return 1;
                    }
                } else if ( sortPrio(au) < sortPrio(bu) ) {
                    return -1;
                } else {
                    return 1;
                }
            } else if (au.team) {
                return -1;
            } else {
                return 1;
            }
        });
        fleet.table = fln;
    }

    function updateFleet (rid, mode, data) {
        var fleet = raceFleetMap.get(rid);
        data.forEach(function (message) {
            mergeBoatInfo(rid, mode, message.userId, message);
        });
        sortFriends(fleet);
    }

    function readTextFile(file) {
        var csvFile;
        var fileToRead = new XMLHttpRequest();
        fileToRead.open("GET", file, false);
        fileToRead.onreadystatechange = function (){
            if (fileToRead.readyState === 4) {
                if (fileToRead.status === 200 || fileToRead.status == 0) {
                    csvFile = fileToRead.responseText;
                } else {
                    alert("Fichier CSV non trouvé !");
                }
			}
        }
		fileToRead.send(null);
		return csvFile;
	}

    // Ajout Michel - Date pour races ranking
    function formatDHMSRanking(seconds) {
        if (seconds === undefined || isNaN(seconds) || seconds < 0) {
            return "-";
        }

        seconds = Math.floor(seconds / 1000);

        var days = Math.floor(seconds / 86400);
        var hours = Math.floor(seconds / 3600) % 24;
        var minutes = Math.floor(seconds / 60) % 60;
        var sec = seconds - ((days * 86400) + (hours * 3600) + (minutes * 60)); 

        if (seconds < 60) {
            var rkDate = Util.pad0(sec) + "s";
        } else if (seconds < 3600) {
            var rkDate = minutes + "m " + Util.pad0(sec) + "s";
        } else if(seconds < 86400) {
            var rkDate = hours + "h " + Util.pad0(minutes) + "m " + Util.pad0(sec) + "s";
        } else {
            var rkDate = days + "d " + Util.pad0(hours) + "h " + Util.pad0(minutes) + "m " + Util.pad0(sec) + "s";
        }
        return rkDate;
    }
    // Michel - Date coutes (Last Update, Start Date)
    function formatShortDate(ts) {
        var tsOptions = {
            month: "numeric",
            day: "numeric",
            hour: "numeric",
            minute: "numeric",
            hour12: false
        };
        var d = (ts) ? (new Date(ts)) : (new Date());
        if (!cbLocalTime.checked) {
            tsOptions.timeZone = "UTC";
        }
        var d = new Date(ts);
        return new Intl.DateTimeFormat("lookup", tsOptions).format(d);
    }

    function dateUTC() {
       var options = {
            year: "numeric",
            timeZoneName: "short"
        };
        if (cbLocalTime.checked) {} else {
            options.timeZone = "UTC";
        }
        var str = new Intl.DateTimeFormat("lookup", options).format(new Date());
        var res = str.substring(5);
        return  '<span id="small">&nbsp;(' + res + ')</span>';
    }

    function formatTime(ts) {
        var tsOptions = {
            hour: "numeric",
            minute: "numeric",
            second: "numeric",
            hour12: false
        };
        var d = (ts) ? (new Date(ts)) : (new Date());
        if (!cbLocalTime.checked) {
            tsOptions.timeZone = "UTC";
        }
        return new Intl.DateTimeFormat("lookup", tsOptions).format(d);
    }

    // Ajout Michel - Select KMZ
    async function setKmz() {
        var race = races.get(selRace.value);
        var raceName = race.name.remAcc();
        var map = race.gmap;
        for (var i = 1; i <= 4; i++) {
            if(race.kmzLayer[i]) race.kmzLayer[i].setMap(null);            
        }
        race.kmz = selBlocKmz.selectedIndex;
        console.log("Selected KMZ : " +  race.kmz + " (" + selBlocKmz.value +")");    
        
        // Affichage KMZ
        if (race.kmz != 0) {
            for (var i = 1; i <= 4; i++) {
				var kmzUrl = "http://team.bsp.free.fr/blocs_kmz_2022/geoblocs/" + race.kmz + "-Bloc" + i + ".kmz?a="+Date.now();
                if (await fileExist(kmzUrl) == false){
                    kmzUrl = "";
                }                
                race.kmzLayer[i] = new google.maps.KmlLayer({
                    url: kmzUrl,
                    preserveViewport: true
                });
                race.kmzLayer[i].setMap(map);
            }
        }
    }    

    // Ajout Michel - Notifications
    function setNotif() {        
        if (lbRaceNotif.value == "---") {
            alert ("Enregistrememnt impossible, sélectionnez une course !");
            return;
        }

        if (lbMinNotif.value) {    
            var nText = "<p><b>" + lbRaceNotif.value + " :</b> rappel vers " + Perso.formatTimeNotif(Date.now() + lbMinNotif.value * 60000) + " (heure locale).</p>";
            notifications.push({race: lbRaceNotif.value,
                                time: Date.now() + lbMinNotif.value * 60000,
                                repet: 0,
                                text: nText
                               }); 
        }

        if (lbType1Notif.value != "---" && lbType2Notif.value != "---" && lbValNotif.value) {
            var nTime;
            var nText = "<p><b>" + lbRaceNotif.value + " :</b> notification si le "
                    + lbType1Notif.value + " est " + lbType2Notif.value + " à " + lbValNotif.value + ".</p>";
            if(lbType1Notif.value == "TWA") {
                var nTWA = Util.roundTo(lbValNotif.value,1);
            } else if (lbType1Notif.value == "HDG") {
                var nHDG = Util.roundTo(lbValNotif.value,1);          
            } else if (lbType1Notif.value == "TWS") {
                var nTWS = Util.roundTo(lbValNotif.value,1);          
            } else if (lbType1Notif.value == "TWD") {
                var nTWD = Util.roundTo(lbValNotif.value,1);          
            } else if (lbType1Notif.value == "Stamina") {
                var nStamina = Util.roundTo(lbValNotif.value,1);   
			}            
            notifications.push({race: lbRaceNotif.value,
                                twa: nTWA,
                                hdg: nHDG,
                                tws: nTWS,
                                twd: nTWD,
								stamina: nStamina,
                                limite: lbType2Notif.value.substring(0,3),
                                repet: 0,
                                text: nText
                               });
        } else if (!lbMinNotif.value) {
            alert ("Enregistrememnt impossible, vérifiez les données !");
            return;
        }
        lbRaceNotif.value = "---";
        lbType1Notif.value = "---";
        lbType2Notif.value = "---";
        lbValNotif.value = "";
        lbMinNotif.value = "";
        afficheNotif();
            
    }


    function afficheNotif() {
        divNotif.innerHTML = "";
        for (var i = 0; i < notifications.length; i++) {
            if(notifications[i].repet < 3) {divNotif.innerHTML += notifications[i].text;}            
        }        
    }
    
    function showNotif(r) {
        function show(i) {     
            var repeat = notifications[i].repet;
            notifications[i].repet = repeat + 1;
            GoNotif(TitreNotif, TextNotif, TextNotifMail, icon, i);
        }
        
        var TitreNotif = r.name;
        var icon = 2;
        
		// Notification Echouement
        if (r.curr.aground == true) {
            TextNotif =  r.curr.displayName + " : vous êtes échoué !";
			TextNotifMail = "*** échoué ***";
            GoNotif(TitreNotif, TextNotif, TextNotifMail, icon);
        }

        // Notification Mauvaise voile
        if (r.curr.badSail == true && r.curr.distanceToEnd > 1) {
			if ( r.curr.lastCalcDate > lastSailAlert ) {
				TextNotif = r.curr.displayName + " : vous naviguez sous mauvaise voile !";
				TextNotifMail = "*** mauvaise voile ***";
				GoNotif(TitreNotif, TextNotif, TextNotifMail, icon);
				lastSailAlert = r.curr.lastCalcDate + delaiSailAlert;
			}	
        }

		// Notifications demandées par l'utilisateur
        for (var i = 0; i < notifications.length; i++) {
            var icon = 1;
            if(notifications[i].race == r.name && notifications[i].repet < 3){
                // Notification type rappel horaire
                // 300000 millisecondes = 5 minutes
                if (Date.now() > notifications[i].time - 300000 && Date.now() < notifications[i].time + 600000) {
                    var icon = 3;
                    TextNotif =  r.curr.displayName + " : rappel programmé à " + Perso.formatTimeNotif(notifications[i].time) + " !";
					TextNotifMail = "*** notification rappel programmé ***";
                    show(i);
                }
                
                // Notification type TWA
                if (notifications[i].twa) {
					TextNotifMail = "*** notification TWA ***";
                    if (notifications[i].limite == "inf" && Util.roundTo(Math.abs(r.curr.twa), 1) <= notifications[i].twa) {
                        TextNotif =  r.curr.displayName + " : votre TWA est inférieur à " + notifications[i].twa + ".";
                        show(i);
                    } else if (notifications[i].limite == "sup" && Util.roundTo(Math.abs(r.curr.twa), 1) >= notifications[i].twa) {
                        TextNotif =  r.curr.displayName + " : votre TWA est supérieur à " + notifications[i].twa + ".";
                        show(i);
                    }    
                }

                // Notification type HDG
                if (notifications[i].hdg) {
					TextNotifMail = "*** notification HDG ***";
                    if (notifications[i].limite == "inf" && Util.roundTo(Math.abs(r.curr.heading), 1) <= notifications[i].hdg) {
                        TextNotif =  r.curr.displayName + " : votre cap est inférieur à " + notifications[i].hdg + ".";
                        show(i);
                    } else if (notifications[i].limite == "sup" && Util.roundTo(Math.abs(r.curr.heading), 1) >= notifications[i].hdg) {
                        TextNotif =  r.curr.displayName + " : votre cap est supérieur à " + notifications[i].hdg + ".";
                        show(i);
                    }    
                }            

                // Notification type TWS
                if (notifications[i].tws) {
					TextNotifMail = "*** notification TWS ***";
                    if (notifications[i].limite == "inf" && Util.roundTo(Math.abs(r.curr.tws), 1) <= notifications[i].tws) {
                        TextNotif =  r.curr.displayName + " : la force du vent est inférieure à " + notifications[i].tws + ".";
                        show(i);
                    } else if (notifications[i].limite == "sup" && Util.roundTo(Math.abs(r.curr.tws), 1) >= notifications[i].tws) {
                        TextNotif =  r.curr.displayName + " : la force du vent est supérieure à " + notifications[i].tws + ".";
                        show(i);
                    }    
                }            

                // Notification type STAMINA
                if (notifications[i].stamina) {
					TextNotifMail = "*** notification STAMINA ***";
                    if (notifications[i].limite == "inf" && Util.roundTo(Math.abs(r.curr.stamina), 1) <= notifications[i].stamina) {
                        TextNotif =  r.curr.displayName + " : la stamina est inférieure à " + notifications[i].stamina + ".";
                        show(i);
                    } else if (notifications[i].limite == "sup" && Util.roundTo(Math.abs(r.curr.stamina), 1) >= notifications[i].stamina) {
                        TextNotif =  r.curr.displayName + " : la stamina est supérieure à " + notifications[i].stamina + ".";
                        show(i);
                    }    
                }
				
                // Notification type TWD
                if (notifications[i].twd) {
					extNotifMail = "*** notification TWD ***";
                    if (notifications[i].limite == "inf" && Util.roundTo(Math.abs(r.curr.twd), 1) <= notifications[i].twd) {
                        TextNotif =  r.curr.displayName + " : la direction du vent est inférieure à " + notifications[i].twd + ".";
                        show(i);
                    } else if (notifications[i].limite == "sup" && Util.roundTo(Math.abs(r.curr.twd), 1) >= notifications[i].twd) {
                        TextNotif =  r.curr.displayName + " : la direction du vent est supérieure à " + notifications[i].twd + ".";
                        show(i);
                    }    
                }            
            }
        }
    }
    // Fin ajout Michel - Notifications
    
    function addTableCommandLine (r) {
        r.tableLines.unshift('<tr>'
            + '<td class="time">' + Perso.formatDateUTC(r.lastCommand.request.ts) + '</td>'           // Modif Michel
            + '<td colspan="3">Command @ ' + Perso.formatDateUTC() + '</td>'                             // Modif Michel
            + '<td colspan="16">Actions : ' + printLastCommand(r.lastCommand.request.actions) + '</td>'
            + '</tr>');
        if (r.id == selRace.value) {
            divRecordLog.innerHTML = makeTableHTML(r);
        }
        makeIntegratedHTML();
    }

    function makeTableLine (r) {
        showNotif(r);       // Modification Michel - Notifications
        
        function isDifferingSpeed(speed) {
            return Math.abs(1 - r.curr.speed / speed) > 0.01;
        }

        function isCurrent (timestamp) {
            return (timestamp && (timestamp > r.prev.lastCalcDate));
        }

        function getBG (timestamp) {
            return isCurrent(timestamp) ? ('class="bgLightRed"') : "";
        }

        function isPenalty () {
            return isCurrent(r.curr.tsEndOfSailChange)
                || isCurrent(r.curr.tsEndOfGybe)
                || isCurrent(r.curr.tsEndOfTack);
        }

        nbdigits=(cb2digits.checked?1:0);
        var speedCStyle = "";
        var speedTStyle = "";
        var deltaDist = Util.roundTo(r.curr.deltaD, 2+nbdigits);
        var speedT = "-";
        if (r.curr.speedT) {
			speedT = Util.roundTo(r.curr.speedT.speed, 2+nbdigits) + "&nbsp;(" + r.curr.speedT.sail + ")";
        }

		// Ajout Manel : boost
        var tabBoost = "-";
		var coeffBoost = 0;
		if (r.curr.speedT) {
			coeffBoost = Util.roundTo((r.curr.speedT.boost-1)*100,2+nbdigits);
			if (coeffBoost > 0) {
				tabBoost = coeffBoost + recouvrement(r);
			}
		}
		speedT += "&nbsp" + tabBoost ;
		var boostStyle = "speed1";
        if ( coeffBoost > 1.4) {
            boostStyle = ' class="speed1 bgLightRed"';
        } else if ( coeffBoost > 1.2 ) {
            boostStyle = ' class="speed1 bgLightOrange"';
        } else if ( coeffBoost > 1.0 ) {
            boostStyle = ' class="speed1 bgLightYellow"';
        } else if ( coeffBoost > 0 ) {
            boostStyle = ' class="speed1 bgLightGreen"';
		}
		
		// Fin ajout makeTableHTML

        if (isPenalty()) {
            speedCStyle = 'class="bgLightRed"';
        } else if (isDifferingSpeed(r.curr.speedC)) {
            speedCStyle = 'class="bgYellow"';
        } else if (r.curr.speedT && isDifferingSpeed(r.curr.speedT.speed)) {
            // Speed differs but not due to penalty
            speedTStyle = 'class="bgLightRed"';
        }
        deltaDist = deltaDist + " (" + Util.roundTo(r.curr.deltaD_T, 3) + ")";

		/* manoeuvre */
        var sailChange = Util.formatSeconds(r.curr.tsEndOfSailChange - r.curr.lastCalcDate);
        var gybing = Util.formatSeconds(r.curr.tsEndOfGybe - r.curr.lastCalcDate);
        var tacking = Util.formatSeconds(r.curr.tsEndOfTack - r.curr.lastCalcDate);
		var bgClassSail = (sailChange == "-") ? 'class="sail"' : 'class="sail bgLightRed"';
		var bgClassGybing = (gybing == "-") ? 'class="gybe"' : 'class="gybe bgLightRed"';		
		var bgClassTacking = (tacking == "-") ? 'class="tack"' : 'class="tack bgLightRed"';


		// Stamina et time to 100%
		var stam = r.curr.stamina;
		var rtws = (r.curr.tws >=30) ? 1 : bezier(r.curr.tws / 30);
		var timeTo100 = ( stam == 100 ) ? "" : '&nbsp;'+(( 100 - stam ) * (5 + 10 * rtws )).toFixed(0);

        return '<tr>'
            + '<td class="time">' + Perso.formatDateUTC(r.curr.lastCalcDate) + '</td>'
            + commonTableLines(r)
            + '<td class="speed1">' + Util.roundTo(r.curr.speed, 2+nbdigits) + '</td>'
            + '<td class="speed2" ' + speedCStyle + '>' + Util.roundTo(r.curr.speedC, 2+nbdigits) + " (" + sailNames[(r.curr.sail % 10)] + ")" + '</td>'
            + '<td ' + boostStyle + '>' + speedT + '</td>' // Modif Manel
			+ '<td class="foils">' + (r.curr.speedT ? (Util.roundTo(r.curr.speedT.foiling, 0) + "%") : "-") + '</td>'
            + '<td class="deltaD" ' + speedTStyle + '>' + deltaDist + '</td>'
            + '<td class="deltaT">' + Util.roundTo(r.curr.deltaT, 0) + '</td>'
            + '<td class="position">' + Util.formatPosition(r.curr.pos.lat, r.curr.pos.lon) + '</td>'
            + '<td ' + bgClassSail + '>' + sailChange + '</td>'
            + '<td ' + bgClassGybing + '>' + gybing + '</td>'
            + '<td ' + bgClassTacking + '>' + tacking + '</td>'
            + '</tr>';
    }

    function saveMessage (r) {
        var newRow = makeTableLine(r);
        r.tableLines.unshift(newRow);
        if (r.id == selRace.value) {
            divRecordLog.innerHTML = makeTableHTML(r);
        }
    }

    function updateFleetFilter (race) {
        nbdigits=(cb2digits.checked?1:0);
        updateFleetHTML(raceFleetMap.get(selRace.value));
        makeWaypointsHTML(raceFleetMap.get(selRace.value));
    }

    function changeRace (raceId) {
        if (typeof raceId === "object") { // select event
            raceId = this.value;
        }

        var race = races.get(raceId);
        lbBoattype.innerHTML = race.curr.boat.label;
        selBlocKmz.selectedIndex=race.kmz;
        divRaceStatus.innerHTML = makeRaceStatusHTML();
        divRecordLog.innerHTML = makeTableHTML(race);
        updateFleetHTML(raceFleetMap.get(raceId));
		buildlogBookHTML(race);
        makeWaypointsHTML(raceFleetMap.get(selRace.value));
        switchMap(race);
    }

    function getRaceLegId (id) {
        // work around for certain messages (Game_GetOpponents)
        if (id.raceId) {
            return id.raceId + "." + id.legNum;
        } else {
            if (id.leg_num) {
                return id.race_id + "." + id.leg_num;
            } else if (id.num) {
                return id.race_id + "." + id.num;
            } else {
                alert("Unknown race id format");
                return undefined;
            }
        }
    }

    function legId (legInfo) {
        return legInfo.raceId + "." + legInfo.legNum;
    }

    function clearLog () {
        divRawLog.innerHTML = "";
    }

    function tableClick (ev) {
        var call_rt = false;
		var call_rz = false;
		var call_ra = false;
		var call_rb = false;
        var call_wi = false;
        var call_pl = false;
		var call_py = false;
        var call_wp = false;
        var friend = false;
        var trackWP = false;
        var tabsel = false;
        var cbox = false;
        var dosort = true;
        var rmatch;
        var re_rtsp = new RegExp("^rt:(.+)"); // Call-Zezo
        var re_rzen = new RegExp("^rz:(.+)"); // Call VR-Zen
        var re_rsar = new RegExp("^ra:(.+)"); // Call LaSardine
		var re_rbts = new RegExp("^rb:(.+)"); // Call BitSailor
        var re_polr = new RegExp("^pl:(.+)"); // Call-Polars
        var re_ityc = new RegExp("^py:(.+)"); // Call-ityc.fr
        var re_wisp = new RegExp("^wi:(.+)"); // Weather-Info
        var re_wpts = new RegExp("^wp:(.+)"); // Tracks-WP
        var re_rsel = new RegExp("^rs:(.+)"); // Race-Selection
        var re_usel = new RegExp("^ui:(.+)"); // User-Selection
        var re_tsel = new RegExp("^ts:(.+)"); // Tab-Selection
        var re_cbox = new RegExp("^sel_(.+)"); // Checkbox-Selection

        var ev_lbl = ev.target.id;

        switch (ev_lbl) {
        case "th_name":
            sortField = "displayName";
            break;
        case "th_sta":
            sortField = "stamina";
            break;
		case "th_rank":
            sortField = "rank";
            break;
        case "th_lu":
            sortField = "lastCalcDate";
            break;
        case "th_sd":
            sortField = "startDate";
            break;
        case "th_eRT":
            sortField = "eRT";
            break;
        case "th_avgS":
            sortField = "avgSpeed";
            break;
        case "th_dtf":
            sortField = "dtf";
            break;
        case "th_dtu":
            sortField = "distanceToUs";
            break;
        case "th_state":
            sortField = "state";
            break;
        case "th_hdg":
            sortField = "heading";
            break;
        case "th_twa":
            sortField = "twa";
            break;
        case "th_tws":
            sortField = "tws";
            break;
        case "th_speed":
            sortField = "speed";
            break;
        case "th_sail":
            sortField = "sail";
            break;
        case "th_twd":
            sortField = "twd";
            break;
        case "th_name2":
            sortField = "userName";
            break;
        case "th_teamname":
            sortField = "teamName";
            break;
        case "th_teamsize":
            sortField = "teamsize";
            break;
        case "th_gender":
            sortField = "gender";
            break;
        case "th_gender2":
            sortField = "genderType";
            break;
        case "th_flag2":
            sortField = "country";
            break;
        case "th_flag":
            sortField = "dispCountry";
            break;
        case "th_role":
            sortField = "role";
            break;
        case "th_last":
            sortField = "last";
            break;
        case "th_type":
            sortField = "type";
            break;
        case "th_level":
            sortField = "vsrLevel";
            break;
        case "th_vsr":
            sortField = "vsrPoints";
            break;
        case "th_RaceTime":
            sortField = "RaceTime";
            break;
        case "th_vmg":
            sortField = "vmg";
            break;
        case "th_options":
            sortField = "xoption_options";
            break;
        case "th_rt":
        case "th_brg":
        case "th_psn":
        case "th_foils":
            sortField = "none";
            break;
        default:
            dosort = false;
        }

        // Sort friends table
        if (dosort) {
            if (sortField == currentSortField) {
                currentSortOrder = 1 - currentSortOrder;
            } else {
                currentSortField = sortField;
                currentSortOrder = 0;
            }            
            if (origin == 2) {
                updateFleetHTML(raceFleetMap.get(selRace.value));
            } else if (origin == 5) {
                makeWaypointsHTML(raceFleetMap.get(selRace.value));
            } else if (origin == 61) {
                divVRRanking.innerHTML = makeVSR_HTML();
            } else if (origin == 62) {
                divVRRanking.innerHTML = makeXP_HTML();
            }  else if (origin == 63) {
                divVRRanking.innerHTML = makeHOF_HTML();
            }  else if (origin == 64) {
                divVRRanking.innerHTML = makeHOFRace_HTML();
            }  else if (origin == 65) {
                divVRRanking.innerHTML = makeRace_HTML();
            }  else if (origin == 66) {
                divVRRanking.innerHTML = makeTeams_HTML();
            }  else if (origin == 67) {
                divVRRanking.innerHTML = makeTeamMembers_HTML();
            }  else if (origin == 68) {
                divVRRanking.innerHTML = makeFleet_HTML();
            }
        }

        for (var node = ev.target; node; node = node.parentNode) {
            var id = node.id;
            var match;
            if (re_rtsp.exec(id)) {
                call_rt = true;
			} else if (re_rzen.exec(id)) {
                call_rz = true;
			} else if (re_rsar.exec(id)) {
                call_ra = true;
			} else if (re_rbts.exec(id)) {
                call_rb = true;
            } else if (re_polr.exec(id)) {
                call_pl = true;
            } else if (re_ityc.exec(id)) {
                call_py = true;
			} else if (re_wisp.exec(id)) {
                call_wi = true;
            } else if (re_wpts.exec(id)) {
                call_wp = true;
                trackWP = true;
                match = re_wpts.exec(id);
                rmatch = match[1];
            } else if (match = re_rsel.exec(id)) {
                rmatch = match[1];
            } else if (match = re_usel.exec(id)) {
                rmatch = match[1];
                friend = true;
            } else if (match = re_tsel.exec(id)) {
                rmatch = match[1];
                tabsel = true;
            } else if (match = re_cbox.exec(id)) {
                rmatch = match[1];
                cbox = true;
            }
        }
        if (rmatch) {
            if (tabsel) {
                // Tab-Selection
                origin = rmatch ;
                display_RZ("hidden");
                display_Kmz("hidden");
                display_selbox("hidden");
                display_Ranking("hidden");
                for (var t = 1; t <= 8; t++) {
                    document.getElementById("tab-content" + t).style.display = (rmatch == t ? "block" : "none");
                }
                if (rmatch == 2) {
                    display_selbox("visible");
                } else if (rmatch == 4) {
                    var race = races.get(selRace.value);
                    initializeMap(race);
                    display_selbox("visible");
                    display_RZ("visible");
                    display_Kmz("visible");
                    // display_Record();
                // } else if (rmatch == 5) {
                } else if (rmatch == 6) {
                    display_Ranking("visible");
                } else if (rmatch == 7) {
                    afficheNotif();
                } else if (rmatch == 8) {
                    buildlogBookHTML(races.get(selRace.value));
                }
            } else if (friend) {
                // Friend-Routing
                if (call_rt) callRouter(selRace.value, rmatch, false);
				if (call_rz) callRZen(selRace.value, rmatch);
            } else if (trackWP) {
                // Selected-tracks
                if (call_wp) callWaypoints(rmatch);
            } else if (cbox) {
                // Skippers-Choice
                changeState(ev_lbl);
                // if (origin == 2) {
                updateFleetHTML(raceFleetMap.get(selRace.value));
                updateMapFleet(races.get(selRace.value));
                makeWaypointsHTML(raceFleetMap.get(selRace.value));
                // }
            } else {
                // Race-Switching
                if (call_wi) callWindy(rmatch, 0); // weather
                if (call_rt) callRouter(rmatch, currentUserId, false);
                if (call_pl) callPolars(rmatch);
                if (call_py) callITYC(rmatch);
				if (call_rz) callRZen(rmatch, currentUserId);
				if (call_ra) callSard(rmatch, currentUserId);
				if (call_rb) callRbts(rmatch, currentUserId);
                enableRace(rmatch, true);
                changeRace(rmatch);
            }
        }
    }

    function callWaypoints(id){
        var rf = raceFleetMap.get(selRace.value);
        if (rf === undefined) {
            "No friend positions received yet";
        } else {
            var race = races.get(selRace.value);
            var map = race.gmap;
            if (id == "ALL"){
                for (var i = 0; i < rf.table.length; i++) {
                    var idx = rf.table[i];
                    rf.uinfo[idx].choice = false;
                }        
                clearTrack(map,"_db_fl");
            } else {
                rf.uinfo[id].choice = false;
                for (var i = 0; i < map["_db_fl"].length; i++) {
                    if (map["_db_fl"][i].userId == id) {
                        map["_db_fl"][i].setMap(null);                                
                    }
                }                        
            }
        }
        makeWaypointsHTML(raceFleetMap.get(selRace.value));
    }
    
    
    
    function changeState(lbl_tochange) {
        var cbxlbl = lbl_tochange.replace("lbl_", "sel_");
        var selectedcbx = document.getElementById(cbxlbl);
        if (selectedcbx.checked) {
            selectedcbx.checked = false;
        } else {
            selectedcbx.checked = true;
        }
    }

    function display_selbox(state) {
        selFriends.style.visibility = state;
    }

    // Ajout Michel - Routage / Ranking / Kmz
    function display_RZ(state) {
        importRoute.style.visibility = state;
    }

    function display_Kmz(state) {
        selBlocKmz.style.visibility = state;
    }

    function display_Ranking(state) {
        makeRanking.style.visibility = state;
    }
    // Fin ajout Michel - Routage / Ranking / Kmz

    function resize(ev) {
        for (var t = 1; t <= 7; t++) {
            var tab = document.getElementById("tab-content" + t);
            tab.style.height = window.innerHeight - tab.getBoundingClientRect().y;
        }
    }

    function enableRace(id, force) {
        for (var i = 0; i < selRace.options.length; i++) {
            if (selRace.options[i].value == id) {
                selRace.options[i].disabled = false;
                if (selRace.selectedIndex == -1 || force) {
                    selRace.selectedIndex = i;
                }
            }
        }
    }

    function renameRace(id, newname) {
        for (var i = 0; i < selRace.options.length; i++) {
            if (selRace.options[i].value == id) {
                selRace.options[i].text = newname;
            }
        }
    }

    function disableRaces() {
        for (var i = 0; i < selRace.options.length; i++) {
            selRace.options[i].disabled = true;
        }
        selRace.selectedIndex == -1;
    }

    function addRace(message) {
        var raceId = getRaceLegId(message._id);
        var race = {
            id: raceId,
            name: "Race #" + raceId,
            source: "tmp"
        };
        initRace(race, false);
        return race;
    }

    function updatePosition(message, r) {
        if (r === undefined) {      // race not lsited
            r = addRace(message);
        }

        if (r.curr !== undefined && r.curr.lastCalcDate == message.lastCalcDate) {
            // Repeated message
            // return;
        }

        if (!r.curr) {
            enableRace(r.id);
        }

        r.prev = r.curr;
        r.curr = message;
        var boatPolars = polars[message.boat.polar_id];
        if (boatPolars == undefined || message.options == undefined || message.tws == undefined) {
        } else {
            r.curr.speedT = theoreticalSpeed(message.tws, message.twa, message.options, boatPolars, message.sail % 10); // Modif Manel
		}
        if (r.prev != undefined) {
            var d = Util.gcDistance(r.prev.pos, r.curr.pos);
            var delta = Util.courseAngle(r.prev.pos.lat, r.prev.pos.lon, r.curr.pos.lat, r.curr.pos.lon);
            var alpha = Math.PI - Util.angle(Util.toRad(r.prev.heading), delta);
            var beta = Math.PI - Util.angle(Util.toRad(r.curr.heading), delta);
            var gamma = Util.angle(Util.toRad(r.curr.heading), Util.toRad(r.prev.heading));
            // Epoch timestamps are milliseconds since 00:00:00 UTC on 1 January 1970.
            r.curr.deltaT = (r.curr.lastCalcDate - r.prev.lastCalcDate) / 1000;
            if (r.curr.deltaT > 0
                && Math.abs(Util.toDeg(gamma) - 180) > 1
                && Util.toDeg(alpha) > 1
                && Util.toDeg(beta) > 1) {
                r.curr.deltaD = d / Math.sin(gamma) * (Math.sin(beta) + Math.sin(alpha));
            } else {
                r.curr.deltaD = d;
            }
            r.curr.speedC = Math.abs(Util.roundTo(r.curr.deltaD / r.curr.deltaT * 3600, 2+nbdigits));
            // deltaD_T = Delta distance computed from speedT is only displayed when it deviates
            if (r.curr.speedT) {
                r.curr.deltaD_T = r.curr.deltaD / r.curr.speedC * r.curr.speedT.speed;
            }
        }
		saveMessage(r); // modif d'après les infos transmises par Phil Ze Cagou
		if (message.gateGroupCounters) {
            r.gatecnt = message.gateGroupCounters;
            updateMapCheckpoints(r);
        }
        divRaceStatus.innerHTML = makeRaceStatusHTML();

		if(cbvrouteur.checked){
            //modif jph
            transmissionajax(message);
            // fin de transmission ajax
        }

    }
	

//modif jph 

function transmissionajax(message)
{

    console.log ('Mise a jour position '+ message+ 'pos '+ message.pos)
    console.log ('message.keys '+Object.keys(message) )
    var raceId = getRaceLegId(message._id);
    var race = races.get(raceId);
    
    // console.log('Race '+Object.keys(race))
    // console.log('state keys '+Object.keys(message['state']))
    // console.log('state 0 : '+Object.keys(message['state']['0']))
    // console.log('state 1 : '+Object.keys(message['state']['1']))
    // console.log('state 2 : '+Object.keys(message['state']['2']))
    // console.log('state 3 : '+Object.keys(message['state']['3']))
    // console.log('state 4 : '+Object.keys(message['state']['4']))
    // console.log('state 5 : '+Object.keys(message['state']['5']))
    // console.log('tslastAction '+message['tsLastAction'])
    // console.log('Message[gateGroupCounters] '+message['gateGroupCounters'])
    // console.log('Boat keys : '+Object.keys(message['boat']))
    // console.log('Boat keys name : '+Object.keys(message['boat']['name']))
    // console.log('DisplayName : '+Object.keys(message['displayName']))
    // console.log('name [0]: '+(message['displayName'][0]))
    // console.log('name [1]: '+(message['displayName'][1]))
    // console.log('name [2]: '+(message['displayName'][2]))

    
    try {
    console.log('rank : '+(message['last_seen_rank']['rank']))
    
    var rank            =message  ['last_seen_rank']['rank']
    console.log('rank '+rank)
}

catch{ rank=9999    // on est dans le cas d un record 
     }
    var name              = concat(message['displayName'])
    console.log ('name en ligne 1327'+name)
    console.log('Race_id'+Object.keys( message ['_id']))
    var racevr            = message ['_id']['race_id']
    var legvr             = message ['_id']['leg_num']
    var lat1              = message ['pos']['lat']
    var lon1              = message ['pos']['lon']
    var twsvr             = message ['tws']
    var twdvr             = message ['twd']
    var twavr             = message ['twa']
    var heading           = message ['heading']
    var speed             = message ['speed']
    var twaAuto           = message ['twaAuto']
    var sail              = message ['sail']
    var stamina           = message ['stamina']
    var lastCalcDate      = message ['lastCalcDate']
    var gateGroupCounters = message['gateGroupCounters']
    var tsEndOfSailChange = message['tsEndOfSailChange']
    var tsEndOfGybe       = message['tsEndOfGybe']
    var tsEndOfTack       = message['tsEndOfTack']
    var tsLastEngine      = message['tsLastEngine']

    if (tsEndOfGybe      ===undefined )       {tsEndOfGybe=lastCalcDate}
    if (tsEndOfSailChange===undefined )       {tsEndOfSailChange=lastCalcDate}
    if (tsEndOfTack      ===undefined )       {tsEndOfTack=lastCalcDate}

    // console.log ('1328 tslastEngine ******         '+tsLastEngine)
    // console.log ('1328 endofgybe  ******         '+lastCalcDate)
    // console.log ('1327 endofgybe  ******         '+tsEndOfGybe)
    // console.log ('1328 endofSailChange  ******   '+tsEndOfSailChange)
    // maintenant=new Date()
    // if (lastCalcDate     ===undefined || lastCalcDate     =='null' )       {lastCalcDate = maintenant}
    // console.log ('1337 endofgybe  ******         '+tsEndOfGybe)
    // console.log ('1338 endofTack  ******         '+tsEndOfTack)
    // console.log ('1335 endofSailChange  ******   '+tsEndOfSailChange)
    // console.log ('1335 LastEngine  ******        '+tsLastEngine)

    var ajax= new XMLHttpRequest();
    var host='http://vrouteur.ddns.net/api/ajax';
    //var host='192.168.0.23:5000/api/ajax';
    var url = host+"?lat="+ lat1
                  +"&lon="+ lon1
                  +"&tws="+ twsvr
                  +"&twd="+ twdvr
                  +"&twa="+ twavr
                  +"&race="+racevr
                  +"&name="+name
                  +"&leg=" +legvr
                  +"&rank="+rank
                  +"&heading="+ heading
                  +"&speed="+ speed
                  +"&twaAuto="+ twaAuto
                  +"&sail="+ sail
                  +"&stamina="+ stamina
                  +"&lastCalcDate="+lastCalcDate
                  +"&gateGroupCounters="+gateGroupCounters
                  +"&tsEndOfSailChange="+tsEndOfSailChange
                  +"&tsEndOfGybe="+tsEndOfGybe
                  +"&tsEndOfTack="+tsEndOfTack
                  +"&gateGroupCounters="+gateGroupCounters

    console.log ('url '+url)
    ajax.open("GET",url)
    ajax.responseType="json"
    ajax.send();

  

    // console.log ("readystate apres new "+ajax.readyState);
    // ajax.onreadystatechange=function()       // detection de changement dans la requete 
    // {console.log ("readystate a change et vaut " +ajax.readyState)} ;
        
    ajax.onload=function()
    {
        console.log ("Appel ajax terminé" )
        console.log ("Status "+this.status)
        if (this.status==200 )
        {
        console.log(this.response)
        } 

    }

}

    function concat(arr){                      //utilitaire a voir si je peux eviter 
    var result=''   
    for(var i = 0; i < arr.length; i++) 
    {result+=arr[i]}
    return result
}

//fin de modif jph  

    function theoreticalSpeed (tws, twa, options, boatPolars, thisSail) {
        var foil = foilingFactor(options, tws, twa, boatPolars.foil);
        var foiling = (foil - 1.0) * 100 / (boatPolars.foil.speedRatio - 1.0);
        var hull = options.includes("hull") ? 1.003 : 1.0;
        var ratio = boatPolars.globalSpeedRatio;
        var twsLookup = fractionStep(tws, boatPolars.tws);
        var twaLookup = fractionStep(twa, boatPolars.twa);
        var speed = maxSpeed(options, twsLookup, twaLookup, boatPolars.sail);
		// Modif Manel, ajout de la voile actuelle (thisSail) pour le calcul de la vitesse
		// ajout Manel : quelle est la vitesse pour la voile actuelle ?
        var speedThisSail = speed.speed;
        if ( thisSail > 0 ) {
            var speedThisSail = thisSailSpeed(options, twsLookup, twaLookup, boatPolars.sail, thisSail);		
        }
		// fin ajout Manel
        return {
            "speed": Util.roundTo(speed.speed * foil * hull * ratio, 3),
            "sail": sailNames[speed.sail],
            "foiling": foiling,
            "boost": speed.speed / speedThisSail, // ajout Manel
            "sailspeed": Util.roundTo(speedThisSail * foil * hull * ratio, 3) //ajout Manel
        };
    }

    function thisSailSpeed(options, iS, iA, sailDefs, thisSail) {
        var speed = 0;
        var sailDef = getSailDef(sailDefs, thisSail);
        var speed = pSpeed(iA, iS, sailDef.speed);
        return speed ;
    }
	
	function maxSpeed(options, iS, iA, sailDefs) {
        var maxSpeed = 0;
        var maxSail = "";
        for (const sailDef of sailDefs) {
            if (sailDef.id === 1
                || sailDef.id === 2
                || (sailDef.id === 3 && options.includes("heavy"))
                || (sailDef.id === 4 && options.includes("light"))
                || (sailDef.id === 5 && options.includes("reach"))
                || (sailDef.id === 6 && options.includes("heavy"))
                || (sailDef.id === 7 && options.includes("light"))) {
                var speed = pSpeed(iA, iS, sailDef.speed);
                if (speed > maxSpeed) {
                    maxSpeed = speed;
                    maxSail = sailDef.id;
                }
            }
        }
        return {
            speed: maxSpeed,
            sail: maxSail
        }
    }

    function getSailDef(sailDefs, id) {
        for (const sailDef of sailDefs) {
            if (sailDef.id === id) {
                return sailDef;
            }
        }
        return null;
    }

    function pSpeed(iA, iS, speeds) {
        return bilinear(iA.fraction, iS.fraction,
            speeds[iA.index - 1][iS.index - 1],
            speeds[iA.index][iS.index - 1],
            speeds[iA.index - 1][iS.index],
            speeds[iA.index][iS.index]);
    }

    function bilinear(x, y, f00, f10, f01, f11) {
        return f00 * (1 - x) * (1 - y)
            + f10 * x * (1 - y)
            + f01 * (1 - x) * y
            + f11 * x * y;
    }

    function foilingFactor(options, tws, twa, foil) {
        var speedSteps = [0, foil.twsMin - foil.twsMerge, foil.twsMin, foil.twsMax, foil.twsMax + foil.twsMerge, Infinity];
        var twaSteps = [0, foil.twaMin - foil.twaMerge, foil.twaMin, foil.twaMax, foil.twaMax + foil.twaMerge, Infinity];
        var foilMat = [[1, 1, 1, 1, 1, 1],
                       [1, 1, 1, 1, 1, 1],
                       [1, 1, foil.speedRatio, foil.speedRatio, 1, 1],
                       [1, 1, foil.speedRatio, foil.speedRatio, 1, 1],
                       [1, 1, 1, 1, 1, 1],
                       [1, 1, 1, 1, 1, 1]];

        if (options.includes("foil")) {
            var iS = fractionStep(tws, speedSteps);
            var iA = fractionStep(twa, twaSteps);
            return bilinear(iA.fraction, iS.fraction,
                foilMat[iA.index - 1][iS.index - 1],
                foilMat[iA.index][iS.index - 1],
                foilMat[iA.index - 1][iS.index],
                foilMat[iA.index][iS.index]);
        } else {
            return 1.0;
        }
    }

    function fractionStep(value, steps) {
        var absVal = Math.abs(value);
        var index = 0;
        while (index < steps.length && steps[index] <= absVal) {
            index++;
        }
        if (index < steps.length) {
            return {
                index: index,
                fraction: (absVal - steps[index - 1]) / (steps[index] - steps[index - 1])
            }
        } else {
            return {
                index: index - 1,
                fraction: 1.0
            }
        }
    }

    function callWindy(raceId, userId) {
        var baseURL = "https://www.windy.com";
        var r = races.get(raceId);
        var uinfo;

        if (userId) {
            uinfo = raceFleetMap.get(raceId).uinfo[userId];
            if (uinfo === undefined) {
                alert("Can't find record for user id " + userId);
                return;
            }
        }
        var pos = r.curr.pos;
        if (uinfo) pos = uinfo.pos;
        var url = baseURL + "/?gfs," + pos.lat + "," + pos.lon + ",6,i:pressure,d:picker";
        var tinfo = "windy:" + r.url;
        window.open(url, cbReuseTab.checked ? tinfo : "_blank");
    }

    function callSard(raceId, userId) {
		var raceNum = Math.trunc(raceId);
        var baseURL = 'https://route.phtheirichthys.fr/#/-' + raceNum + '/';
        /* var r = races.get(raceId);
        var uinfo;
        if (userId) {
            uinfo = raceFleetMap.get(raceId).uinfo[userId];
            if (uinfo === undefined) {
                alert("Can't find record for user id " + userId);
                return;
            }
        }
        var pos = r.curr.pos;
        if (uinfo) pos = uinfo.pos;
        var position = Util.roundTo(pos.lat,4) + "/" + Util.roundTo(pos.lon,4) ; */
		var url = baseURL ;
        window.open(url, cbReuseTab.checked ? baseURL : "_blank");	
    }

    function callRbts(raceId, userId) {
		// userId not used > is to check if user isMe (see like : function callRouter) /* Phil */
		// changed below userInfo to race.curr for .pos & .options /* Phil */
		let race = races.get(raceId);
        let host = 'bitsailor.net';
        let baseURL = `http://${host}/router?race=${race.id}`;
        let date = (race.curr.lastCalcDate)?new Date(race.curr.lastCalcDate):new Date();
        let options = encodeURI(JSON.stringify(race.curr.options));        
        let url = baseURL
            + `&starttime=${date.toISOString().substring(0, 16)}`
            + `&slat=${race.curr.pos.lat}`
            + `&slon=${race.curr.pos.lon}`
            + `&options=${options}`
            + `&twa=${race.curr.twa}`
            + `&energy=${race.curr.stamina.toFixed()}`
            + `&sail=${sailNames[race.curr.sail%10]}`;
        window.open(url, cbReuseTab.checked ? baseURL : "_blank");
    }

    function callPolars(raceId) {
        var race = races.get(raceId);
        if(cbBSPDown.checked){
            var IdRace = raceId ;
			var baseURL = "http://inc.bureauvallee.free.fr/polaires/?race_id=" + IdRace;
			} else {
            var IdRace = raceId ;
			var baseURL = "http://blacksailingpolars.vrzen.org/?race_id=" + IdRace;
        }
        var twa = Math.abs(Util.roundTo(race.curr.twa || 20, 1));
        var tws = Util.roundTo(race.curr.tws || 4, 1);
		var stam = Util.roundTo(race.curr.stamina || 100, 1);
		
        if (!race.curr.tws || !race.curr.twa || !race.curr.stamina || !race.curr.twd ) {
            alert("Missing TWA and/or TWS and/or Stamina  and/or TWD , calling polars with TWA=" + twa + "°, TWS=" + tws + "kn, Stamina=" + stam +"%");
        }

        var url = baseURL + "&tws=" + tws + "&twa=" + twa + "&stam=" + stam ;

        for (const option of race.curr.options) {
			if ( option != "radio" && option != "skin" ) url += "&" + option + "=true";
        } 

        url += "&voile="+(race.curr.sail % 10).toString();
		var toxcct = window.open(url, cbReuseTab.checked ? baseURL : "_blank");
		var longueur = Object.keys(toxcct).lenght;
    }

    function callITYC(raceId) {

        var r = races.get(raceId);

        //get needed info
        var twa = r.curr.twa;
        var tws = r.curr.tws;

        //buidl options fields
        var options= "";
        if (r.curr.fullOptions === true) {
            options = "FP";
        } else if (r.curr.options) {
            if (r.curr.options.length == 8) {
                options = "AO";
            } else {
                var opt_sail = "[";
                var opt_perf = "[";
                for (const opt of r.curr.options.sort()) {
                    if (opt == "reach" || opt == "light" || opt == "heavy") {
                        opt_sail += opt + ",";
                    }
                    if (opt == "winch" || opt == "foil" || opt == "hull" ){
                        opt_perf += opt + ",";
                    }
                }
                opt_sail = opt_sail.substring(0,opt_sail.length-1);
                opt_perf = opt_perf.substring(0,opt_perf.length-1);
                if (opt_sail.length != "") opt_sail += "]";
                if (opt_perf.length != "") opt_perf += "]";                
                options = opt_sail + " " + opt_perf;
            }
        }

        options = options.replace("reach","R");
        options = options.replace("light","L");
        options = options.replace("heavy","H");
        options = options.replace("winch","W");
        options = options.replace("foil","F");
        options = options.replace("hull","h");

        //build url
        var baseURL = "https://ityc.fr/polar.html?b=";
        baseURL += r.curr.boat.label.replace(" ","_");
        var url = baseURL+"&s="+sailNames[r.curr.sail % 10];
        url += "&o="+options;
        url += "&tws="+tws;
        url += "&twa="+twa;

        //call
        window.open(url, cbReuseTab.checked ? baseURL : "_blank");
    }

    String.prototype.remAcc = function() {
        var rules = {
            'a': /[àâ]/g,
            'A': /[ÀÂ]/g,
            'e': /[èéêë]/g,
            'E': /[ÈÉÊË]/g,
            'i': /[îï]/g,
            'I': /[ÎÏ]/g,
            'o': /[ô]/,
            'O': /[Ô]/g,
            'u': /[ùû]/g,
            'U': /[ÙÛ]/g,
            'c': /[ç]/g,
            'C': /[Ç]/g,
            '' : /[\/|\s|-]/g,
        };
    var str = this;
    for(var latin in rules) {
        var nonLatin = rules[latin];
        str = str.replace(nonLatin , latin);
    }
    return str;
}

    function getJSONKey(key) {
        for (acc in rules) {
            if (rules[acc].indexOf(key) > -1) {return acc};
        }
    }

    function replaceSpec(str){
        var regstring = "";
        for (acc in rules) {
            regstring += rules[acc];
        }
        var reg = new RegExp("[" + regstring + "]", "g");
        return str.replace(reg, function(t) {return getJSONKey(t)});
    }

    function fileExist(url) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.addEventListener('loadend', () => {
                if (xhr.status == 200) {
                    console.log("File exist");
                    resolve(true);
                } else if (xhr.status == 404) {
                    console.log("File does not exist");
                    resolve(false);
                } else {
                    console.log("Error - Status: " + xhr.status);
                    resolve(false);
                }
            });
            xhr.open('HEAD', url);
            xhr.send();
        });
    }

    function switchMap(race) {
        initializeMap(race);
        races.forEach(function (r) {
            if (r.gdiv) {
                if (r == race) {
                    r.gdiv.style.display = "block";
                    // r.gmap.fitBounds(r.gbounds);

                } else {
                    r.gdiv.style.display = "none";
                }
            }
        });
    }

	async function initializeMap(race) {
        if (!race || !race.legdata) return; // no legdata yet;

        if (!race.gdiv) {
            // Create div
            var divMap = document.createElement('div');
            divMap.style.height = "100%";
            divMap.style.display = "block";
            document.getElementById("tab-content4").appendChild(divMap);
            race.gdiv = divMap;

			// dark or no ?
			var styles_dark = [ 
					{"elementType": "geometry","stylers": [{"color": "#333333"}]},
					{"featureType": "administrative","stylers": [{"visibility": "off"}]},
					{"featureType": "poi","stylers": [{"visibility": "off"}]},
					{"featureType": "landscape","elementType": "labels", "stylers": [{"visibility": "off"}]},
					{"featureType": "road","stylers": [{"visibility": "off"}]},
					{"featureType": "transit","stylers": [{"visibility": "off"}]},
					{"featureType": "water","elementType": "geometry","stylers": [{"color": "#000000"}]},
					{"featureType": "water","elementType": "labels.text","stylers": [{"color": "#666666"}]}
				];
			var type_dark ="OSM";
			if (cbDark.checked) {
				type_dark = "terrain";
			}

            // Create map
            var mapOptions = {
                mapTypeId: type_dark,
                streetViewControl: false,
                scaleControl: true,
                styles: styles_dark,
				maxZoom: 30,
				draggableCursor: 'default',
				mapTypeControlOptions: {
					mapTypeIds: ["OSM", "terrain", "satellite"],
					// mapTypeIds: mapTypeIds,
					position: google.maps.ControlPosition.LEFT_TOP
                }
            };
            var map = new google.maps.Map(divMap, mapOptions);
            map.setTilt(90);
            map.mapTypes.set("OSM", new google.maps.ImageMapType({
                getTileUrl: function(coord, zoom) {
                    return "https://tile.openstreetmap.org/" + zoom + "/" + coord.x + "/" + coord.y + ".png";
                },
				/* 	https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png */		
                tileSize: new google.maps.Size(256, 256),
                name: "Light",
                maxZoom: 30
            }));
            race.gmap = map;

            // Customize & init map
            var bounds = race.gbounds = new google.maps.LatLngBounds();

            // start, finish
            var pos = new google.maps.LatLng(race.legdata.start.lat, race.legdata.start.lon);
            addmarker(map, bounds, pos, undefined, {
                color: "blue",
                text: "S"
            }, "Start: " + race.legdata.start.name + "\nPosition: " + Util.formatPosition(race.legdata.start.lat, race.legdata.start.lon), "S", 10, 1);
            pos = new google.maps.LatLng(race.legdata.end.lat, race.legdata.end.lon);
            addmarker(map, bounds, pos, undefined, {
                color: "yellow",
                text: "F"
            }, "Finish: " + race.legdata.end.name + "\nPosition: " + Util.formatPosition(race.legdata.end.lat, race.legdata.end.lon), "F", 10, 1);
            var fincircle = new google.maps.Circle({
                strokeColor: "#FF0000",
                strokeOpacity: 0.8,
                strokeWeight: 2,
                fillOpacity: 0,
                map: map,
                center: pos,
                radius: race.legdata.end.radius * 1852.0,
                zIndex: 9
            });

            // course
            var cpath = [];
            for (var i = 0; i < race.legdata.course.length; i++) {
                cpath.push(new google.maps.LatLng(race.legdata.course[i].lat, race.legdata.course[i].lon));
            }
            var arrow = {
                path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW
            };
            var ccpath = new google.maps.Polyline({
                path: cpath,
                icons: [{
                    icon: arrow,
                    repeat: "50px"
                }],
                geodesic: false, // Manel (true)
                strokeColor: "#FFFFFF",
                strokeOpacity: 0.5,
                strokeWeight: 1,
                zIndex: 4
            });
            ccpath.setMap(map);

            //  Ice limits
            if (race.legdata.ice_limits) {
                var iceLimit = [];
                var iceData = race.legdata.ice_limits.south;
                for (var i = 0; i < iceData.length; i++) {
                    iceLimit.push(new google.maps.LatLng(iceData[i].lat, iceData[i].lon));
                }
				iceLimit.push(new google.maps.LatLng(iceData[0].lat, iceData[0].lon));
                var icePath = new google.maps.Polyline({
                    path: iceLimit,
                    geodesic: false,
                    strokeColor: "#FF0000",
                    strokeWeight: 1,
                    zIndex: 4
                });
                icePath.setMap(map);
            }

			// Zones d'exclusion
            if (race.legdata.restrictedZones) {
                var restrictionData = race.legdata.restrictedZones;
                for (var i = 0; i < restrictionData.length; i++) {
					var subLimit = [];
					var subData = restrictionData[i].vertices;
					for (var j = 0; j < subData.length; j++) {
						subLimit.push(new google.maps.LatLng(subData[j].lat, subData[j].lon));
					}
					subLimit.push(new google.maps.LatLng(subData[0].lat, subData[0].lon));
					if (restrictionData[i].color) {
						var subColor = restrictionData[i].color;
					} else {
						var subColor = "#ae0b71";
					}
                	var subPath = new google.maps.Polygon({
						path: subLimit,
						geodesic: false,
						strokeColor: subColor,
						fillColor: subColor,
						fillOpacity: 0.2,
						strokeWeight: 1,
						zIndex: 4
					});
					subPath.setMap(map);
				}
            }		
            
            // Modification - WP Marker : rightlick => enable, click => disable
            // 1s = 0.0002777777 = 1/3600 = 31m
            // 1m = 0.0166666666 = 1/60 = 1852m
            var markerWpt = new google.maps.Marker({
                "position": {lat: 0, lng: 0},
                "map": null,
                "label": {text: "M", color: "limegreen"},
                "draggable": true
            });

            var squareWpt1 = new google.maps.Rectangle({
                "map": null,
                "bounds": {
                    north: 0,
                    south: 0,
                    east: 0,
                    west: 0
                },
                "clickable": false,
                "draggable": true,
                "strokeColor": '#ff6d6d',
                "strokeOpacity": 0.60,
                "strokeWeight": 0.75,
                "fillColor": '#000000',
                "fillOpacity": 0.0
            });
            squareWpt1.bindTo("center", markerWpt, "position");
            
            var squareWpt2 = new google.maps.Rectangle({
                "map": null,
                "bounds": {
                    north: 0,
                    south: 0,
                    east: 0,
                    west: 0
                },
                "clickable": false,
                "draggable": true,
                "strokeColor": '#87ff87',
                "strokeOpacity": 0.60,
                "strokeWeight": 0.75,
                "fillColor": '#000000',
                "fillOpacity": 0.0
            });
            squareWpt2.bindTo("center", markerWpt, "position");

            var squareWpt3 = new google.maps.Rectangle({
                "map": null,
                "bounds": {
                    north: 0,
                    south: 0,
                    east: 0,
                    west: 0
                },
                "clickable": false,
                "draggable": true,
                "strokeColor": '#54aaff',
                "strokeOpacity": 0.55,
                "strokeWeight": 0.75,
                "fillColor": '#000000',
                "fillOpacity": 0.0
            });
            squareWpt3.bindTo("center", markerWpt, "position");

            var squareWpt4 = new google.maps.Rectangle({
                "map": null,
                "bounds": {
                    north: 0,
                    south: 0,
                    east: 0,
                    west: 0
                },
                "clickable": false,
                "draggable": true,
                "strokeColor": '#ff6d6d',
                "strokeOpacity": 0.50,
                "strokeWeight": 0.75,
                "fillColor": '#000000',
                "fillOpacity": 0.0,
            });
            squareWpt4.bindTo("center", markerWpt, "position");
			
			// meilleures positions WP selon gps, Manël
			var squareWpt5 = new google.maps.Rectangle({
                "map": null,
                "bounds": {
                    north: 0,
                    south: 0,
                    east: 0,
                    west: 0
                },
                "clickable": false,
                "draggable": true,
                "strokeColor": '#ff6d6d',
                "strokeOpacity": 0.50,
                "strokeWeight": 0.75,
                "fillColor": '#ff0000',
                "fillOpacity": 0.1,
            });
            squareWpt5.bindTo("center", markerWpt, "position");		

            // Provoque Erreur : Uncaught (in promise) TypeError: Cannot read property '__e3_' of undefined
            google.maps.event.addListener(map, "rightclick", function (event) {

				var minLat = Math.abs(event.latLng.lat() ) < 10  ? 6 : 5;
				// var minLng = Math.abs(event.latLng.lng() ) < 10 ? 6 : ( ( Math.abs(event.latLng.lng() ) > 100 ) ? 4 : 5 );
				var minLng = 5;
				var lat0 = Number(event.latLng.lat().toFixed(minLat));
				var lng0 = Number(event.latLng.lng().toFixed(minLng));
				var pasLat = Number(Math.pow(10, -1 * minLat).toFixed(minLat));
				var pasLng = Number(Math.pow(10, -1 * minLng).toFixed(minLng));	

				var deltaLat = Number(event.latLng.lat()) - Number(myLat);
				var deltaLng = Number(event.latLng.lng()) - Number(myLng);
				var HeadingFromMe = 180 / Math.PI * ( Math.PI/2- Math.atan(deltaLat / Math.abs(deltaLng ))) ;
				HeadingFromMe = deltaLng > 0 ? HeadingFromMe : 360 - HeadingFromMe;

                markerWpt.setPosition(event.latLng);
                markerWpt.setTitle("WPT Marker: " + Util.formatPositionWithMilliSec(event.latLng.lat(), event.latLng.lng()) + "\nPas en latitude :  " + (pasLat * 3600).toFixed(4) + '"\nPas en longitude : ' + (pasLng * 3600).toFixed(4) + '"\nCap = ' + HeadingFromMe.toFixed(1));
				markerWpt.setMap(this);

				var pointWP =[] ;
				for (let i = 0; i < 10; i++) {
					for (let j = 0; j < 10; j++) {
						var pointWP = new google.maps.Marker({
									"position": {"lat": lat0 + (i-5) * pasLat,
											   "lng": lng0 + (j-5) * pasLng },
									"icon": pinSymbol2("#b86dff", 1, 1),
									"map": null,
									"draggable": false
								});
						pointWP.setMap(this);
					}
				}
				
                squareWpt1.setBounds({
                    north: event.latLng.lat() + (0.5/3600),
                    south: event.latLng.lat() - (0.5/3600),
                    east: event.latLng.lng() + (0.5/3600),
                    west: event.latLng.lng() - (0.5/3600)
                })
                squareWpt1.setMap(this);
                
                squareWpt2.setBounds({
                    north: event.latLng.lat() + (2/3600),
                    south: event.latLng.lat() - (2/3600),
                    east: event.latLng.lng() + (2/3600),
                    west: event.latLng.lng() - (2/3600)
                })
                squareWpt2.setMap(this);
                
                squareWpt3.setBounds({
                    north: event.latLng.lat() + (1.5/3600),
                    south: event.latLng.lat() - (1.5/3600),
                    east: event.latLng.lng() + (1.5/3600),
                    west: event.latLng.lng() - (1.5/3600)
                })
                squareWpt3.setMap(this);
                
                squareWpt4.setBounds({
                    north: event.latLng.lat() + (1/3600),
                    south: event.latLng.lat() - (1/3600),
                    east: event.latLng.lng() + (1/3600),
                    west: event.latLng.lng() - (1/3600)
                })
                squareWpt4.setMap(this);

				squareWpt5.setBounds({
                    north: event.latLng.lat() + ( ( Math.abs(event.latLng.lat() ) < 10 ) ? .000001 : .00001 ),
                    south: event.latLng.lat() - ( ( Math.abs(event.latLng.lat() ) < 10 ) ? .000001 : .00001 ),
                    east: event.latLng.lng() + .00001,
                    west: event.latLng.lng() - .00001 
                })
                squareWpt5.setMap(this);
            });

            google.maps.event.addListener(markerWpt, "dragend", function (event) {

				var minLat = Math.abs(event.latLng.lat() ) < 10  ? 6 : 5;
				var minLng = Math.abs(event.latLng.lng() ) < 10 ? 6 : ( Math.abs(event.latLng.lng() > 100 ) ? 4 : 5 );
				var lat0 = Number(event.latLng.lat().toFixed(minLat));
				var lng0 = Number(event.latLng.lng().toFixed(minLng));
				var pasLat = Number(Math.pow(10, -1 * minLat).toFixed(minLat));
				var pasLng = Number(Math.pow(10, -1 * minLng).toFixed(minLng));	

                var newPosition = {lat: event.latLng.lat(), lng: event.latLng.lng()};
                markerWpt.setTitle("WPT Marker : " + Util.formatPositionWithMilliSec(newPosition.lat, newPosition.lng));
				
				var pointWP =[];
				for (let i = 0; i < 10; i++) {
					for (let j = 0; j < 10; j++) {
						var pointWP = new google.maps.Marker({
							"position": {"lat": lat0 + (i-5) * pasLat,
									   "lng": lng0 + (j-5) * pasLng },
							"icon": pinSymbol2("#b86dff", 1, 1),
							"map": null,
							"draggable": false
						});
					}
				}
				
                squareWpt1.setBounds({
                    north: newPosition.lat + (0.5/3600),
                    south: newPosition.lat - (0.5/3600),
                    east: newPosition.lng + (0.5/3600),
                    west: newPosition.lng - (0.5/3600)
                })
                squareWpt2.setBounds({
                    north: newPosition.lat + (2/3600),
                    south: newPosition.lat - (2/3600),
                    east: newPosition.lng + (2/3600),
                    west: newPosition.lng - (2/3600)
                })

                squareWpt3.setBounds({
                    north: newPosition.lat + (1.5/3600),
                    south: newPosition.lat - (1.5/3600),
                    east: newPosition.lng + (1.5/3600),
                    west: newPosition.lng - (1.5/3600)
                })

                squareWpt4.setBounds({
                    north: newPosition.lat + (1/3600),
                    south: newPosition.lat - (1/3600),
                    east: newPosition.lng + (1/3600),
                    west: newPosition.lng - (1/3600)
                })
				
				squareWpt5.setBounds({
                    north: event.latLng.lat() + ( ( Math.abs(event.latLng.lat() ) < 10 ) ? .000001 : .00001 ),
                    south: event.latLng.lat() - ( ( Math.abs(event.latLng.lat() ) < 10 ) ? .000001 : .00001 ),
                    east: event.latLng.lng() + ( ( Math.abs(event.latLng.lng() ) < 10 ) ? .000001 : ( ( Math.abs(event.latLng.lng() ) >= 100 ) ? .0001 : .00001 ) ),
                    west: event.latLng.lng() - ( ( Math.abs(event.latLng.lng() ) < 10 ) ? .000001 : ( ( Math.abs(event.latLng.lng() ) >= 100 ) ? .0001 : .00001 ) )
                })
				
            });

            google.maps.event.addListener(map, "click", function (event) {
                markerWpt.setMap(null);
                squareWpt1.setMap(null);
                squareWpt2.setMap(null);
                squareWpt3.setMap(null);
                squareWpt4.setMap(null);
            });
            // Fin Modification - WPMarker   
			
        }
        updateMapWaypoints(race);
    }

    function clearTrack(map, db) {
        if (map[db])
            for (var i = 0; i < map[db].length; i++) {
                map[db][i].setMap(null);
            }
        map[db] = new Array();
    }


/*    var colors = [];
    colors.push("#000000");
    colors.push("#0080ff");
    colors.push("#ff0000");
    colors.push("#00cc00");
    colors.push("#d020ff");
    colors.push("#ffff00");
    colors.push("#00ffff");
    colors.push("#ffc000");
    colors.push("#8020ff");
    colors.push("#ff8000");
    colors.push("#a0ff00");
    colors.push("#0000ff");
    colors.push("#f00080");
    colors.push("#00ffa0");
    colors.push("#ffffff");

    function getColor (i) {
        if (i >= colors.length) {
            colors.push(randomColor());
            getColor(i);
        } else {
            return colors[i];
        }
    } */

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

            /*
            if (!groupColors[cp.group]) {
                groupColors[cp.group] = getColor(cp.group);
            } */

            var position_s = new google.maps.LatLng(cp.start.lat, cp.start.lon);
            var position_e = new google.maps.LatLng(cp.end.lat, cp.end.lon);

            var c_sb = "#00FF00";
            var c_bb = "#FF0000";
            var zi = 8;
            if (cp.display == "none") {
                c_sb = "#448800";
                c_bb = "#884400";
                zi = 6;
            }

            var op = 1.0;
            var g_passed = false;
            if (race.gatecnt[cp.group - 1]) {
                g_passed = true;
                op = 0.6;
            } // mark/gate passed - semi transparent
            
            var label_g = "checkpoint " + cp.group + "." + cp.id +  ", type: " + cp_name + ", engine: " + cp.engine + ", name: " + cp.name + (g_passed ? ", PASSED" : "");
            var side_s =  cp.side ;
            var side_e = (cp.side == "stbd")?"port":"stbd";
            var label_s = label_g + ", side: " + side_s + "\nPosition: " + Util.formatPosition(cp.start.lat, cp.start.lon);
            var label_e = label_g + ", side: " + side_e + "\nPosition: " + Util.formatPosition(cp.end.lat, cp.end.lon);

            if (cp.side == "stbd") {
                map._db_cp.push(addmarker(map, bounds, position_s, pinSymbol(c_sb, "C"), undefined, label_s, i, zi, op));
                map._db_cp.push(addmarker(map, bounds, position_e, pinSymbol(c_bb, "C"), undefined, label_e, i, zi, op));
            } else {
                map._db_cp.push(addmarker(map, bounds, position_s, pinSymbol(c_bb, "C"), undefined, label_s, i, zi, op));
                map._db_cp.push(addmarker(map, bounds, position_e, pinSymbol(c_sb, "C"), undefined, label_e, i, zi, op));
            }

            if (cp.display == "gate") {
                if (cp.side == "stbd") {
                    map._db_cp.push(addmarker(map, bounds, position_s, pinSymbol("#FFFF00", "RR"), undefined, label_s, i, 8, op));
                    map._db_cp.push(addmarker(map, bounds, position_e, pinSymbol("#FFFF00", "RL"), undefined, label_e, i, 8, op));
                } else {
                    map._db_cp.push(addmarker(map, bounds, position_s, pinSymbol("#FFFF00", "RL"), undefined, label_s, i, 8, op));
                    map._db_cp.push(addmarker(map, bounds, position_e, pinSymbol("#FFFF00", "RR"), undefined, label_e, i, 8, op));
                }
            } else if (cp.display == "buoy") {
                if (cp.side == "stbd") {
                    map._db_cp.push(addmarker(map, bounds, position_s, pinSymbol(c_sb, "RR"), undefined, label_s, i, 8, op));
                } else {
                    map._db_cp.push(addmarker(map, bounds, position_s, pinSymbol(c_bb, "RL"), undefined, label_s, i, 8, op));
                }
            } else {
                if (cp.side == "stbd") {
                    map._db_cp.push(addmarker(map, bounds, position_s, pinSymbol(c_sb, "RR"), undefined, label_s, i, zi, op));
                } else {
                    map._db_cp.push(addmarker(map, bounds, position_s, pinSymbol(c_bb, "RL"), undefined, label_s, i, zi, op));
                }
            }
            var path = [];
            path.push(position_s);
            path.push(position_e);
            var ppath = new google.maps.Polyline({
                path: path,
                strokeOpacity: 0.0,
                icons: [{
                    icon: pinSymbol(cp.display == "none" ? "#FF6600" : "#FFFF00", "DL", op),
                    repeat: "16px"
                }],
                geodesic: true,
                zIndex: cp.display == "none" ? 5 : 6
            });
            ppath.setMap(map);
            map._db_cp.push(ppath);
        }
    }

    function updateMapWaypoints(race) {
        if (!race) return;
        if (!race.curr) return; // current position unknown
        var map = race.gmap;
        var bounds = race.gbounds;

        clearTrack(map,"_db_wp");
        // track wp
        var tpath = [];
        if (race.waypoints) {
            var action = race.waypoints
            if (action.pos) {

                // Waypoint lines
                tpath.push(new google.maps.LatLng(race.curr.pos.lat, race.curr.pos.lon)); // boat
                for (var i = 0; i < action.pos.length; i++) {
					tpath.push(new google.maps.LatLng(action.pos[i].lat, action.pos[i].lon));
                }
                var ttpath = makeTTPath(tpath,"#FF00FF", 0.7, 1.5);
                ttpath.setMap(map);
                map._db_wp.push(ttpath);
                // Waypoint markers + cap de sortie - Manel
				var origin = race.curr.pos;
                for (var i = 0; i < action.pos.length; i++) {
                    var icap = Util.courseAngle(origin.lat, origin.lon, action.pos[i].lat, action.pos[i].lon)/Math.PI*180;
					var capSortie = icap.toFixed(1);
					origin = action.pos[i]
                    var waypoint = new google.maps.Marker({
						title: "WayPoint n° : " + (i+1).toString() + "\nPosition : " + Util.formatPosition(action.pos[i].lat, action.pos[i].lon) + "\nCap de sortie : " + capSortie + "°",
                        // title: Util.formatPosition(action.pos[i].lat, action.pos[i].lon),
                        position: {"lat": action.pos[i].lat,
                                   "lng": action.pos[i].lon
                                  },
                        icon: pinSymbol2("#FF00FF", 2, 1),
                        map: map,
                        draggable: false
                    });
                    map._db_wp.push(waypoint);      
                }
            } else {
                console.error("Unexpected waypoint format: " + JSON.stringify(action));
            }
        }            
        var ZZ = map.getZoom();
        if(map.getZoom() == undefined || map.getZoom() == 0) {
            map.fitBounds(bounds);
        }
    }
    
    function updateMapMe(race, track) {
        if (!race) return;
		if (track.length == 0) return;
        var map = race.gmap;

        clearTrack(map, "_db_me");

        // track
        var tpath = [];
        if (track) {
            for (var i = 0; i < track.length; i++) {
                var segment = track[i];
                var pos = new google.maps.LatLng(segment.lat, segment.lon);
                tpath.push(pos);
            }
            tpath.push(pos);
			
            var ttpath = makeTTPath(tpath, "#b86dff", 0.7, 1.5);  // Color track Me
            ttpath.setMap(map);
            map._db_me.push(ttpath);
        }        
        var bounds = race.gbounds;
			
        // boat
		/* affichage du "fantôme" de mon boat : supprimé Manël 
        if (race.curr && race.curr.pos) {
          var pos = new google.maps.LatLng(race.curr.pos.lat, race.curr.pos.lon);
          var title = "Me | HDG : " + Util.roundTo(race.curr.heading, 1 ) + " | TWA : " + Util.roundTo(race.curr.twa, 1) + " | Speed : " + Util.roundTo(race.curr.speed, 2) + "\nTWD : " + Util.roundTo(race.curr.twd % 360, 1 ) + " | TWS : " + Util.roundTo(race.curr.tws, 1);
          var mymarker = addmarker(map, bounds, pos, pinSymbol("#b86dff", "B", 0.4, race.curr.heading), undefined, title, 'me', 200, 0.5);            

          map._db_me.push(mymarker);
          mymarker.addListener('click', function() {
              var ZZ = map.getZoom() + 4;
              if (ZZ > 20) {ZZ = 20;}
              map.setZoom(ZZ);
              map.setCenter(mymarker.getPosition());
          });
          mymarker.addListener('rightclick', function() {
              var ZZ = map.getZoom() - 4;
              if (ZZ < 4) {ZZ = 4;}
              map.setZoom(ZZ);
              map.setCenter(mymarker.getPosition());
          });
        }
		Fin affichage du fantôme */
    }

    function updateMapLeader(race) {
        if (!race) return;
        if (!race.curr) return;
        if (!race.curr.startDate) return;
        var map = race.gmap;
        
        var d = new Date();
        var offset = d - race.curr.startDate;

        // track
        if (race.leaderTrack && race.leaderTrack.length > 0) {
            addGhostTrack(map, race.gbounds, race.leaderTrack, "Leader", "Leader : " + race.leaderName + " | Elapsed : " + Util.formatDHMS(offset), offset, "_db_leader", "#FF8C00");
        }
        if (race.myTrack && race.myTrack.length > 0) {
            addGhostTrack(map, race.gbounds, race.myTrack, "Best Attempt", "Best Attempt" + " | Elapsed : " + Util.formatDHMS(offset), offset, "_db_self", "#b86dff");
        }
    }

    function addGhostTrack (map, bounds, ghostTrack, label, title, offset, db, color) { 
        clearTrack(map, db);
        var tpath = [];
        var ghostStartTS = ghostTrack[0].ts;
        var ghostPosTS = ghostStartTS + offset;
        var ghostPos;
        for (var i = 0; i < ghostTrack.length; i++) {
            tpath.push(new google.maps.LatLng(ghostTrack[i].lat, ghostTrack[i].lon));
            if (!ghostPos) {
                if (ghostTrack[i].ts >= ghostPosTS) {
                    ghostPos = i;
                }
            }
        }
        var lineSymbol = {
            path: 'M 0,-1 0,1',
            strokeColor: color,
            strokeOpacity: 0.2,
            scale: 4
        };
        var ttpath = new google.maps.Polyline({
            path: tpath,
            geodesic: true,
            strokeOpacity: 0.0,
            strokeWeight: 1,
            icons: [{
                icon: lineSymbol,
                offset: '0',
                repeat: '20px'
            }],
            zIndex: 4
        });
        ttpath.setMap(map);
        map[db].push(ttpath);
        
        if (ghostPos) {
            var lat1 = ghostTrack[ghostPos].lat;
            var lon1 = ghostTrack[ghostPos].lon
            var lat0 = ghostTrack[Math.max(ghostPos - 1, 0)].lat;
            var lon0 = ghostTrack[Math.max(ghostPos - 1, 0)].lon;
            var heading = Util.courseAngle(lat0, lon0, lat1, lon1) * 180 / Math.PI;
            var d = (ghostPosTS - ghostTrack[ghostPos - 1].ts ) / (ghostTrack[ghostPos].ts - ghostTrack[ghostPos - 1].ts)
            var lat = lat0 + (lat1-lat0) * d;
            var lon = lon0 + (lon1-lon0) * d;
            var pos = new google.maps.LatLng(lat, lon);
            map[db].push(addmarker(map, bounds, pos, pinSymbol(color, "B", 0.4, heading), label, title, 'leader', 20, 0.4));
        }
    }
    
    
    function updateMapFleet(race) {
        if (!race) return;
        var map = race.gmap;
        var bounds = race.gbounds;

        clearTrack(map, "_db_op");
        clearTrack(map, "_db_fl");

        // opponents/followed
        var fleet = raceFleetMap.get(race.id);
        
        Object.keys(fleet.uinfo).forEach(function (key) {
            var elem = fleet.uinfo[key];
            var bi = boatinfo(key, elem);

            if (isDisplayEnabled(elem, key)) {
                var pos = new google.maps.LatLng(elem.pos.lat, elem.pos.lon);
                // Boat
                // Organisation z-index
                var zi;
                if (bi.bcolor == '#b86dff'){
                    zi = 50;    // Me
                } else if (bi.bcolor == '#ffd700') {
                    zi = 49;    // Top VSR
                } else if (bi.bcolor == '#ae1030') {
                    zi = 48;    // Team
                } else if (bi.bcolor == '#32cd32') {
                    zi = 47;    // Friend
                } else if (bi.bcolor == '#4169e1') {
                    zi = 46;    // Color Sponsor
                } else if (bi.bcolor == '#87ceeb') {
                    zi = 45;    // Real
                } else {
                    zi = 44;    // Opponent
                }

                var info = bi.name + "\nHDG : " + Util.roundTo(bi.heading, 1) + " | TWA : " + Util.roundTo(bi.twa, 1) + " | Speed : " + Util.roundTo(bi.speed, 2) + "\nTWD : " + Util.roundTo(bi.twd % 360, 1) + " | TWS : " + Util.roundTo(bi.tws, 2);
                if (elem.startDate && race.type == "record") {
                    info += " | Elapsed : " + Util.formatDHMS(elem.ts - elem.startDate);
                }
                var mymarker = addmarker(map, bounds, pos, pinSymbol(bi.bcolor, "B", 0.8, elem.heading, bi.bbcolor), undefined, info, key, zi, 0.8);

                map._db_op.push(mymarker);
                mymarker.addListener('click', function() {
					infoWindow.close();
					infoWindow.setContent(mymarker.getTitle());
					infoWindow.open(mymarker.getMap(), mymarker);
                });

				// Affichage des repères liés à mon boat
                if (bi.bcolor == '#b86dff'){ //me
				
					// position pour distance au pointeur
					myLat = elem.pos.lat;
					myLng = elem.pos.lon;
				
					// Projection au cap et vitesse actuels sur 24 heures
                    
                    var fproj = [];
                    fproj.push(pos);
                    var hdgNow = bi.heading;
                    var dist1min = bi.speed / 60;

                    // ajout pour le rognage de pixels
                    var subdivision = 6; // indique ici le nombre d'intervalles, mini = 1
                    for (var i = 1; i < 11 * subdivision ; i++) {
                        var distimin = dist1min * i / subdivision ;
                        var posimin = Util.addDistance(elem.pos, distimin , hdgNow, 3437.74683);
                        var waypoint = new google.maps.Marker({
                            position: {"lat": posimin.lat,
                                       "lng": posimin.lon},
                            icon: pinSymbol2("#b86dff", 1.4, 0.4),
                            map: map,
                            draggable: false
                        });
                        map._db_fl.push(waypoint);
                    }
                    // fin ajout pour le rognage de pixels

                    for (var i = 1; i < 21; i++) {
                        var distimin = dist1min * i;
                        var posimin = Util.addDistance(elem.pos, distimin , hdgNow, 3437.74683);
						var waypoint = new google.maps.Marker({
							title: Perso.formatTimeNotif(elem.lastCalcDate + i * 60000) + " (+" + i + "min)",
							position: {"lat": posimin.lat,
									   "lng": posimin.lon},
							icon: pinSymbol2("#b86dff", 2, 0.5),
							map: map,
							draggable: false
						});
						map._db_fl.push(waypoint);
                    }
					var dist10min = dist1min * 10 ;
					for (var i = 3; i < 6; i++) {
						var distimin = dist10min * i;
						var posimin = Util.addDistance(elem.pos, distimin , hdgNow, 3437.74683);
						var waypoint = new google.maps.Marker({
							title: Perso.formatTimeNotif(elem.lastCalcDate + i * 600000) + " (+" + i * 10 + "min)",
							position: {"lat": posimin.lat,
									   "lng": posimin.lon},
							icon: pinSymbol2("#b86dff", 1.5, 0.5),
							map: map,
							draggable: false
						});
						map._db_fl.push(waypoint);
						var posProj = new google.maps.LatLng(posimin.lat, posimin.lon);
						fproj.push(posProj);
                    }
					var dist1h = bi.speed ;
					for (var i = 1; i < 25; i++) {
						var distimin = dist1h * i;
						var posimin = Util.addDistance(elem.pos, distimin , hdgNow, 3437.74683);
						var waypoint = new google.maps.Marker({
							title: "(+" + i + "h)",
							position: {"lat": posimin.lat,
									   "lng": posimin.lon},
							icon: pinSymbol2("#b86dff", 1.5, 0.4),
							map: map,
							draggable: false
						});
						map._db_fl.push(waypoint);
						var posProj = new google.maps.LatLng(posimin.lat, posimin.lon);
						fproj.push(posProj);
                    }
					var ttproj = makeTTPath(fproj, "#b86dff", 0.6, 1);  // Color track Me
					ttproj.setMap(map);
					map._db_op.push(ttproj);					
					
					// Au vent, sous le vent
					var fwind = [];
					var posLeft = Util.addDistance(elem.pos, 10, elem.twd + 90, 3437.74683);
					var posLeftPos = new google.maps.LatLng(posLeft.lat, posLeft.lon);
					fwind.push(posLeftPos);
					fwind.push(pos);
					var posRight = Util.addDistance(elem.pos, 10, elem.twd + 270, 3437.74683);
					var posRightPos = new google.maps.LatLng(posRight.lat, posRight.lon);
					fwind.push(posRightPos);
					var ttwind = makeTTPath(fwind, "#b86dff", 0.4, 1);  // Color track Me
					ttwind.setMap(map);
					map._db_op.push(ttwind);
					
					// direction du vent
					var cwind = [];
					cwind.push(pos);
					var posWind = Util.addDistance(elem.pos, 2 * dist1min, elem.twd + 180 , 3437.74683);
					var posWindPos = new google.maps.LatLng(posWind.lat, posWind.lon);
					cwind.push(posWindPos);
					var ccwind = makeTTPath(cwind, "#b86dff", 0.3, 3);  // Color track Me
					ccwind.setMap(map);
					map._db_op.push(ccwind);
					var waypoint = new google.maps.Marker({
						title: "twd : " + elem.twd,
						position: {"lat": posWind.lat,
								   "lng": posWind.lon},
						icon: pinSymbol3("#b86dff", 3, 0.4, elem.twd),
						map: map,
						draggable: false
					});
					map._db_fl.push(waypoint);	

					// bâbord / tribord
					var fBab = [];
					var posBab = Util.addDistance(elem.pos, 10, hdgNow + 270, 3437.74683);
					var posBabPos = new google.maps.LatLng(posBab.lat, posBab.lon);
					fBab.push(posBabPos);
					fBab.push(pos);
					var ttwind = makeTTPath(fBab, "#f08080", 0.4, 1);  
					ttwind.setMap(map);
					map._db_op.push(ttwind);
					
					var fTri = [];
					var posTri = Util.addDistance(elem.pos, 10, hdgNow + 90, 3437.74683);
					var posTriPos = new google.maps.LatLng(posTri.lat, posTri.lon);
					fTri.push(posTriPos);
					fTri.push(pos);
					var ttwind = makeTTPath(fTri, "#32cd32", 0.4, 1);  
					ttwind.setMap(map);
					map._db_op.push(ttwind);					
					
				}
				// Fin des affichages liés à mon boat
				
                // track
                if (cbMarkers.checked) {
                    var tpath = [];
                    if (elem.track) {
                        for (var i = 0; i < elem.track.length; i++) {
                            var segment = elem.track[i];
                            var pos = new google.maps.LatLng(segment.lat, segment.lon);
                            tpath.push(pos);
                        }
                        var pos = new google.maps.LatLng(elem.pos.lat, elem.pos.lon);
                        tpath.push(pos);
                        
                        var ttpath = new google.maps.Polyline({
                            path: tpath,
                            geodesic: true,
                            strokeColor: bi.bcolor,
                            strokeOpacity: 0.7,
                            strokeWeight: 1,
                            zIndex: 4
                        });
                        ttpath.setMap(map);
                        map._db_op.push(ttpath);
                    }
                }
                // waypoints
               if(elem.choice == true && elem.waypoints && currentUserId != elem._id.user_id){
                    var tpath = [];
                    // Waypoint lines
                    var pos = new google.maps.LatLng(elem.pos.lat, elem.pos.lon);                    
                    tpath.push(pos);
                    for (var i = 0; i < elem.waypoints.length; i++) {
                        var segment = elem.waypoints[i];
                        var pos = new google.maps.LatLng(segment.lat, segment.lon);
                        tpath.push(pos);
                    }
                    var ttpath = new google.maps.Polyline({
                        path: tpath,
                        geodesic: true,
                        strokeColor: "#696969",
                        strokeOpacity: 1,
                        strokeWeight: 1,
                        userId: elem._id.user_id,
                        zIndex: 4
                    });
                    ttpath.setMap(map);
                    map._db_fl.push(ttpath);

                    // Waypoint markers
                    for (var i = 0; i < elem.waypoints.length; i++) {
                        var waypoint = new google.maps.Marker({
                            title: elem.displayName + " : " + Util.formatPosition(elem.waypoints[i].lat, elem.waypoints[i].lon),
                            position: {"lat": elem.waypoints[i].lat,
                                       "lng": elem.waypoints[i].lon
                                    },
                            icon: pinSymbol2(bi.bcolor, 2, 1),
                            map: map,
                            userId: elem._id.user_id,
                            draggable: false
                        });
                        map._db_fl.push(waypoint);
                        
                        waypoint.addListener('click', function() {
                            callWaypoints(elem._id.user_id);
                        });
                    }
                }
            }
        });
    }

    function makeTTPath (tpath, color, opacity, weight) {
        return new google.maps.Polyline({
            path: tpath,
            geodesic: false, // change Manël (true) 
            strokeColor: color,
            strokeOpacity: opacity,
            strokeWeight: weight,
            zIndex: 4
        });
    }

    // Ajour Michel - Import Routage -------------------------------------------------
    function routing(button) {
        var race = races.get(selRace.value);
        switch (button.srcElement.id) {
            case "lbl_importZezo":
                importZezo();
                break;
            case "lbl_importAvalon":
                importAvalon("a");
                break;
            case "lbl_importAvalon2":
                importAvalon("aa");
                break;
			case "lbl_importVRZen":
                importVRZen("z");
                break;
			case "lbl_importVRZen2":
                importVRZen("zz");
                break;
			case "lbl_importLasardine":
                importSardine();
                break;
			case "lbl_importBitSailor":
                importBitSailor();
                break;
            case "lbl_delete":
                clearTrack(race.gmap,"_db_zezo");
                clearTrack(race.gmap,"_db_avl");
                clearTrack(race.gmap,"_db_avl2");
                clearTrack(race.gmap,"_db_zen");
                clearTrack(race.gmap,"_db_zen2");
                clearTrack(race.gmap,"_db_sar");
				clearTrack(race.gmap,"_db_bts");
                break;
        }
    }
    // Import from Zezo
    function importZezo(){
        var race = races.get(selRace.value);
        if(!race.tabzezo) {
            return;
        }
        var map = race.gmap;
        var RaceId = race.legdata._id.race_id;
        var tabzezo = race.tabzezo;

        map._db_zezo = new Array();
        var zpath = [];

        for (var i = 0 ; i < tabzezo.length ; i++) {
            var pos = new google.maps.LatLng(tabzezo[i].latitude, tabzezo[i].longitude);
            zpath.push(pos);

            var DateZezo = tabzezo[i].date.substr(8,2) + "/" + tabzezo[i].date.substr(5,2);
            var twa = tabzezo[i].twa + "°";
            var hdg = tabzezo[i].btw + "°";
            var twd = tabzezo[i].twd + "°";
            var infoTitle = "Routage zezo :\n"+
                        "Position : " + tabzezo[i].position + "\n" +
                        "Date : " + DateZezo + " " + tabzezo[i].time + " " + tabzezo[i].timezone + " (" + tabzezo[i].ttw + ")\n" +
                        "TWA : " + twa + "  |  HDG : " + hdg + "\n" +
                        "TWD : " + twd + "  |  TWS : " + tabzezo[i].tws + "s\n" +
                        "Speed : " + tabzezo[i].stw + " | Sail : " + tabzezo[i].sail;

            var marker = new google.maps.Marker({
                position: pos,
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    fillColor: "#DC143C",
                    strokeColor: "#DC143C",
                    strokeOpacity: 1,
                    scale: 1.5
                    },
                title: infoTitle,
                map: map
            });
            map._db_zezo.push(marker);
        }

        var zzpath = makeTTPath(zpath, "#DC143C", 1, 1.5);
        zzpath.setMap(map);
        map._db_zezo.push(zzpath);
    }
        
    // Import from Avalon
    function importAvalon(numRoute) {
        var race = races.get(selRace.value);
        var map = race.gmap;
        var RaceId = race.legdata._id.race_id;

		if ( numRoute == "a" ) {
			map._db_avl = new Array();
		}
		if ( numRoute == "aa" ) {
			map._db_avl2 = new Array();
		}	

        var zpath = [];

        var lineAvl = new Array();
        var poi = new Array();
        var lineAvl = readTextFile("./routes/" + numRoute + RaceId + ".csv");
        if(!lineAvl) {
            alert("Le fichier " + numRoute + RaceId + ".csv n'existe pas !");
            return;
        }
        var lineAvl = lineAvl.split('\n');
        var i = 0;
        while (i < lineAvl.length-2) {
            i = i + 1;
			
            if (i > 120) i = i + 5;
            if (i > lineAvl.length-2) i = lineAvl.length-2;
			lineAvl[i] = lineAvl[i].replace(/,/gi, ".");
            poi = lineAvl[i].split(";");
            var pos = new google.maps.LatLng(poi[1], poi[2]);
            zpath.push(pos);                
            for (var j = 0; j < 11; j++){
                if (poi[j] == "" || poi[j] == "undefined") poi[j] = "---"; 
            }
            if (poi[6] > 180) poi[6] = Math.abs(poi[6] - 360);
			if (poi[10] == 0) poi[10] = 1;
            var infoTitle = "Routage Avalon : " + poi[0] + "\n" +
                        "Position : " + Util.formatPosition(poi[1], poi[2]) + "\n" +
                        "TWA      : " + poi[6] + "°  |  HDG : " + poi[3] + "°\n" +
                        "TWD      : " + Util.roundTo( poi[7], 2) + "°  |  TWS : " + Util.roundTo( poi[8], 2) + " kt\n" +
                        "Speed    : " + poi[4] + " kt\n" +
						"Stamina  : " + poi[9] + "%\n" + 
						"Sail     : " + poi[5] + " | Boost = " + Util.roundTo(((poi[10] - 1) * 100),2) + "%" ;
                
            var marker = new google.maps.Marker({
                position: pos,
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    fillColor: ( numRoute == "a" ? "darkorange" : "gold" ),
                    strokeColor: ( numRoute == "a" ? "darkorange" : "gold" ),
                    strokeOpacity: 1,
                    scale: 1.5
                    },
                title: infoTitle,
                map: map
            });
            if ( numRoute == "a" ) {
				map._db_avl.push(marker);
			}
            if ( numRoute == "aa" ) {
				map._db_avl2.push(marker);
			}			
        }

		if ( numRoute == "a" ) {
			var zzpath = makeTTPath(zpath, "darkorange" , 1, 1.5);
			zzpath.setMap(map);
			map._db_avl.push(zzpath);
		}
		if ( numRoute == "aa" ) {
			var zzpath2 = makeTTPath(zpath, "gold" , 1, 1.5);
			zzpath2.setMap(map);
			map._db_avl2.push(zzpath2);
		}
	}

    // Import from VRZen
    function importVRZen(numRoute) {
        var race = races.get(selRace.value);
        var map = race.gmap;
        var RaceId = race.legdata._id.race_id;

		if ( numRoute == "z" ) {
			map._db_zen = new Array();
		}
		if ( numRoute == "zz" ) {
			map._db_zen2 = new Array();
		}	

        var zpath = [];

        var lineZen = new Array();
        var poi = new Array();
        var lineZen = readTextFile("./routes/" + numRoute + RaceId + ".csv");
        if(!lineZen) {
            alert("Le fichier " + numRoute + RaceId + ".csv n'existe pas !");
            return;
        }
        var lineZen = lineZen.split('\n');
        var i = 0;
        while (i < lineZen.length-2) {
            i = i + 1;
            if (i >120) i = i + 5;
            if(i > lineZen.length-2) i = lineZen.length-2;
            lineZen[i] = lineZen[i].replace(/,/gi, ".");
            poi = lineZen[i].split(";");
            // poi[1] = poi[1].substr(8,2) + "/" + poi[1].substr(5,2) + " " + poi[1].substr(11,5)
			var pos = new google.maps.LatLng(poi[3], poi[4]);
            zpath.push(pos);                
            for (var j = 0; j < 16 ; j++){
                if (poi[j] == "" || poi[j] == "undefined") poi[j] = "---"; 
            }
            if (poi[7] > 180) poi[7] = Math.abs(poi[7] - 360);
            var infoTitle = "Routage VR-Zen : "+ poi[1] + " (CET)\n"+
                        "Position : " + Util.formatPosition(poi[3], poi[4]) + "\n" +
                        "TWA : " + poi[6] + "°  |  HDG : " + poi[5] + "°\n" +
                        "TWD : " + poi[10] + "°  |  TWS : " + poi[11] + " kt\n" +
                        "Speed : " + poi[9] + " kt\n" +
						"Sail : " + poi[14] + " | Boost : " + Util.roundTo(poi[15],4);

            var marker = new google.maps.Marker({
                position: pos,
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    fillColor: ( numRoute == "z" ? "blue" : "cyan" ),
                    strokeColor: ( numRoute == "z" ? "blue" : "cyan" ),
                    strokeOpacity: 1,
                    scale: 1.5
                    },
                title: infoTitle,
                map: map
            });
            if ( numRoute == "z" ) {
				map._db_zen.push(marker);
			}
            if ( numRoute == "zz" ) {
				map._db_zen2.push(marker);
			}			
        }

		if ( numRoute == "z") {
			var zzpath = makeTTPath(zpath, "blue" , 1, 1.5);
			zzpath.setMap(map);
			map._db_zen.push(zzpath);
		}
		if ( numRoute == "zz" ) {
			var zzpath2 = makeTTPath(zpath, "cyan" , 1, 1.5);
			zzpath2.setMap(map);
			map._db_zen2.push(zzpath2);
		}
	}

    // Import from La Sardine
    function importSardine() {
        var race = races.get(selRace.value);
        var map = race.gmap;
        var RaceId = race.legdata._id.race_id;

        map._db_sar = new Array();
        var zpath = [];

        var lineSar = new Array();
        var poi = new Array();
        var lineSar = readTextFile("./routes/s" + RaceId + ".csv");
        if(!lineSar) {
            alert("Le fichier s" + RaceId + ".csv n'existe pas !");
            return;
        }
        var lineSar = lineSar.split('\n');
        var i = 0;
        while (i < lineSar.length-2) {
            i = i + 1;
            if (i > 54) i = i + 5;
            if(i > lineSar.length-2) i = lineSar.length-2;
            poi = lineSar[i].split(";");
            poi[0] = poi[0].substr(8,2) + "/" + poi[0].substr(5,2) + " " + poi[0].substr(11,5)
            var pos = new google.maps.LatLng(poi[1], poi[2]);
            zpath.push(pos);                
            for (var j = 0; j < 9; j++){
                if (poi[j] == "" || poi[j] == "undefined") poi[j] = "---"; 
            }
            if (poi[6] > 180) poi[6] = Math.abs(poi[6] - 360);
            var infoTitle = "Routage La Sardine :\n"+
                        "Position : " + Util.formatPosition(poi[1], poi[2]) + "\n" +
                        "Date : " + poi[0] + "\n" +
                        "TWA : " + Util.roundTo(poi[4], 1+nbdigits) + "°  |  HDG : " + Util.roundTo(poi[3], 1+nbdigits) + "°\n" +
                        "TWD : " + Util.roundTo(poi[5], 1+nbdigits) + "°  |  TWS : " + Util.roundTo(poi[6], 1+nbdigits) + " kts\n" +
                        "Speed : " + Util.roundTo(poi[7], 1+nbdigits) + " kts | Sail : " + poi[8];

            var marker = new google.maps.Marker({
                position: pos,
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    fillColor: "#2E8B57",
                    strokeColor: "#2E8B57",
                    strokeOpacity: 1,
                    scale: 1.5
                    },
                title: infoTitle,
                map: map
            });
            map._db_sar.push(marker);
        }

        var zzpath = makeTTPath(zpath, "#2E8B57", 1, 1.5);
        zzpath.setMap(map);
        map._db_sar.push(zzpath);
    }

    // Import from BitSailor
    function importBitSailor() {
		function ParseDMS(input) {
			var parts = input.split(/[^\d\w]+/);
			var lat = ConvertDMSToDD(parts[0], parts[1], parts[2], parts[3]);
			var lng = ConvertDMSToDD(parts[4], parts[5], parts[6], parts[7]);
			return {
				ddlat : lat,
				ddlng : lng
			}
		}
		function ConvertDMSToDD(degrees, minutes, seconds, direction) {
			var dd = Number(degrees) + Number(minutes)/60 + Number(seconds)/(60*60);
			if (direction == "S" || direction == "W") {
				dd = dd * -1;
			}
			return dd;
		}

        var race = races.get(selRace.value);
        var map = race.gmap;
        var RaceId = race.legdata._id.race_id;

        map._db_bts = new Array();
        var zpath = [];

        var lineBts = new Array();
        var poi = new Array();
        var lineBts = readTextFile("./routes/b" + RaceId + ".csv");
        if(!lineBts) {
            alert("Le fichier b" + RaceId + ".csv n'existe pas !");
            return;
        }
        var lineBts = lineBts.split('\n');
        var i = 0;
        while (i < lineBts.length-2) {
            i = i + 1;
            if (i > 120) i = i + 5; // Phil, à quoi ça sert ??? et pourquoi 120 ou 54 (sardine) ???
            if(i > lineBts.length-2) i = lineBts.length-2;
            poi = lineBts[i].split(";");
            poi[0] = poi[0].substr(0,10) + " " + poi[0].substr(11,5)
			var ddll = ParseDMS(poi[1]);
            var pos = new google.maps.LatLng(ddll.ddlat, ddll.ddlng);
            zpath.push(pos);                
            for (var j = 0; j < 11; j++){
                if (poi[j] == "" || poi[j] == "undefined") poi[j] = "---"; 
            }
            if (poi[6] > 180) poi[6] = Math.abs(poi[6] - 360);
            var infoTitle = "Routage BitSailor : " + poi[0] + " (UTC)\n"+
                        "Position : " + poi[1] + "\n" +
                        "TWA : " + poi[2] + "°  |  HDG : " + poi[5] + "°\n" +
                        "TWD : " + poi[7] + "°  |  TWS : " + poi[6] + " kt\n" +
                        "Speed : " + poi[4] + " kt\n" +
						"Stamina  : " + poi[10] + "%\n" + 
						"Sail : " + poi[3] + " | Boost : " + (poi[8] == "tolerance" ? "oui" : "non");

            var marker = new google.maps.Marker({
                position: pos,
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    fillColor: "#660033",
                    strokeColor: "#660033",
                    strokeOpacity: 1,
                    scale: 1.5
                    },
                title: infoTitle,
                map: map
            });
            map._db_bts.push(marker);
        }

        var zzpath = makeTTPath(zpath, "#660033", 1, 1.5);
        zzpath.setMap(map);
        map._db_bts.push(zzpath);
    }
    // Fin ajout Michel - Routage -----------------------------------------------
    
    function addmarker(map, bounds, pos, symbol, label, title, mref, zi, op) {
        var marker = new google.maps.Marker({
            position: pos,
            map: map,
            icon: symbol,
            label: label,
            title: title,
            mref: mref,
            zIndex: zi,
            opacity: op
        });
        bounds.extend(pos);
        return marker;
    }

    var ps_pathmap = {
        C: ['M 0 0 C -2 -20 -10 -22 -10 -30 A 10 10 0 1 1 10 -30 C 10 -22 2 -20 0 0 z M -2 -30 a 2 2 0 1 1 4 0 2 2 0 1 1 -4 0', 1, 1],
        RL: ['M 0 -47 A 25 25 0 0 1 23.4923155196477 -13.4494964168583 M 3.9939080863394 -44.6505783192808 L 0 -47 L 4.68850079700712 -48.5898093313296 M 21.650635094611 -9.50000000000001 A 25 25 0 0 1 -19.1511110779744 -5.93030975783651 M 17.6190221917365 -7.2158849772096 L 21.650635094611 -9.50000000000001 L 20.6831999642124 -4.64473453846344 M -21.650635094611 -9.49999999999999 A 25 25 0 0 1 -4.34120444167328 -46.6201938253052 M -21.6129302780759 -14.1335367035096 L -21.650635094611 -9.49999999999999 L -25.3717007612195 -12.7654561302069', 1, 0],
        RR: ['M 0 -47 A 25 25 0 0 1 23.4923155196477 -13.4494964168583 M 22.6505783192808 -18.0060919136606 L 23.4923155196477 -13.4494964168583 L 26.5898093313296 -17.3114992029929 M 21.650635094611 -9.50000000000001 A 25 25 0 0 1 -19.1511110779744 -5.93030975783651 M -14.7841150227904 -4.3809778082635 L -19.1511110779744 -5.93030975783651 L -17.3552654615366 -1.31680003578759 M -21.650635094611 -9.49999999999999 A 25 25 0 0 1 -4.34120444167328 -46.6201938253052 M -7.86646329649038 -43.6129302780759 L -4.34120444167328 -46.6201938253052 L -9.23454386979305 -47.3717007612195', 1, 0],
        B: ['M -8 20 C -12 -5 0 -20 0 -20 C 0 -20 12 -5 8 20 L -8 20', 0.7, 1],
        DL: ['M 0,-1 0,1', 5, 0]
    };

    function pinSymbol(color, objtyp, opacity, rotation, bordercol) {
        if (!opacity) opacity = 1.0;
        if (!rotation) rotation = 0.0;
        var strWeight = 1;
        if (bordercol == "#ffffff") strWeight = 2;
        return {
            path: ps_pathmap[objtyp][0],
            fillColor: color,
            fillOpacity: ps_pathmap[objtyp][2] ? 1.0 : 0.0,
            strokeColor: ps_pathmap[objtyp][2] ? bordercol : color,
            strokeWeight: strWeight,
            strokeOpacity: opacity,
            scale: ps_pathmap[objtyp][1],
            rotation: rotation
        };
    }

    function pinSymbol2(color, size, opacity) {
        return {
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: color,
            strokeColor: color,
            strokeOpacity: opacity,
            scale: size,
            draggable: false
        };
    }

    function pinSymbol3(color, size, opacity, angle) {
        return {
            path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
            fillColor: color,
            strokeColor: color,
            strokeOpacity: opacity,
            scale: size,
			rotation:angle,
            draggable: false
        };
    }
    
    /*
    function randomColor () {
        const r = Math.floor(Math.random() * 256);
        const g = Math.floor(Math.random() * 256);
        const b = Math.floor(Math.random() * 256);
        return "rgb(" + r + "," + g + "," + b + ")";
    } */

    function saveOption(e) {
        localStorage["cb_" + this.id] = this.checked;
    }

    function getOption(name) {
        var value = localStorage["cb_" + name];
        if (value !== undefined) {
            var checkBox = document.getElementById(name);
            checkBox.checked = (value === "true");
            var event = new Event('change');
            checkBox.dispatchEvent(event);
        }
    }

    function readOptions() {
        getOption("auto_router");
		getOption("zen_router");
        getOption("auto_dark");
        getOption("markers");
        getOption("reuse_tab");
        getOption("local_time");
        getOption("nmea_output");
        getOption("2digits");
        getOption("bsp_down");
		getOption("vrouteur");
    }

    function addConfigListeners() {
        cbRouter.addEventListener("change", saveOption);
		cbZenRouter.addEventListener("change", saveOption);
        cbDark.addEventListener("change", saveOption);
        cbMarkers.addEventListener("change", saveOption);
        cbMarkers.addEventListener("change", () => {
            updateMapFleet(races.get(selRace.value));
        });
        cbReuseTab.addEventListener("change", saveOption);
        cbLocalTime.addEventListener("change", saveOption);
        cbNMEAOutput.addEventListener("change", saveOption);
        cb2digits.addEventListener("change", saveOption);
        cbBSPDown.addEventListener("change", saveOption);
		cbvrouteur.addEventListener("change", saveOption);
    }

    function filterChanged(e) {
        updateMapFleet();
    }
    

    function onCallRouter (event) {
        callRouter(selRace.value);
    }

    function callRouter (raceId, userId = currentUserId, auto = false) {
        if (selRace.selectedIndex == -1) {
            alert("Race info not available - please reload VR Offshore");
            return;
        }

        var race = races.get(raceId);
        if (!race) {
            alert("Unsupported race #" + raceId);
            return;
        }

        // Get boat status
        var isMe = (userId == currentUserId);
        var userInfo = (isMe) ? race.curr : raceFleetMap.get(raceId).uinfo[userId];
        if (!userInfo) {
            alert("No position received yet. Please retry later.");
            return;
        }

        callRouterZezo(race, userInfo, isMe, auto);
    }

    function callRouterZezo (race, userInfo, isMe, auto) {

        // Zezo race set up?
        if (race.url === undefined) {
            alert("Unsupported race, no router support yet.");
            return;
        }

        // Ask user confirmation if position is stale
        if (userInfo.lastCalcDate) {
            var now = new Date();
            if ((now - userInfo.lastCalcDate) > 750000) {
                console.log("Confirm routing for stable position?");
                // If the Dashboard tab is not active, confirm does NOT raise a popup
                // and returns false immediately.
                // This means the router will not be auto-called with a stale position.
                if (! confirm("Position is older than 10min, really call router?")) {
                    console.log("Confirm routing ==> cancel.");
                    return;
                } else {
                    console.log("Confirm routing ==> confirmed.");
                }
            }
        }

        var baseURL = `http://zezo.org/${race.url}/chart.pl`;

        var optionBits = {
            "winch": 4,
            "foil": 16,
            "light": 32,
            "reach": 64,
            "heavy": 128
        };

        var pos = userInfo.pos;
        var twa = userInfo.twa;

        var options = 2;
        if (userInfo.options) {
            for (const option of userInfo.options) {
                if (optionBits[option]) {
                    options |= optionBits[option];
                }
            }
        } else {
			options = "246";
		}

        var url = baseURL
            + "?lat=" + pos.lat
            + "&lon=" + pos.lon
            + "&clat=" + pos.lat
            + "&clon=" + pos.lon
            + "&ts=" + (race.curr.lastCalcDate / 1000)
            + "&o=" + options
            + "&twa=" + twa
            + "&userid=" + getUserId(userInfo)
            + "&type=" + (isMe ? "me":"friend")
            + "&auto=" + (auto ? "yes" : "no")
        window.open(url, cbReuseTab.checked ? baseURL : "_blank");
        race.tabzezo = scriptzezo(url);     // Add Guy
        console.log("tabzezo : ", race.tabzezo);
    }
    
    function callRZen(raceId, userId) {
		var raceNum = Math.trunc(raceId);
        var isMe = (userId == currentUserId);
		var baseURL = "https://routage.";
		if ( whiteVRZen[currentUserId] ) baseURL = "http://bsp.";
		if ( cbBSPDown.checked ) baseURL = "https://routage.";
		baseURL += "vrzen.org/Course/" + raceNum + "/"
		console.log(currentUserId, whiteVRZen[currentUserId], baseURL);
		var race = races.get(raceId);
		// Get boat status
        var userInfo = (isMe) ? race.curr : raceFleetMap.get(raceId).uinfo[userId];
        if (!userInfo) {
            alert("No position received yet. Please retry later.");
            return;
        }
        var pos = userInfo.pos ;
		var sail = userInfo.sail % 10;
		var stamina = race.curr.stamina ; // stamina du boat qui lance le calcul
		var cap = userInfo.heading ;
        var position = pos.lat.toFixed(4) + "/" + pos.lon.toFixed(4) + "/" +  cap.toFixed(0) + "/" +  sail + "/" +  stamina.toFixed(0) ;
		var url = baseURL + position.replaceAll(".",",");
        window.open(url, cbReuseTab.checked ? baseURL : "_blank");	
    }

    function reInitUI(newId) {
        if (currentUserId != undefined && currentUserId != newId) {
            // Re-initialize statistics
            disableRaces();
            races.forEach(function (race) {
                race.tableLines = [];
                race.curr = undefined;
                race.prev = undefined;
                race.lastCommand = undefined;
                race.rank = undefined;
                race.dtl = undefined;
                race.gmap = undefined;
            });
            divRaceStatus.innerHTML = makeRaceStatusHTML();
            divRecordLog.innerHTML = makeTableHTML();
            updateFleetHTML();
            makeWaypointsHTML();
			buildlogBookHTML();

        };
    }

    //**********************
	//* ONGLET : RACE DATA *
	//**********************

function buildlogBookHTML(race) {

    // start, finish blue yellow
    //var pos = new google.maps.LatLng(race.legdata.start.lat, race.legdata.start.lon);
    //Util.formatPosition(race.legdata.end.lat, race.legdata.end.lon)
    
    function makelogBookLine(type,name,id,lat1,lon1,lat2,lon2,status) {

        var bookLine = '<tr>'
        + '<td class="type">'+type+'</td>'
        + '<td class="name">'+name+'</td>'
        + '<td class="name">'+id+'</td>'
        + '<td class="position"> ' + Util.formatPosition(lat1,lon1) + '</td>';

        if(lat2 && lon2) 
            bookLine += '<td class="position">' + Util.formatPosition(lat2,lon2) + '</td>';
        else if(lat2)
            bookLine += '<td class="position"> Radius : '+ lat2 + ' mn </td>';
        else    
            bookLine += '<td class="position"> - </td>';
        
        if(status) 
            bookLine += '<td class="status">' + status + '</td>';
        else
            bookLine += '<td class="status"> - </td>';
        bookLine += '</tr>';
        return bookLine;
    }
    function highlightOptionsAlreadyTaken(opt) {
        if (race.curr.options.includes(opt)) return 'style="color:limegreen"';
    }
    function totalCreditsForOptionsAlreadyTaken() {
        let total = 0;
        if (race.curr.options.includes('foil')) total += race.legdata.optionPrices.foil;
        if (race.curr.options.includes('winch')) total += race.legdata.optionPrices.winch;
        if (race.curr.options.includes('hull')) total += race.legdata.optionPrices.hull;
        if (race.curr.options.includes('light')) total += race.legdata.optionPrices.light;
        if (race.curr.options.includes('reach')) total += race.legdata.optionPrices.reach;
        if (race.curr.options.includes('heavy')) total += race.legdata.optionPrices.heavy;
        if (race.curr.options.includes('radio')) total += race.legdata.optionPrices.radio;
        if (race.curr.options.includes('skin')) total += race.legdata.optionPrices.skin;
        return total;
    }
	
    if(!race || !race.legdata) {
        var raceIdentification = '<br><table id="raceidTable">'
        + '<thead>'
        + '<tr>'
        + '<th colspan = 8>No data available</th>'
        + '</tr>' 
        + '</thead>'
        + '</table>'
        
        document.getElementById("raceBook").innerHTML = raceIdentification;
        return;
    }

    let playerOption = "-";
    if(race.curr && race.curr.options) playerOption = race.curr.options;

	var levelVSR = "HC";
	if ( race.legdata.vsrLevel != "-1") levelVSR = "VSR" + race.legdata.vsrLevel;
	levelVSR += " - Cat" + race.legdata.priceLevel;
	var fineGrib = race.legdata.fineWinds ? '<span style="color:red;">GFS 0,25°</span>' : 'GFS 1°' ;
	var polarID = polars[race.legdata.boat.polar_id];
	if (polarID._updatedAt != undefined) {
		var polarDate = polarID._updatedAt.substring(0,16);
	} else {
		var polarDate = 'unknown';
	}
    var raceIdentification = '<br><table id="raceidTable">'
        + '<thead>'
        + '<tr><th colspan="8">Race and boat data</th></tr>'
		+ '<tr>'
			+ '<th>Race name</th>'
			+ '<th>Race Id . #leg</th>'
			+ '<th>Level VSR</th>'
			+ '<th>Grib</th>'
			+ '<th>Boat name</th>'
			+ '<th>Boat/polar Id</th>'
			+ '<th>Boat/polar update</th>'
			+ '<th>Boat coeff.</th>'
		+ '</tr>'
		+ '<tr>'
			+ '<td class="type">' + race.legdata.name + ' </td>'
			+ '<td class="type">' + race.id + '</td>'
			+ '<td class="type">' + levelVSR + '</td>'
			+ '<td class="type">' + fineGrib + '</td>'
			+ '<td class="type">' + race.legdata.boat.label + '</td>'
			+ '<td class="type">' + race.legdata.boat.polar_id + '</td>'	
			+ '<td class="type">' + polarDate + '</td>'
			+ '<td class="type">' + race.coeff_sta + '</td>'
        + '</tr>'
        + '</thead>'
        + '</table>'
        + '<br><table id="raceidTable2">'
        + '<thead>'
        + '<tr>'
        + '<th colspan="9">Credits <span style="color:limegreen">(Option équipée)</span></th>'
        + '</tr>' 
        + '<tr>'
			+ '<th>Free Credits</th>'
			+ '<th ' + highlightOptionsAlreadyTaken('foil') + '>Foils</th>'
			+ '<th ' + highlightOptionsAlreadyTaken('winch') + '>Winch</th>'
			+ '<th ' + highlightOptionsAlreadyTaken('hull') + '>Hull</th>'
			+ '<th ' + highlightOptionsAlreadyTaken('light') + '>Light</th>'
			+ '<th ' + highlightOptionsAlreadyTaken('reach') + '>Reach</th>'
			+ '<th ' + highlightOptionsAlreadyTaken('heavy') + '>Heavy</th>'
			+ '<th ' + highlightOptionsAlreadyTaken('radio') + '>Radio</th>'
			+ '<th ' + highlightOptionsAlreadyTaken('skin') + '>Skin</th>'
        + '</tr>' 
        + '</thead>'
        + '<tbody>'
        + '<tr>'
			+ '<td class="type">'+ race.legdata.freeCredits +'</td>'
			+ '<td class="type">'+ race.legdata.optionPrices.foil + '</td>'
			+ '<td class="type">'+ race.legdata.optionPrices.winch + '</td>'
			+ '<td class="type">'+ race.legdata.optionPrices.hull + '</td>'
			+ '<td class="type">'+ race.legdata.optionPrices.light + '</td>'
			+ '<td class="type">'+ race.legdata.optionPrices.reach + '</td>'
			+ '<td class="type">'+ race.legdata.optionPrices.heavy + '</td>'
			+ '<td class="type">'+ race.legdata.optionPrices.radio + '</td>'
			+ '<td class="type">'+ race.legdata.optionPrices.skin + '</td>'
        + '</tr>'
        + '</tbody>'
        + '</table>';
        
    var raceStatusHeader = '<tr>'
    + '<th title="Type">' + "Type" + '</th>'
    + '<th title="Name">' + "Name" + '</th>'
    + '<th title="Id">' + "Id" + '</th>'
    + '<th title="Position">' + "Position" + '</th>'
    + '<th title="Position2">' + "Position2" + '</th>'
    + '<th>' + "Status" + '</th>';

    raceStatusHeader += '</tr>';

    var raceLine ="";
    
    raceLine += makelogBookLine("Start ",
                                race.legdata.start.name,
                                "Start",
                                race.legdata.start.lat,race.legdata.start.lon,
                                null,null,
                                "Date : " + Perso.formatDateUTC(race.legdata.start.date) );

    if(race.legdata.checkpoints)
    {
        for (var i = 0; i < race.legdata.checkpoints.length; i++) {
            var cp = race.legdata.checkpoints[i];
            var cp_name = "invisible";
            if (cp.display != "none") cp_name = cp.display;  
            
            var g_passed = "";
            if (race.gatecnt && race.gatecnt[cp.group - 1]) {
                g_passed = "Passed";
            } // mark/gate passed - semi transparent

            raceLine += makelogBookLine(cp_name,
                                        cp.name,
                                        cp.group + "." + cp.id,
                                        cp.start.lat,cp.start.lon,
                                        cp.end?cp.end.lat:null,cp.end?cp.end.lon:null ,
                                        g_passed);  
        }
    }
    

    raceLine += makelogBookLine("End ",
                                race.legdata.end.name,
                                "End",
                                race.legdata.end.lat,race.legdata.end.lon,
                                race.legdata.end.radius?race.legdata.end.radius:null,null,
                                "Date : " + Perso.formatDateUTC(race.legdata.end.date) );
 
    var raceBookTable = '<table id="raceStatusTable">'
    + '<br><thead>'
    + raceStatusHeader
    + '</thead>'
    + '<tbody>'
    + raceLine
    + '</tbody>'
    + '</table>';

    document.getElementById("raceBook").innerHTML = raceIdentification+raceBookTable;

}

    function getUserId (message) {
        return (message._id)?message._id.user_id:message.userId;
    }

    // Helper function: Invoke debugger command
    function sendDebuggerCommand (debuggeeId, params, command, callback) {
        try {
            chrome.debugger.sendCommand({ tabId: debuggeeId.tabId }, command, { requestId: params.requestId }, callback);
        } catch (e) {
            console.log(e);
        }
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async function handleResponseReceived (debuggeeId, params) {
		await sleep(selWaitDelay.value * 1000);
		sendDebuggerCommand(debuggeeId, params, "Network.getRequestPostData", (response) => {
			if(chrome.runtime.lastError) {
				console.warn(chrome.runtime.lastError.message);
				console.log("*Erreur dans handleResponseReceived : getRequestPostData");
			} else {
				if (response && response.postData) {
					var postData = response.postData;
					sendDebuggerCommand(debuggeeId, params, "Network.getResponseBody", (response) => {_handleResponseReceived(xhrMap.get(params.requestId), response, postData)});
						if(chrome.runtime.lastError) {
							console.warn(chrome.runtime.lastError.message);
							console.log("*Erreur dans handleResponseReceived : getResponseBody");
						}
				}				
			}										
		});
    }

    function _handleResponseReceived(request, response, postData) {
        if (cbRawLog.checked) {
            divRawLog.innerHTML = divRawLog.innerHTML + "\n" + "<<< " + JSON.stringify(response);
        }
        let eventClass = request.url.substring(request.url.lastIndexOf('/') + 1);
        let body = JSON.parse(response.body.replace(/\bNaN\b|\bInfinity\b/g, "null"));
        if (eventClass == 'getboatinfos') {
            handleBoatInfo(response);
        } else if (eventClass == 'getfleet') {
            handleFleet(request, response, postData);
        } else if (eventClass == 'AccountDetailsRequest') {
            handleAccountDetailsResponse(body);
		} else if (eventClass == 'getlegranks') {
            handleLegRanks(request, response, postData);
        } else if (eventClass == 'LeaderboardDataRequest') {
            handleLeaderboardDataResponse(request, response);
        } else if (eventClass == 'LogEventRequest') {
            if (postData) {
                let postDataJSON = JSON.parse(postData);
                // let event = postDataJSON['@class'];
                var eventKey = postDataJSON.eventKey;
                if (eventKey == 'Leg_GetList') {
                    handleLegGetListResponse(body);
                } else if (eventKey == 'Meta_GetPolar') {
                    handleMetaGetPolar(body);
                } else if (eventKey == 'Game_AddBoatAction' ) {
                    handleGameAddBoatAction(postDataJSON, body);
                } else if (eventKey == "Game_GetGhostTrack") {
                    handleGameGetGhostTrack(postDataJSON, body);
				} else if (eventKey == "Leg_GetHistory") {
					handleLegGetHistory(postDataJSON, body);
				} else if (eventKey == "Team_GetList") {
					handleTeamGetList(postDataJSON, body);
				} else if (eventKey == "Team_Get") {
					handleTeamGet(postDataJSON, body);
				} else if (eventKey == "Team_GetFrozenList") {
					handleTeamGetFrozenList(postDataJSON, body);
                } else if (eventKey == "User_GetCard") {
                    handleUserGetCard(postDataJSON, body);
                } else if (ignoredMessages.includes(eventKey)) {
                    // console.info("Ignored eventKey " + eventKey, postDataJSON);
                } else {
                    // console.info("Unhandled logEvent " + JSON.stringify(response) + " with eventKey " + eventKey);
                }
            } else {
                console.log("Can't determine event type for {}", response);
            }
        } else {
			console.info("Unhandled request " + request.url );
        }
    }

    function handleAccountDetailsResponse (response) {
        reInitUI(response.userId);
        currentUserId = response.userId;
        lbBoatname.innerHTML = response.displayName;
		// lien GEFS si autorisé
		selGefs.innerHTML = ( whiteVRZen[currentUserId] ) ? " | <a href='http://bsp-gefs.vrzen.org/' target='blank'>GEFS</a>"  : "";
        if (response.scriptData.team) {
            currentTeam = response.scriptData.team.name;
        }
    }
    
    function handleBoatInfo (response) {
        if (response) {
            if (cbRawLog.checked) {
                divRawLog.innerHTML = divRawLog.innerHTML + "\n" + "<<< " + JSON.stringify(response);
            }
            try {
                var message = JSON.parse(response.body).res;
                if (message.leg) {
                    if (message.bs && (! currentUserId)) {
                        // Don't overwrite currentUserId if it's defined.
                        // When the user changes boats, we either receive an account message, or Dashboard was restartet.
                        currentUserId = message.bs._id.user_id;
                    }
                    handleLegInfo(message.leg);
                }
                if (message.bs) {
                    if (!currentUserId) {
                        alert("Logged-on user is unknown, please exit and re-enter VR Offshore!");
                        return;
                    }
                    if (currentUserId ==  message.bs._id.user_id) {
                        var isFirstBoatInfo = (message.leg != undefined);
                        handleOwnBoatInfo(message.bs, isFirstBoatInfo);
                    } else {
                        handleFleetBoatInfo(message.bs);
                    }
                }
				if (message.track) {
					if (message.track._id.user_id == currentUserId) {
						handleOwnTrackInfo(message.track);
					} else {
						// Ignore track info.
						// There is currently no function to update a single competitor track.
					}
				}
                if (message.ba) {
                    handleBoatActions(message.ba);
                }

            } catch (e) {
                console.log(e + " at " + e.stack);
            }
        }        
    }

    function handleFleet (request, response, postData) {
        if (response) {
            try {
                var requestData = JSON.parse(postData);
                var raceId = getRaceLegId(requestData);
                var race = races.get(raceId);
                var message = JSON.parse(response.body).res;
                updateFleet(raceId, "fleet", message);
                updateFleetHTML(raceFleetMap.get(selRace.value));
                updateMapFleet(race);
            } catch (e) {
                console.log(e + " at " + e.stack);;
            }
        }
    }
    
    // Ajout Classements Michel
    function handleLegRanks (request, response, postData) {
        if (response) {
            if (cbRawLog.checked) {
                divRawLog.innerHTML = divRawLog.innerHTML + "\n" + "<<< " + JSON.stringify(response);
            }
            try {
				console.log("request", request, "response", response, "postdata", postData);
                var requestData = JSON.parse(postData);
				console.log("requestData", requestData);
                var raceId = getRaceLegId(requestData);
				console.log("raceId", raceId);
				console.log("races", races);
                var race = races.get(raceId);
				console.log("race", race);
				console.log("body", JSON.parse(response.body));
                var message = JSON.parse(response.body).res;
				console.log("message", message);
                if (!RaceRank.partition) {
                    RaceRank.partition = 0;    
                }

                if (RaceRank.legId != raceId || RaceRank.partition != requestData.partition) {
                    RaceRank.uinfo = [];
                    RaceRank.table = [];
                }
                if (race) {
                    RaceRank.legId = race.id;
                    RaceRank.legName = race.legName;
                    RaceRank.vsrLevel = race.vsrLevel;
                    RaceRank.priceLevel = race.priceLevel;
                }
				if (!RaceRank.legName) RaceRank.legName = raceId;
				console.log("RaceRank.legName",RaceRank.legName);

                switch (RaceRank.vsrLevel) {
                    case -1:
                        var MaxPoints = 15000;
                        break;
                    case 1:
                        var MaxPoints = 10000;
                        break;
                    case 2:
                        var MaxPoints = 5000;
                        break;
                    case 3:
                        var MaxPoints = 3000;
                        break;
                }
                RaceRank.partition = requestData.partition;
                var idx = message.rank.length;
                for (var i = 0; i< idx; i++) {
                    var id = message.rank[i]._id;
                    RaceRank.uinfo[id] = message.rank[i];
                    RaceRank.uinfo[id].dispCountry = message.rank[i].country;
                    RaceRank.uinfo[id].userName = message.rank[i].displayName;
                    RaceRank.uinfo[id].teamName = teamnameCSV[message.rank[i]._id];	// Manël			
                    RaceRank.uinfo[id].rank = message.rank[i].rank;
                    RaceRank.uinfo[id].time = message.rank[i].time;
                    RaceRank.uinfo[id].userId = message.rank[i]._id;
                    RaceRank.uinfo[id].vsrpoints = MaxPoints / (message.rank[i].rank ** 0.125);
                    RaceRank.uinfo[id].credits = 1600 * (7 - RaceRank.priceLevel) / (message.rank[i].rank ** 0.25);                        
                    RaceRank.uinfo[id].country = "-";
                    RaceRank.uinfo[id].city = "-";
                    }

                RaceRank.table = Object.keys(RaceRank.uinfo);
            } catch (e) {
                console.log(e + " at " + e.stack);;
            }
        }        
    }
    
    function handleLeaderboardDataResponse(request, response) {
        if (response) {
            if (cbRawLog.checked) {
                divRawLog.innerHTML = divRawLog.innerHTML + "\n" + "<<< " + JSON.stringify(response);
            }
            try {
                var response = JSON.parse(response.body);
                if (response.leaderboardShortCode == "LDB_VSR2") {
                    if (!VSRRank.dt) {
                        var year = response.data[0].when.substring(0, 4);
                        var month = response.data[0].when.substring(5, 7);
                        var day = response.data[0].when.substring(8, 10);
                        var dt = day + "/" + month + "/" + year;
                        VSRRank.dt = dt;
                    }
                        
                    if (!VSRRank.legname) {
                        VSRRank.legname = response.scriptData.lastLeg[0].legName;
                    }

                    var idx = response.data.length;
                    for (var i = 0; i< idx; i++) {
                        var id = response.data[i].userId;
                        VSRRank.uinfo[id] = response.data[i];
                        if(response.scriptData.genderTypes[id]) {
                            VSRRank.uinfo[id].gender = response.scriptData.genderTypes[id];                                
                        } else {
                            VSRRank.uinfo[id].gender = "-";                                
                        }
                        if(response.scriptData.usersData[id].team) {
                            VSRRank.uinfo[id].team = response.scriptData.usersData[id].team.name;    
                        } else {
                            VSRRank.uinfo[id].team = "---";    
                        }
                    }
                    VSRRank.table = Object.keys(VSRRank.uinfo);    

                } else if (response.leaderboardShortCode.substring(0, 13) == "LDB_VSRSeason") {
                    if (!SeasonRank.dt) {
                        var year = response.data[0].when.substring(0, 4);
                        var month = response.data[0].when.substring(5, 7);
                        var day = response.data[0].when.substring(8, 10);
                        var dt = day + "/" + month + "/" + year;
                        SeasonRank.dt = dt;
                    }
                        
                    if (!SeasonRank.legname) {
                        SeasonRank.legname = response.scriptData.lastLeg[0].legName;
                    }

                    var idx = response.data.length;
                    for (var i = 0; i< idx; i++) {
                        var id = response.data[i].userId;
                        SeasonRank.uinfo[id] = response.data[i];
                        if(response.scriptData.genderTypes[id]) {
                            SeasonRank.uinfo[id].gender = response.scriptData.genderTypes[id];                                
                        } else {
                            SeasonRank.uinfo[id].gender = "-";                                
                        }
                        if(response.scriptData.usersData[id].team) {
                            SeasonRank.uinfo[id].team = response.scriptData.usersData[id].team.name;    
                        } else {
                            SeasonRank.uinfo[id].team = "---";    
                        }
                    }
                    SeasonRank.table = Object.keys(SeasonRank.uinfo);    
                    
                } else if (response.leaderboardShortCode == "LDB_Team") {
                    if (!HOFRank.dt) {
                        var year = response.data[0].when.substring(0, 4);
                        var month = response.data[0].when.substring(5, 7);
                        var day = response.data[0].when.substring(8, 10);
                        var dt = day + "/" + month + "/" + year;
                        HOFRank.dt = dt;
                    }                        

                    if (VSRRank.legName) {
                        HOFRank.legName = VSRRank.legName;
                    } else {
                        HOFRank.legName = "NC";
                    }

                    for (var VRdata of response.data) {
                        var HOFdata = Object.keys(VRdata);
                        VRdata.score = VRdata[HOFdata[6]]/1000000;
                        VRdata.teamsize = VRdata[HOFdata[7]];
                    }
                    var idx = response.data.length;
                    for (var i = 0; i< idx; i++) {
                        id = response.data[i].teamId;
                        HOFRank.uinfo[id] = response.data[i];
                    }
                    HOFRank.table = Object.keys(HOFRank.uinfo);                    

                } else if (response.leaderboardShortCode.substring(0, 12) == "LDB_Team_Leg") {                        
                    var len = response.leaderboardShortCode.length;
                    var legId = response.leaderboardShortCode.substring(22, len);
                    HOFRace.legId = legId;
                    if (RaceRank.legName) {
                        HOFRace.legName = RaceRank.legName;    
                    } else {
                        HOFRace.legname = "NC";
                    }
                    for (var VRdata of response.data) {    
                        var HOFdata = Object.create(VRdata);
                        VRdata.teamsize = HOFdata["SUPPLEMENTAL-teamsize"];
                        VRdata.score = HOFdata["LAST-score"]/1000000;
                        VRdata.racing = HOFdata["SUPPLEMENTAL-racing"];
                    }
                    var idx = response.data.length;
                    for (var i = 0; i< idx; i++) {
                        id = response.data[i].teamId;
                        HOFRace.uinfo[id] = response.data[i];
                    }
                    HOFRace.table = Object.keys(HOFRace.uinfo);
                    FrozenList = [];
                    FrozenList.legId = legId;
                    FrozenList.legName = HOFRace.legName;

                }

            } catch (e) {
                console.log(e + " at " + e.stack);;
            }
        }
    }
   
    function handleLegGetHistory(request, response) {
        RacesHistory = response.scriptData.res;
        for (var VRdata of RacesHistory) {
            VRdata.legId = VRdata._id.race_id;
            if (VRdata.multiLeg == true) {
                VRdata.legId += "." + VRdata._id.leg_num;
            } else {
                VRdata.legId += ".1";    
            }
        }
        const iterator1 = races[Symbol.iterator]();
        for (const item of iterator1) {
            RacesHistory.push({
                legId: item[1].id,
                legName: item[1].legName,
                name: item[1].name
            });
        }
    }
    
    function handleTeamGetFrozenList(request, response) {
        var response = response.scriptData.res;
        var id = response[0]._id;
        FrozenList[id] = response;
    }
    
    function handleTeamGetList(request, response) {
        var idx = response.scriptData.res.length;
        for (var i = 0; i< idx; i++) {
            var id = response.scriptData.res[i].id;
            TeamList.uinfo[id] = response.scriptData.res[i];
            TeamList.uinfo[id].teamName = response.scriptData.res[i].def.name;
            TeamList.uinfo[id].teamsize = response.scriptData.res[i].def.members;
            TeamList.uinfo[id].type = response.scriptData.res[i].def.type;
            TeamList.uinfo[id].vsrLevel = response.scriptData.res[i].def.vsrLevel;
            TeamList.uinfo[id].desc = response.scriptData.res[i].def.desc;
        }
        TeamList.table = Object.keys(TeamList.uinfo);
    }
    
    function handleTeamGet(request, response) {
        var idx = response.scriptData.res.def.members.length;
        for (var i = 0; i< idx; i++) {
            var id = response.scriptData.res.def.members[i].id;
            TeamMembers.uinfo[id] = response.scriptData.res.def.members[i].id;
            TeamMembers.uinfo[id] = response.scriptData.res.def.members[i];
            TeamMembers.uinfo[id].idTeam = response.scriptData.res.id;    
            TeamMembers.uinfo[id].teamName = response.scriptData.res.def.name;
            TeamMembers.uinfo[id].vsrPoints = response.scriptData.res.def.members[i].vsr2.currentPoints;
            TeamMembers.uinfo[id].xpPoints = response.scriptData.res.def.members[i].xp.points;
            TeamMembers.uinfo[id].xpLevel = response.scriptData.res.def.members[i].xp.level;
        }
        TeamMembers.table = Object.keys(TeamMembers.uinfo);     
    }
    // Fin Ajout Classements Michel
    
    function handleOwnBoatInfo(message, isFirstBoatInfo) {
        var raceId = selRace.value = getRaceLegId(message._id);        
        var race = races.get(raceId);
        updatePosition(message, race);
        if (isFirstBoatInfo ) {
            if ( cbRouter.checked) {
				callRouter(raceId, currentUserId, true);
			}
			if ( cbZenRouter.checked) { // Manël
				callRZen(raceId, currentUserId);
			}
        }
        // Add own info on Fleet tab
        mergeBoatInfo(raceId, "usercard", message._id.user_id, message);
    }

    function handleOwnTrackInfo(message) {
        var raceId = getRaceLegId(message._id);
        var race = races.get(raceId);
        updateMapMe(race, message.track);
    }

    function handleFleetBoatInfo(message) {
        var raceId = getRaceLegId(message._id);
        var race = races.get(raceId);
        var userId = getUserId(message);
        if ( (!race.bestDTF) || (message.distanceToEnd < race.bestDTF) ) {
            race.bestDTF = message.distanceToEnd;
        }	
        makeRaceStatusHTML();
        makeTableHTML(race);
        mergeBoatInfo(raceId, "usercard", userId, message);
        updateFleetHTML(raceFleetMap.get(selRace.value));
        makeWaypointsHTML(raceFleetMap.get(selRace.value));
        updateMapFleet(race);
        document.dispatchEvent(new Event('change'))
    }

    function handleLegInfo(message) {
        // ToDo - refactor updateFleetUinfo message
        var raceId = getRaceLegId(message._id);
        var race = races.get(raceId);
        race.legdata = message;
		getCoeffStamina(race, message.boat.label);
        switchMap(race);
    }

    function handleBoatActions(message) {
        for (const action of message) {
            var raceId = getRaceLegId(action._id);
            var race = races.get(raceId);
            if (action.pos) {
                race.waypoints = action;
                updateMapWaypoints(race);
            }
        }
    }

    function noticeGFSCycle(params) {
        // console.log("Loading wind " + params.request.url.substring(45));
        /* if ( params.request.url.endsWith('wnd') ) {
            var cycleString = params.request.url.substring(45, 56);
            var d = parseInt(cycleString.substring(0, 8));
            var c = parseInt(cycleString.substring(9, 11));
            var cycle = d * 100 + c;
            if (cycle > currentCycle) {
                currentCycle = cycle;
                // Modif Manel - Mise en forme
                lbCycle.innerHTML = cycleString.substring(6, 8) + "-" + cycleString.substring(4, 6) + "-" + cycleString.substring(0, 4) + " " + cycleString.substring(9, 11) + "Z";
            }
        } */
		// Version de Phil
		var noaa = true;
		var cyclePos = 0, cycleLive = 0, cycleFine = 0;
		var currentCycle;
		var dt = new Date().toLocaleTimeString("fr").substring(0, 5);	
		if ( params.request.url.substring(40, 44) == "live" ) {
		    if ( params.request.url.substring(60) != ".wnd" ) {
				var ref = params.request.url.substring(60);				
				// divRawLog.innerHTML = divRawLog.innerHTML + "\n " + dt + " - Chargement vent réf : " + ref;
				noaa = false;
			} else {
				// divRawLog.innerHTML = divRawLog.innerHTML + "\n " + dt + " - Chargement vent : " + params.request.url.substring(45, 60);
				cycleLive = 1;
				currentCycle = currentCycle_live;
			}
		} else if ( params.request.url.substring(40, 44) == "fine" ) {
			// divRawLog.innerHTML = divRawLog.innerHTML + "\n " + dt + " - Chargement vent : " + params.request.url.substring(54, 69);
			cycleFine = 1;
			currentCycle = currentCycle_fine;
			cyclePos = 9;
		} else {
			lbCycle.innerHTML = "Unknown";
			return;
		}				
        if (noaa === true) {
            var cycleString = params.request.url.substring(45 + cyclePos, 60 + cyclePos);
            var d = parseInt(cycleString.substring(0, 8));
            var c = parseInt(cycleString.substring(9, 11));
			var t = parseInt(cycleString.substring(12, 15));
            var cycle = d * 100 + c;
			cycle = cycle * 1000 + t;
            if (cycle > currentCycle) {
                currentCycle = cycle;
				if (cycleLive == 1) {
					cycle_live = "Gfs1_" + cycleString.substring(0, 8) + "_" + cycleString.substring(9, 11) + "Z";
					cycle_live = cycle_live +  "_TM" + cycleString.substring(12, 15);
					currentCycle_live = currentCycle;
				} else if (cycleFine == 1) {
					cycle_fine = "Gfs025_" + cycleString.substring(0, 8) + "_" + cycleString.substring(9, 11) + "Z";
					cycle_fine = cycle_fine +  "_TM" + cycleString.substring(12, 15);
					currentCycle_fine = currentCycle;
				}				
				if (cycleLive == 1 && currentCycle_fine == 0) {
					cycleString = cycle_live;
				} else if (cycleFine == 1 && currentCycle_live == 0) {
					cycleString = cycle_fine;
				} else {
					cycleString = cycle_live + " / " + cycle_fine;
				}                				
				lbCycle.innerHTML = cycleString;
            }
        }		
		
    }
    
    function handleLegGetListResponse(response) {
        // Contains destination coords, ice limits
        // ToDo: contains Bad Sail warnings. Show in race status table?
        var legInfos = response.scriptData.res;
        legInfos.map(function (legInfo) {
            var rid = legId(legInfo);
            var race = races.get(rid);
            if (race === undefined) {
                race = {
                    id: rid,
                    name: legInfo.legName,
                    legName: legInfo.legName,
                    source: "vr_leglist"
                };
                initRace(race, true);
            } else {
                race.legName = legInfo.legName; // no name yet (created by updatePosition)
                // renameRace(rid, race.name);
            }
            race.rank = legInfo.rank;
            race.type = legInfo.raceType;
            race.legnum = legInfo.legNum;
            race.status = legInfo.status;
            race.record = legInfo.record;
            race.priceLevel = legInfo.priceLevel;
            race.vsrLevel = legInfo.vsrRank;
            if (legInfo.problem == "badSail") {} else if (legInfo.problem == "...") {}
        });
        divRaceStatus.innerHTML = makeRaceStatusHTML();
    }

    function handleGameAddBoatAction(request, response) {
        // First boat state message, only sent for the race the UI is displaying
        var raceId = getRaceLegId(request);
        var race = races.get(raceId);
        if (race != undefined) {
            race.lastCommand = {
                request: request,
                rc: response.scriptData.rc
            };
            addTableCommandLine(race);
            divRaceStatus.innerHTML = makeRaceStatusHTML();
            clearTrack(race.gmap,"_db_wp");
            if (response.scriptData.boatActions) {
                handleBoatActions(response.scriptData.boatActions);
            }
        }
    }

    function handleMetaGetPolar(response) {
        // Always overwrite cached data...
        polars[response.scriptData.polar._id] = response.scriptData.polar;
        chrome.storage.local.set({
            "polars": polars
        });
        console.info("Stored polars " + response.scriptData.polar.label);
    }

    function handleGameGetGhostTrack(request, response) {
        var raceId = getRaceLegId(request);
        var fleet = raceFleetMap.get(raceId);
        var race = races.get(raceId);
        var uid = request.user_id;
        
        if (race) {
            race.leaderTrack = response.scriptData.leaderTrack;
            race.leaderName =  response.scriptData.leaderName;
            if (response.scriptData.myTrack) {
                race.myTrack = response.scriptData.myTrack;
            }
            updateMapLeader(race);
        }
    }

    function handleUserGetCard(request, response) {
        var raceId = getRaceLegId(request);
        var uid = request.user_id;
        if ( response.scriptData.baseInfos
             && response.scriptData.legInfos
             && response.scriptData.legInfos.type) {
            mergeBoatInfo(raceId, "usercard", uid, response.scriptData.baseInfos);
            mergeBoatInfo(raceId, "usercard", uid, response.scriptData.legInfos);
            if (raceId == selRace.value) {
                updateFleetHTML(raceFleetMap.get(selRace.value));
                makeWaypointsHTML(raceFleetMap.get(selRace.value));
                makeIntegratedHTML();
            }
            var race = races.get(raceId);
            updateMapFleet(race);
        }
    }
    
    function handleWebSocketFrameSent(params) {
        // Append message to raw log
        if (cbRawLog.checked) {
            divRawLog.innerHTML = divRawLog.innerHTML + "\n" + ">>> " + params.response.payloadData;
        }
        
        // Map to request type via requestId
        var request = JSON.parse(params.response.payloadData);
        requests.set(request.requestId, request);
        
        if (request.eventKey == "Game_StartAttempt") {
            var raceId = getRaceLegId(request);
            var race = races.get(raceId);
            if (race) {
                race.prev = undefined;
                race.curr = undefined;
            }
        }
    }

    function handleWebSocketFrameReceived(params) {
        // Append message to raw log
        if (cbRawLog.checked) {
            divRawLog.innerHTML = divRawLog.innerHTML + "\n" + "<<< " + params.response.payloadData;
        }
        // Work around broken message
        var jsonString = params.response.payloadData.replace(/\bNaN\b|\bInfinity\b/g, "null");
        var response = JSON.parse(jsonString);
        if (response == undefined) {
            console.log("Invalid JSON in payload");
        } else {
            var responseClass = response["@class"];
            if (responseClass == ".AccountDetailsResponse") {
                handleAccountDetailsResponse();
            } else if (responseClass == ".LogEventResponse") {
                // Get the matching request and Dispatch on request type
                var request = requests.get(response.requestId);
                
                // Dispatch on request type
                if (request == undefined) {
                    // Probably only when debugging.
                    // -- save and process later ?
                    console.warn(responseClass + " " + response.requestId + " not found");
                } else if (request.eventKey == "Leg_GetList") {
                    handleLegGetListResponse(response);
                } else if (request.eventKey == "Game_AddBoatAction") {
                    handleGameAddBoatAction(postData, response);
                } else if (request.eventKey == "Meta_GetPolar") {
                    handleMetaGetPolar(response);
                } else if (request.eventKey == "Game_GetGhostTrack") {
                    handleGameGetGhostTrack(request, response);
                } else if (request.eventKey == "User_GetCard") {
                    handleUserGetCard(request, response);
                } else if (request.eventKey == "Leg_GetHistory") {
                    handleLegGetHistory(request, response);
                } else if (request.eventKey == "Team_GetList") {
                    handleTeamGetList(request, response);
                } else if (request.eventKey == "Team_Get") {
                    handleTeamGet(request, response);
                } else if (eventKey == "Team_GetFrozenList") {
                    handleTeamGetFrozenList(postData, body);
                } else if (ignoredMessages.includes(eventKey)) {
                    console.info("Ignored eventKey " + eventKey);
                } else {
                    console.warn("Unhandled logEvent " + JSON.stringify(response) + " with eventKey " + eventKey);
                }
            }
        }
    }
    
    function onEvent (debuggeeId, message, params) {
        if ( tabId != debuggeeId.tabId ) return;

        if ( message == "Network.requestWillBeSent" && params && params.request && params.request.url) {
            if  ( params.request.method == "POST" &&
                  ( params.request.url.startsWith("https://prod.vro.sparks.virtualregatta.com")
					|| params.request.url.startsWith("https://dev.vro.sparks.virtualregatta.com")
                    || params.request.url.startsWith("https://vro-api-ranking.prod.virtualregatta.com")
					|| params.request.url.startsWith("https://vro-api-ranking.devel.virtualregatta.com")
                    || params.request.url.startsWith("https://vro-api-client.prod.virtualregatta.com")
					|| params.request.url.startsWith("https://vro-api-client.devel.virtualregatta.com"))
                ) {
                if (cbRawLog.checked && params) {
                    divRawLog.innerHTML = divRawLog.innerHTML + "\n" + ">>> " + JSON.stringify(params.request);
                }
                xhrMap.set(params.requestId, params.request);
            } else if ( params.request.url.substring(0, 40) == "https://static.virtualregatta.com/winds/" ) {
                noticeGFSCycle(params);
            }
        } else if (message == "Network.responseReceived") {
            var request = xhrMap.get(params.requestId);
            if (request) {
                // if ( params && params.response && params.response.url == "https://vro-api-client.prod.virtualregatta.com/getboatinfos" ) {
                //     handleBoatInfo(debuggeeId, params);
                // } else if ( params && params.response && params.response.url == "https://vro-api-client.prod.virtualregatta.com/getfleet" ) {
                //     handleFleet(debuggeeId, params);
                // }
                handleResponseReceived(debuggeeId, params);
            }
        } else if (message == "Network.webSocketFrameSent") {
            handleWebSocketFrameSent(params);
        } else if (message == "Network.webSocketFrameReceived") {
            handleWebSocketFrameReceived(params);
        }
    }

    function setUp () {
        var manifest = chrome.runtime.getManifest();        
        document.getElementById("lb_version").innerHTML = manifest.version;

        lbBoatname = document.getElementById("lb_boatname");
        lbBoattype = document.getElementById("lb_boattype");
        lbTeamname = document.getElementById("lb_teamname");
        selRace = document.getElementById("sel_race");
        lbCycle = document.getElementById("lb_cycle");
        selNmeaport = document.getElementById("sel_nmeaport");
        selWaitDelay = document.getElementById("sel_waitdelay");
        selFriends = document.getElementById("sel_skippers");
        cbFriends = document.getElementById("sel_friends");
        cbOpponents = document.getElementById("sel_opponents");
        cbCertified = document.getElementById("sel_certified");
        cbTeam = document.getElementById("sel_team");
        cbTop = document.getElementById("sel_top");
        cbReals = document.getElementById("sel_reals");
        cbSponsors = document.getElementById("sel_sponsors");
        cbInRace = document.getElementById("sel_inrace");
        cbRouter = document.getElementById("auto_router");
		cbZenRouter = document.getElementById("zen_router");
        cbDark = document.getElementById("auto_dark");          // Ajout Manel
        cbMarkers = document.getElementById("markers");
        cbReuseTab = document.getElementById("reuse_tab");
        cbLocalTime = document.getElementById("local_time");
        cbNMEAOutput = document.getElementById("nmea_output");
        lbRace = document.getElementById("lb_race");
        lbCurTime = document.getElementById("lb_curtime");
        lbCurPos = document.getElementById("lb_curpos");
        lbHeading = document.getElementById("lb_heading");
        lbTWS = document.getElementById("lb_tws");
        lbTWD = document.getElementById("lb_twd");
        lbTWA = document.getElementById("lb_twa");
        lbDeltaD = document.getElementById("lb_delta_d");
        lbDeltaT = document.getElementById("lb_delta_t");
        lbSpeedC = document.getElementById("lb_curspeed_computed");
        lbSpeedR = document.getElementById("lb_curspeed_reported");
        lbSpeedT = document.getElementById("lb_curspeed_theoretical");
        divRaceStatus = document.getElementById("raceStatus");
        divRecordLog = document.getElementById("recordlog");
        divRecordLog.innerHTML = makeTableHTML();
        cbRawLog = document.getElementById("cb_rawlog");
        divRawLog = document.getElementById("rawlog");
        // Ajout Michel ---------------------------------------------
        cbSelect = document.getElementById("sel_selected");        
        cb2digits = document.getElementById("2digits");
        cbBSPDown = document.getElementById("bsp_down");
		cbvrouteur = document.getElementById("vrouteur");
        importRoute = document.getElementById("sel_importRoute");
        divVRRanking = document.getElementById("VRRanking");
        makeRanking = document.getElementById("sel_ranking");
        lbRankingVSR = document.getElementById("sel_VSR");
        lbRankingSeason = document.getElementById("sel_Season");
        lbRankingHOF = document.getElementById("sel_HOF");
        lbRankingHOFRace = document.getElementById("sel_HOFRace");
        lbTeamMembers = document.getElementById("sel_TeamMb");
        lbLegname = document.getElementById("lb_legname");
        lbRaceNotif = document.getElementById("sel_raceNotif");
        lbType1Notif = document.getElementById("sel_type1Notif");
        lbType2Notif = document.getElementById("sel_type2Notif");
        lbValNotif = document.getElementById("sel_valNotif");
        lbMinNotif = document.getElementById("sel_minuteNotif");
        divNotif = document.getElementById("notif");
        selBlocKmz = document.getElementById("sel_blockmz");
        // Fin ajout Michel ------------------------------------------
		selGefs = document.getElementById("sel_gefs");
		
        document.getElementById("bt_router").addEventListener("click", onCallRouter);
        document.getElementById("sel_race").addEventListener("change", changeRace);
        document.getElementById("sel_skippers").addEventListener("change", updateFleetFilter);
        document.getElementById("sel_friends").addEventListener("change", updateFleetFilter);
        document.getElementById("sel_opponents").addEventListener("change", updateFleetFilter);
        document.getElementById("sel_team").addEventListener("change", updateFleetFilter);
        document.getElementById("sel_top").addEventListener("change", updateFleetFilter);
        document.getElementById("sel_reals").addEventListener("change", updateFleetFilter);
        document.getElementById("sel_sponsors").addEventListener("change", updateFleetFilter);
        document.getElementById("sel_inrace").addEventListener("change", updateFleetFilter);
        document.getElementById("bt_clear").addEventListener("click", clearLog);
        
        document.addEventListener("click", tableClick);
        document.addEventListener("resize", resize);
        
        // Ajout Michel ----------------------------------------------------------------------------
        document.getElementById("sel_certified").addEventListener("change", updateFleetFilter);
        document.getElementById("sel_selected").addEventListener("change", updateFleetFilter);
        document.getElementById("2digits").addEventListener("change", updateFleetFilter);
        document.getElementById("bsp_down").addEventListener("change", updateFleetFilter);
		document.getElementById("vrouteur").addEventListener("change", updateFleetFilter);
        document.getElementById("local_time").addEventListener("change", updateFleetFilter);
        document.getElementById("sel_ranking").addEventListener("click", ranking);
        document.getElementById("sel_importRoute").addEventListener("click", routing); 
        document.getElementById("bt_notif").addEventListener("click", setNotif);
        document.getElementById("sel_blockmz").addEventListener("change", setKmz);
        document.getElementById("bt_map").addEventListener("click", Perso.showmap);
        // Fin ajout Michel -------------------------------------------------------------------------

        initRaces();

        chrome.storage.local.get("polars", function (items) {
            if (items["polars"] !== undefined) {
                console.log("Retrieved " + items["polars"].filter(function (value) {
                    return value != null
                }).length + " polars.");
                polars = items["polars"];
            }
        });
        
        selNmeaport.addEventListener("change", function (e) {
            console.log("Setting proxyPort = " +  selNmeaport.value); 
            NMEA.settings.proxyPort = selNmeaport.value;
        }); 
        
        selWaitDelay.addEventListener("change", function (e) {
            console.log("Setting Wait Delay = " +  selWaitDelay.value); 
        });

        cbNMEAOutput.addEventListener("change", function (e) {
            if (cbNMEAOutput.checked) {
                console.log("Starting NMEA");
                NMEA.start(races, raceFleetMap, isDisplayEnabled);
            } else {
                console.log("Stopping NMEA");
                NMEA.stop();
            }
        });
        
		cbDark.addEventListener("change", function (e) {
			var allLinks = document.getElementsByTagName("link");
			for ( var iLink = 0 ; iLink < allLinks.length ; iLink++) {
				var theLink = document.getElementsByTagName("link").item(iLink);
				var theHref = theLink.getAttribute("href");
				theHref = theHref.substring(6,12);
				if ( theHref == "style-" ) {
					var oldlink = theLink;
					var newlink = document.createElement("link");
					newlink.setAttribute("rel", "stylesheet");
					newlink.setAttribute("type", "text/css");
					if (cbDark.checked) {	
						newlink.setAttribute("href", "./css/style-dark.css");
					} else {
						newlink.setAttribute("href", "./css/style-light.css");
					}
					document.getElementsByTagName("head").item(0).replaceChild(newlink, oldlink);
				}
			}			
        });
		
        // Set stored options after connectiing event listeners
        readOptions();
        addConfigListeners();
        
        chrome.debugger.sendCommand({
            tabId: tabId
        }, "Network.enable", function () {
            // just close the dashboard window if debugger attach fails
            // wodks on session restore too
            
            if (chrome.runtime.lastError) {
                window.close();
                return;
            }
        });
        chrome.debugger.onEvent.addListener(onEvent);
    };

    document.addEventListener("DOMContentLoaded", function (event) {
        setUp();
    });
    
}) ();
