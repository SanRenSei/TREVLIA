var worldMap = [];
var reference = {};

function generateSkillReferenceTable() {
  reference.skills = [
    {name:'MINING'},
    {name:'KNAWLEDGE'},
    {name:'DRUNKNESS'},
    {name:'MOJO'},
    {name:'FISHING'}
  ];
}

function generateItemReferenceTable() {
  reference.items = [
    {name:'Blobfish',desc:'The Jello of the sea.',stackable:false}
  ];
}

function generateNPCReferenceTable() {
  reference.NPCs = [
    {name:'Crab',hp:1}
  ];
}

function generateWorldMapTestData() {
  worldMap.push(new Location('The Mines',-3,4,[{skillID:0,experienceRate:1}]));
  worldMap.push(new Location('The Library',4,2,[{skillID:1,experienceRate:1}]));
  worldMap.push(new Location('The Tavern',0,-1,[{skillID:2,experienceRate:1}]));
  worldMap.push(new Location('Sex Dungeon',-3,-3,[{skillID:3,experienceRate:1},{mobID:0}]));
  worldMap.push(new Location('Swimming Pool',2,1,[{skillID:4,experienceRate:1,rewardItemID:0,rewardDropRate:0.2}]));
}

function Location(name,longitude,latitude,attributes=[]) {
  this.name = name;
  this.longitude = longitude;
  this.latitude = latitude;
  this.attributes = attributes;
  this.distanceTo = (otherLoc) => {
    var distSquared = (this.longitude-otherLoc.longitude)*(this.longitude-otherLoc.longitude)+(this.latitude-otherLoc.latitude)*(this.latitude-otherLoc.latitude);
    return Math.sqrt(distSquared);
  }
  return this;
}

generateItemReferenceTable();
generateNPCReferenceTable();
generateSkillReferenceTable();
generateWorldMapTestData();

exports.worldMap = worldMap;
exports.reference = reference;