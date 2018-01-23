
var connection;

//var serverIp = 'localhost';
var serverIp = '198.100.45.213';

function setUpWebSocket() {
  window.WebSocket = window.WebSocket || window.MozWebSocket;
  if (!window.WebSocket) {
    console.log("No WebSocket available");
    return;
  }
  connection = new WebSocket('ws://'+serverIp+':17633');
  connection.onopen = function () {
  };
  connection.onmessage = function(message) {
    try {
      var message = message.data || message.utf8Data;
			var data = JSON.parse(message);
      console.log(data);
      switch (data.tag) {
      case 'INFO':
        switch (data.param) {
        case 'ITEMS':
          var itemsReference = data.info;
          reference.items = itemsReference;
          renderInventory();
          break;
        case 'NPCS':
          var npcReference = data.info;
          reference.NPCs = npcReference;
          renderActions();
          break;
        case 'PLAYERS':
          var players = data.info;
          player = players[data.id];
          renderActions();
          renderWorld();
          renderSkills();
          renderInventory();
          break;
        case 'SKILLS':
          var skillsReference = data.info;
          reference.skills = skillsReference;
          renderActions();
          renderSkills();
          break;
        case 'WORLD':
          var worldData = data.info;
          worldMap = worldData;
          renderActions();
          renderWorld();
          break;
        }
        break;
      case 'LOGIN':
        if (data.result) {
          loginContainer.hidden=true;
          worldContainer.hidden=false;
          actionContainer.hidden=false;
          skillsContainer.hidden=false;
          backpackContainer.hidden=false;
          initialInfoRequests();
        }
        break;
      case 'NOTIFICATION':
        var notificationText = data.text;
        notifications.push(notificationText);
        if (notifications.length>5) {
          notifications.splice(0,1);
        }
        renderNotifications();
        break;
      case 'TIME':
        var time = data.param;
        timeOffset = (new Date()).getTime()-time;
      }
    } catch (e) {
      console.log(e);
      return;
    }
  };
}
setUpWebSocket();

/////////////////////////////////////////////////
/////////////////////////////////////////////////
/////////////////////////////////////////////////

function sendLoginRequest() {
  var sha256 = new jsSHA('SHA-256', 'TEXT');
  sha256.update(loginPassword.value);
  var passHash = sha256.getHash("HEX");
  var packet = {
    tag:'LOGIN',
    register:false,
    user:loginUsername.value,
    pass:passHash
  };
  connection.send(JSON.stringify(packet));
}

function sendNewAccountRequest() {
  var sha256 = new jsSHA('SHA-256', 'TEXT');
  sha256.update(loginPassword.value);
  var passHash = sha256.getHash("HEX");
  var packet = {
    tag:'LOGIN',
    register:true,
    user:loginUsername.value,
    pass:passHash
  };
  connection.send(JSON.stringify(packet));
}

function sendPlayerInfoRequest() {
  var packet = {
    tag:'INFO',
    param:'PLAYERS'
  };
  connection.send(JSON.stringify(packet));
}

function sendItemReferenceInfoRequest() {
  var packet = {
    tag:'INFO',
    param:'ITEMS'
  };
  connection.send(JSON.stringify(packet));
}

function sendNPCReferenceInfoRequest() {
  var packet = {
    tag:'INFO',
    param:'NPCS'
  };
  connection.send(JSON.stringify(packet));
}

function sendSkillReferenceInfoRequest() {
  var packet = {
    tag:'INFO',
    param:'SKILLS'
  };
  connection.send(JSON.stringify(packet));
}

function sendWorldInfoRequest() {
  var packet = {
    tag:'INFO',
    param:'WORLD'
  };
  connection.send(JSON.stringify(packet));
}

function sendLocationActionRequest(locationID, actionIndex) {
  var packet = {
    tag:'ACTION',
    param:'LOCAL',
    locationID,
    actionIndex
  };
  connection.send(JSON.stringify(packet));
}

