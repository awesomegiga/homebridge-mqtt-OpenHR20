'use strict';

var mqtt = require('mqtt');
var Service, Characteristic;

module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory("homebridge-mqtt-openhr20", "mqtt-openhr20", Thermostat_hr20);
}

function Thermostat_hr20(log, config) {
  this.log = log;
  this.name = config["name"];
  this.url = config['url'];
  this.topic_CT = config['topic'] + '_CT';
  this.topic_TT_local = config['topic'] + '_TT_local';
  this.topic_TT = config['topic'] + '_TT';
  this.topic_BS = config['topic'] + '_BS';
  this.client_Id 		= 'mqttjs_' + Math.random().toString(16).substr(2, 8);7
  this.options = {
    keepalive: 10,
    clientId: this.client_Id,
    protocolId: 'MQTT',
    protocolVersion: 4,
    clean: true,
    reconnectPeriod: 1000,
    connectTimeout: 30 * 1000,
    will: {
      topic: 'WillMsg',
      payload: 'Connection Closed abnormally..!',
      qos: 0,
      retain: false
      },
    username: config["username"],
    password: config["password"],
    rejectUnauthorized: false
  };

  this.temperatureDisplayUnits = Characteristic.TemperatureDisplayUnits.CELSIUS;
  var Current_temp;
  var Target_temp =10;
  var Target_temp_local;
  var BatteryStatus =0;
  var update_req = 0;


  this.client  = mqtt.connect(this.url, this.options);
  var that = this;
  this.client.subscribe(this.topic_CT);
  this.client.subscribe(this.topic_BS);
  this.client.subscribe(this.topic_TT_local);


  this.client.on('message', function (topic, message) {
  // data = JSON.parse(message);
  // if (data === null) {return null}
  // that.Current_temp = parseFloat(data);
  if (topic === that.topic_CT){
    that.Current_temp = parseFloat(message);
    that.log(that.name, "- MQTT : Current Temprature = ", that.Current_temp);
  }
  if (topic === that.topic_BS){
    that.BatteryStatus = parseFloat(message);
    that.log(that.name, "- MQTT : Battery Status = ", that.BatteryStatus);
  }
  if (topic === that.topic_TT_local){
    that.Target_temp_local = parseFloat(message);
    that.log(that.name, "- MQTT : Local Tagert Temprature = ", that.Target_temp_local);
    if (that.update_req === 0){
      that.Target_temp = that.Target_temp_local;
      that.setTargetTemperatureEvent(that);
    }
    that.syncTargetTemp(that);
  }
});
}

Thermostat_hr20.prototype = {
  getCurrentTemperature: function(callback) {
    this.log(this.name, "- MQTT : Current Temprature = ", this.Current_temp);
    callback(null, this.Current_temp);
  },

  getTargetTemperature: function(callback) {
    this.log('getTargetTemperature:', this.Target_temp);
    callback(null, this.Target_temp);
  },

  setTargetTemperature: function(value, callback) {
    this.Target_temp = value;
    this.update_req = 1;
    this.log(this.name, "Target Temprature remotely update = ", this.Target_temp);
    callback(null);
  },

  setTargetTemperatureEvent: function(callback) {
    this.log(this.name, "Target Temprature locally updated = ", this.Target_temp);
    this.thermostatService.setCharacteristic(Characteristic.TargetTemperature, this.Target_temp);
    // callback(null);
  },

  syncTargetTemp: function(callback){
    this.log(this.name, "- MQTT : Sync Target Temprature with thermostat = ", this.Target_temp);
    this.client.publish(this.topic_TT, this.Target_temp.toString());
    this.update_req = 0;
    // callback(null);
  },

  setTemperatureDisplayUnits: function(value, callback) {
    this.log("setTemperatureDisplayUnits from %s to %s", this.temperatureDisplayUnits);
    this.temperatureDisplayUnits = value;
    callback(null);
  },

  getBatteryStatus: function(callback) {
    this.log(this.name, "getBattaryStatus : Battery Status = ", this.BatteryStatus);
    callback(null, this.BatteryStatus);
  }
}

Thermostat_hr20.prototype.getServices = function() {

this.informationService = new Service.AccessoryInformation();

this.informationService
  .setCharacteristic(Characteristic.Manufacturer, "Honeywell Hacked")
  .setCharacteristic(Characteristic.Model, "Open HR20")
  .setCharacteristic(Characteristic.SerialNumber, "Open HR20 SN");

this.thermostatService = new Service.Thermostat(this.name);

// thermostatService
  // .getCharacteristic(Characteristic.CurrentHeatingCoolingState)
  // .on('get', this.getCurrentHeatingCoolingState.bind(this));

// thermostatService
  // .getCharacteristic(Characteristic.TargetHeatingCoolingState)
  // .on('get', this.getTargetHeatingCoolingState.bind(this))
  // .on('set', this.setTargetHeatingCoolingState.bind(this));

this.thermostatService
  .getCharacteristic(Characteristic.CurrentTemperature)
  .on('get', this.getCurrentTemperature.bind(this));

this.thermostatService
  .getCharacteristic(Characteristic.TargetTemperature)
  .on('get', this.getTargetTemperature.bind(this))
  .on('set', this.setTargetTemperature.bind(this));

this.thermostatService
  .getCharacteristic(Characteristic.TemperatureDisplayUnits)
//  .on('get', this.getTemperatureDisplayUnits.bind(this))
  .on('set', this.setTemperatureDisplayUnits.bind(this));

this.thermostatService
  .addCharacteristic(Characteristic.StatusLowBattery)
  .on('get', this.getBatteryStatus.bind(this));

  return [this.informationService, this.thermostatService];
}
