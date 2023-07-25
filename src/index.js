var express = require('express');
var request = require('request');
var config = require('config');
var bodyParser = require('body-parser');
const mongoose = require('mongoose')
const DataModel = require('./dbModel/dataModel');
require('dotenv').config()

var app = express();

app.use(bodyParser.json({type : ['application/*+json','application/json']}));

var cseURL = "http://"+config.cse.ip+":"+config.cse.port;
var csePoA = "http://"+config.cse.ip+":"+config.cse.port;
var cseRelease = config.cse.release;
var requestNr = 0;


// MongoDB Connection for Validation
mongoose.connect(process.env.DB).then(() => {
    console.log("DB connected successfully");
}).catch((err) => {
    console.log("DB error", err);
})


// created APIs
// creating an AE on mobius and saving it's data on mongoDB
app.post('/devices/', async function (req, res) {
	let reqBody = req.body;
	let name = reqBody.device_id;
	try {
		const devices = await DataModel.find({
			device_id : name
		})
		if(devices.length === 0) {
			const result = await DataModel.create(reqBody)
			createAE(reqBody);
			return res.status(201).json({
				message : "AE device created!",
				data : result
			})
		}
		else {
			return res.status(200).json({
				message : "Device already exists, AE can't be created!"
			})
		}
	} catch (error) {
		return res.status(500).json({
			message : error.message
		})
	}
})


// delete an AE device on mobius and it's data from mongoDB
app.delete('/devices/', async function(req,res) {
	const reqBody = req.body;
	const name = reqBody.device_id;
	try {
		const devices = await DataModel.find({
			device_id : name
		})
		if(devices.length !== 0) {
			const result = await DataModel.deleteOne({
				device_id : name
			})
			deleteAE(name);
			return res.status(200).json({
				message : "AE device deleted!",
				data : result
			})
		}
		else {
			return res.status(200).json({
				message : "Device doesn't exist, AE can't be deleted!"
			})
		}
	} catch (error) {
		return res.status(500).json({
			message : error.message
		})
	}
})


// update an AE on mobius and it's data on mongoDB
app.put('/devices/', async function (req, res) {
	const reqBody = req.body;
	const name = reqBody.device_id;
	try {
		const devices = await DataModel.find({
			device_id : name
		})
		if(devices.length !== 0) {
			const deletedResult = await DataModel.deleteOne({
				device_id : name
			})
			deleteAE(name);
			const result = await DataModel.create(reqBody)
			createAE(reqBody);
			return res.status(201).json({
				message : "AE device updated!",
				data : result
			})
		}
		else {
			return res.status(200).json({
				message : "Device doesn't exist, AE can't be updated!"
			})
		}
	} catch (error) {
		return res.status(500).json({
			message : error.message
		})
	}
})



app.listen(config.app.port, function () {
	console.log('Simulator API listening on port ' + config.app.port)
})



// Mobius Functions for device management
function createAE(reqBody) {
	let aeName = reqBody.device_id
	console.log("\n[REQUEST]");
	
		var options = {
		uri: csePoA + "/" + config.cse.name,
		method: "POST",
		headers: {
			"X-M2M-Origin": "Cae-"+aeName,
			"X-M2M-RI": "req"+requestNr,
			"Content-Type": "application/vnd.onem2m-res+json;ty=2"
		},
		json: { 
			"m2m:ae":{
				"rn":aeName,			
				"api":"Napp.company.com",
				"rr":false
			}
		}
	};

	var rr="false";
	var poa = "";

	console.log("");
	console.log(options.method + " " + options.uri);
	console.log(options.json);

	if(cseRelease != "1") {
		options.headers = Object.assign(options.headers, {"X-M2M-RVI":cseRelease});
		options.json["m2m:ae"] = Object.assign(options.json["m2m:ae"], {"srv":["2a"]});
	}
	
	requestNr += 1;
	request(options, function (err, resp, body) {
		console.log("[RESPONSE]");
		if(err) {
			console.log("AE Creation error : " + err);
		}
		else {
			let values = reqBody.values
			values.forEach(element => {
				createContainer(aeName,element)
			});
		}
	});
}