function sendMoveRequest(destinationID) {
  var packet = {
    tag:'ACTION',
    param:'WORLDMOVE',
    destination:destinationID
  };
  connection.send(JSON.stringify(packet));
}

/////////////////////////////////////////////////
/////////////////////////////////////////////////
/////////////////////////////////////////////////

var reference = {};

var notifications = [];

var worldMap = [];
var player;

var timeOffset = 0;

function Player() {
  this.speed = 1;
  this.status = 'REST';
  this.locationID = 2;
  this.getLocationName = () => {
    console.log(this.locationID);
    return worldMap[this.locationID].name;
  };
  this.travelTo = (destinationID) => {
    this.status = 'TRAVEL';
    this.startLocationID = this.locationID;
    this.endLocationID = destinationID;
    this.departureTime = (new Date()).getTime();
    this.arrivalTime = this.departureTime + worldMap[this.startLocationID].distanceTo(worldMap[this.endLocationID])*1000/this.speed;
  };
  return this;
}

function removeNotification(index) {
  notifications.splice(index,1);
  renderNotifications();
}

function renderLogin () {
  var loginHTML = `
  <h2>Login or Register</h2>
  <br>
  <span>Username:  <input id='loginUsername'></input></span><br>
  <span>Password:  <input id='loginPassword'></input></span><br><br>
  <button id='loginButton' onclick='sendLoginRequest()'>Login</button> <button id='registerButton' onclick='sendNewAccountRequest()'>Create new Account</button>
  `;
  loginContainer.innerHTML = loginHTML;
}

function renderNotifications() {
  var notificationHTML = ``;
  var i;
  for (i=0;i<notifications.length;i++) {
    notificationHTML += `<div onclick='removeNotification(${i})' class='notificationBox'>${notifications[i]}</div>`;
  }
  notificationsContainer.innerHTML = notificationHTML;
}

function renderWorld () {
  if (worldMap) {
    var worldMapHTML = ``;
    var i;
    for (i=0;i<worldMap.length;i++) {
      worldMapHTML+=`<img src='${toCamelCase(worldMap[i].name)}.png' id='world-map-location-${i}' onclick='sendMoveRequest(${i})' width=50 height=50></img>`;
    }
    if (player) {
      worldMapHTML+=`<img src='player.png' id='world-map-player' width=25 height=25></img>`;
    }
    worldContainer.innerHTML = worldMapHTML;
    // ^^^ Create image elements ^^^
    for (i=0;i<worldMap.length;i++) {
      var image = document.getElementById(`world-map-location-${i}`);
      image.style.position = 'absolute';
      image.style.left = `${worldMap[i].longitude*50+250}px`;
      image.style.top = `${-worldMap[i].latitude*50+250}px`;
    }
    if (player && worldMap[player.locationID]) {
      var worldMapPlayerImage = document.getElementById('world-map-player');
      worldMapPlayerImage.style.position = 'absolute';
      worldMapPlayerImage.style.left = `${worldMap[player.locationID].longitude*50+262}px`;
      worldMapPlayerImage.style.top = `${-worldMap[player.locationID].latitude*50+262}px`;
      if (player.status=='TRAVEL') {
        setTimeout(animateWorldMapPlayer,50);
      }
    }
    // ^^^ Position image elements ^^^
  }
}

