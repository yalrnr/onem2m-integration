var express = require('express');
var request = require('request');
var hashmap = require('hashmap');
var config = require('config');
var path = require('path');
var bodyParser = require('body-parser');
const readline = require('readline');

var app = express();
var map = new hashmap();

app.use(bodyParser.json({type : ['application/*+json','application/json']}));

var csePoA = "http://"+config.cse.ip+":"+config.cse.port;
var cseRelease = config.cse.release;
var deviceTypes = new hashmap();
var templates = config.templates;
var acpi = {};
var requestNr = 0;
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});							


app.post('/devices/:name', function (req, res) {
	let name = req.params.name;

	createAE(name);
	res.sendStatus(201).json("AE device created");
})
  
app.listen(config.app.port, function () {
	console.log('Simulator API listening on port ' + config.app.port)
})

function createAE(name){
	console.log("\n[REQUEST]");
	
		var options = {
		uri: csePoA + "/" + config.cse.name,
		method: "POST",
		headers: {
			"X-M2M-Origin": "Cae-"+name,
			"X-M2M-RI": "req"+requestNr,
			"Content-Type": "application/vnd.onem2m-res+json;ty=2"
		},
		json: { 
			"m2m:ae":{
				"rn":name,			
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
		if(err){
			console.log("AE Creation error : " + err);
		}
	});
}