function deleteAE(aeName){
	console.log("\n[REQUEST]");

	var options = {
		uri: cseURL + "/" + config.cse.name + "/" + aeName,
		method: "DELETE",
		headers: {
			"X-M2M-Origin": "S"+aeName,
			"X-M2M-RI": "req"+requestNr,
		}
	};

	if(cseRelease != "1") {
		options.headers = Object.assign(options.headers, {"X-M2M-RVI":cseRelease});
	}
	
	requestNr += 1;
	request(options, function (error, response, body) {
		console.log("[RESPONSE]");
		if(error){
			console.log(error);
		}else{			
			console.log(response.statusCode);
			console.log(body);
		}
	});
}


function createContainer(aeName, valuesArray) {
	let containerName = valuesArray.device_type
	console.log("\n[REQUEST]");
  
	var options = {
	  uri: csePoA + "/" + config.cse.name + "/" + aeName,
	  method: "POST",
	  headers: {
		"X-M2M-Origin": "Cae-" + aeName,
		"X-M2M-RI": "req" + requestNr,
		"Content-Type": "application/vnd.onem2m-res+json;ty=3"
	  },
	  json: {
		"m2m:cnt": {
		  "rn": containerName
		}
	  }
	};
  
	console.log("");
	console.log(options.method + " " + options.uri);
	console.log(options.json);
  
	if (cseRelease != "1") {
	  options.headers = Object.assign(options.headers, { "X-M2M-RVI": cseRelease });
	  options.json["m2m:cnt"] = Object.assign(options.json["m2m:cnt"], { "srv": ["2a"] });
	}
  
	requestNr += 1;
	request(options, function (err, resp, body) {
	  console.log("[RESPONSE]");
	  if (err) {
		console.log("Container Creation error : " + err);
	  }
	  else {
		console.log(`${valuesArray.sensor_value} ${valuesArray.unit}`);
		createContentInstance(aeName,containerName,(`${valuesArray.sensor_value} ${valuesArray.unit}`))
	  }
	});
  }


  function createContentInstance(aeName, containerName, content) {
	console.log("\n[REQUEST]");
  
	var options = {
	  uri: csePoA + "/" + config.cse.name + "/" + aeName + "/" + containerName,
	  method: "POST",
	  headers: {
		"X-M2M-Origin": "Cae-" + aeName,
		"X-M2M-RI": "req" + requestNr,
		"Content-Type": "application/vnd.onem2m-res+json;ty=4"
	  },
	  json: {
		"m2m:cin": {
		  "con": content
		}
	  }
	};
  
	console.log("");
	console.log(options.method + " " + options.uri);
	console.log(options.json);
  
	if (cseRelease != "1") {
	  options.headers = Object.assign(options.headers, { "X-M2M-RVI": cseRelease });
	  options.json["m2m:cin"] = Object.assign(options.json["m2m:cin"], { "srv": ["2a"] });
	}
  
	requestNr += 1;
	request(options, function (err, resp, body) {
	  console.log("[RESPONSE]");
	  if (err) {
		console.log("Content Instance Creation error : " + err);
	  }
	});
  }
  
  
  function createSubscription(name){
	console.log("\n[REQUEST]");

	var options = {
		uri: cseURL + "/" + config.cse.name + "/" + name + "/COMMAND",
		method: "POST",
		headers: {
			"X-M2M-Origin": "S"+name,
			"X-M2M-RI": "req"+requestNr,
			"Content-Type": "application/json;ty=23"
		},
		json: {
			"m2m:sub": {
				"rn": "subscription",
				"nu": ["http://"+config.app.ip+":"+config.app.port+"/"+"S"+name+"?ct=json"],
				"nct": 2,
				"enc": {
					"net": [3]
				}
			}
		}
	};

	console.log("");
	console.log(options.method + " " + options.uri);
	console.log(options.json);

	if(cseRelease != "1") {
		options.headers = Object.assign(options.headers, {"X-M2M-RVI":cseRelease});
	}
	
	requestNr += 1;
	request(options, function (error, response, body) {
		console.log("[RESPONSE]");
		if(error){
			console.log(error);
		}else{
			console.log(response.statusCode);
			console.log(body);
		}
	});
}