function renderActions() {
  if (player && player.status=='REST' && reference.skills && worldMap[player.locationID]) {
    var actionContainerHTML = ``;
    var locationName = worldMap[player.locationID].name;
    var locationActions = worldMap[player.locationID].attributes;
    actionContainerHTML+=`<h2>Your location: ${locationName}</h2><br>`;
    var i;
    for (i=0;i<locationActions.length;i++) {
      var action = locationActions[i];
      if (action.skillID!=undefined) {
        var skillName = reference.skills[action.skillID].name;
        actionContainerHTML+=`<h4>You can train ${skillName} here</h4><button onclick='sendLocationActionRequest(${player.locationID},${i})'>TRAIN!</button>`;
      }
      if (action.mobID!=undefined) {
        var mobName = reference.NPCs[action.mobID].name;
        actionContainerHTML+=`<h4>You can fight ${mobName+'s'} here</h4><button onclick='sendLocationActionRequest(${player.locationID},${i})'>FIGHT!</button>`;
      }
    }
    actionContainer.innerHTML = actionContainerHTML;
    return;
  }
  if (player && player.status=='TRAVEL') {
    actionContainer.innerHTML = `
    <h2>Travelling...</h2>
    <div height=400>
      <img src='travel.jpg' height=400>
    </div>`;
    return;
  }
  if (player && player.status=='WORK' && reference.skills && worldMap[player.locationID]) {
    var actionContainerHTML = ``;
    var locationName = worldMap[player.locationID].name;
    actionContainerHTML+=`<h2>Your location: ${locationName}</h2><br>`;
    var skillName = reference.skills[player.action.skillID].name;
    actionContainerHTML+=`<h4>You are training ${skillName} here</h4><button onclick=''>Cancel</button>`;
    actionContainer.innerHTML = actionContainerHTML;
  }
  if (player && player.status=='COMBAT' && worldMap[player.locationID]) {
    var actionContainerHTML = ``;
    var locationName = worldMap[player.locationID].name;
    actionContainerHTML+=`<h2>Your location: ${locationName}</h2><br>`;
    var enemyName = reference.NPCs[player.action.mobID].name;
    actionContainerHTML+=`<h4>You are fighting a ${enemyName} here</h4><button onclick=''>Cancel</button>`;
    actionContainer.innerHTML = actionContainerHTML;
  }
}

function renderSkills() {
  if (player.skillExperience && reference.skills) {
    var skillContainerHTML = `<table>`;
    var i;
    for (i=0;i<reference.skills.length;i++) {
      skillContainerHTML+=`
      <tr>
        <td>
          <img src='${toCamelCase('skill '+reference.skills[i].name)}.png' width=25px height=25px>
        </td>
        <td>
          ${player.skillExperience[i]||0}
        </td>
      </tr>`;
    }
    skillsContainer.innerHTML = skillContainerHTML;
  }
}

function renderInventory() {
  if (player && player.backpackItems && reference.items) {
    var skillContainerHTML = ``;
    var i;
    for (i=0;i<player.backpackItems.length;i++) {
      skillContainerHTML+=`<img src='${toCamelCase('item '+reference.items[player.backpackItems[i].id].name)}.png' title='${reference.items[player.backpackItems[i].id].desc}' width=25px height=25px margin=5px>  `;
    }
    backpackContainer.innerHTML = skillContainerHTML;
  }
}

function animateWorldMapPlayer() {
  var time = (new Date()).getTime()-timeOffset;
  var travelProportion = (time-player.departureTime)/(player.arrivalTime-player.departureTime);
  if (travelProportion>1) {
    travelProportion = 1;
  }
  var worldMapPlayerImage = document.getElementById('world-map-player');
  worldMapPlayerImage.style.left = `${Math.floor(((1-travelProportion)*(worldMap[player.startLocationID].longitude)+(travelProportion)*(worldMap[player.endLocationID].longitude))*50)+262}px`;
  worldMapPlayerImage.style.top = `${-Math.floor(((1-travelProportion)*(worldMap[player.startLocationID].latitude)+(travelProportion)*(worldMap[player.endLocationID].latitude))*50)+262}px`;
  if (travelProportion<1) {
    setTimeout(animateWorldMapPlayer,50);
  }
}

function toCamelCase(str) {
  var toReturn = '';
  var pieces = str.split(' ');
  toReturn+=pieces.splice(0,1)[0].toLowerCase();
  toReturn+=pieces.map(s=>(s.substring(0,1).toUpperCase()+s.substring(1).toLowerCase()));
  return toReturn;
}

function initialInfoRequests() {
  sendPlayerInfoRequest();
  sendSkillReferenceInfoRequest();
  sendItemReferenceInfoRequest();
  sendNPCReferenceInfoRequest();
  sendWorldInfoRequest();
}

renderLogin();