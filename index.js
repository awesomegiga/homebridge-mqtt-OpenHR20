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
  var Target_temp;
  var BatteryStatus;


  this.client  = mqtt.connect(this.url, this.options);
  var that = this;
  this.client.subscribe(this.topic_CT);
  this.client.subscribe(this.topic_BS);

  this.client.on('message', function (topic, message) {
  // data = JSON.parse(message);
  // if (data === null) {return null}
  // that.Current_temp = parseFloat(data);
  if (topic === topic_CT){
    that.Current_temp = parseFloat(message);
  }
  if (topic === topic_BS){
    that.BatteryStatus = parseFloat(message);
  }
  });
}

Thermostat_hr20.prototype = {
  getCurrentTemperature: function(callback) {
    this.log(this.name, "- MQTT : Current Temprature = ", this.Current_temp);
    callback(null, this.Current_temp);
  },

  getTargetTemperature: function(callback) {
    //this.log('getTargetTemperature:', this.Target_temp);
    callback(null, this.Target_temp);
  },

  setTargetTemperature: function(value, callback) {
    this.log(this.name, "- MQTT : Target Temprature = ", this.Target_temp);
    this.Target_temp = value;
    this.client.publish(this.topic_TT, this.Target_temp.toString());
    callback(null);
  },

  setTemperatureDisplayUnits: function(value, callback) {
    this.log("setTemperatureDisplayUnits from %s to %s", this.temperatureDisplayUnits);
    this.temperatureDisplayUnits = value;
    callback(null);
  },

  getBatteryStatus: function(callback) {
    this.log(this.name, "- MQTT : Battery Status = ", this.BatteryStatus);
    callback(null, this.BatteryStatus);
  }
}

Thermostat_hr20.prototype.getServices = function() {

  var informationService = new Service.AccessoryInformation();

informationService
  .setCharacteristic(Characteristic.Manufacturer, "Honeywell Hacked")
  .setCharacteristic(Characteristic.Model, "Open HR20")
  .setCharacteristic(Characteristic.SerialNumber, "Open HR20 SN");

var thermostatService = new Service.Thermostat(this.name);

// thermostatService
  // .getCharacteristic(Characteristic.CurrentHeatingCoolingState)
  // .on('get', this.getCurrentHeatingCoolingState.bind(this));

// thermostatService
  // .getCharacteristic(Characteristic.TargetHeatingCoolingState)
  // .on('get', this.getTargetHeatingCoolingState.bind(this))
  // .on('set', this.setTargetHeatingCoolingState.bind(this));

thermostatService
  .getCharacteristic(Characteristic.CurrentTemperature)
  .on('get', this.getCurrentTemperature.bind(this));

thermostatService
  .getCharacteristic(Characteristic.TargetTemperature)
  .on('get', this.getTargetTemperature.bind(this))
  .on('set', this.setTargetTemperature.bind(this));

thermostatService
  .getCharacteristic(Characteristic.TemperatureDisplayUnits)
//  .on('get', this.getTemperatureDisplayUnits.bind(this))
  .on('set', this.setTemperatureDisplayUnits.bind(this));

thermostatService
  .addCharacteristic(Characteristic.StatusLowBattery)
  .on('get', this.getBatteryStatus.bind(this));

  return [informationService, thermostatService];
}
