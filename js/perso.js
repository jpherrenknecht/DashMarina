    // Fonctions perso Michel -------------------------------------------------

    // Carte repérage pixels ------
    function showmap() {
        var width = 550;
        var height = 600;
        if(window.innerWidth) {
            var left = (window.innerWidth - width)/2;
            var top = (window.innerHeight - height)/2;
        } else {
            var left = (document.body.clientWidth - width)/2;
            var top = (document.body.clientHeight - height)/2;
        }
        window.open('./map.html', 'carte des pixels', 'menubar=no, scrollbars=yes, left=' + left + ', top=' + top + ', width=' + width + ', height=' + height);
    }

    // Notifications -------------------------
    function formatTimeNotif(ts) {
        var tsOptions = {
            hour: "numeric",
            minute: "numeric",
            hour12: false
        };
        var d = (ts) ? (new Date(ts)) : (new Date());
        return new Intl.DateTimeFormat("lookup", tsOptions).format(d);
    }


    // Michel - Date pour races ranking
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

    // Michel - Affichage Heure locale / Heure UTC
    function formatDateUTC(ts) {
        var tsOptions = {
            month: "numeric",
            day: "numeric",
            hour: "numeric",
            minute: "numeric",
            // second: "numeric",
            hour12: false
         };
        var d = (ts) ? (new Date(ts)) : (new Date());
		
		// ajout des secndes si !=0 (arrivée ou échoué) 
		var tsOptionSec = { second: "numeric" };
		var tsSec = new Intl.DateTimeFormat("lookup", tsOptionSec).format(d);
		// 	console.log( tsSec);
		if ( tsSec != 0 ) { 
			tsOptions.second = "numeric";
		}

		var sec = new Intl.DateTimeFormat("lookup", tsOptions).format(d);
        var dtUTCLocal = new Intl.DateTimeFormat("lookup", tsOptions).format(d);
        tsOptions.timeZone = "UTC";
        var dtUTC = new Intl.DateTimeFormat("lookup", tsOptions).format(d);
        return '<span id="UTC">' + dtUTC + '</span><span id="UTCLocal">' + dtUTCLocal + '</span>';

    }
    // Fin ajout Michel - Date / Time




export { showmap,
        formatTimeNotif,
        formatDateUTC
        };

