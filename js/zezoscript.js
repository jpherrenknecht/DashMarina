"use strict";
//const pattern = /updi\(event,'([0-9]{4}-[0-9]{2}-[0-9]{2}) ([0-9]{2}:[0-9]{2}) ([A-Z]{3,4}).*(T[+-]{1}.*?[0-9]{1,}:[0-9]{2}).*<br>Distances:.*?([0-9]{1,}\.[0-9]{1,}nm)\/([0-9]{1,}\.[0-9]{1,}nm)<br><b>Wind:<\/b> ([0-9]*?.*) (.*? kt).*\(<b>TWA(.*?)<\/b>\)<br><b>Heading:<\/b>(.*?)<b>Sail:<\/b>(.*?)<br><b>Boat Speed:<\/b>(.*?)'/g

// const pattern = /1;\sleft\s:([-]{0,1}[0-9]{1,5})px;\stop:([0-9]{1,5})px;"\s\s\sonmouseover="updi\(event,'([0-9]{4}-[0-9]{2}-[0-9]{2})\s([0-9]{2}:[0-9]{2})\s([A-Z]{3,4})\s\((T[+]{1}\s[0-9]{1}:[0-9]{2}|T[+]{1}[0-9]{2,3}:[0-9]{2})\)<br>Distances:&nbsp;([0-9]{1,4}\.[0-9]{1,1}nm)\/([0-9]{1,4}\.[0-9]{1,1}nm)<br><b>Wind:<\/b>\s([0-9]{1,3})&deg;\s([0-9]{1,2}\.[0-9]{1,1}\skt)\s\(<b>TWA\s([-]{0,1}[0-9]{1,3})&deg;<\/b>\)<br><b>Heading:<\/b>\s([0-9]{1,3})&deg;<b>Sail:<\/b>\s([a-zA-Z]{2,4})<br><b>Boat\sSpeed:<\/b>\s([0-9]{1,3}\.[0-9]{1,2}\skts)/

// const pattern2 = /left :([+-]{1}.[0-9]{1,})px.*?top:([0-9]{1,})px/
const pattern = /1;\sleft\s:([-]{0,1}[0-9]{1,})px;\stop:([0-9]{1,})px;"\s*onmouseover="updi\(event,'([0-9]{4}-[0-9]{2}-[0-9]{2})\s([0-9]{2}:[0-9]{2})\s([A-Z]{3,4})\s\((T[+]{1}\s?[0-9]{1,3}:[0-9]{2})\)<br>Distances:&nbsp;([0-9]{1,4}.[0-9]{1}nm)\/([0-9]{1,4}.[0-9]{1}nm)<br><b>Wind:<\/b>\s([0-9]{1,3})&deg;\s([0-9]{1,2}.[0-9]{1}\skt)\s\(<b>TWA\s([-]{0,1}[0-9]{1,3})&deg;<\/b>\)<br><b>Heading:<\/b>\s([0-9]{1,3})&deg;<b>Sail:<\/b>\s([a-zA-Z0]{2,3})<br><b>Boat\sSpeed:<\/b>\s([0-9]{1,3}.[0-9]{1,2}\skts)/

var scale;

/* Calculate latitude using the scale of the display and the css top property
 * @param top
 * @param scale
 * @returns {number}
 */
function getLatitude(top, scale) {
    return 90 - ((parseInt(top) + 2) / scale);
}

/*
 * Calculate longitude using the scale of the display and the css left property
 * @param left
 * @param scale
 * @returns {number}
 */

function zero(value) {
    if (value < 10) {
        value = "0" + value;
    }
    return value;
}
function dmsConv(latitude, longitude) {
    var latAbs = Math.abs(latitude);
    var latDeg = Math.trunc(latAbs);
    var latMin = Math.trunc((latAbs - latDeg) * 60);
    var latSec = Math.trunc((((latAbs - latDeg) * 60) - latMin ) * 60);
    var latCard = (latitude >= 0) ? "N" : "S";

    var lonAbs = Math.abs(longitude);
    var lonDeg = Math.trunc(lonAbs);
    var lonMin = Math.trunc((lonAbs - lonDeg) * 60);
    var lonSec = Math.trunc((((lonAbs - lonDeg) * 60) - lonMin ) * 60);
    var lonCard = (longitude >= 0) ? "E" : "W";

    return zero(latDeg) + "\u00B0" + zero(latMin) + "\u0027" + zero(latSec) + "\u0022" + latCard + " - " + zero(lonDeg) + "\u00B0" + zero(lonMin) + "\u0027" + zero(lonSec) + "\u0022" + lonCard;
} 
 
function getLongitude(left, scale){
    left= parseInt(left);
    if (((left + 2 / scale) >= -180) || ((left + 2 / scale) <= 180)) {
        return (left + 2) / scale;
    } else {
        return ((left  + 2) / scale) - 360;
    }
}

function scriptzezo(url){
    var points = [];
    var result = [];;
    var xhrtst = new XMLHttpRequest();
    var textContent;
    var table="";
    xhrtst.open("GET", url);
//    xhrtst.responseType = "text";
    xhrtst.send();
    xhrtst.onload = function () {
        textContent = xhrtst.responseText;
        result=textContent.split(pattern);
        scale = /var scale = ([0-9]+)/.exec(result[0]);

        for (var i = 0; i < result.length -1; i = i + 15) {
            var datas=result.slice(i+1,i+15);
            // console.log("Datas : ", datas);
            var [left,top,date,time,timezone,ttw,dtw,dtg,twd,tws,twa,btw,sail,stw] = datas;
            var longitude = getLongitude(left, scale[1]);
            var latitude = getLatitude(top, scale[1]);
            var position = dmsConv(latitude, longitude);
            table = table + '#' + [latitude, longitude, position, date, time, timezone, ttw, dtw, dtg, twd, tws, twa, btw, sail, stw].join();
            points.push({
                latitude: latitude,
                longitude: longitude,
                position: position,
                date: date,
                time: time,
                timezone: timezone,
                ttw: ttw,
                dtw: dtw,
                dtg: dtg,
                twd: twd,
                tws: tws,
                twa: twa,
                btw: btw,
                sail: sail,
                stw: stw
            });
        }

        // console.log("table :", table.replace(/&deg;/g, "°"));
        return table;
    }
    // console.log(points);
    return points;
}

