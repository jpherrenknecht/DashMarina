let drawTheme = "dark";
//if(localStorage["addOnTheme"])
//drawTheme = localStorage["addOnTheme"];

let mode="pirate";
/*
if(localStorage["addOnMode"])
  mode = localStorage["addOnMode"];
if(mode=="incognito")
  drawTheme = "light"

document.documentElement.style.height = '100%';
document.body.style.height = '100%';
document.documentElement.style.width = '100%';
document.body.style.width = '100%';
document.documentElement.setAttribute("data-theme", drawTheme);
 


function callRouterZezo() { 
  if(zezoUrl!= "") window.open(zezoUrl, openNewTab ? zezoUrlRace:"_blank");
}

function callRouterToxxct() { 
  if(toxxctUrl!= "")  window.open(toxxctUrl, openNewTab ?toxxctUrlRace:"_blank" );
}
let openNewTab = false;
let zezoUrl = "";
let toxxctUrl = "";
let zezoUrlRace = "";
let toxxctUrlRace = "";

*/

chrome.runtime.onConnect.addListener(function(port) {
  
  var manifest = chrome.runtime.getManifest();
    if(port.name==("DashPortCom" + manifest.version)) {
      port.onMessage.addListener(function(msg) {
          if (msg.order === "create"  /*&& mode!="incognito"*/) {
          createContainer();
        } else if (msg.order === "update" /*&& mode!="incognito"*/) {
          openNewTab = msg.newTab;
          //zezoUrl = msg.zurl;
          //toxxctUrl = msg.purl;
          
          //zezoUrlRace = msg.rzurl;
          //toxxctUrlRace = msg.rpurl;

          let ourDiv = document.getElementById('dashInteg');
          if(!ourDiv) { //page has been refresh but not dashboard tab
            document.documentElement.setAttribute("data-theme", drawTheme);
            ourDiv = createContainer();
          }
          ourDiv.innerHTML = msg.content;

          if(msg.rid !="") {
            document.getElementById('rt:' + msg.rid).addEventListener("click", callRouterZezo);
			document.getElementById('rz:' + msg.rid).addEventListener("click", callRouterVRZ);
            document.getElementById('pl:' + msg.rid).addEventListener("click", callRouterToxxct);
          }
        } else if (msg.order === "setTheme" /*&& mode!="incognito" */) {
          drawTheme = msg.theme;
          document.documentElement.setAttribute("data-theme", drawTheme);
          localStorage["addOnTheme"] = drawTheme;
        } else if(msg.order === "addOnMode") {
          mode=msg.mode;
          if(msg.mode == "incognito") {
            let ourDiv = document.getElementById('dashIntegRow');
            if(ourDiv) ourDiv.remove();
            drawTheme = "light";
            document.documentElement.setAttribute("data-theme", drawTheme);
          } else
          {
            let ourDiv = document.getElementById('dashInteg');
            if(!ourDiv) { //page has been refresh but not dashboard tab
              document.documentElement.setAttribute("data-theme", drawTheme);
              ourDiv = createContainer();
            }
            drawTheme = msg.theme;
            document.documentElement.setAttribute("data-theme", drawTheme); 
            localStorage["addOnTheme"] = drawTheme; 

          }
          localStorage["addOnMode"] = mode;
        }
      });
    }
});


function createContainer() {
  //search for existing div
  let ourDiv = document.getElementById('dashIntegRow');
  if(ourDiv) ourDiv.remove();

  ourDiv = document.createElement('div');
  ourDiv.id = 'dashIntegRow';
  ourDiv.classList.add("et_pb_row");
  

  let ourDiv2 = document.createElement('div');
  ourDiv2.id = 'dashInteg';
  ourDiv2.classList.add("et_pb_column");
  ourDiv2.classList.add("et_pb_column_4_4");
  ourDiv2.classList.add("et_pb_column_0");

  ourDiv.appendChild(ourDiv2);
  //append all elements
  

 // // gameDiv.appendChild(ourDiv);
 const gameDiv = document.getElementsByClassName('et_pb_section et_pb_section_0')[0];
 //const gameDiv = document.getElementsByClassName('logo_container')[0];
  gameDiv.appendChild(ourDiv);
  return ourDiv2;

}
  