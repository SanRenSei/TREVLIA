var WebSocketServer = require('websocket').server;
var http = require('http');

var sockets = [];

var wsserver = http.createServer(function(request, response) {
});
console.log("Server running");
wsserver.listen(17633, function() {});

var webServer = new WebSocketServer({
    httpServer: wsserver
});

webServer.on('request', function(request) {
	console.log("New Connection ID: "+sockets.length);
  var connection = request.accept(null, request.origin);
	sockets.push(connection);
  connection.on('message', function(message) {
		try {
			var message = message.data || message.utf8Data;
			var data = JSON.parse(message);
      console.log(data);
      switch (data.tag) {
      case 'INFO':
        switch (data.param) {
        case 'ITEMS': connection.send(JSON.stringify({tag:'INFO',param:data.param,info:reference.items}));break;
        case 'NPCS': connection.send(JSON.stringify({tag:'INFO',param:data.param,info:reference.NPCs}));break;
        case 'PLAYERS': connection.send(JSON.stringify({tag:'INFO',param:data.param,info:players,id:connection.playerID}));break;
        case 'SKILLS': connection.send(JSON.stringify({tag:'INFO',param:data.param,info:reference.skills}));break;
        case 'WORLD': connection.send(JSON.stringify({tag:'INFO',param:data.param,info:worldMap}));break;
        }
        break;
      case 'ACTION':
        switch (data.param) {
        case 'LOCAL':
          var {locationID,actionIndex} = data;
          if (players[connection.playerID].status=='REST' || players[connection.playerID].status=='WORK' || players[connection.playerID].status=='COMBAT') {
            if (players[connection.playerID].locationID == locationID) {
              players[connection.playerID].takeLocalAction(actionIndex);
            }
          }
          break;
        case 'WORLDMOVE':
          if (players[connection.playerID].status=='REST' || players[connection.playerID].status=='WORK' || players[connection.playerID].status=='COMBAT') {
            var destinationID = data.destination;
            players[connection.playerID].travelTo(destinationID);
            connection.send(JSON.stringify({tag:'INFO',param:'PLAYERS',info:players,id:connection.playerID}));
          }
          break;
        }
        break;
        case 'LOGIN':
          var {user,pass} = data;
          if (data.register) {
            var accountID = createNewAccount(user,pass);
            if (accountID==-1) {
              connection.send(JSON.stringify({tag:'LOGIN',result:false}));
            } else {
              players.push(new Player());
              connection.accountID = accountID;
              connection.playerID = accountID;
              connection.send(JSON.stringify({tag:'LOGIN',result:true}));
            }
          } else {
            var accountID = getExistingAccount(user,pass);
            if (accountID!=-1) {
              connection.accountID = accountID;
              connection.playerID = accountID;
              connection.send(JSON.stringify({tag:'LOGIN',result:true}));
            } else {
              connection.send(JSON.stringify({tag:'LOGIN',result:false}));
            }
          }
          break;
      }
		} catch (e) {
			console.log(e.stack);
			return;
		}
	});
  connection.on('close', function(connect) {
    sockets.splice(sockets.indexOf(connection),1);
    console.log("Connection Closed");
    console.log(`${sockets.length} sockets open`);
  });
});

/////////////////////////////////////////////////
/////////////////////////////////////////////////
/////////////////////////////////////////////////
/////////////////////////////////////////////////

var {worldMap, reference} = require('./reference.js');

var sockets = [];
var accounts = [];
var players = [];

var lastTimeUpdate = 0;
var timeUpdateInterval = 10000;

function Player() {
  this.speed = 1;
  this.status = 'REST';
  this.locationID = 2;
  this.skillExperience = [];
  this.backpackItems = [];
  this.backpackSize = 8;
  this.health = 5;
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
  this.takeLocalAction = (actionIndex) => {
    var {locationID} = this;
    this.action = worldMap[locationID].attributes[actionIndex];
    if (this.action.skillID) {
      this.status = 'WORK';
      this.actionStartTime = (new Date()).getTime();
      this.actionCycleTime = 1000;
    } else {
      this.status = 'COMBAT';
      this.actionStartTime = (new Date()).getTime();
      this.actionCycleTime = 1000;
    }
  };
  this.gainExperience = (skillID, experienceRate) => {
    this.skillExperience[skillID] = (this.skillExperience[skillID]||0)+experienceRate;
  }
  this.addItemToBackpack = (itemID) => {
    var item = reference.items[itemID];
    if (!item.stackable) {
      if (this.backpackItems.length<this.backpackSize) {
        this.backpackItems.push({id:itemID,quantity:1});
      }
    }
  }
  return this;
}

function update() {
  var currentTime = (new Date()).getTime();
  var updateTime = false;
  if ((new Date()).getTime()>lastTimeUpdate+timeUpdateInterval) {
    updateTime = true;
    lastTimeUpdate = (new Date()).getTime();
  }
  sockets.forEach(socket => {
    if (socket.playerID!=0 && !socket.playerID) {
      return;
    }
    if (updateTime) {
      socket.send(JSON.stringify({tag:'TIME',param:(new Date()).getTime()}));
    }
    var playerID = socket.playerID;
    var player = players[playerID];
    if (player.status=='TRAVEL') {
      if (currentTime>player.arrivalTime) {
        player.status='REST';
        player.locationID=player.endLocationID;
        socket.send(JSON.stringify({tag:'INFO',param:'PLAYERS',info:players,id:playerID}));
      }
    }
    if (player.status=='WORK') {
      if (currentTime>(player.actionStartTime+player.actionCycleTime)) {
        player.gainExperience(player.action.skillID,player.action.experienceRate);
        if (player.action.rewardDropRate && Math.random()<player.action.rewardDropRate) {
          player.addItemToBackpack(player.action.rewardItemID);
          socket.send(JSON.stringify({tag:'NOTIFICATION',text:`Received item: ${reference.items[player.action.rewardItemID].name}`}));
        }
        player.actionStartTime += player.actionCycleTime;
        socket.send(JSON.stringify({tag:'INFO',param:'PLAYERS',info:players,id:playerID}));
      }
    }
    if (player.status=='COMBAT') {
      if (currentTime>(player.actionStartTime+player.actionCycleTime)) {
        player.actionStartTime += player.actionCycleTime;
        socket.send(JSON.stringify({tag:'INFO',param:'PLAYERS',info:players,id:playerID}));
      }
    }
  });
  setTimeout(update, 200);
}

function createNewAccount(user,pass) {
  var i;
  for (i=0;i<accounts.length;i++) {
    if (accounts[i].username==user) {
      console.log('Duplicate account request. '+user);
      return -1;
    }
  }
  accounts.push({username:user,password:pass});
  return accounts.length-1;
}

function getExistingAccount(user,pass) {
  var i;
  for (i=0;i<accounts.length;i++) {
    if (accounts[i].username==user) {
      if (accounts[i].password==pass) {
        return i;
      }
    }
  }
  return -1;
}

update();